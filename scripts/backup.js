#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const lib = require("./lib/backup-lib");

/**
 * Takes an encrypted backup of the database.
 *
 *   node scripts/backup.js
 *
 * Environment:
 *   DATABASE_URL            required
 *   BACKUP_ENCRYPTION_KEY   required, 64 hex chars, NOT the field key
 *   BACKUP_DIR              default ./backups
 *   BACKUP_RETENTION_DAYS   default 30
 *   PG_DOCKER_CONTAINER     run pg_dump inside this container instead of on PATH
 */

async function main() {
  const cfg = lib.config();
  const key = lib.loadBackupKey(process.env.BACKUP_ENCRYPTION_KEY);

  fs.mkdirSync(cfg.dir, { recursive: true });
  const target = path.join(cfg.dir, lib.backupName());
  const partial = target + ".partial";

  // Counted before the dump starts, so a write that lands during the dump can
  // only make the restored copy larger than this record, never smaller. That
  // asymmetry is what lets the check treat "fewer rows than recorded" as real
  // data loss without ever crying wolf over ordinary traffic.
  const manifest = await capture(cfg);

  // Custom format: compressed, and pg_restore can rebuild selectively from it.
  const cmd = lib.pgCommand(
    "pg_dump",
    ["-d", cfg.conn.database, "-Fc", "--no-owner", "--no-privileges"],
    cfg.conn,
    cfg.container,
  );

  const started = Date.now();
  let written = null;
  let size = 0;

  try {
    await lib.run(cmd, {
      // Written to a .partial name and renamed only once the file is complete,
      // so a backup interrupted half way cannot be mistaken for a whole one by
      // the restore or the retention sweep.
      onStdout: (stdout) => {
        written = lib.encryptStream(stdout, partial, key);
      },
    });

    // pg_dump exiting is not the same as the file being finished: the
    // authentication tag is only appended once the cipher has flushed. Renaming
    // before this resolves would publish a backup that cannot be decrypted.
    size = await written;
    fs.renameSync(partial, target);
    lib.writeManifest(lib.manifestPathFor(target), manifest, key);
  } catch (err) {
    if (fs.existsSync(partial)) fs.unlinkSync(partial);
    throw err;
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Wrote ${path.basename(target)} (${(size / 1048576).toFixed(2)} MB) in ${seconds}s`);
  console.log(`Recorded ${manifest.tables} tables, ${manifest.counts.patients ?? 0} patients`);

  const removed = prune(cfg);
  if (removed.length) console.log(`Removed ${removed.length} backup(s) past ${cfg.retentionDays} days`);

  const kept = lib.listBackups(cfg.dir);
  console.log(`${kept.length} backup(s) in ${cfg.dir}`);
}

/** Tables whose row counts are worth recording and checking after a restore. */
const TRACKED = ["patients", "users", "invoices", "audit_logs", "_prisma_migrations"];

/** Records what the database holds, for the restore check to compare against. */
async function capture(cfg) {
  const counts = {};
  for (const table of TRACKED) {
    const value = await scalar(cfg, `SELECT count(*) FROM "${table}"`);
    if (value !== null) counts[table] = Number(value);
  }
  return {
    takenAt: new Date().toISOString(),
    database: cfg.conn.database,
    tables: Number(
      await scalar(cfg, "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"),
    ),
    counts,
  };
}

async function scalar(cfg, sql) {
  try {
    let out = "";
    await lib.run(
      lib.pgCommand("psql", ["-d", cfg.conn.database, "-t", "-A", "-c", sql], cfg.conn, cfg.container),
      { onStdout: (s) => s.on("data", (d) => (out += d.toString())) },
    );
    return out.trim();
  } catch {
    return null;
  }
}

/**
 * Deletes backups older than the retention window, never the most recent one,
 * and takes each one's manifest with it so the directory cannot accumulate
 * manifests describing backups that no longer exist.
 */
function prune(cfg) {
  const cutoff = Date.now() - cfg.retentionDays * 86_400_000;
  const all = lib.listBackups(cfg.dir);
  const removed = [];

  // Keeping the newest regardless means a misconfigured retention of 0 cannot
  // leave the system with no backup at all.
  for (const file of all.slice(0, -1)) {
    if (fs.statSync(file).mtimeMs < cutoff) {
      fs.unlinkSync(file);
      const manifest = lib.manifestPathFor(file);
      if (fs.existsSync(manifest)) fs.unlinkSync(manifest);
      removed.push(file);
    }
  }
  return removed;
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
