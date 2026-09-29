import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { HmoService } from "./hmo.service";

const genStatementNo = customAlphabet("0123456789", 6);
const ZERO = new Decimal(0);

/**
 * Consolidated billing for a payer.
 *
 * A company on retainership does not want a claim per visit; it wants one
 * invoice a month covering everyone it pays for. This groups claims that have
 * already been approved into a single statement and collects against it.
 *
 * It posts nothing to the general ledger, on purpose. The receivable was
 * raised when each claim was submitted and the revenue when the invoice was
 * issued, so recognising anything again here would count the same money twice.
 * A statement presents debt that already exists; paying one settles the claims
 * underneath it through the same path a single remittance takes.
 */
@Injectable()
export class StatementsService {
  constructor(
    private prisma: PrismaService,
    private hmo: HmoService,
  ) {}

  /**
   * Gathers a payer's approved, unbilled claims for a period.
   *
   * Only APPROVED claims are included: a claim still being adjudicated has no
   * agreed figure, and billing a payer for one would be asking for money
   * nobody has yet accepted is owed.
   */
  async build(
    dto: { payerId: string; periodStart: string; periodEnd: string; notes?: string },
    organizationId: string,
  ) {
    const payer = await this.prisma.hmoProvider.findFirst({
      where: { id: dto.payerId, organizationId },
      include: {
        contracts: {
          where: { status: "ACTIVE" },
          orderBy: { startsAt: "desc" },
          take: 1,
        },
      },
    });
    if (!payer) throw new NotFoundException("Payer not found");

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    if (periodEnd <= periodStart) {
      throw new BadRequestException("The period must end after it starts");
    }

    const claims = await this.prisma.insuranceClaim.findMany({
      where: {
        organizationId,
        providerId: dto.payerId,
        status: "APPROVED",
        statementId: null,
        reviewedAt: { gte: periodStart, lte: periodEnd },
      },
      select: { id: true, approvedAmount: true, paidAmount: true },
    });

    if (claims.length === 0) {
      throw new BadRequestException(
        "No approved claims for this payer in that period that are not already on a statement",
      );
    }

    // Anything already part-paid is billed only for what is left, or the
    // payer is asked twice for the same money.
    const total = claims.reduce(
      (sum, c) => sum.add((c.approvedAmount ?? ZERO).sub(c.paidAmount ?? ZERO)),
      ZERO,
    );

    const terms = payer.contracts[0]?.paymentTermsDays ?? 30;

    return this.prisma.$transaction(async (tx) => {
      const statement = await tx.payerStatement.create({
        data: {
          statementNumber: `STM-${genStatementNo()}`,
          payerId: dto.payerId,
          periodStart,
          periodEnd,
          claimCount: claims.length,
          totalApproved: total,
          notes: dto.notes,
          dueOn: new Date(Date.now() + terms * 86_400_000),
          organizationId,
        },
      });

      await tx.insuranceClaim.updateMany({
        where: { id: { in: claims.map((c) => c.id) } },
        data: { statementId: statement.id },
      });

      return statement;
    });
  }

  async issue(id: string, organizationId: string) {
    const statement = await this.prisma.payerStatement.findFirst({
      where: { id, organizationId },
    });
    if (!statement) throw new NotFoundException("Statement not found");
    if (statement.status !== "DRAFT") {
      throw new BadRequestException(`This statement is already ${statement.status.toLowerCase()}`);
    }

    return this.prisma.payerStatement.update({
      where: { id },
      data: { status: "ISSUED", issuedAt: new Date() },
    });
  }

