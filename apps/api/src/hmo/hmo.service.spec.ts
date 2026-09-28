import { BadRequestException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { HmoService } from "./hmo.service";

/**
 * What an insurer owes, what the patient owes, and what happens when the two
 * disagree. The arithmetic here decides who gets chased for money, so it is
 * covered line by line rather than in aggregate.
 */

const DAY = 86_400_000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

interface BuildOpts {
  coveragePercent?: number;
  perVisitLimit?: number | null;
  annualLimit?: number | null;
  charges?: { id: string; total: number; unitPrice: number; quantity: number }[];
  enrolmentStartsAt?: Date;
  enrolmentEndsAt?: Date | null;
  enrolmentStatus?: string;
  hasEnrolment?: boolean;
  existingClaim?: { claimNumber: string } | null;
  invoiced?: boolean;
  usedThisYear?: number;
}

function build(opts: BuildOpts = {}) {
  const emitted: { event: string; payload: any }[] = [];
  let created: any = null;
  let updated: any = null;

  const enrolment = {
    id: "enr-1",
    memberNumber: "HYG-99001",
    startsAt: opts.enrolmentStartsAt ?? daysFromNow(-30),
    endsAt: opts.enrolmentEndsAt === undefined ? daysFromNow(300) : opts.enrolmentEndsAt,
    status: opts.enrolmentStatus ?? "ACTIVE",
    provider: { id: "prov-1", code: "HYG", name: "Hygeia HMO" },
    plan: {
      id: "plan-1",
      code: "GOLD",
      name: "Gold",
      coveragePercent: new Decimal(opts.coveragePercent ?? 80),
      requiresPreAuth: false,
      annualLimit: opts.annualLimit == null ? null : new Decimal(opts.annualLimit),
      perVisitLimit: opts.perVisitLimit == null ? null : new Decimal(opts.perVisitLimit),
    },
  };

  const charges = (opts.charges ?? [
    { id: "chg-1", total: 10000, unitPrice: 10000, quantity: 1 },
  ]).map((c) => ({
    id: c.id,
    description: `Charge ${c.id}`,
    quantity: c.quantity,
    unitPrice: new Decimal(c.unitPrice),
    total: new Decimal(c.total),
    // Claims may only be raised against charges that reached an invoice.
    invoiceId: opts.invoiced === false ? null : "inv-1",
  }));

  const prisma = {
    encounter: {
      findFirst: jest.fn().mockResolvedValue({
        id: "enc-1",
        patientId: "pat-1",
        charges,
      }),
    },
    hmoEnrolment: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (opts.hasEnrolment === false) return Promise.resolve(null);

        // Honour the validity window the service asks for, or the test proves
        // nothing about expiry.
        if (where?.status === "ACTIVE") {
          const asOf: Date = where.startsAt?.lte ?? new Date();
          const validNow =
            enrolment.status === "ACTIVE" &&
            enrolment.startsAt <= asOf &&
            (enrolment.endsAt === null || enrolment.endsAt >= asOf);
          return Promise.resolve(validNow ? enrolment : null);
        }
        return Promise.resolve(enrolment);
      }),
    },
    insuranceClaim: {
      findFirst: jest.fn().mockResolvedValue(opts.existingClaim ?? null),
      aggregate: jest.fn().mockResolvedValue({
        _sum: { coveredAmount: new Decimal(opts.usedThisYear ?? 0) },
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        created = data;
        return Promise.resolve({ id: "clm-1", ...data, lines: data.lines?.create ?? [] });
      }),
      update: jest.fn().mockImplementation(({ data }) => {
        updated = data;
        return Promise.resolve({
          id: "clm-1",
          claimNumber: "CLM-TEST",
          providerId: "prov-1",
          patientId: "pat-1",
          coveredAmount: new Decimal(0),
          ...data,
        });
      }),
    },
  } as any;

  const events = {
    emit: jest.fn().mockImplementation((event: string, payload: any) => {
      emitted.push({ event, payload });
      return true;
    }),
  } as any;

  const service = new HmoService(prisma, events);
  return { service, prisma, events, emitted, get created() { return created; }, get updated() { return updated; } };
}

const ORG = "org-1";

