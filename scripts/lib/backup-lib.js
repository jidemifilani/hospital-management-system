"use strict";

const { createCipheriv, createDecipheriv, randomBytes } = require("node:crypto");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Shared pieces for taking, restoring and checking a backup.
 *
 * A backup of this database is not safe just because the application encrypts
 * some columns. Names, MRNs, phone numbers and every appointment sit in it in
 * the clear, so the dump itself is encrypted before it touches disk.
 */

const MAGIC = Buffer.from("CSYNCBK1");
const IV_BYTES = 12;
const TAG_BYTES = 16;

/* ─────────────────────────── key ─────────────────────────── */

class BackupKeyError extends Error {}

function loadBackupKey(raw) {
  if (!raw || !String(raw).trim()) {
    throw new BackupKeyError(
      "BACKUP_ENCRYPTION_KEY is not set. Generate one with: openssl rand -hex 32\n" +
        "Keep it somewhere other than the backups themselves.",
    );
  }
  const value = String(raw).trim();
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new BackupKeyError(
      "BACKUP_ENCRYPTION_KEY must be 64 hex characters (32 bytes). " +
        "Generate one with: openssl rand -hex 32",
    );
  }
  return Buffer.from(value, "hex");
}

/* ────────────────────── connection details ────────────────────── */

/**
 * Splits a postgres URL into the parts the command line tools want.
 *
 * When the tools run inside the database container the host and port from the
 * URL are wrong — they describe how to reach it from outside. Inside, it is
 * always listening on its own 5432.
 */
function parseDatabaseUrl(url, { insideContainer = false } = {}) {
  const parsed = new URL(url);
  return {
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: insideContainer ? "127.0.0.1" : parsed.hostname,
    port: insideContainer ? "5432" : parsed.port || "5432",
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
  };
}

/**
 * Builds the argv for a postgres tool, routing through `docker exec` when the
 * client binaries are not installed on this machine. A developer on Windows
 * has the database in a container and nothing on PATH; a server and a CI
 * runner have the binaries and no container.
 */
function pgCommand(tool, args, conn, container) {
  const flags = ["-h", conn.host, "-p", String(conn.port), "-U", conn.user, ...args];
  if (!container) return { command: tool, args: flags, env: { PGPASSWORD: conn.password } };

  return {
    command: "docker",
    args: ["exec", "-i", "-e", `PGPASSWORD=${conn.password}`, container, tool, ...flags],
    env: {},
  };
}

/** Runs a command, streaming stdout to `onStdout` if given, and resolves with stderr. */
function run({ command, args, env }, { onStdout, stdin } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: [stdin ? "pipe" : "ignore", onStdout ? "pipe" : "inherit", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    if (onStdout) onStdout(child.stdout);
    if (stdin) stdin.pipe(child.stdin);

    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(stderr)
        : reject(new Error(`${command} ${args.join(" ")} exited ${code}\n${stderr}`)),
    );
  });
}

/* ───────────────────── encrypted container ───────────────────── */

/**
 * File layout: MAGIC | IV | ciphertext | TAG.
 *
 * The tag goes at the end because GCM only produces it once everything has
 * been read, which is what lets the dump be encrypted as it streams rather
 * than buffered whole in memory.
 */
function encryptStream(source, destPath, key) {
  return new Promise((resolve, reject) => {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const out = fs.createWriteStream(destPath);

    out.write(MAGIC);
    out.write(iv);

    source.on("error", reject);
    cipher.on("error", reject);
    out.on("error", reject);

    cipher.pipe(out, { end: false });
    cipher.on("end", () => {
      out.end(cipher.getAuthTag(), () => resolve(fs.statSync(destPath).size));
    });
    source.pipe(cipher);
  });
}

function decryptToStream(sourcePath, key) {
  const size = fs.statSync(sourcePath).size;
  const headerBytes = MAGIC.length + IV_BYTES;
  if (size < headerBytes + TAG_BYTES) throw new Error("Backup file is truncated");

  const fd = fs.openSync(sourcePath, "r");
  try {
    const header = Buffer.alloc(headerBytes);
    fs.readSync(fd, header, 0, headerBytes, 0);
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) {
      throw new Error("Not a CareSync backup file");
    }
    const iv = header.subarray(MAGIC.length);

    const tag = Buffer.alloc(TAG_BYTES);
    fs.readSync(fd, tag, 0, TAG_BYTES, size - TAG_BYTES);

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const body = fs.createReadStream(sourcePath, {
      start: headerBytes,
      end: size - TAG_BYTES - 1,
    });
    return body.pipe(decipher);
  } finally {
    fs.closeSync(fd);
  }
}

/* ─────────────────────── manifest ─────────────────────── */

/**
 * A small encrypted record of what a backup contained, written beside it.
 *
 * Without this, checking a restore means comparing the restored copy against
 * the live database — which has moved on. A hospital that admitted one patient
 * between the backup and the check would see the check fail, every time, for no
 * reason. An alarm that is always ringing is one nobody looks at, which is
 * worse than no alarm.
 *
 * Encrypted because row counts describe how many patients an organisation has.
 */
function writeManifest(destPath, manifest, key) {
  fs.writeFileSync(destPath, encryptText(JSON.stringify(manifest, null, 2), key));
}

function readManifest(sourcePath, key) {
  if (!fs.existsSync(sourcePath)) return null;
  return JSON.parse(decryptText(fs.readFileSync(sourcePath, "utf8"), key));
}

function manifestPathFor(backupPath) {
  return backupPath.replace(/\.dump\.enc$/, ".manifest.enc");
}

function encryptText(plain, key) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}

function decryptText(stored, key) {
  const blob = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, blob.subarray(0, IV_BYTES));
  decipher.setAuthTag(blob.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([
    decipher.update(blob.subarray(IV_BYTES + TAG_BYTES)),
    decipher.final(),
  ]).toString("utf8");
}

/* ───────────────────────── misc ───────────────────────── */

const FILE_PATTERN = /^caresync-\d{8}T\d{6}Z\.dump\.enc$/;

function backupName(at = new Date()) {
  return `caresync-${at.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}.dump.enc`;
}

function listBackups(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => FILE_PATTERN.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

function config() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const container = process.env.PG_DOCKER_CONTAINER || "";
  return {
    databaseUrl,
    container,
    conn: parseDatabaseUrl(databaseUrl, { insideContainer: !!container }),
    dir: path.resolve(process.env.BACKUP_DIR || "backups"),
    retentionDays: Number(process.env.BACKUP_RETENTION_DAYS || 30),
  };
}

module.exports = {
  BackupKeyError,
  backupName,
  config,
  decryptToStream,
  decryptText,
  encryptStream,
  encryptText,
  listBackups,
  loadBackupKey,
  manifestPathFor,
  parseDatabaseUrl,
  pgCommand,
  readManifest,
  run,
  writeManifest,
};
