import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

const include = {
  patient: { select: { firstName: true, lastName: true, mrn: true } },
  therapist: { select: { firstName: true, lastName: true, department: { select: { name: true } } } },
};

@Injectable()
export class RehabService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, organizationId: string) {
    return this.prisma.rehabSession.create({
      data: {
        sessionNumber: `RHB-${genId()}`,
        organizationId,
        patientId: data.patientId,
        therapistId: data.therapistId,
        type: data.type,
        scheduledAt: new Date(data.scheduledAt),
        goals: data.goals ?? null,
      },
      include,
    });
  }

  async findAll(q: any, organizationId: string) {
    const where: any = { organizationId };
    if (q.patientId) where.patientId = q.patientId;
    if (q.therapistId) where.therapistId = q.therapistId;
    if (q.status) where.status = q.status;
    if (q.type) where.type = q.type;
    if (q.date) {
      const d = new Date(q.date);
      where.scheduledAt = { gte: new Date(d.setHours(0, 0, 0, 0)), lte: new Date(d.setHours(23, 59, 59, 999)) };
    }

    return this.prisma.rehabSession.findMany({
      where,
      include,
      orderBy: { scheduledAt: "asc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const s = await this.prisma.rehabSession.findFirst({ where: { id, organizationId }, include });
    if (!s) throw new NotFoundException("Session not found");
    return s;
  }

  async start(id: string, organizationId: string) {
    const s = await this.prisma.rehabSession.findFirst({ where: { id, organizationId } });
    if (!s) throw new NotFoundException("Session not found");
    return this.prisma.rehabSession.update({
      where: { id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
      include,
    });
  }

  async complete(id: string, data: any, organizationId: string) {
    const s = await this.prisma.rehabSession.findFirst({ where: { id, organizationId } });
    if (!s) throw new NotFoundException("Session not found");
    return this.prisma.rehabSession.update({
      where: { id },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
        sessionNotes: data.sessionNotes ?? null,
        progressNotes: data.progressNotes ?? null,
        functionalScore: data.functionalScore != null ? data.functionalScore : null,
      },
      include,
    });
  }

  async updateStatus(id: string, status: string, organizationId: string) {
    const s = await this.prisma.rehabSession.findFirst({ where: { id, organizationId } });
    if (!s) throw new NotFoundException("Session not found");
    return this.prisma.rehabSession.update({ where: { id }, data: { status: status as any }, include });
  }

  async getSummary(organizationId: string) {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));

    const [scheduled, inProgress, completedToday, total, noShow] = await Promise.all([
      this.prisma.rehabSession.count({ where: { organizationId, status: "SCHEDULED" } }),
      this.prisma.rehabSession.count({ where: { organizationId, status: "IN_PROGRESS" } }),
      this.prisma.rehabSession.count({ where: { organizationId, status: "COMPLETED", endedAt: { gte: start, lte: end } } }),
      this.prisma.rehabSession.count({ where: { organizationId, scheduledAt: { gte: start, lte: end } } }),
      this.prisma.rehabSession.count({ where: { organizationId, status: "NO_SHOW" } }),
    ]);
    return { scheduled, inProgress, completedToday, total, noShow };
  }
}