describe("HmoService eligibility", () => {
  it("treats cover that is inside its dates as usable", async () => {
    const { service } = build();
    const result = await service.eligibility("pat-1", ORG);

    expect(result.covered).toBe(true);
    expect(result.enrolment?.provider.name).toBe("Hygeia HMO");
    expect(result.enrolment?.plan.coveragePercent).toBe("80");
  });

  it("refuses cover that has lapsed, and says so rather than going quiet", async () => {
    const { service } = build({
      enrolmentStartsAt: daysFromNow(-400),
      enrolmentEndsAt: daysFromNow(-30),
    });

    const result = await service.eligibility("pat-1", ORG);

    expect(result.covered).toBe(false);
    // The front desk needs to know cover exists but has run out, because that
    // can be renewed; "no cover on file" would send them down another path.
    expect(result.reason).toMatch(/not valid today/i);
    expect(result.reason).toMatch(/Hygeia/);
  });

  it("reports no cover at all when the patient was never enrolled", async () => {
    const { service } = build({ hasEnrolment: false });
    const result = await service.eligibility("pat-1", ORG);

    expect(result.covered).toBe(false);
    expect(result.reason).toMatch(/no hmo cover/i);
  });

  it("reports what is left of an annual limit", async () => {
    const { service } = build({ annualLimit: 500000, usedThisYear: 120000 });
    const result = await service.eligibility("pat-1", ORG);

    expect(result.usedThisYear).toBe("120000");
    expect(result.remainingThisYear).toBe("380000");
  });

  it("never reports a negative remaining limit once it is exhausted", async () => {
    const { service } = build({ annualLimit: 100000, usedThisYear: 140000 });
    const result = await service.eligibility("pat-1", ORG);

    expect(result.remainingThisYear).toBe("0");
  });
});

