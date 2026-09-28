import { BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { DocumentsService, MAX_BYTES } from "./documents.service";

/**
 * Documents attached to a patient are protected health information, so the
 * tests here are mostly about what must be refused: the wrong kind of file,
 * a restricted record reaching someone without the permission for it, and a
 * clinical record being destroyed rather than hidden.
 */

function build(opts: { exists?: boolean; restricted?: boolean; doc?: any } = {}) {
  const saved: { key: string }[] = [];
  const discarded: string[] = [];
  let created: any = null;
  let updated: any = null;

  const storage = {
    save: jest.fn().mockImplementation((buf: Buffer) => {
      const key = "2026/09/generated-key.pdf";
      saved.push({ key });
      return Promise.resolve({ storageKey: key, checksum: "abc123", sizeBytes: buf.length });
    }),
    exists: jest.fn().mockReturnValue(opts.exists ?? true),
    discard: jest.fn().mockImplementation((k: string) => {
      discarded.push(k);
      return Promise.resolve();
    }),
    stream: jest.fn(),
  } as any;

  const doc = opts.doc ?? {
    id: "doc-1",
    documentNumber: "DOC-TEST",
    storageKey: "2026/09/x.pdf",
    confidentiality: opts.restricted ? "RESTRICTED" : "NORMAL",
    version: 1,
    patientId: "pat-1",
  };

  const prisma = {
    patient: { findFirst: jest.fn().mockResolvedValue({ id: "pat-1" }) },
    encounter: { findFirst: jest.fn().mockResolvedValue({ id: "enc-1" }) },
    admission: { findFirst: jest.fn().mockResolvedValue({ id: "adm-1" }) },
    insuranceClaim: { findFirst: jest.fn().mockResolvedValue({ id: "clm-1" }) },
    document: {
      findFirst: jest.fn().mockResolvedValue(doc),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => {
        created = data;
        return Promise.resolve({ id: "new-doc", ...data });
      }),
      update: jest.fn().mockImplementation(({ data }) => {
        updated = data;
        return Promise.resolve({ id: "doc-1", ...data });
      }),
    },
  } as any;

  const service = new DocumentsService(prisma, storage);
  return {
    service, prisma, storage, saved, discarded,
    get created() { return created; },
    get updated() { return updated; },
  };
}

const ORG = "org-1";
const pdf = (over: Partial<{ mimetype: string; size: number; originalname: string }> = {}) => ({
  buffer: Buffer.from("x".repeat(over.size ?? 1000)),
  mimetype: over.mimetype ?? "application/pdf",
  size: over.size ?? 1000,
  originalname: over.originalname ?? "consent.pdf",
});

