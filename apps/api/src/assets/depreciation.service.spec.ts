import { BadRequestException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { DepreciationService } from "./depreciation.service";

/**
 * Depreciation must stop exactly at salvage value. Without a clamp, straight
 * line overshoots on any rounding remainder and declining balance never
 * terminates at all, so an asset's book value drifts below what it is worth and
 * the ledger follows it down.
 */

const asset = (over: Record<string, unknown> = {}) => ({
  id: "a-1",
  name: "Ultrasound",
  assetNumber: "AST-001",
  purchasePrice: new Decimal(1000),
  salvageValue: new Decimal(100),
  usefulLifeMonths: 12,
  depreciationMethod: "STRAIGHT_LINE",
  depreciationStartDate: new Date("2026-01-01"),
  purchaseDate: new Date("2026-01-01"),
  depreciationEndedAt: null,
  status: "ACTIVE",
  category: "OTHER",
  ...over,
});

function build(over: Record<string, any> = {}) {
  const prisma = {
    asset: {
      findFirst: jest.fn().mockResolvedValue(asset()),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    depreciationEntry: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
      groupBy: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "de-1", ...data })),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    ...over,
  };
  const accounting = { postEntry: jest.fn().mockResolvedValue({ id: "je-1" }) };
  return { service: new DepreciationService(prisma as never, accounting as never), prisma, accounting };
}

const ORG = "org-1";

describe("DepreciationService.schedule", () => {
  it("spreads straight line evenly and lands exactly on salvage value", async () => {
    const { service } = build();

    const result = await service.schedule("a-1", ORG);

    // (1000 - 100) / 12 = 75 a month for 12 months
    expect(result.rows).toHaveLength(12);
    expect(result.rows[0]!.amount).toBe("75");
    expect(result.totalDepreciable).toBe("900");
    expect(result.rows[11]!.bookValue).toBe("100");
    expect(result.rows[11]!.accumulated).toBe("900");
  });

  it("never carries book value below salvage when the charge does not divide evenly", async () => {
    const { service, prisma } = build();
    // 1000 - 0 over 7 months = 142.857... which rounds to 142.86 and would
    // overshoot by the last period.
    prisma.asset.findFirst = jest.fn().mockResolvedValue(
      asset({ purchasePrice: new Decimal(1000), salvageValue: new Decimal(0), usefulLifeMonths: 7 }),
    );

    const result = await service.schedule("a-1", ORG);

    const last = result.rows[result.rows.length - 1]!;
    expect(Number(last.bookValue)).toBeGreaterThanOrEqual(0);
    expect(last.bookValue).toBe("0");
    // Total charged equals exactly the depreciable amount, no more.
    expect(last.accumulated).toBe("1000");
  });

  it("stops declining balance at salvage instead of approaching zero forever", async () => {
    const { service, prisma } = build();
    prisma.asset.findFirst = jest.fn().mockResolvedValue(
      asset({ depreciationMethod: "DECLINING_BALANCE", usefulLifeMonths: 36, salvageValue: new Decimal(100) }),
    );

    const result = await service.schedule("a-1", ORG);

    const last = result.rows[result.rows.length - 1]!;
    expect(Number(last.bookValue)).toBeGreaterThanOrEqual(100);
    expect(result.rows.every((r) => Number(r.bookValue) >= 100)).toBe(true);
  });

  it("charges declining balance on the written-down value, not on cost", async () => {
    const { service, prisma } = build();
    prisma.asset.findFirst = jest.fn().mockResolvedValue(
      asset({ depreciationMethod: "DECLINING_BALANCE", usefulLifeMonths: 24, salvageValue: new Decimal(0) }),
    );

    const result = await service.schedule("a-1", ORG);

    // Each charge must be smaller than the one before it.
    const first = Number(result.rows[0]!.amount);
    const second = Number(result.rows[1]!.amount);
    expect(second).toBeLessThan(first);
    // 1000 * 2/24 = 83.33 for the opening period
    expect(result.rows[0]!.amount).toBe("83.33");
  });

  it("refuses to project a schedule for an asset with no basis configured", async () => {
    const { service, prisma } = build();
    prisma.asset.findFirst = jest.fn().mockResolvedValue(asset({ depreciationMethod: null }));

    await expect(service.schedule("a-1", ORG)).rejects.toThrow(BadRequestException);
  });

  it("marks periods that have already been posted", async () => {
    const { service, prisma } = build();
    prisma.depreciationEntry.findMany = jest.fn().mockResolvedValue([
      { year: 2026, month: 1, amount: new Decimal(75), postedAt: new Date() },
    ]);

    const result = await service.schedule("a-1", ORG);

    expect(result.rows[0]!.charged).toBe(true);
    expect(result.rows[1]!.charged).toBe(false);
  });
});

