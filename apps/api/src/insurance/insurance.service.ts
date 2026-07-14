import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genClaim = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

const INCLUDE = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true, hmoProvider: true, hmoNumber: true } },
  invoice: { select: { id: true, invoiceNumber: true, total: true } },
} as const;

@Injectable()
export class InsuranceService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    patientId: string; invoiceId?: string; provider: string; scheme?: string;
    memberNumber?: string; preAuthCode?: string; amount: number; notes?: string;
  }, organizationId: string) {
    return this.prisma.insuranceClaim.create({
      data: {
        claimNumber: `CLM-${genClaim()}`,
        patientId: data.patientId,
        invoiceId: data.invoiceId,
        provider: data.provider,
        scheme: data.scheme,
        memberNumber: data.memberNumber,
        preAuthCode: data.preAuthCode,
        amount: data.amount,
        notes: data.notes,
        organizationId,
      },
      include: INCLUDE,
    });
  }

  async findAll(organizationId: string, status?: string, provider?: string) {
    return this.prisma.insuranceClaim.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as any } : {}),
        ...(provider ? { provider: { contains: provider, mode: "insensitive" } } : {}),
      },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const claim = await this.prisma.insuranceClaim.findFirst({ where: { id, organizationId }, include: INCLUDE });
    if (!claim) throw new NotFoundException("Claim not found");
    return claim;
  }

  async updateStatus(id: string, status: string, data: {
    approvedAmount?: number; rejectionReason?: string; notes?: string;
  }, organizationId: string) {
    const claim = await this.prisma.insuranceClaim.findFirst({ where: { id, organizationId } });
    if (!claim) throw new NotFoundException("Claim not found");

    const update: any = { status };
    if (status === "SUBMITTED") update.submittedAt = new Date();
    if (status === "APPROVED" || status === "REJECTED") update.reviewedAt = new Date();
    if (status === "PAID") update.paidAt = new Date();
    if (data.approvedAmount !== undefined) update.approvedAmount = data.approvedAmount;
    if (data.rejectionReason) update.rejectionReason = data.rejectionReason;
    if (data.notes) update.notes = data.notes;

    return this.prisma.insuranceClaim.update({ where: { id }, data: update, include: INCLUDE });
  }

  async getSummary(organizationId: string) {
    const [draft, submitted, underReview, approved, rejected, paid] = await Promise.all([
      this.prisma.insuranceClaim.count({ where: { organizationId, status: "DRAFT" } }),
      this.prisma.insuranceClaim.count({ where: { organizationId, status: "SUBMITTED" } }),
      this.prisma.insuranceClaim.count({ where: { organizationId, status: "UNDER_REVIEW" } }),
      this.prisma.insuranceClaim.count({ where: { organizationId, status: "APPROVED" } }),
      this.prisma.insuranceClaim.count({ where: { organizationId, status: "REJECTED" } }),
      this.prisma.insuranceClaim.count({ where: { organizationId, status: "PAID" } }),
    ]);

    const totalPaid = await this.prisma.insuranceClaim.aggregate({
      where: { organizationId, status: "PAID" },
      _sum: { approvedAmount: true },
    });

    const totalPending = await this.prisma.insuranceClaim.aggregate({
      where: { organizationId, status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] } },
      _sum: { amount: true },
    });

    return {
      draft, submitted, underReview, approved, rejected, paid,
      totalPaidAmount: totalPaid._sum.approvedAmount ?? 0,
      totalPendingAmount: totalPending._sum.amount ?? 0,
    };
  }
}
