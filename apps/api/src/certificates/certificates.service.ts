import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, issuedById: string, organizationId: string) {
    return this.prisma.medicalCertificate.create({
      data: {
        certificateNumber: `CERT-${genId()}`,
        type: data.type,
        status: "DRAFT",
        patientId: data.patientId ?? null,
        issuedById,
        organizationId,
        issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        daysOff: data.daysOff ? Number(data.daysOff) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        diagnosis: data.diagnosis ?? null,
        fittedForDuty: data.fittedForDuty ?? null,
        restrictions: data.restrictions ?? null,
        deceasedName: data.deceasedName ?? null,
        deathDate: data.deathDate ? new Date(data.deathDate) : null,
        causeOfDeath: data.causeOfDeath ?? null,
        placeOfDeath: data.placeOfDeath ?? null,
        notes: data.notes ?? null,
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        issuedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findAll(organizationId: string, filters: { type?: string; status?: string; patientId?: string }) {
    const where: any = { organizationId };
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.patientId) where.patientId = filters.patientId;

    return this.prisma.medicalCertificate.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        issuedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const record = await this.prisma.medicalCertificate.findFirst({
      where: { id, organizationId },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true } },
        issuedBy: { select: { firstName: true, lastName: true, specialization: true } },
      },
    });
    if (!record) throw new NotFoundException("Certificate not found");
    return record;
  }

  async issue(id: string, organizationId: string) {
    const record = await this.findOne(id, organizationId);
    if (record.status !== "DRAFT") throw new BadRequestException("Only DRAFT certificates can be issued");

    return this.prisma.medicalCertificate.update({
      where: { id },
      data: { status: "ISSUED" },
      include: { patient: { select: { firstName: true, lastName: true } }, issuedBy: { select: { firstName: true, lastName: true } } },
    });
  }

  async revoke(id: string, revokedReason: string, organizationId: string) {
    const record = await this.findOne(id, organizationId);
    if (record.status === "REVOKED") throw new BadRequestException("Certificate is already revoked");

    return this.prisma.medicalCertificate.update({
      where: { id },
      data: { status: "REVOKED", revokedAt: new Date(), revokedReason },
      include: { patient: { select: { firstName: true, lastName: true } }, issuedBy: { select: { firstName: true, lastName: true } } },
    });
  }

  async getSummary(organizationId: string) {
    const [total, issued, draft, revoked, sickLeave, fitnessToWork, deathCert] = await Promise.all([
      this.prisma.medicalCertificate.count({ where: { organizationId } }),
      this.prisma.medicalCertificate.count({ where: { organizationId, status: "ISSUED" } }),
      this.prisma.medicalCertificate.count({ where: { organizationId, status: "DRAFT" } }),
      this.prisma.medicalCertificate.count({ where: { organizationId, status: "REVOKED" } }),
      this.prisma.medicalCertificate.count({ where: { organizationId, type: "SICK_LEAVE" } }),
      this.prisma.medicalCertificate.count({ where: { organizationId, type: "FITNESS_TO_WORK" } }),
      this.prisma.medicalCertificate.count({ where: { organizationId, type: "DEATH_CERTIFICATE" } }),
    ]);
    return { total, issued, draft, revoked, sickLeave, fitnessToWork, deathCert };
  }
}