describe("DepreciationService.setup", () => {
  it("refuses a salvage value at or above the purchase price", async () => {
    const { service } = build();

    await expect(
      service.setup("a-1", { depreciationMethod: "STRAIGHT_LINE", usefulLifeMonths: 12, salvageValue: 1000 } as never, ORG),
    ).rejects.toThrow(BadRequestException);
  });

  it("refuses to change the basis once charges have been posted", async () => {
    const { service, prisma } = build();
    prisma.depreciationEntry.count = jest.fn().mockResolvedValue(3);

    await expect(
      service.setup("a-1", { depreciationMethod: "STRAIGHT_LINE", usefulLifeMonths: 24, salvageValue: 0 } as never, ORG),
    ).rejects.toThrow(/already been depreciated/i);
  });

  it("refuses an asset with no purchase price", async () => {
    const { service, prisma } = build();
    prisma.asset.findFirst = jest.fn().mockResolvedValue(asset({ purchasePrice: null }));

    await expect(
      service.setup("a-1", { depreciationMethod: "STRAIGHT_LINE", usefulLifeMonths: 12 } as never, ORG),
    ).rejects.toThrow(/purchase price/i);
  });
});

describe("DepreciationService.runMonth", () => {
  it("posts expense against accumulated depreciation for each charge", async () => {
    const { service, prisma, accounting } = build();
    prisma.asset.findMany = jest.fn().mockResolvedValue([asset()]);

    const result = await service.runMonth(2026, 3, ORG, "staff-1");

    expect(result.chargedCount).toBe(1);
    expect(result.totalCharged).toBe("75");

    const posted = accounting.postEntry.mock.calls[0]![0];
    expect(posted.source).toBe("DEPRECIATION");
    expect(posted.sourceId).toBe("de-1");
    const debit  = posted.lines.find((l: any) => l.debit);
    const credit = posted.lines.find((l: any) => l.credit);
    expect(debit.accountCode).toBe("6060");   // depreciation expense
    expect(credit.accountCode).toBe("1450");  // accumulated depreciation
    expect(debit.debit.toString()).toBe("75");
    expect(credit.credit.toString()).toBe("75");
  });

  it("skips an asset already charged for the period instead of charging it twice", async () => {
    const { service, prisma, accounting } = build();
    prisma.asset.findMany = jest.fn().mockResolvedValue([asset()]);
    prisma.depreciationEntry.findFirst = jest.fn().mockResolvedValue({ id: "existing" });

    const result = await service.runMonth(2026, 3, ORG);

    expect(result.chargedCount).toBe(0);
    expect(result.skipped[0]!.reason).toMatch(/already charged/i);
    expect(accounting.postEntry).not.toHaveBeenCalled();
  });

  it("charges only the remaining amount when salvage is one part-period away", async () => {
    const { service, prisma } = build();
    prisma.asset.findMany = jest.fn().mockResolvedValue([asset()]);
    // 880 already taken of a 900 depreciable base: only 20 is left, not 75.
    prisma.depreciationEntry.aggregate = jest.fn().mockResolvedValue({ _sum: { amount: new Decimal(880) } });
    prisma.depreciationEntry.count = jest.fn().mockResolvedValue(11);

    const result = await service.runMonth(2026, 12, ORG);

    expect(result.charged[0]!.amount).toBe("20");
  });

  it("stops the asset once it reaches salvage rather than charging past it", async () => {
    const { service, prisma } = build();
    prisma.asset.findMany = jest.fn().mockResolvedValue([asset()]);
    prisma.depreciationEntry.aggregate = jest.fn().mockResolvedValue({ _sum: { amount: new Decimal(900) } });
    prisma.depreciationEntry.count = jest.fn().mockResolvedValue(11);

    const result = await service.runMonth(2026, 12, ORG);

    expect(result.chargedCount).toBe(0);
    expect(result.skipped[0]!.reason).toMatch(/salvage/i);
    expect(prisma.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "a-1" }, data: { depreciationEndedAt: expect.any(Date) } }),
    );
  });

  it("stops the asset once its useful life is exhausted", async () => {
    const { service, prisma } = build();
    prisma.asset.findMany = jest.fn().mockResolvedValue([asset()]);
    prisma.depreciationEntry.count = jest.fn().mockResolvedValue(12); // all 12 months taken

    const result = await service.runMonth(2026, 13 - 1, ORG);

    expect(result.chargedCount).toBe(0);
    expect(result.skipped[0]!.reason).toMatch(/useful life/i);
  });

  it("removes the charge when its journal posting fails, so the register cannot show an unposted charge", async () => {
    const { service, prisma, accounting } = build();
    prisma.asset.findMany = jest.fn().mockResolvedValue([asset()]);
    accounting.postEntry = jest.fn().mockRejectedValue(new Error("Unknown account code(s): 1450"));

    const result = await service.runMonth(2026, 3, ORG);

    expect(result.chargedCount).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.error).toMatch(/1450/);
    expect(prisma.depreciationEntry.delete).toHaveBeenCalledWith({ where: { id: "de-1" } });
  });

  it("carries on with the rest of the run when one asset fails", async () => {
    const { service, prisma, accounting } = build();
    prisma.asset.findMany = jest.fn().mockResolvedValue([
      asset({ id: "a-bad", assetNumber: "AST-BAD" }),
      asset({ id: "a-good", assetNumber: "AST-GOOD" }),
    ]);
    accounting.postEntry = jest.fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ id: "je-2" });

    const result = await service.runMonth(2026, 3, ORG);

    expect(result.failed).toHaveLength(1);
    expect(result.chargedCount).toBe(1);
    expect(result.charged[0]!.assetNumber).toBe("AST-GOOD");
  });

  it("rejects a month outside 1-12", async () => {
    const { service } = build();
    await expect(service.runMonth(2026, 13, ORG)).rejects.toThrow(BadRequestException);
    await expect(service.runMonth(2026, 0, ORG)).rejects.toThrow(BadRequestException);
  });
});

