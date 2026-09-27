import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);

const include = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
  attendingDoctor: {
    select: {
      id: true, firstName: true, lastName: true,
      user: { select: { role: true } },
    },
  },
  nurse: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class WardRoundsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, staffId: string, organizationId: string) {
    return this.prisma.wardRound.create({
      data: {
        roundNumber: `WRD-${nanoid()}`,
        organizationId,
        patientId: data.patientId,
        bedId: data.bedId,
        attendingDoctorId: staffId,
        nurseId: data.nurseId,
        roundDate: data.roundDate ? new Date(data.roundDate) : new Date(),
        chiefComplaint: data.chiefComplaint,
        findings: data.findings,
        assessment: data.assessment,
        plan: data.plan,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
        notes: data.notes,
      },
      include,
    });
  }

  async findAll(q: any, organizationId: string) {
    const where: any = { organizationId };
    if (q.patientId) where.patientId = q.patientId;
    if (q.status) where.status = q.status;
    if (q.date) {
      const d = new Date(q.date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      where.roundDate = { gte: start, lte: end };
    }
    return this.prisma.wardRound.findMany({
      where,
      include,
      orderBy: { roundDate: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const record = await this.prisma.wardRound.findFirst({ where: { id, organizationId }, include });
    if (!record) throw new NotFoundException("Ward round not found");
    return record;
  }

  async update(id: string, data: any, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.wardRound.update({
      where: { id },
      data: {
        chiefComplaint: data.chiefComplaint,
        findings: data.findings,
        assessment: data.assessment,
        plan: data.plan,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
        notes: data.notes,
        status: data.status,
      },
      include,
    });
  }

  async complete(id: string, data: any, organizationId: string) {
    const record = await this.findOne(id, organizationId);
    if (record.status === "COMPLETED") throw new BadRequestException("Already completed");
    return this.prisma.wardRound.update({
      where: { id },
      data: {
        status: "COMPLETED",
        findings: data.findings ?? record.findings,
        assessment: data.assessment ?? record.assessment,
        plan: data.plan ?? record.plan,
        notes: data.notes ?? record.notes,
      },
      include,
    });
  }

  async getSummary(organizationId: string) {
    const today = new Date();
    const start = new Date(today); start.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setHours(23, 59, 59, 999);

    const [pending, inProgress, completed, todayTotal] = await Promise.all([
      this.prisma.wardRound.count({ where: { organizationId, status: "PENDING" } }),
      this.prisma.wardRound.count({ where: { organizationId, status: "IN_PROGRESS" } }),
      this.prisma.wardRound.count({ where: { organizationId, status: "COMPLETED", roundDate: { gte: start, lte: end } } }),
      this.prisma.wardRound.count({ where: { organizationId, roundDate: { gte: start, lte: end } } }),
    ]);
    return { pending, inProgress, completed, todayTotal };
  }
}
