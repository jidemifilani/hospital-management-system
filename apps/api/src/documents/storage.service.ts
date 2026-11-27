import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import { join, resolve } from "path";
import { Readable } from "stream";
import { LocalStorageDriver } from "./local-storage.driver";
import { S3StorageDriver } from "./s3-storage.driver";
import { StorageDriver, storageKeyFor } from "./storage.driver";

export interface StoredFile {
  storageKey: string;
  checksum: string;
  sizeBytes: number;
}

/**
 * Where uploaded bytes live.
 *
 * Local disk by default, which is right for a deployment that owns its server
 * and mounts a volume over the directory. `STORAGE_DRIVER=s3` switches to an
 * S3-compatible bucket, which is what a managed host requires: on Render,
 * Railway or Fly the container filesystem is replaced on every deploy, so a
 * document written to disk is a patient record that vanishes the next time
 * the service ships. Nothing warns you — the row stays, the file does not.
 *
 * Two rules the rest of the system depends on, and both hold for either
 * driver:
 *  - the key is generated in storageKeyFor() and never derived from the
 *    uploader's filename, so "../../etc/passwd" is not a path this can be
 *    talked into writing to;
 *  - the bytes sit outside anything the web server serves, so a file is only
 *    ever reachable through an endpoint that checks who is asking.
 *
 * The driver is chosen once, at startup, and an S3 selection with missing
 * settings refuses to boot rather than falling back to a disk that will be
 * wiped. Quietly degrading to local storage is how you find out, months
 * later, that nothing has been kept.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: StorageDriver;

  constructor(private config: ConfigService) {
    this.driver = this.build();
    this.logger.log(`Document storage: ${this.driver.name}`);
  }

  private build(): StorageDriver {
    const selected = (this.config.get<string>("STORAGE_DRIVER") ?? "local").toLowerCase();

    if (selected === "local") {
      const root = resolve(
        this.config.get<string>("FILE_STORAGE_ROOT") ?? join(process.cwd(), "storage", "documents"),
      );
      return new LocalStorageDriver(root);
    }

    if (selected === "s3") {
      const bucket = this.config.get<string>("AWS_S3_BUCKET") ?? "";
      const region = this.config.get<string>("AWS_REGION") ?? "";
      const accessKeyId = this.config.get<string>("AWS_ACCESS_KEY_ID") ?? "";
      const secretAccessKey = this.config.get<string>("AWS_SECRET_ACCESS_KEY") ?? "";
      const endpoint = this.config.get<string>("AWS_S3_ENDPOINT") ?? "";

      const missing = [
        ["AWS_S3_BUCKET", bucket],
        ["AWS_REGION", region],
        ["AWS_ACCESS_KEY_ID", accessKeyId],
        ["AWS_SECRET_ACCESS_KEY", secretAccessKey],
      ]
        .filter(([, value]) => !value)
        .map(([name]) => name);

      if (missing.length) {
        throw new Error(
          `STORAGE_DRIVER=s3 needs ${missing.join(", ")}. Refusing to start: falling back to ` +
            `local disk on a host that replaces its filesystem would lose every document.`,
        );
      }

      return new S3StorageDriver({ bucket, region, accessKeyId, secretAccessKey, endpoint });
    }

    throw new Error(`Unknown STORAGE_DRIVER "${selected}". Use "local" or "s3".`);
  }

  async save(buffer: Buffer, originalName: string): Promise<StoredFile> {
    const storageKey = storageKeyFor(originalName);
    await this.driver.put(storageKey, buffer);

    return {
      storageKey,
      checksum: createHash("sha256").update(buffer).digest("hex"),
      sizeBytes: buffer.length,
    };
  }

  exists(storageKey: string): Promise<boolean> {
    return this.driver.exists(storageKey);
  }

  stream(storageKey: string): Promise<Readable> {
    return this.driver.read(storageKey);
  }

  sizeOf(storageKey: string): Promise<number> {
    return this.driver.sizeOf(storageKey);
  }

  /**
   * Removes the bytes. Used only when a database write failed after the file
   * landed — deleting a document is a soft delete, because a record that was
   * part of someone's care has to stay producible.
   */
  async discard(storageKey: string): Promise<void> {
    try {
      await this.driver.remove(storageKey);
    } catch (err) {
      this.logger.warn(`Could not discard orphaned upload ${storageKey}: ${String(err)}`);
    }
  }
}