describe("HmoService claim building", () => {
  it("splits each charge between the insurer and the patient's co-payment", async () => {
    // Held as a context object, not destructured: `created` is a getter, and
    // destructuring would read it before buildClaim has run.
    const ctx = build({
      coveragePercent: 80,
      charges: [
        { id: "chg-1", total: 10000, unitPrice: 10000, quantity: 1 },
        { id: "chg-2", total: 5000, unitPrice: 2500, quantity: 2 },
      ],
    });

    const claim = await ctx.service.buildClaim("enc-1", ORG);
    const created = ctx.created;

    expect(claim.amount.toString()).toBe("15000");
    expect(claim.coveredAmount!.toString()).toBe("12000");
    expect(claim.patientPortion!.toString()).toBe("3000");

    // Every claimed line has to trace back to a real charge, or nothing
    // reconciles when the insurer queries one.
    const lines = created.lines.create;
    expect(lines).toHaveLength(2);
    expect(lines.map((l: any) => l.chargeId)).toEqual(["chg-1", "chg-2"]);
    expect(lines[0].coveredAmount.toString()).toBe("8000");
    expect(lines[0].patientAmount.toString()).toBe("2000");
  });

  it("keeps the split adding back to the full bill when the share does not divide evenly", async () => {
    const { service } = build({
      coveragePercent: 33.33,
      charges: [{ id: "chg-1", total: 1000, unitPrice: 1000, quantity: 1 }],
    });

    const claim = await service.buildClaim("enc-1", ORG);

    // Rounding must not create or destroy money.
    const covered = new Decimal(claim.coveredAmount!.toString());
    const patient = new Decimal(claim.patientPortion!.toString());
    expect(covered.add(patient).toString()).toBe("1000");
  });

  it("pushes anything over a per-visit cap back onto the patient", async () => {
    const { service } = build({
      coveragePercent: 100,
      perVisitLimit: 6000,
      charges: [{ id: "chg-1", total: 10000, unitPrice: 10000, quantity: 1 }],
    });

    const claim = await service.buildClaim("enc-1", ORG);

    // Claiming the full 10,000 against a 6,000 cap would be rejected later and
    // leave 4,000 owed by nobody.
    expect(claim.coveredAmount!.toString()).toBe("6000");
    expect(claim.patientPortion!.toString()).toBe("4000");
  });

  it("refuses to claim twice for the same encounter", async () => {
    const { service } = build({ existingClaim: { claimNumber: "CLM-EXISTING" } });

    await expect(service.buildClaim("enc-1", ORG)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuses to claim when the cover has lapsed", async () => {
    const { service } = build({
      enrolmentStartsAt: daysFromNow(-400),
      enrolmentEndsAt: daysFromNow(-10),
    });

    await expect(service.buildClaim("enc-1", ORG)).rejects.toThrow(/not valid today/i);
  });

  it("refuses to claim for charges that were never invoiced", async () => {
    const { service } = build({ invoiced: false });

    // Submitting such a claim moved the insurer's share off a patient debt
    // that had never been raised, driving the patient's balance negative.
    await expect(service.buildClaim("enc-1", ORG)).rejects.toThrow(/invoiced/i);
  });

  it("refuses to claim for an encounter with nothing charged", async () => {
    const { service, prisma } = build();
    prisma.encounter.findFirst.mockResolvedValue({ id: "enc-1", patientId: "pat-1", charges: [] });

    await expect(service.buildClaim("enc-1", ORG)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("HmoService adjudication", () => {
  function submitted(coveredAmount: number, patientPortion = 0) {
    const ctx = build();
    ctx.prisma.insuranceClaim.findFirst.mockResolvedValue({
      id: "clm-1",
      claimNumber: "CLM-TEST",
      status: "SUBMITTED",
      providerId: "prov-1",
      patientId: "pat-1",
      amount: new Decimal(coveredAmount),
      coveredAmount: new Decimal(coveredAmount),
      patientPortion: new Decimal(patientPortion),
    });
    return ctx;
  }

  it("returns the shortfall to the patient when the insurer approves less", async () => {
    const ctx = submitted(12000, 3000);

    await ctx.service.adjudicate("clm-1", { approvedAmount: 9000 }, ORG);

    // The 3,000 declined does not evaporate — the patient now owes 6,000.
    expect(ctx.updated.patientPortion.toString()).toBe("6000");
    expect(ctx.updated.status).toBe("APPROVED");

    const event = ctx.emitted.find((e) => e.event === "hmo.claim.adjudicated");
    expect(event?.payload.shortfall).toBe("3000");
  });

  it("marks a claim rejected when nothing is approved", async () => {
    const ctx = submitted(12000, 3000);

    await ctx.service.adjudicate(
      "clm-1",
      { approvedAmount: 0, rejectionReason: "No pre-authorisation" },
      ORG,
    );

    expect(ctx.updated.status).toBe("REJECTED");
    expect(ctx.updated.patientPortion.toString()).toBe("15000");
  });

  it("refuses a full rejection with no reason given", async () => {
    const ctx = submitted(12000);

    await expect(
      ctx.service.adjudicate("clm-1", { approvedAmount: 0 }, ORG),
    ).rejects.toThrow(/needs a reason/i);
  });

  it("refuses to approve more than was claimed", async () => {
    const ctx = submitted(12000);

    await expect(
      ctx.service.adjudicate("clm-1", { approvedAmount: 20000 }, ORG),
    ).rejects.toThrow(/more than/i);
  });

  it("refuses to adjudicate a claim that was never submitted", async () => {
    const ctx = build();
    ctx.prisma.insuranceClaim.findFirst.mockResolvedValue({
      id: "clm-1",
      status: "DRAFT",
      amount: new Decimal(1000),
      coveredAmount: new Decimal(1000),
      patientPortion: new Decimal(0),
    });

    await expect(
      ctx.service.adjudicate("clm-1", { approvedAmount: 500 }, ORG),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("HmoService remittance", () => {
  function approved(approvedAmount: number, paidAmount: number | null = null) {
    const ctx = build();
    ctx.prisma.insuranceClaim.findFirst.mockResolvedValue({
      id: "clm-1",
      claimNumber: "CLM-TEST",
      status: "APPROVED",
      providerId: "prov-1",
      approvedAmount: new Decimal(approvedAmount),
      paidAmount: paidAmount === null ? null : new Decimal(paidAmount),
    });
    return ctx;
  }

  it("settles the claim when the full approved amount arrives", async () => {
    const ctx = approved(9000);

    await ctx.service.recordPayment("clm-1", { amount: 9000, reference: "RMT-1" }, ORG);

    expect(ctx.updated.status).toBe("PAID");
    expect(ctx.updated.paidAmount.toString()).toBe("9000");
  });

  it("leaves a part-paid claim open", async () => {
    const ctx = approved(9000);

    await ctx.service.recordPayment("clm-1", { amount: 4000 }, ORG);

    expect(ctx.updated.status).toBeUndefined();
    expect(ctx.updated.paidAmount.toString()).toBe("4000");
  });

  it("refuses to accept more than was approved", async () => {
    const ctx = approved(9000, 7000);

    await expect(
      ctx.service.recordPayment("clm-1", { amount: 5000 }, ORG),
    ).rejects.toThrow(/against an approved/i);
  });

  it("keys each remittance on the running total so a repeat cannot double-post", async () => {
    const ctx = approved(9000, 4000);

    await ctx.service.recordPayment("clm-1", { amount: 3000 }, ORG);

    const event = ctx.emitted.find((e) => e.event === "hmo.claim.paid");
    expect(event?.payload.amount).toBe("3000");
    expect(event?.payload.paidToDate).toBe("7000");
  });
});