  /**
   * Records money received against a statement, spreading it over the claims
   * underneath.
   *
   * Allocating down to the individual claims is what keeps the ledger and the
   * claim records honest: a lump sum recorded only on the statement would
   * leave every claim under it still reading as unpaid, and the HMO ageing
   * would never clear.
   */
  async recordPayment(
    id: string,
    dto: { amount: number; reference?: string },
    organizationId: string,
  ) {
    const statement = await this.prisma.payerStatement.findFirst({
      where: { id, organizationId },
      include: {
        claims: {
          where: { status: "APPROVED" },
          orderBy: { reviewedAt: "asc" },
          select: { id: true, approvedAmount: true, paidAmount: true },
        },
      },
    });
    if (!statement) throw new NotFoundException("Statement not found");
    if (statement.status === "DRAFT") {
      throw new BadRequestException("Issue the statement before recording payment against it");
    }
    if (statement.status === "VOID") {
      throw new BadRequestException("This statement was voided");
    }

    let remaining = new Decimal(dto.amount);
    if (remaining.lessThanOrEqualTo(0)) {
      throw new BadRequestException("Payment must be positive");
    }

    const outstanding = statement.totalApproved.sub(statement.paidAmount);
    if (remaining.greaterThan(outstanding)) {
      throw new BadRequestException(
        `That would pay ${remaining} against ${outstanding} still outstanding on this statement`,
      );
    }

    const settled: string[] = [];
    for (const claim of statement.claims) {
      if (remaining.lessThanOrEqualTo(0)) break;

      const owing = (claim.approvedAmount ?? ZERO).sub(claim.paidAmount ?? ZERO);
      if (owing.lessThanOrEqualTo(0)) continue;

      const part = Decimal.min(owing, remaining);
      // Routed through the ordinary claim payment so the ledger entry and the
      // claim's own status follow exactly the same path as a single remittance.
      await this.hmo.recordPayment(
        claim.id,
        { amount: part.toNumber(), reference: dto.reference },
        organizationId,
      );
      remaining = remaining.sub(part);
      settled.push(claim.id);
    }

    const paidAmount = statement.paidAmount.add(new Decimal(dto.amount).sub(remaining));
    const fullyPaid = paidAmount.greaterThanOrEqualTo(statement.totalApproved);

    return this.prisma.payerStatement.update({
      where: { id },
      data: {
        paidAmount,
        status: fullyPaid ? "PAID" : "PART_PAID",
      },
    });
  }

  async list(organizationId: string, payerId?: string) {
    const statements = await this.prisma.payerStatement.findMany({
      where: { organizationId, ...(payerId && { payerId }) },
      include: {
        payer: { select: { id: true, code: true, name: true, type: true } },
        _count: { select: { claims: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const now = new Date();
    return statements.map((s) => ({
      ...s,
      outstanding: s.totalApproved.sub(s.paidAmount).toString(),
      isOverdue:
        s.status !== "PAID" && s.status !== "VOID" && s.dueOn !== null && s.dueOn < now,
    }));
  }

  async findOne(id: string, organizationId: string) {
    const statement = await this.prisma.payerStatement.findFirst({
      where: { id, organizationId },
      include: {
        payer: { select: { id: true, code: true, name: true, type: true } },
        claims: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
          },
          orderBy: { reviewedAt: "asc" },
        },
      },
    });
    if (!statement) throw new NotFoundException("Statement not found");

    return {
      ...statement,
      outstanding: statement.totalApproved.sub(statement.paidAmount).toString(),
    };
  }

  async void(id: string, reason: string, organizationId: string) {
    if (!reason?.trim()) throw new BadRequestException("Voiding a statement needs a reason");

    const statement = await this.prisma.payerStatement.findFirst({
      where: { id, organizationId },
    });
    if (!statement) throw new NotFoundException("Statement not found");
    if (statement.paidAmount.greaterThan(0)) {
      throw new BadRequestException(
        "Money has already been received against this statement; it cannot be voided",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // The claims go back to being unbilled so they can be put on a corrected
      // statement, rather than becoming invisible to both.
      await tx.insuranceClaim.updateMany({
        where: { statementId: id },
        data: { statementId: null },
      });

      return tx.payerStatement.update({
        where: { id },
        data: { status: "VOID", notes: reason.trim() },
      });
    });
  }
}
