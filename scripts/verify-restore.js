#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createDecipheriv } = require("node:crypto");
const lib = require("./lib/backup-lib");

/**
 * Proves the latest backup can actually be restored and read.
 *
 *   node scripts/verify-restore.js [--fresh]
 *
 * A backup nobody has restored is not a backup, it is a file. This restores
 * into a throwaway database beside the real one and checks the result against
 * the source: same tables, same row counts, same migration history, and —
 * the part that is easy to forget — that the encrypted columns still decrypt
 * with the current FIELD_ENCRYPTION_KEY. A dump restored without a working key
 * gives back rows nobody can read, which looks like a successful restore right
 * up until someone opens a chart.
 *
 * Exits non-zero if anything does not match, so it can run on a schedule and
 * be noticed when it fails.
 */

const COMPARE_TABLES = ["patients", "users", "invoices", "audit_logs", "_prisma_migrations"];

async function main() {
  const fresh = process.argv.includes("--fresh");
  const cfg = lib.config();
  const key = lib.loadBackupKey(process.env.BACKUP_ENCRYPTION_KEY);

  if (fresh) {
    console.log("Taking a fresh backup first ...");
    await lib.run({
      command: process.execPath,
      args: [path.join(__dirname, "backup.js")],
      env: {},
    });
  }

  const backups = lib.listBackups(cfg.dir);
  if (backups.length === 0) throw new Error(`No backups found in ${cfg.dir}`);
  const backup = backups[backups.length - 1];
  console.log(`Verifying ${path.basename(backup)}`);

  const manifest = lib.readManifest(lib.manifestPathFor(backup), key);
  if (manifest) {
    console.log(`  recorded at ${manifest.takenAt}`);
  } else {
    console.log("  no manifest beside this backup — checking structure only, not completeness");
  }

  const scratch = `caresync_verify_${Date.now()}`;
  const admin = { ...cfg.conn, database: "postgres" };
  const target = { ...cfg.conn, database: scratch };

  await psql(admin, cfg.container, `CREATE DATABASE "${scratch}"`);

  const failures = [];
  try {
    await restoreInto(backup, target, cfg.container, key);

    // Compared against what the backup recorded, never against the live
    // database. The live one has moved on — that is what a database does — and
    // comparing to it would report ordinary traffic as a broken backup.
    if (manifest) {
      for (const [table, recorded] of Object.entries(manifest.counts)) {
        const restored = await count(target, cfg.container, table);
        // Fewer rows than were recorded means the dump or the restore lost
        // some. More is possible and harmless: a write can land between the
        // count and the snapshot pg_dump works from.
        const ok = restored !== null && restored >= recorded;
        const note = restored > recorded ? ` (+${restored - recorded} written during the dump)` : "";
        console.log(
          `  ${ok ? "ok  " : "FAIL"} ${table.padEnd(20)} recorded ${recorded}, restored ${restored}${note}`,
        );
        if (!ok) failures.push(`${table}: ${recorded} recorded, only ${restored} restored`);
      }

      const tablesAfter = await tableCount(target, cfg.container);
      const tablesOk = tablesAfter === manifest.tables;
      console.log(
        `  ${tablesOk ? "ok  " : "FAIL"} ${"tables".padEnd(20)} recorded ${manifest.tables}, restored ${tablesAfter}`,
      );
      if (!tablesOk) failures.push(`table count: ${manifest.tables} recorded, ${tablesAfter} restored`);
    } else {
      // Without a manifest the most that can be said is that the schema came
      // back and core tables are not empty.
      const tablesAfter = await tableCount(target, cfg.container);
      const ok = tablesAfter > 0;
      console.log(`  ${ok ? "ok  " : "FAIL"} ${"tables".padEnd(20)} restored ${tablesAfter}`);
      if (!ok) failures.push("no tables restored");

      for (const table of COMPARE_TABLES) {
        const restored = await count(target, cfg.container, table);
        if (restored === null) continue;
        const nonEmpty = restored > 0;
        console.log(`  ${nonEmpty ? "ok  " : "FAIL"} ${table.padEnd(20)} restored ${restored}`);
        if (!nonEmpty) failures.push(`${table} restored empty`);
      }
    }

    const readable = await encryptedColumnsStillReadable(target, cfg.container);
    console.log(`  ${readable.ok ? "ok  " : "FAIL"} ${"decrypts".padEnd(20)} ${readable.detail}`);
    if (!readable.ok) failures.push(`encrypted columns: ${readable.detail}`);
  } finally {
    await psql(admin, cfg.container,
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${scratch}'`).catch(() => {});
    await psql(admin, cfg.container, `DROP DATABASE IF EXISTS "${scratch}"`).catch(() => {});
  }

  if (failures.length) {
    console.error(`\nRestore verification FAILED:\n  - ${failures.join("\n  - ")}`);
    process.exit(1);
  }
  console.log("\nRestore verified.");
}

/**
 * Decrypts one encrypted value from the restored copy with the field key.
 *
 * This is the check that distinguishes a restore that worked from one that
 * merely completed: the bytes came back, but can the running system read them?
 */
async function encryptedColumnsStillReadable(conn, container) {
  const fieldKey = process.env.FIELD_ENCRYPTION_KEY;
  if (!fieldKey || !/^[0-9a-fA-F]{64}$/.test(fieldKey)) {
    return { ok: false, detail: "FIELD_ENCRYPTION_KEY is not set or malformed" };
  }

  const value = (await query(conn, container,
    `SELECT "address" FROM patients WHERE "address" LIKE 'enc:%' LIMIT 1`)).trim();

  if (!value) return { ok: true, detail: "no encrypted values present to check" };

  try {
    const [, , blob] = value.split(":");
    const bytes = Buffer.from(blob, "base64");
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(fieldKey, "hex"), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const plain = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
    return { ok: plain.length > 0, detail: "a restored encrypted column decrypts with the current key" };
  } catch (err) {
    return {
      ok: false,
      detail: `a restored value will not decrypt (${err.message}). The backup and the ` +
        `current FIELD_ENCRYPTION_KEY do not belong together.`,
    };
  }
}

async function restoreInto(backup, conn, container, key) {
  const plain = path.join(os.tmpdir(), `caresync-verify-${process.pid}.dump`);
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(plain);
    const stream = lib.decryptToStream(backup, key);
    stream.on("error", (e) =>
      reject(
        new Error(
          `Could not decrypt ${path.basename(backup)}: ${e.message}. Either ` +
            `BACKUP_ENCRYPTION_KEY is not the key this backup was written with, ` +
            `or the file has been altered since.`,
        ),
      ),
    );
    out.on("error", reject);
    out.on("finish", resolve);
    stream.pipe(out);
  });
  try {
    await lib.run(
      lib.pgCommand("pg_restore", ["-d", conn.database, "--no-owner", "--no-privileges"], conn, container),
      { stdin: fs.createReadStream(plain) },
    );
  } finally {
    if (fs.existsSync(plain)) fs.unlinkSync(plain);
  }
}

async function query(conn, container, sql) {
  let out = "";
  await lib.run(lib.pgCommand("psql", ["-d", conn.database, "-t", "-A", "-c", sql], conn, container), {
    onStdout: (s) => s.on("data", (d) => (out += d.toString())),
  });
  return out;
}

async function psql(conn, container, sql) {
  return query(conn, container, sql);
}

async function count(conn, container, table) {
  try {
    return Number((await query(conn, container, `SELECT count(*) FROM "${table}"`)).trim());
  } catch {
    return null;
  }
}

async function tableCount(conn, container) {
  return Number(
    (await query(conn, container,
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")).trim(),
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
