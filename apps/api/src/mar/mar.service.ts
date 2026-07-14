import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

@Injectable()
export class MarService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, organizationId: string) {
    return this.prisma.mARRecord.create({
      data: {
        marNumber: `MAR-${genId()}`,
        organizationId,
        patientId: data.patientId,
        prescriptionId: data.prescriptionId ?? null,
        medicationName: data.medicationName,
        dose: data.dose,
        route: data.route,
        scheduledTime: new Date(data.scheduledTime),
        notes: data.notes ?? null,
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        administeredBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findAll(q: any, organizationId: string) {
    const where: any = { organizationId };
    if (q.patientId) where.patientId = q.patientId;
    if (q.status) where.status = q.status;
    if (q.date) {
      const d = new Date(q.date);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      where.scheduledTime = { gte: start, lte: end };
    } else {
      const now = new Date();
      const start = new Date(now.setHours(0, 0, 0, 0));
      const end = new Date(now.setHours(23, 59, 59, 999));
      where.scheduledTime = { gte: start, lte: end };
    }

    return this.prisma.mARRecord.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        administeredBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledTime: "asc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const record = await this.prisma.mARRecord.findFirst({
      where: { id, organizationId },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        administeredBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!record) throw new NotFoundException("MAR record not found");
    return record;
  }

  async administer(id: string, staffId: string, data: any, organizationId: string) {
    const record = await this.prisma.mARRecord.findFirst({ where: { id, organizationId } });
    if (!record) throw new NotFoundException("MAR record not found");
    if (record.status === "ADMINISTERED") throw new BadRequestException("Already administered");

    return this.prisma.mARRecord.update({
      where: { id },
      data: {
        status: "ADMINISTERED",
        administeredAt: new Date(),
        administeredById: staffId,
        notes: data.notes ?? record.notes,
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        administeredBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async skip(id: string, data: any, organizationId: string) {
    const record = await this.prisma.mARRecord.findFirst({ where: { id, organizationId } });
    if (!record) throw new NotFoundException("MAR record not found");
    if (!["SCHEDULED", "HELD"].includes(record.status)) {
      throw new BadRequestException("Record cannot be skipped in current status");
    }

    return this.prisma.mARRecord.update({
      where: { id },
      data: { status: data.status ?? "SKIPPED", reasonSkipped: data.reason ?? null },
    });
  }

  async getSummary(patientId: string | undefined, organizationId: string) {
    const now = new Date();
    const start = new Date(now.setHours(0, 0, 0, 0));
    const end = new Date(now.setHours(23, 59, 59, 999));
    const where: any = { organizationId, scheduledTime: { gte: start, lte: end } };
    if (patientId) where.patientId = patientId;

    const [scheduled, administered, skipped, refused, held] = await Promise.all([
      this.prisma.mARRecord.count({ where: { ...where, status: "SCHEDULED" } }),
      this.prisma.mARRecord.count({ where: { ...where, status: "ADMINISTERED" } }),
      this.prisma.mARRecord.count({ where: { ...where, status: "SKIPPED" } }),
      this.prisma.mARRecord.count({ where: { ...where, status: "REFUSED" } }),
      this.prisma.mARRecord.count({ where: { ...where, status: "HELD" } }),
    ]);

    return { scheduled, administered, skipped, refused, held, total: scheduled + administered + skipped + refused + held };
  }
}
