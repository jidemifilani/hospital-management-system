import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);

const include = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
  requestedBy: {
    select: {
      id: true, firstName: true, lastName: true,
      user: { select: { role: true } },
    },
  },
} as const;

@Injectable()
export class ConsentService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, staffId: string, organizationId: string) {
    return this.prisma.consentForm.create({
      data: {
        consentNumber: `CST-${nanoid()}`,
        organizationId,
        patientId: data.patientId,
        procedureName: data.procedureName,
        consentType: data.consentType ?? "GENERAL",
        consentText: data.consentText,
        requestedById: staffId,
        notes: data.notes,
      },
      include,
    });
  }

  async findAll(q: any, organizationId: string) {
    const where: any = { organizationId };
    if (q.patientId) where.patientId = q.patientId;
    if (q.status) where.status = q.status;
    if (q.consentType) where.consentType = q.consentType;
    return this.prisma.consentForm.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const record = await this.prisma.consentForm.findFirst({ where: { id, organizationId }, include });
    if (!record) throw new NotFoundException("Consent form not found");
    return record;
  }

  async sign(id: string, data: any, organizationId: string) {
    const record = await this.findOne(id, organizationId);
    if (record.status !== "PENDING") throw new BadRequestException("Consent is not pending");
    return this.prisma.consentForm.update({
      where: { id },
      data: {
        status: "SIGNED",
        signedAt: new Date(),
        witnessName: data.witnessName,
        witnessRelation: data.witnessRelation,
      },
      include,
    });
  }

  async revoke(id: string, data: any, organizationId: string) {
    const record = await this.findOne(id, organizationId);
    if (record.status === "REVOKED") throw new BadRequestException("Already revoked");
    return this.prisma.consentForm.update({
      where: { id },
      data: { status: "REVOKED", revokedAt: new Date(), revokedReason: data.reason },
      include,
    });
  }

  async updateStatus(id: string, data: any, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.consentForm.update({ where: { id }, data: { status: data.status }, include });
  }

  async getSummary(organizationId: string) {
    const [pending, signed, declined, revoked, surgical, anaesthesia] = await Promise.all([
      this.prisma.consentForm.count({ where: { organizationId, status: "PENDING" } }),
      this.prisma.consentForm.count({ where: { organizationId, status: "SIGNED" } }),
      this.prisma.consentForm.count({ where: { organizationId, status: "DECLINED" } }),
      this.prisma.consentForm.count({ where: { organizationId, status: "REVOKED" } }),
      this.prisma.consentForm.count({ where: { organizationId, consentType: "SURGICAL", status: { not: "REVOKED" } } }),
      this.prisma.consentForm.count({ where: { organizationId, consentType: "ANAESTHESIA", status: { not: "REVOKED" } } }),
    ]);
    return { pending, signed, declined, revoked, surgical, anaesthesia, total: pending + signed + declined + revoked };
  }
}
