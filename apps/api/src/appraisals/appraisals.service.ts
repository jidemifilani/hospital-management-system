import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";
import { Decimal } from "@prisma/client/runtime/library";

const genId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

@Injectable()
export class AppraisalsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, organizationId: string) {
    const existing = await this.prisma.staffAppraisal.findFirst({
      where: { staffId: data.staffId, period: data.period, year: Number(data.year), quarter: data.quarter ? Number(data.quarter) : null },
    }).catch(() => null);
    if (existing) throw new ConflictException("Appraisal already exists for this period");

    return this.prisma.staffAppraisal.create({
      data: {
        appraisalNumber: `APR-${genId()}`,
        staffId: data.staffId,
        reviewedById: data.reviewedById,
        organizationId,
        period: data.period,
        year: Number(data.year),
        quarter: data.quarter ? Number(data.quarter) : null,
        goals: data.goals ?? null,
        staffComments: data.staffComments ?? null,
        reviewerComments: data.reviewerComments ?? null,
      },
      include: {
        staff: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
        reviewedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findAll(organizationId: string, filters: { staffId?: string; status?: string; year?: number }) {
    const where: any = { organizationId };
    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.status) where.status = filters.status;
    if (filters.year) where.year = Number(filters.year);

    return this.prisma.staffAppraisal.findMany({
      where,
      include: {
        staff: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
        reviewedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const record = await this.prisma.staffAppraisal.findFirst({
      where: { id, organizationId },
      include: {
        staff: { select: { firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } } },
        reviewedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!record) throw new NotFoundException("Appraisal not found");
    return record;
  }

  async update(id: string, data: any, organizationId: string) {
    await this.findOne(id, organizationId);

    const scores = ["attendanceScore", "performanceScore", "teamworkScore", "initiativeScore"];
    const scoreValues: Record<string, Decimal | null> = {};
    for (const s of scores) {
      scoreValues[s] = data[s] != null ? new Decimal(data[s]) : undefined as any;
    }

    // Calc overall as average of provided scores
    const provided = scores.filter((s) => data[s] != null).map((s) => Number(data[s]));
    const overallScore = provided.length > 0 ? new Decimal(provided.reduce((a, b) => a + b, 0) / provided.length) : undefined;

    return this.prisma.staffAppraisal.update({
      where: { id },
      data: {
        ...scoreValues,
        overallScore,
        strengths: data.strengths ?? undefined,
        improvements: data.improvements ?? undefined,
        goals: data.goals ?? undefined,
        staffComments: data.staffComments ?? undefined,
        reviewerComments: data.reviewerComments ?? undefined,
      },
      include: {
        staff: { select: { firstName: true, lastName: true } },
        reviewedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async updateStatus(id: string, status: string, organizationId: string) {
    const record = await this.findOne(id, organizationId);
    const transitions: Record<string, string[]> = {
      DRAFT: ["SUBMITTED"],
      SUBMITTED: ["REVIEWED"],
      REVIEWED: ["FINALIZED"],
    };
    if (!transitions[record.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${record.status} to ${status}`);
    }

    return this.prisma.staffAppraisal.update({
      where: { id },
      data: {
        status: status as any,
        submittedAt: status === "SUBMITTED" ? new Date() : undefined,
        reviewedAt: status === "REVIEWED" ? new Date() : undefined,
        finalizedAt: status === "FINALIZED" ? new Date() : undefined,
      },
      include: {
        staff: { select: { firstName: true, lastName: true } },
        reviewedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async getSummary(organizationId: string, year?: number) {
    const where: any = { organizationId };
    if (year) where.year = Number(year);
    else where.year = new Date().getFullYear();

    const [draft, submitted, reviewed, finalized] = await Promise.all([
      this.prisma.staffAppraisal.count({ where: { ...where, status: "DRAFT" } }),
      this.prisma.staffAppraisal.count({ where: { ...where, status: "SUBMITTED" } }),
      this.prisma.staffAppraisal.count({ where: { ...where, status: "REVIEWED" } }),
      this.prisma.staffAppraisal.count({ where: { ...where, status: "FINALIZED" } }),
    ]);

    const withScores = await this.prisma.staffAppraisal.findMany({
      where: { ...where, overallScore: { not: null } },
      select: { overallScore: true },
    });
    const avgScore = withScores.length > 0
      ? withScores.reduce((s, a) => s + Number(a.overallScore), 0) / withScores.length
      : null;

    return { draft, submitted, reviewed, finalized, total: draft + submitted + reviewed + finalized, avgScore: avgScore ? Number(avgScore.toFixed(2)) : null };
  }
}
