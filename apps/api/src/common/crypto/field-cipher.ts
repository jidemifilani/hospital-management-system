import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Authenticated encryption for individual column values.
 *
 * AES-256-GCM with a fresh 12-byte IV per value. GCM is used rather than CBC
 * because it authenticates: a ciphertext that has been altered in the database
 * fails to decrypt instead of returning plausible-looking rubbish into a
 * medical record.
 *
 * Stored form is "enc:<version>:<base64(iv | tag | ciphertext)>". The prefix
 * does two jobs. It lets a value be recognised as encrypted without consulting
 * anything else, so a column part-way through a backfill can hold a mixture of
 * both and still be read; and the version digit leaves room to rotate the key
 * later by decrypting with the old one and writing back with the new.
 */

const PREFIX = "enc";
const VERSION = "1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class FieldEncryptionKeyError extends Error {}

/** Reads and validates the key. Throws rather than falling back to anything weaker. */
export function loadKey(raw: string | undefined): Buffer {
  if (!raw || !raw.trim()) {
    throw new FieldEncryptionKeyError(
      "FIELD_ENCRYPTION_KEY is not set. Generate one with: openssl rand -hex 32",
    );
  }
  const value = raw.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new FieldEncryptionKeyError(
      "FIELD_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). " +
        "Generate one with: openssl rand -hex 32",
    );
  }
  return Buffer.from(value, "hex");
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX + ":");
}

export function encryptValue(plain: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, VERSION, Buffer.concat([iv, tag, ciphertext]).toString("base64")].join(":");
}

export function decryptValue(stored: string, key: Buffer): string {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== PREFIX) {
    throw new Error("Value is not in encrypted form");
  }
  if (parts[1] !== VERSION) {
    throw new Error("Unsupported field encryption version: " + parts[1]);
  }

  const blob = Buffer.from(parts[2], "base64");
  const iv = blob.subarray(0, IV_BYTES);
  const tag = blob.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = blob.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
