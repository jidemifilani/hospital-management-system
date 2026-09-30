#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const lib = require("./lib/backup-lib");

/**
 * Restores an encrypted backup.
 *
 *   node scripts/restore.js backups/caresync-20260930T120000Z.dump.enc --to "postgres://..."
 *
 * --to defaults to DATABASE_URL. Restoring over a database that already has
 * tables requires --force, because the restore drops and recreates what it
 * touches and there is no undo.
 */

async function main() {
  const argv = process.argv.slice(2);
  const file = argv.find((a) => !a.startsWith("--"));
  const force = argv.includes("--force");
  const toIndex = argv.indexOf("--to");
  const targetUrl = toIndex >= 0 ? argv[toIndex + 1] : process.env.DATABASE_URL;

  if (!file) throw new Error("Usage: node scripts/restore.js <backup-file> [--to URL] [--force]");
  if (!fs.existsSync(file)) throw new Error(`No such backup: ${file}`);
  if (!targetUrl) throw new Error("No target: pass --to or set DATABASE_URL");

  const key = lib.loadBackupKey(process.env.BACKUP_ENCRYPTION_KEY);
  const container = process.env.PG_DOCKER_CONTAINER || "";
  const conn = lib.parseDatabaseUrl(targetUrl, { insideContainer: !!container });

  const existing = await tableCount(conn, container);
  if (existing > 0 && !force) {
    throw new Error(
      `${conn.database} already has ${existing} table(s). Restoring drops and recreates ` +
        `them and cannot be undone. Re-run with --force if that is what you want.`,
    );
  }

  // Decrypted to a temp file rather than piped: pg_restore needs to seek within
  // a custom-format archive, which it cannot do on a stream.
  const plain = path.join(os.tmpdir(), `caresync-restore-${process.pid}.dump`);
  console.log(`Decrypting ${path.basename(file)} ...`);
  await writeDecrypted(file, plain, key);

  try {
    console.log(`Restoring into ${conn.database} ...`);
    const cmd = lib.pgCommand(
      "pg_restore",
      ["-d", conn.database, "--no-owner", "--no-privileges", "--clean", "--if-exists"],
      conn,
      container,
    );
    // pg_restore reports benign notices on stderr; a non-zero exit is the failure.
    await lib.run(cmd, { stdin: fs.createReadStream(plain) });
    console.log(`Restored ${await tableCount(conn, container)} table(s) into ${conn.database}`);
  } finally {
    if (fs.existsSync(plain)) fs.unlinkSync(plain);
  }
}

function writeDecrypted(source, dest, key) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    const stream = lib.decryptToStream(source, key);
    stream.on("error", (e) =>
      reject(
        new Error(
          `Could not decrypt ${path.basename(source)}: ${e.message}. ` +
            `Either BACKUP_ENCRYPTION_KEY is not the key this was written with, ` +
            `or the file has been altered.`,
        ),
      ),
    );
    out.on("error", reject);
    out.on("finish", resolve);
    stream.pipe(out);
  });
}

async function tableCount(conn, container) {
  const cmd = lib.pgCommand(
    "psql",
    ["-d", conn.database, "-t", "-A", "-c",
     "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"],
    conn,
    container,
  );
  let out = "";
  await lib.run(cmd, { onStdout: (s) => s.on("data", (d) => (out += d.toString())) });
  return Number(out.trim()) || 0;
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
