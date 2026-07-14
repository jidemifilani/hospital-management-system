import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, organizationId: string) {
    return this.prisma.trainingRecord.create({
      data: {
        trainingNumber: `TRN-${genId()}`,
        organizationId,
        staffId: data.staffId,
        title: data.title,
        provider: data.provider ?? null,
        category: data.category,
        type: data.type ?? "ELECTIVE",
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        notes: data.notes ?? null,
      },
      include: {
        staff: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
      },
    });
  }

  async findAll(q: any, organizationId: string) {
    const where: any = { organizationId };
    if (q.staffId) where.staffId = q.staffId;
    if (q.status) where.status = q.status;
    if (q.category) where.category = q.category;
    if (q.type) where.type = q.type;

    return this.prisma.trainingRecord.findMany({
      where,
      include: {
        staff: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
      },
      orderBy: { startDate: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const record = await this.prisma.trainingRecord.findFirst({
      where: { id, organizationId },
      include: {
        staff: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
      },
    });
    if (!record) throw new NotFoundException("Training record not found");
    return record;
  }

  async complete(id: string, data: any, organizationId: string) {
    const record = await this.prisma.trainingRecord.findFirst({ where: { id, organizationId } });
    if (!record) throw new NotFoundException("Training record not found");

    return this.prisma.trainingRecord.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        score: data.score != null ? data.score : null,
        certificationNumber: data.certificationNumber ?? null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        notes: data.notes ?? record.notes,
      },
      include: {
        staff: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
      },
    });
  }

  async updateStatus(id: string, status: string, organizationId: string) {
    const record = await this.prisma.trainingRecord.findFirst({ where: { id, organizationId } });
    if (!record) throw new NotFoundException("Training record not found");

    return this.prisma.trainingRecord.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async getSummary(organizationId: string) {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [scheduled, inProgress, completed, expired, cancelled, mandatory, expiringCerts] = await Promise.all([
      this.prisma.trainingRecord.count({ where: { organizationId, status: "SCHEDULED" } }),
      this.prisma.trainingRecord.count({ where: { organizationId, status: "IN_PROGRESS" } }),
      this.prisma.trainingRecord.count({ where: { organizationId, status: "COMPLETED" } }),
      this.prisma.trainingRecord.count({ where: { organizationId, status: "EXPIRED" } }),
      this.prisma.trainingRecord.count({ where: { organizationId, status: "CANCELLED" } }),
      this.prisma.trainingRecord.count({ where: { organizationId, type: "MANDATORY", status: { not: "COMPLETED" } } }),
      this.prisma.trainingRecord.count({ where: { organizationId, status: "COMPLETED", expiryDate: { gte: now, lte: thirtyDaysLater } } }),
    ]);

    return { scheduled, inProgress, completed, expired, cancelled, mandatory, expiringCerts, total: scheduled + inProgress + completed + expired };
  }
}
