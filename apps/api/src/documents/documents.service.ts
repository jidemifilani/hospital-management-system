import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { DocumentCategory, DocumentConfidentiality, Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "./storage.service";

const genDocNo = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

/**
 * What may be uploaded. An allowlist rather than a blocklist: the question is
 * what a hospital legitimately needs to store, and anything executable has no
 * business in a patient's record.
 */
export const ALLOWED_MIME: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/tiff": [".tif", ".tiff"],
  "application/dicom": [".dcm"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
};

export const MAX_BYTES = 25 * 1024 * 1024;

export interface UploadInput {
  title: string;
  description?: string;
  category?: DocumentCategory;
  confidentiality?: DocumentConfidentiality;
  patientId?: string;
  encounterId?: string;
  admissionId?: string;
  claimId?: string;
  supersedesId?: string;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /** Rejects anything the hospital has no reason to store, before it is written. */
  assertAcceptable(file: { mimetype: string; size: number; originalname: string }) {
    if (!file.size) throw new BadRequestException("The uploaded file is empty");

    if (file.size > MAX_BYTES) {
      throw new BadRequestException(
        `File is ${(file.size / 1024 / 1024).toFixed(1)}MB; the limit is ${MAX_BYTES / 1024 / 1024}MB`,
      );
    }

    const allowedExtensions = ALLOWED_MIME[file.mimetype];
    if (!allowedExtensions) {
      throw new BadRequestException(
        `${file.mimetype} files cannot be stored. Accepted: PDF, images, DICOM, Word, Excel, text.`,
      );
    }

    // A .exe announced as application/pdf is the obvious attack; requiring the
    // extension to match the declared type closes the easy version of it.
    const ext = file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `A ${file.mimetype} file should end in ${allowedExtensions.join(" or ")}, not "${ext}"`,
      );
    }
  }

  async upload(
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
    input: UploadInput,
    organizationId: string,
    staffId?: string | null,
  ) {
    this.assertAcceptable(file);

    if (!input.title?.trim()) throw new BadRequestException("A document needs a title");

    // Refuse to attach to something that does not exist, or the document is
    // filed against nothing and nobody will find it again.
    await this.assertOwnerExists(input, organizationId);

    let previous = null;
    if (input.supersedesId) {
      previous = await this.prisma.document.findFirst({
        where: { id: input.supersedesId, organizationId, deletedAt: null },
      });
      if (!previous) throw new NotFoundException("The document being replaced was not found");

      const alreadyReplaced = await this.prisma.document.findFirst({
        where: { supersedesId: input.supersedesId },
      });
      if (alreadyReplaced) {
        throw new BadRequestException(
          `That version was already replaced by ${alreadyReplaced.documentNumber}`,
        );
      }
    }

    const stored = await this.storage.save(file.buffer, file.originalname);

    try {
      return await this.prisma.document.create({
        data: {
          documentNumber: `DOC-${genDocNo()}`,
          title: input.title.trim(),
          description: input.description,
          category: input.category ?? "OTHER",
          confidentiality: input.confidentiality ?? "NORMAL",
          patientId: input.patientId ?? previous?.patientId,
          encounterId: input.encounterId ?? previous?.encounterId,
          admissionId: input.admissionId ?? previous?.admissionId,
          claimId: input.claimId ?? previous?.claimId,
          fileName: file.originalname,
          storageKey: stored.storageKey,
          mimeType: file.mimetype,
          sizeBytes: stored.sizeBytes,
          checksum: stored.checksum,
          version: previous ? previous.version + 1 : 1,
          supersedesId: input.supersedesId,
          uploadedById: staffId ?? undefined,
          organizationId,
        },
        include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
      });
    } catch (err) {
      // The bytes are already on disk; without this a failed write leaves an
      // orphan nothing will ever reference or clean up.
      await this.storage.discard(stored.storageKey);
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException("That document version already exists");
      }
      throw err;
    }
  }

  private async assertOwnerExists(input: UploadInput, organizationId: string) {
    const checks: Promise<unknown>[] = [];
    const missing: string[] = [];

    if (input.patientId) {
      checks.push(
        this.prisma.patient
          .findFirst({ where: { id: input.patientId, organizationId } })
          .then((r) => { if (!r) missing.push("patient"); }),
      );
    }
    if (input.encounterId) {
      checks.push(
        this.prisma.encounter
          .findFirst({ where: { id: input.encounterId, organizationId } })
          .then((r) => { if (!r) missing.push("encounter"); }),
      );
    }
    if (input.admissionId) {
      checks.push(
        this.prisma.admission
          .findFirst({ where: { id: input.admissionId, organizationId } })
          .then((r) => { if (!r) missing.push("admission"); }),
      );
    }
    if (input.claimId) {
      checks.push(
        this.prisma.insuranceClaim
          .findFirst({ where: { id: input.claimId, organizationId } })
          .then((r) => { if (!r) missing.push("claim"); }),
      );
    }

    await Promise.all(checks);
    if (missing.length) {
      throw new NotFoundException(`Cannot file this document: no such ${missing.join(", ")}`);
    }
  }

  async list(
    organizationId: string,
    filters: {
      patientId?: string;
      encounterId?: string;
      claimId?: string;
      category?: DocumentCategory;
      search?: string;
      includeDeleted?: boolean;
      canSeeRestricted?: boolean;
    } = {},
  ) {
    const docs = await this.prisma.document.findMany({
      where: {
        organizationId,
        ...(filters.includeDeleted ? {} : { deletedAt: null }),
        ...(filters.patientId && { patientId: filters.patientId }),
        ...(filters.encounterId && { encounterId: filters.encounterId }),
        ...(filters.claimId && { claimId: filters.claimId }),
        ...(filters.category && { category: filters.category }),
        ...(filters.search && {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" as const } },
            { fileName: { contains: filters.search, mode: "insensitive" as const } },
            { documentNumber: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }),
        // Only the current version of anything is listed; older ones are
        // reachable through the version history of the document that replaced
        // them, so a chart is not cluttered with superseded consent forms.
        supersededBy: null,
        ...(filters.canSeeRestricted ? {} : { confidentiality: "NORMAL" as const }),
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    return docs;
  }

  /**
   * Fetches a document for download.
   *
   * Confidentiality is enforced here rather than in the controller because
   * this is the only path to the bytes, and a restricted record leaking is not
   * recoverable by any later fix.
   */
  async forDownload(id: string, organizationId: string, canSeeRestricted: boolean) {
    const doc = await this.prisma.document.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException("Document not found");

    if (doc.confidentiality === "RESTRICTED" && !canSeeRestricted) {
      throw new ForbiddenException("This document is restricted");
    }

    if (!this.storage.exists(doc.storageKey)) {
      // The row says the file is there and it is not. Saying so is better than
      // streaming nothing and letting the browser show an empty page.
      this.logger.error(`Document ${doc.documentNumber} has no file at ${doc.storageKey}`);
      throw new NotFoundException("The stored file for this document is missing");
    }

    return doc;
  }

  stream(storageKey: string) {
    return this.storage.stream(storageKey);
  }

  /** History of a document, newest first, following the supersedes chain. */
  async versions(id: string, organizationId: string) {
    const chain = [];
    let current = await this.prisma.document.findFirst({
      where: { id, organizationId },
      include: { uploadedBy: { select: { firstName: true, lastName: true } } },
    });
    if (!current) throw new NotFoundException("Document not found");

    while (current) {
      chain.push(current);
      if (!current.supersedesId) break;
      current = await this.prisma.document.findFirst({
        where: { id: current.supersedesId, organizationId },
        include: { uploadedBy: { select: { firstName: true, lastName: true } } },
      });
    }
    return chain;
  }

  /**
   * Soft delete. Clinical records are not removed: a document that informed
   * someone's care has to remain producible for an investigation or a claim,
   * so this hides it and records who hid it and why.
   */
  async remove(id: string, reason: string, organizationId: string, staffId?: string | null) {
    if (!reason?.trim()) throw new BadRequestException("Removing a document needs a reason");

    const doc = await this.prisma.document.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!doc) throw new NotFoundException("Document not found");

    return this.prisma.document.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: staffId ?? undefined,
        deleteReason: reason.trim(),
      },
    });
  }

  async summary(organizationId: string) {
    const [total, byCategory, deleted, restricted] = await Promise.all([
      this.prisma.document.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.document.groupBy({
        by: ["category"],
        where: { organizationId, deletedAt: null },
        _count: { _all: true },
        _sum: { sizeBytes: true },
      }),
      this.prisma.document.count({ where: { organizationId, deletedAt: { not: null } } }),
      this.prisma.document.count({
        where: { organizationId, deletedAt: null, confidentiality: "RESTRICTED" },
      }),
    ]);

    return {
      total,
      deleted,
      restricted,
      totalBytes: byCategory.reduce((a, c) => a + (c._sum.sizeBytes ?? 0), 0),
      byCategory: byCategory.map((c) => ({
        category: c.category,
        count: c._count._all,
        bytes: c._sum.sizeBytes ?? 0,
      })),
    };
  }
}
