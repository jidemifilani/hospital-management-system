import { randomUUID } from "crypto";
import { extname } from "path";
import { Readable } from "stream";

/**
 * Where uploaded bytes live, behind one interface.
 *
 * Two drivers implement it: local disk, which is what a single server wants,
 * and S3, which is what anything else needs. On a managed host the container
 * filesystem does not survive a deploy, so local disk there means patient
 * documents are destroyed every time the service restarts.
 *
 * Every method is async, including `exists` and `sizeOf`. They were
 * synchronous while disk was the only option; no object store can answer
 * either without a round trip, and a seam that cannot express that is not a
 * seam.
 */
export interface StorageDriver {
  readonly name: string;

  /** Writes the bytes under `storageKey`. */
  put(storageKey: string, buffer: Buffer): Promise<void>;

  exists(storageKey: string): Promise<boolean>;

  read(storageKey: string): Promise<Readable>;

  sizeOf(storageKey: string): Promise<number>;

  /** Best effort; a failure here is logged, never thrown. */
  remove(storageKey: string): Promise<void>;
}

/**
 * The extensions a stored object may carry.
 *
 * Exactly the extensions ALLOWED_MIME accepts, and
 * s3-storage.driver.spec.ts fails if the two ever drift apart. The upload
 * endpoint already refuses anything else -- it requires the extension to
 * match the declared mime type -- so this is the second lock: an extension
 * that got here another way cannot end up on disk as something a web server
 * would be willing to execute.
 *
 * That is not hypothetical on a developer's machine, where this repository
 * sits under a document root: a stored `.php` would be reachable and would
 * run. Nothing an attacker chooses should decide the suffix of a file we
 * write.
 */
export const SAFE_EXTENSIONS: ReadonlySet<string> = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".tif",
  ".tiff",
  ".dcm",
  ".txt",
  ".csv",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
]);

/**
 * The key for a new upload.
 *
 * Shared by both drivers so the rule holds wherever the bytes go: the key is
 * generated here and never derived from the uploader's filename, so
 * "../../etc/passwd" is not a path this can be talked into writing to. Only
 * the extension survives, and only one on the list above.
 *
 * Laid out by year and month so no single prefix grows without bound — which
 * matters for a directory listing on disk, and for request distribution
 * across an S3 bucket's partitions.
 */
export function storageKeyFor(originalName: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const raw = extname(originalName).slice(0, 12).toLowerCase();
  const ext = SAFE_EXTENSIONS.has(raw) ? raw : "";

  return `${yyyy}/${mm}/${randomUUID()}${ext}`;
}
