import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, organizationId: string) {
    if (data.rating < 1 || data.rating > 5) throw new BadRequestException("Rating must be between 1 and 5");

    return this.prisma.patientFeedback.create({
      data: {
        feedbackNumber: `FB-${genId()}`,
        patientId: data.patientId ?? null,
        organizationId,
        category: data.category ?? "GENERAL",
        rating: Number(data.rating),
        title: data.title ?? null,
        message: data.message,
        isAnonymous: data.isAnonymous ?? false,
      },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
  }

  async findAll(organizationId: string, filters: { category?: string; status?: string; rating?: number }) {
    const where: any = { organizationId };
    if (filters.category) where.category = filters.category;
    if (filters.status) where.status = filters.status;
    if (filters.rating) where.rating = Number(filters.rating);

    return this.prisma.patientFeedback.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true } },
        respondedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const record = await this.prisma.patientFeedback.findFirst({
      where: { id, organizationId },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        respondedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!record) throw new NotFoundException("Feedback not found");
    return record;
  }

  async respond(id: string, data: { response: string; status: string }, respondedById: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.patientFeedback.update({
      where: { id },
      data: {
        response: data.response,
        status: (data.status ?? "ACKNOWLEDGED") as any,
        respondedById,
        respondedAt: new Date(),
      },
      include: { patient: { select: { firstName: true, lastName: true } }, respondedBy: { select: { firstName: true, lastName: true } } },
    });
  }

  async getSummary(organizationId: string) {
    const [total, submitted, acknowledged, resolved] = await Promise.all([
      this.prisma.patientFeedback.count({ where: { organizationId } }),
      this.prisma.patientFeedback.count({ where: { organizationId, status: "SUBMITTED" } }),
      this.prisma.patientFeedback.count({ where: { organizationId, status: "ACKNOWLEDGED" } }),
      this.prisma.patientFeedback.count({ where: { organizationId, status: "RESOLVED" } }),
    ]);

    const all = await this.prisma.patientFeedback.findMany({ where: { organizationId }, select: { rating: true, category: true } });
    const avgRating = all.length > 0 ? Number((all.reduce((s, f) => s + f.rating, 0) / all.length).toFixed(1)) : null;

    const byCategory: Record<string, number> = {};
    for (const f of all) {
      byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
    }

    const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const f of all) ratingDist[f.rating] = (ratingDist[f.rating] ?? 0) + 1;

    return { total, submitted, acknowledged, resolved, avgRating, byCategory, ratingDist };
  }
}
