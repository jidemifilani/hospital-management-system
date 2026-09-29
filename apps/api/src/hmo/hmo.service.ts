import { Injectable, BadRequestException, NotFoundException, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";

const genClaimNo = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);
const ZERO = new Decimal(0);

/** Rounds to kobo. Splitting a bill by percentage rarely divides evenly. */
const money = (d: Decimal) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export interface Eligibility {
  covered: boolean;
  reason?: string;
  enrolment?: {
    id: string;
    memberNumber: string;
    startsAt: Date;
    endsAt: Date | null;
    provider: { id: string; code: string; name: string };
    plan: {
      id: string;
      code: string;
      name: string;
      coveragePercent: string;
      requiresPreAuth: boolean;
      annualLimit: string | null;
      perVisitLimit: string | null;
    };
  };
  /** What the plan has already absorbed this calendar year. */
  usedThisYear?: string;
  remainingThisYear?: string | null;
}

@Injectable()
export class HmoService {
  private readonly logger = new Logger(HmoService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  // ── Registry ───────────────────────────────────────────────────────────────

  async createProvider(
    dto: {
      code: string;
      name: string;
      type?: "HMO" | "CORPORATE" | "NHIS";
      contactName?: string;
      email?: string;
      phone?: string;
      address?: string;
    },
    organizationId: string,
  ) {
    const existing = await this.prisma.hmoProvider.findFirst({
      where: { code: dto.code, organizationId },
    });
    if (existing) throw new BadRequestException(`Provider ${dto.code} already exists`);

    return this.prisma.hmoProvider.create({ data: { ...dto, organizationId } });
  }

  listProviders(
    organizationId: string,
    includeInactive = false,
    type?: "HMO" | "CORPORATE" | "NHIS",
  ) {
    return this.prisma.hmoProvider.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(type && { type }),
      },
      include: {
        plans: { where: { isActive: true }, orderBy: { name: "asc" } },
        _count: { select: { enrolments: true, claims: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async createPlan(
    dto: {
      providerId: string;
      code: string;
      name: string;
      coveragePercent?: number;
      annualLimit?: number;
      perVisitLimit?: number;
      requiresPreAuth?: boolean;
    },
    organizationId: string,
  ) {
    const provider = await this.prisma.hmoProvider.findFirst({
      where: { id: dto.providerId, organizationId },
    });
    if (!provider) throw new NotFoundException("Provider not found");

    const coverage = new Decimal(dto.coveragePercent ?? 100);
    if (coverage.lessThan(0) || coverage.greaterThan(100)) {
      throw new BadRequestException("Coverage must be between 0 and 100 percent");
    }

    return this.prisma.hmoPlan.create({
      data: { ...dto, coveragePercent: coverage, organizationId },
    });
  }

  async createContract(
    dto: {
      providerId: string;
      contractNumber: string;
      startsAt: string;
      endsAt?: string;
      paymentTermsDays?: number;
      creditLimit?: number;
      notes?: string;
    },
    organizationId: string,
  ) {
    const provider = await this.prisma.hmoProvider.findFirst({
      where: { id: dto.providerId, organizationId },
    });
    if (!provider) throw new NotFoundException("Provider not found");

    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException("A contract cannot end before it starts");
    }

    return this.prisma.hmoContract.create({
      data: {
        ...dto,
        startsAt,
        endsAt,
        status: "ACTIVE",
        organizationId,
      },
    });
  }

  listContracts(organizationId: string) {
    return this.prisma.hmoContract.findMany({
      where: { organizationId },
      include: { provider: { select: { id: true, code: true, name: true } } },
      orderBy: { startsAt: "desc" },
    });
  }

  // ── Enrolment ──────────────────────────────────────────────────────────────

  async enrol(
    dto: {
      patientId: string;
      planId: string;
      memberNumber: string;
      startsAt: string;
      endsAt?: string;
      isPrincipal?: boolean;
    },
    organizationId: string,
  ) {
    const [patient, plan] = await Promise.all([
      this.prisma.patient.findFirst({ where: { id: dto.patientId, organizationId } }),
      this.prisma.hmoPlan.findFirst({
        where: { id: dto.planId, organizationId },
        include: { provider: true },
      }),
    ]);
    if (!patient) throw new NotFoundException("Patient not found");
    if (!plan) throw new NotFoundException("Plan not found");

    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException("Cover cannot end before it starts");
    }

    try {
      return await this.prisma.hmoEnrolment.create({
        data: {
          patientId: dto.patientId,
          providerId: plan.providerId,
          planId: dto.planId,
          memberNumber: dto.memberNumber,
          startsAt,
          endsAt,
          isPrincipal: dto.isPrincipal ?? true,
          organizationId,
        },
        include: { plan: true, provider: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException(
          `Member number ${dto.memberNumber} is already enrolled with ${plan.provider.name}`,
        );
      }
      throw err;
    }
  }

  listEnrolments(organizationId: string, patientId?: string) {
    return this.prisma.hmoEnrolment.findMany({
      where: { organizationId, ...(patientId && { patientId }) },
      include: {
        plan: { select: { id: true, code: true, name: true, coveragePercent: true } },
        provider: { select: { id: true, code: true, name: true } },
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Whether this patient's cover is usable today, and for how much.
   *
   * This is the check that was missing: pricing keyed off a free-text provider
   * name on the patient record, so cover that lapsed years ago still billed at
   * scheme rates and the shortfall was never recoverable from anyone.
   */
  async eligibility(patientId: string, organizationId: string, asOf = new Date()): Promise<Eligibility> {
    const enrolment = await this.prisma.hmoEnrolment.findFirst({
      where: {
        patientId,
        organizationId,
        status: "ACTIVE",
        startsAt: { lte: asOf },
        OR: [{ endsAt: null }, { endsAt: { gte: asOf } }],
      },
      include: { plan: true, provider: true },
      orderBy: { startsAt: "desc" },
    });

    if (!enrolment) {
      // Distinguish "never had cover" from "cover has lapsed": the second is
      // worth telling the front desk about, because it can be renewed.
      const lapsed = await this.prisma.hmoEnrolment.findFirst({
        where: { patientId, organizationId },
        include: { provider: true },
        orderBy: { endsAt: "desc" },
      });

      return {
        covered: false,
        reason: lapsed
          ? `Cover with ${lapsed.provider.name} is not valid today (${
              lapsed.status === "ACTIVE" ? "outside its dates" : lapsed.status.toLowerCase()
            })`
          : "No HMO cover on file",
      };
    }

    const yearStart = new Date(asOf.getFullYear(), 0, 1);
    const used = await this.prisma.insuranceClaim.aggregate({
      where: {
        patientId,
        organizationId,
        enrolmentId: enrolment.id,
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "PAID"] },
        createdAt: { gte: yearStart },
      },
      _sum: { coveredAmount: true },
    });

    const usedThisYear = used._sum.coveredAmount ?? ZERO;
    const annualLimit = enrolment.plan.annualLimit;

    return {
      covered: true,
      enrolment: {
        id: enrolment.id,
        memberNumber: enrolment.memberNumber,
        startsAt: enrolment.startsAt,
        endsAt: enrolment.endsAt,
        provider: {
          id: enrolment.provider.id,
          code: enrolment.provider.code,
          name: enrolment.provider.name,
        },
        plan: {
          id: enrolment.plan.id,
          code: enrolment.plan.code,
          name: enrolment.plan.name,
          coveragePercent: enrolment.plan.coveragePercent.toString(),
          requiresPreAuth: enrolment.plan.requiresPreAuth,
          annualLimit: annualLimit?.toString() ?? null,
          perVisitLimit: enrolment.plan.perVisitLimit?.toString() ?? null,
        },
      },
      usedThisYear: usedThisYear.toString(),
      remainingThisYear: annualLimit ? Decimal.max(annualLimit.sub(usedThisYear), ZERO).toString() : null,
    };
  }

  // ── Claims ─────────────────────────────────────────────────────────────────

  /**
   * Builds a claim from what was actually charged on an encounter, splitting
   * each line between the insurer and the patient's co-payment.
   *
   * The previous claim flow took a single typed-in amount with no link to the
   * charges, so nothing reconciled: a claim could be for more than was billed,
   * and no one could see which item an insurer had rejected.
   *
   * Only invoiced charges can be claimed. Submitting a claim moves the covered
   * share off the patient's receivable and onto the insurer's, and a
   * receivable the hospital never raised cannot be moved — doing so drove the
   * patient's balance negative, so the books showed the hospital owing money
   * to someone who had been treated for free.
   */
  async buildClaim(encounterId: string, organizationId: string, preAuthCode?: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, organizationId },
      include: { charges: { where: { isVoided: false } } },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    if (encounter.charges.length === 0) {
      throw new BadRequestException("This encounter has nothing charged to claim for");
    }

    const invoiced = encounter.charges.filter((c) => c.invoiceId !== null);
    if (invoiced.length === 0) {
      throw new BadRequestException(
        "Nothing on this encounter has been invoiced yet — raise the invoice before claiming, " +
          "or the insurer's share would be moved off a debt that does not exist",
      );
    }

    // Charges from one encounter normally share an invoice; only record it on
    // the claim when they genuinely do, rather than guessing.
    const invoiceIds = [...new Set(invoiced.map((c) => c.invoiceId!))];
    const invoiceId = invoiceIds.length === 1 ? invoiceIds[0]! : undefined;

    const existing = await this.prisma.insuranceClaim.findFirst({
      where: { encounterId, organizationId, status: { not: "REJECTED" } },
    });
    if (existing) {
      throw new BadRequestException(
        `Claim ${existing.claimNumber} already covers this encounter`,
      );
    }

    const elig = await this.eligibility(encounter.patientId, organizationId);
    if (!elig.covered || !elig.enrolment) {
      throw new BadRequestException(elig.reason ?? "Patient has no usable cover");
    }

    const coverage = new Decimal(elig.enrolment.plan.coveragePercent).div(100);
    const perVisitLimit = elig.enrolment.plan.perVisitLimit
      ? new Decimal(elig.enrolment.plan.perVisitLimit)
      : null;

    let covered = ZERO;
    let patientPortion = ZERO;
    let total = ZERO;

    const lines = invoiced.map((c) => {
      const amount = c.total;
      const lineCovered = money(amount.mul(coverage));
      total = total.add(amount);
      covered = covered.add(lineCovered);
      patientPortion = patientPortion.add(amount.sub(lineCovered));

      return {
        chargeId: c.id,
        description: c.description,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        amount,
        coveredAmount: lineCovered,
        patientAmount: amount.sub(lineCovered),
        organizationId,
      };
    });

    // A per-visit cap moves the excess back onto the patient rather than
    // silently claiming more than the plan allows.
    if (perVisitLimit && covered.greaterThan(perVisitLimit)) {
      const excess = covered.sub(perVisitLimit);
      covered = perVisitLimit;
      patientPortion = patientPortion.add(excess);
    }

    const claim = await this.prisma.insuranceClaim.create({
      data: {
        claimNumber: `CLM-${genClaimNo()}`,
        patientId: encounter.patientId,
        encounterId,
        invoiceId,
        providerId: elig.enrolment.provider.id,
        enrolmentId: elig.enrolment.id,
        provider: elig.enrolment.provider.name,
        scheme: elig.enrolment.plan.name,
        memberNumber: elig.enrolment.memberNumber,
        preAuthCode,
        amount: total,
        coveredAmount: covered,
        patientPortion,
        status: "DRAFT",
        organizationId,
        lines: { create: lines },
      },
      include: { lines: true, hmoProvider: true },
    });

    if (elig.enrolment.plan.requiresPreAuth && !preAuthCode) {
      this.logger.warn(
        `Claim ${claim.claimNumber} raised on a plan requiring pre-authorisation, with no code`,
      );
    }

    return claim;
  }

  async submit(claimId: string, organizationId: string) {
    const claim = await this.prisma.insuranceClaim.findFirst({
      where: { id: claimId, organizationId },
    });
    if (!claim) throw new NotFoundException("Claim not found");
    if (claim.status !== "DRAFT") {
      throw new BadRequestException(`Claim is already ${claim.status.toLowerCase()}`);
    }

    const submitted = await this.prisma.insuranceClaim.update({
      where: { id: claimId },
      data: { status: "SUBMITTED", submittedAt: new Date() },
      include: { lines: true },
    });

    // Once claimed, the covered share is owed by the insurer, not the patient.
    this.events.emit("hmo.claim.submitted", {
      claimId: submitted.id,
      claimNumber: submitted.claimNumber,
      providerId: submitted.providerId,
      patientId: submitted.patientId,
      coveredAmount: submitted.coveredAmount?.toString() ?? "0",
      organizationId,
    });

    return submitted;
  }

  /**
   * Records the insurer's decision. An insurer may approve less than was
   * asked; the shortfall does not vanish, it falls back to the patient.
   */
  async adjudicate(
    claimId: string,
    dto: { approvedAmount: number; rejectionReason?: string; notes?: string },
    organizationId: string,
  ) {
    const claim = await this.prisma.insuranceClaim.findFirst({
      where: { id: claimId, organizationId },
    });
    if (!claim) throw new NotFoundException("Claim not found");
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(claim.status)) {
      throw new BadRequestException(
        `Only a submitted claim can be adjudicated; this one is ${claim.status.toLowerCase()}`,
      );
    }

    const approved = new Decimal(dto.approvedAmount);
    const claimed = claim.coveredAmount ?? claim.amount;
    if (approved.lessThan(0)) throw new BadRequestException("Approved amount cannot be negative");
    if (approved.greaterThan(claimed)) {
      throw new BadRequestException(
        `Approved ${approved} is more than the ${claimed} claimed`,
      );
    }
    if (approved.isZero() && !dto.rejectionReason) {
      throw new BadRequestException("A fully rejected claim needs a reason");
    }

    const shortfall = claimed.sub(approved);

    const updated = await this.prisma.insuranceClaim.update({
      where: { id: claimId },
      data: {
        status: approved.isZero() ? "REJECTED" : "APPROVED",
        approvedAmount: approved,
        rejectionReason: dto.rejectionReason,
        notes: dto.notes,
        reviewedAt: new Date(),
        // What the patient owes grows by whatever the insurer declined.
        patientPortion: (claim.patientPortion ?? ZERO).add(shortfall),
      },
      include: { lines: true },
    });

    this.events.emit("hmo.claim.adjudicated", {
      claimId: updated.id,
      claimNumber: updated.claimNumber,
      providerId: updated.providerId,
      patientId: updated.patientId,
      claimedAmount: claimed.toString(),
      approvedAmount: approved.toString(),
      shortfall: shortfall.toString(),
      organizationId,
    });

    return updated;
  }

  /** Money actually received from the insurer against an approved claim. */
  async recordPayment(
    claimId: string,
    dto: { amount: number; reference?: string },
    organizationId: string,
  ) {
    const claim = await this.prisma.insuranceClaim.findFirst({
      where: { id: claimId, organizationId },
    });
    if (!claim) throw new NotFoundException("Claim not found");
    if (claim.status !== "APPROVED") {
      throw new BadRequestException("Only an approved claim can be paid");
    }

    const amount = new Decimal(dto.amount);
    if (amount.lessThanOrEqualTo(0)) throw new BadRequestException("Payment must be positive");

    const alreadyPaid = claim.paidAmount ?? ZERO;
    const approved = claim.approvedAmount ?? ZERO;
    if (alreadyPaid.add(amount).greaterThan(approved)) {
      throw new BadRequestException(
        `That would pay ${alreadyPaid.add(amount)} against an approved ${approved}`,
      );
    }

    const paidAmount = alreadyPaid.add(amount);
    const settled = paidAmount.equals(approved);

    const updated = await this.prisma.insuranceClaim.update({
      where: { id: claimId },
      data: {
        paidAmount,
        ...(settled && { status: "PAID", paidAt: new Date() }),
      },
    });

    this.events.emit("hmo.claim.paid", {
      claimId: updated.id,
      claimNumber: updated.claimNumber,
      providerId: updated.providerId,
      amount: amount.toString(),
      paidToDate: paidAmount.toString(),
      reference: dto.reference,
      organizationId,
    });

    return updated;
  }

  listClaims(
    organizationId: string,
    filters: { status?: string; providerId?: string; patientId?: string } = {},
  ) {
    return this.prisma.insuranceClaim.findMany({
      where: {
        organizationId,
        ...(filters.status && { status: filters.status as never }),
        ...(filters.providerId && { providerId: filters.providerId }),
        ...(filters.patientId && { patientId: filters.patientId }),
      },
      include: {
        lines: true,
        hmoProvider: { select: { id: true, code: true, name: true } },
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  /**
   * What each insurer owes, and how much of what was claimed they actually
   * honoured. The approval rate is the number worth watching: a provider
   * approving 60% of claims is costing the hospital more than its tariff says.
   */
  async providerStatement(organizationId: string) {
    const providers = await this.prisma.hmoProvider.findMany({
      where: { organizationId },
      include: {
        claims: {
          select: {
            status: true,
            coveredAmount: true,
            approvedAmount: true,
            paidAmount: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return providers.map((p) => {
      let claimed = ZERO;
      let approved = ZERO;
      let paid = ZERO;
      let open = 0;

      for (const c of p.claims) {
        if (c.status === "DRAFT") continue;
        claimed = claimed.add(c.coveredAmount ?? ZERO);
        approved = approved.add(c.approvedAmount ?? ZERO);
        paid = paid.add(c.paidAmount ?? ZERO);
        if (["SUBMITTED", "UNDER_REVIEW", "APPROVED"].includes(c.status)) open += 1;
      }

      return {
        providerId: p.id,
        code: p.code,
        name: p.name,
        claimCount: p.claims.length,
        openClaims: open,
        claimed: claimed.toString(),
        approved: approved.toString(),
        paid: paid.toString(),
        outstanding: approved.sub(paid).toString(),
        approvalRate: claimed.isZero()
          ? null
          : money(approved.div(claimed).mul(100)).toString(),
      };
    });
  }
}