describe("DocumentsService upload rules", () => {
  it("accepts an ordinary PDF and records its checksum", async () => {
    const ctx = build();

    await ctx.service.upload(pdf(), { title: "Consent form", patientId: "pat-1" }, ORG, "staff-1");

    expect(ctx.created.checksum).toBe("abc123");
    // The key is the server's, never the uploader's filename.
    expect(ctx.created.storageKey).not.toContain("consent.pdf");
    expect(ctx.created.fileName).toBe("consent.pdf");
  });

  it("refuses a file type a hospital has no reason to store", async () => {
    const ctx = build();

    await expect(
      ctx.service.upload(
        pdf({ mimetype: "application/x-msdownload", originalname: "tool.exe" }),
        { title: "Tool" }, ORG,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuses an executable dressed up as a PDF", async () => {
    const ctx = build();

    // Declaring application/pdf while ending in .exe is the obvious attack.
    await expect(
      ctx.service.upload(
        pdf({ mimetype: "application/pdf", originalname: "payload.exe" }),
        { title: "Results" }, ORG,
      ),
    ).rejects.toThrow(/should end in/i);
  });

  it("refuses a file over the size limit", async () => {
    const ctx = build();

    await expect(
      ctx.service.upload(
        { ...pdf(), size: MAX_BYTES + 1 },
        { title: "Huge scan" }, ORG,
      ),
    ).rejects.toThrow(/limit is/i);
  });

  it("refuses an empty file", async () => {
    const ctx = build();

    await expect(
      ctx.service.upload({ ...pdf(), size: 0 }, { title: "Nothing" }, ORG),
    ).rejects.toThrow(/empty/i);
  });

  it("refuses to file a document against a patient that does not exist", async () => {
    const ctx = build();
    ctx.prisma.patient.findFirst.mockResolvedValue(null);

    await expect(
      ctx.service.upload(pdf(), { title: "Orphan", patientId: "nope" }, ORG),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("removes the stored bytes when the database write fails", async () => {
    const ctx = build();
    ctx.prisma.document.create.mockRejectedValue(new Error("db down"));

    await expect(
      ctx.service.upload(pdf(), { title: "Doomed", patientId: "pat-1" }, ORG),
    ).rejects.toThrow("db down");

    // Otherwise the file sits on disk for ever with nothing referencing it.
    expect(ctx.discarded).toHaveLength(1);
  });
});

describe("DocumentsService versioning", () => {
  it("bumps the version and inherits what the old one was filed against", async () => {
    const ctx = build({
      doc: {
        id: "doc-1", version: 2, patientId: "pat-9", encounterId: "enc-9",
        confidentiality: "NORMAL", storageKey: "k", documentNumber: "DOC-OLD",
      },
    });
    // No document already supersedes this one.
    ctx.prisma.document.findFirst
      .mockResolvedValueOnce({
        id: "doc-1", version: 2, patientId: "pat-9", encounterId: "enc-9",
        confidentiality: "NORMAL", storageKey: "k", documentNumber: "DOC-OLD",
      })
      .mockResolvedValueOnce(null);

    await ctx.service.upload(pdf(), { title: "Consent v3", supersedesId: "doc-1" }, ORG);

    expect(ctx.created.version).toBe(3);
    expect(ctx.created.patientId).toBe("pat-9");
    expect(ctx.created.supersedesId).toBe("doc-1");
  });

  it("refuses to replace a version that was already replaced", async () => {
    const ctx = build();
    ctx.prisma.document.findFirst
      .mockResolvedValueOnce({ id: "doc-1", version: 1, confidentiality: "NORMAL" })
      .mockResolvedValueOnce({ id: "doc-2", documentNumber: "DOC-NEWER" });

    // Two people replacing the same version would leave a forked history.
    await expect(
      ctx.service.upload(pdf(), { title: "Conflicting", supersedesId: "doc-1" }, ORG),
    ).rejects.toThrow(/already replaced/i);
  });
});

describe("DocumentsService access control", () => {
  it("lets an ordinary reader download a normal document", async () => {
    const ctx = build();
    await expect(ctx.service.forDownload("doc-1", ORG, false)).resolves.toBeTruthy();
  });

  it("refuses a restricted document to someone without the permission", async () => {
    const ctx = build({ restricted: true });

    await expect(ctx.service.forDownload("doc-1", ORG, false)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("allows a restricted document to someone who holds the permission", async () => {
    const ctx = build({ restricted: true });
    await expect(ctx.service.forDownload("doc-1", ORG, true)).resolves.toBeTruthy();
  });

  it("says so when the row exists but the file is gone", async () => {
    const ctx = build({ exists: false });

    // Streaming nothing would show an empty page and look like a browser fault.
    await expect(ctx.service.forDownload("doc-1", ORG, true)).rejects.toThrow(/missing/i);
  });

  it("hides restricted documents from a listing when the reader lacks the permission", async () => {
    const ctx = build();

    await ctx.service.list(ORG, { canSeeRestricted: false });

    const where = ctx.prisma.document.findMany.mock.calls[0][0].where;
    expect(where.confidentiality).toBe("NORMAL");
  });

  it("shows every confidentiality when the reader holds the permission", async () => {
    const ctx = build();

    await ctx.service.list(ORG, { canSeeRestricted: true });

    const where = ctx.prisma.document.findMany.mock.calls[0][0].where;
    expect(where.confidentiality).toBeUndefined();
  });
});

describe("DocumentsService removal", () => {
  it("hides a document rather than destroying it, and records why", async () => {
    const ctx = build();

    await ctx.service.remove("doc-1", "Filed against the wrong patient", ORG, "staff-2");

    // A record that informed someone's care must remain producible.
    expect(ctx.updated.deletedAt).toBeInstanceOf(Date);
    expect(ctx.updated.deleteReason).toBe("Filed against the wrong patient");
    expect(ctx.updated.deletedById).toBe("staff-2");
  });

  it("refuses to remove a document with no reason given", async () => {
    const ctx = build();

    await expect(ctx.service.remove("doc-1", "   ", ORG)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
