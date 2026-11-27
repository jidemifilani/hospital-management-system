import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { StorageDriver } from "./storage.driver";

export interface S3StorageOptions {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Set for anything that is not AWS itself: R2, B2, MinIO. */
  endpoint?: string;
}

/**
 * S3, or anything that speaks it.
 *
 * What a managed deployment needs: on Render, Railway or Fly the container
 * filesystem is replaced on every deploy, so documents written to disk there
 * are patient records that disappear the next time the service ships.
 *
 * `@aws-sdk/client-s3` v3, not the `aws-sdk` v2 that was already in this
 * package. v2 reached end-of-support and takes no further security updates,
 * which is not a dependency to put under a store of patient records; v3 is
 * also a tenth of the install.
 *
 * Path-style addressing is forced because the S3-compatible stores expect it,
 * and because a bucket name containing a dot breaks virtual-host addressing
 * over TLS.
 */
export class S3StorageDriver implements StorageDriver {
  readonly name = "s3";

  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: S3StorageOptions) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      endpoint: options.endpoint || undefined,
      forcePathStyle: true,
    });
  }

  async put(storageKey: string, buffer: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: buffer,
        // No ContentType on purpose: every download is streamed back through
        // an authenticated endpoint that sets the header from the mime type
        // recorded on the document row, so the object's own is never read.
        // It also means a mislabelled upload cannot talk a browser into
        // rendering something as HTML straight out of the bucket.
      }),
    );
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }));
      return true;
    } catch (error) {
      if (this.isMissing(error)) return false;
      // A permissions or network failure is not an absence. Reporting it as
      // one would tell a clinician their document is gone when it is there.
      throw error;
    }
  }

  async read(storageKey: string): Promise<Readable> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
    if (!result.Body) throw new Error(`No body returned for ${storageKey}`);
    return result.Body as Readable;
  }

  async sizeOf(storageKey: string): Promise<number> {
    const head = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
    return head.ContentLength ?? 0;
  }

  async remove(storageKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
  }

  private isMissing(error: unknown): boolean {
    const name = (error as { name?: string } | null)?.name;
    const status = (error as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata
      ?.httpStatusCode;
    return name === "NotFound" || name === "NoSuchKey" || status === 404;
  }
}