describe("DepreciationService.register", () => {
  it("reports cost, accumulated and book value with totals", async () => {
    const { service, prisma } = build();
    prisma.asset.findMany = jest.fn().mockResolvedValue([
      { id: "a-1", assetNumber: "AST-001", name: "Ultrasound", category: "OTHER", status: "ACTIVE",
        purchasePrice: new Decimal(1000), salvageValue: new Decimal(100), usefulLifeMonths: 12,
        depreciationMethod: "STRAIGHT_LINE", depreciationStartDate: new Date(), depreciationEndedAt: null },
      { id: "a-2", assetNumber: "AST-002", name: "Bed", category: "OTHER", status: "ACTIVE",
        purchasePrice: new Decimal(500), salvageValue: null, usefulLifeMonths: null,
        depreciationMethod: null, depreciationStartDate: null, depreciationEndedAt: null },
    ]);
    prisma.depreciationEntry.groupBy = jest.fn().mockResolvedValue([
      { assetId: "a-1", _sum: { amount: new Decimal(300) }, _count: { _all: 4 } },
    ]);

    const result = await service.register(ORG);

    expect(result.totals.cost).toBe("1500");
    expect(result.totals.accumulated).toBe("300");
    expect(result.totals.bookValue).toBe("1200");

    const first = result.rows.find((r) => r.assetId === "a-1")!;
    expect(first.bookValue).toBe("700");
    expect(first.periodsCharged).toBe(4);
    expect(first.configured).toBe(true);

    // An asset with no basis set is listed but flagged, not silently omitted.
    const second = result.rows.find((r) => r.assetId === "a-2")!;
    expect(second.configured).toBe(false);
    expect(second.accumulated).toBe("0");
    expect(second.bookValue).toBe("500");
  });
});
