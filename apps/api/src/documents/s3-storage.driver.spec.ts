import * as http from "http";
import { AddressInfo } from "net";
import { ALLOWED_MIME } from "./documents.service";
import { S3StorageDriver } from "./s3-storage.driver";
import { SAFE_EXTENSIONS, storageKeyFor } from "./storage.driver";

/**
 * The S3 driver, against something that actually speaks S3 over a socket.
 *
 * A mocked SDK would prove only that the right method names were called. What
 * matters here is the wire: that path-style addressing puts the bucket where
 * this server expects it, that a missing object comes back as `false` from
 * exists() rather than as an exception, that a body arrives as a readable
 * stream, and that the key never contains anything the uploader chose.
 *
 * It is a stand-in, not S3: it ignores the signature, because what is under
 * test is this driver, not AWS's authentication.
 */

interface FakeS3 {
  url: string;
  objects: Map<string, Buffer>;
  requests: { method: string; path: string }[];
  close: () => Promise<void>;
}

async function startFakeS3(): Promise<FakeS3> {
  const objects = new Map<string, Buffer>();
  const requests: { method: string; path: string }[] = [];

  const server = http.createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? "").split("?")[0] ?? "");
    requests.push({ method: req.method ?? "", path });

    if (req.method === "PUT") {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        objects.set(path, Buffer.concat(chunks));
        res.writeHead(200, { ETag: '"fake"' });
        res.end();
      });
      return;
    }

    const body = objects.get(path);

    if (req.method === "HEAD") {
      if (!body) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Length": String(body.length) });
      res.end();
      return;
    }

    if (req.method === "GET") {
      if (!body) {
        res.writeHead(404, { "Content-Type": "application/xml" });
        res.end("<Error><Code>NoSuchKey</Code><Message>Not found</Message></Error>");
        return;
      }
      res.writeHead(200, { "Content-Length": String(body.length) });
      res.end(body);
      return;
    }

    if (req.method === "DELETE") {
      objects.delete(path);
      res.writeHead(204);
      res.end();
      return;
    }

    res.writeHead(405);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    objects,
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function read(stream: import("stream").Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

describe("the S3 document store", () => {
  let fake: FakeS3;
  let driver: S3StorageDriver;

  beforeEach(async () => {
    fake = await startFakeS3();
    driver = new S3StorageDriver({
      bucket: "caresync-documents",
      region: "eu-west-1",
      accessKeyId: "probe",
      secretAccessKey: "probe-secret",
      endpoint: fake.url,
    });
  });

  afterEach(async () => {
    await fake.close();
  });

  it("writes and reads the same bytes back", async () => {
    const bytes = Buffer.from("a discharge summary");

    await driver.put("2026/11/abc.pdf", bytes);
    const streamed = await read(await driver.read("2026/11/abc.pdf"));

    expect(streamed.equals(bytes)).toBe(true);
  });

  it("addresses the bucket by path, as the compatible stores require", async () => {
    await driver.put("2026/11/abc.pdf", Buffer.from("x"));

    // Not a subdomain: a bucket name with a dot in it breaks virtual-host
    // addressing over TLS, and R2, B2 and MinIO all expect path style.
    expect(fake.requests[0]!.path).toBe("/caresync-documents/2026/11/abc.pdf");
  });

  it("reports a missing object as absent rather than throwing", async () => {
    // The download path checks exists() before streaming, and a throw there
    // would be a 500 where the honest answer is "that file is gone".
    await expect(driver.exists("2026/11/never-written.pdf")).resolves.toBe(false);
  });

  it("reports a present object as present, with its size", async () => {
    await driver.put("2026/11/abc.pdf", Buffer.from("twelve bytes"));

    await expect(driver.exists("2026/11/abc.pdf")).resolves.toBe(true);
    await expect(driver.sizeOf("2026/11/abc.pdf")).resolves.toBe(12);
  });

  it("removes an object", async () => {
    await driver.put("2026/11/abc.pdf", Buffer.from("x"));
    await driver.remove("2026/11/abc.pdf");

    await expect(driver.exists("2026/11/abc.pdf")).resolves.toBe(false);
  });

  it("does not mistake a server failure for a missing file", async () => {
    // Pointed at a closed port: unreachable storage must not be reported as
    // an absent document, or a clinician is told the record does not exist.
    const unreachable = new S3StorageDriver({
      bucket: "caresync-documents",
      region: "eu-west-1",
      accessKeyId: "probe",
      secretAccessKey: "probe-secret",
      endpoint: "http://127.0.0.1:1",
    });

    await expect(unreachable.exists("2026/11/abc.pdf")).rejects.toBeDefined();
  });
});

describe("the key an upload is stored under", () => {
  it("keeps nothing from the uploader's filename but a safe extension", () => {
    const key = storageKeyFor("../../etc/passwd");

    expect(key).not.toContain("..");
    expect(key).not.toContain("passwd");
    expect(key).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}$/);
  });

  it("keeps an accepted extension and drops everything else", () => {
    expect(storageKeyFor("scan.PDF")).toMatch(/\.pdf$/);

    // .gz and .php are not on the accepted list, so the key carries no
    // extension at all rather than one a web server might act on.
    expect(storageKeyFor("report.tar.gz")).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}$/);
    expect(storageKeyFor("x.pdf;.php")).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}$/);
    expect(storageKeyFor("payload.php")).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}$/);
  });

  it("accepts exactly the extensions the upload endpoint does", () => {
    // Two lists in two modules, kept apart to avoid an import cycle. If a
    // mime type is added to ALLOWED_MIME and not here, its uploads would be
    // stored with no extension; if removed there and not here, this would go
    // on permitting it.
    const fromMime = new Set(Object.values(ALLOWED_MIME).flat());

    expect([...SAFE_EXTENSIONS].sort()).toEqual([...fromMime].sort());
  });

  it("lays keys out by year and month", () => {
    const now = new Date();
    const prefix = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/`;

    expect(storageKeyFor("scan.pdf").startsWith(prefix)).toBe(true);
  });
});
