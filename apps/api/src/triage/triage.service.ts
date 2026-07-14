import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genNum = customAlphabet("0123456789", 6);

const INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, gender: true } },
  triageNurse: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class TriageService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    patientId?: string; walkinName?: string; walkinPhone?: string;
    chiefComplaint: string; triageLevel: string;
    systolicBP?: number; diastolicBP?: number; heartRate?: number;
    temperature?: number; oxygenSaturation?: number; respiratoryRate?: number;
    painScore?: number; glasgowComaScale?: number; notes?: string;
  }, triageNurseId: string | undefined, organizationId: string) {
    return this.prisma.triageRecord.create({
      data: {
        triageNumber: `TRG-${genNum()}`,
        patientId: data.patientId,
        walkinName: data.walkinName,
        walkinPhone: data.walkinPhone,
        chiefComplaint: data.chiefComplaint,
        triageLevel: data.triageLevel as any,
        systolicBP: data.systolicBP,
        diastolicBP: data.diastolicBP,
        heartRate: data.heartRate,
        temperature: data.temperature,
        oxygenSaturation: data.oxygenSaturation,
        respiratoryRate: data.respiratoryRate,
        painScore: data.painScore,
        glasgowComaScale: data.glasgowComaScale,
        notes: data.notes,
        triageNurseId,
        assessedAt: new Date(),
        organizationId,
      },
      include: INCLUDE,
    });
  }

  async findAll(organizationId: string, status?: string, triageLevel?: string, date?: string) {
    const where: any = { organizationId };
    if (status) where.status = status;
    if (triageLevel) where.triageLevel = triageLevel;
    if (date) {
      const d = new Date(date);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      where.createdAt = { gte: d, lt: next };
    } else {
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
      where.createdAt = { gte: dayStart };
    }
    return this.prisma.triageRecord.findMany({
      where,
      include: INCLUDE,
      orderBy: [
        { triageLevel: "asc" },
        { createdAt: "asc" },
      ],
    });
  }

  async findOne(id: string, organizationId: string) {
    const record = await this.prisma.triageRecord.findFirst({ where: { id, organizationId }, include: INCLUDE });
    if (!record) throw new NotFoundException("Triage record not found");
    return record;
  }

  async updateStatus(id: string, data: { status: string; disposition?: string; notes?: string }, organizationId: string) {
    const record = await this.prisma.triageRecord.findFirst({ where: { id, organizationId } });
    if (!record) throw new NotFoundException("Triage record not found");
    return this.prisma.triageRecord.update({
      where: { id },
      data: {
        status: data.status as any,
        ...(data.disposition ? { disposition: data.disposition } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      },
      include: INCLUDE,
    });
  }

  async getSummary(organizationId: string) {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const [waiting, inAssessment, immediate, emergent, urgent, todayTotal] = await Promise.all([
      this.prisma.triageRecord.count({ where: { organizationId, status: "WAITING", createdAt: { gte: dayStart } } }),
      this.prisma.triageRecord.count({ where: { organizationId, status: "IN_ASSESSMENT", createdAt: { gte: dayStart } } }),
      this.prisma.triageRecord.count({ where: { organizationId, triageLevel: "IMMEDIATE", createdAt: { gte: dayStart } } }),
      this.prisma.triageRecord.count({ where: { organizationId, triageLevel: "EMERGENT", createdAt: { gte: dayStart } } }),
      this.prisma.triageRecord.count({ where: { organizationId, triageLevel: "URGENT", createdAt: { gte: dayStart } } }),
      this.prisma.triageRecord.count({ where: { organizationId, createdAt: { gte: dayStart } } }),
    ]);
    return { waiting, inAssessment, immediate, emergent, urgent, todayTotal };
  }
}
