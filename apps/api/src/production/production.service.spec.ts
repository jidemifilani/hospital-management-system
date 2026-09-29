import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { ProductionService } from "./production.service";

/**
 * Making one thing out of others moves value; it must not change how much
 * there is. These cover that, and the ways a run could corrupt stock: drawing
 * half a recipe before discovering a shortfall, producing a batch-tracked item
 * with no batch, or a recipe that quietly creates value out of nothing.
 */

function build(opts: {
  lines?: { itemId: string; name: string; quantity: number; cost: number }[];
  onHand?: Record<string, number>;
  outputQuantity?: number;
  requiresBatch?: boolean;
  shelfLifeDays?: number | null;
  run?: any;
} = {}) {
  const issued: { itemId: string; quantity: number; type: string }[] = [];
  const received: { itemId: string; quantity: number; unitCost: number; batchNumber?: string; expiresAt?: string }[] = [];
  const writes: any[] = [];

  const lines = (opts.lines ?? [
    { itemId: "mat-1", name: "Drape", quantity: 2, cost: 500 },
    { itemId: "mat-2", name: "Indicator strip", quantity: 1, cost: 200 },
  ]).map((l) => ({
    itemId: l.itemId,
    quantity: l.quantity,
    item: {
      id: l.itemId,
      code: l.itemId.toUpperCase(),
      name: l.name,
      unit: "unit",
      averageCost: new Decimal(l.cost),
    },
  }));

  const bom = {
    id: "bom-1",
    code: "PACK",
    name: "Minor surgery pack",
    outputQuantity: opts.outputQuantity ?? 1,
    shelfLifeDays: opts.shelfLifeDays === undefined ? 180 : opts.shelfLifeDays,
    outputItem: {
      id: "out-1",
      code: "PACK",
      name: "Minor surgery pack",
      unit: "pack",
      requiresBatch: opts.requiresBatch ?? false,
    },
    lines,
  };

  const onHand = opts.onHand ?? { "mat-1": 100, "mat-2": 100 };

  const run = {
    id: "run-1",
    runNumber: "RUN-000001",
    bomId: "bom-1",
    locationId: "loc-1",
    status: "PLANNED",
    quantityPlanned: 10,
    startedAt: null,
    producedById: null,
    bom,
    ...opts.run,
  };

  const prisma = {
    inventoryItem: {
      // Honours the id filter. A mock that returns everything regardless of
      // the query proves nothing about code whose behaviour depends on how
      // many rows come back.
      findMany: jest.fn().mockImplementation(({ where }: any) => {
        const known = new Set([...lines.map((l) => l.itemId), "out-1"]);
        const asked: string[] = where?.id?.in ?? [...known];
        return Promise.resolve(asked.filter((id) => known.has(id)).map((id) => ({ id })));
      }),
    },
    billOfMaterials: {
      findFirst: jest.fn().mockResolvedValue(bom),
      findMany: jest.fn().mockResolvedValue([bom]),
      create: jest.fn().mockImplementation(({ data }) => {
        writes.push(data);
        return Promise.resolve({ id: "bom-new", ...data });
      }),
    },
    stockLevel: {
      findMany: jest.fn().mockImplementation(() =>
        Promise.resolve(
          Object.entries(onHand).map(([itemId, quantity]) => ({ itemId, quantity })),
        ),
      ),
    },
    stockLocation: { findFirst: jest.fn().mockResolvedValue({ id: "loc-1" }) },
    productionRun: {
      findFirst: jest.fn().mockResolvedValue(run),
      findMany: jest.fn().mockResolvedValue([run]),
      create: jest.fn().mockImplementation(({ data }) => {
        writes.push(data);
        return Promise.resolve({ id: "run-new", ...data });
      }),
      update: jest.fn().mockImplementation(({ data }) => {
        writes.push(data);
        return Promise.resolve({ ...run, ...data });
      }),
    },
  } as any;

  const inventory = {
    issue: jest.fn().mockImplementation((dto: any) => {
      issued.push({ itemId: dto.itemId, quantity: dto.quantity, type: dto.type });
      return Promise.resolve({ id: "mv" });
    }),
    receive: jest.fn().mockImplementation((dto: any) => {
      received.push({
        itemId: dto.itemId,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        batchNumber: dto.batchNumber,
        expiresAt: dto.expiresAt,
      });
      return Promise.resolve({ id: "mv" });
    }),
  } as any;

  return { service: new ProductionService(prisma, inventory), prisma, inventory, issued, received, writes };
}

const ORG = "org-1";

describe("recipes", () => {
  it("refuses a recipe with no materials", async () => {
    const ctx = build();

    // Producing something from nothing would create stock value by running it.
    await expect(
      ctx.service.createBom(
        { code: "X", name: "X", outputItemId: "out-1", lines: [] },
        ORG,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuses a recipe that consumes its own output", async () => {
    const ctx = build();

    await expect(
      ctx.service.createBom(
        {
          code: "X",
          name: "X",
          outputItemId: "out-1",
          lines: [{ itemId: "out-1", quantity: 1 }],
        },
        ORG,
      ),
    ).rejects.toThrow(/its own output/i);
  });

  it("refuses a recipe naming an item that does not exist", async () => {
    const ctx = build();
    ctx.prisma.inventoryItem.findMany.mockResolvedValue([{ id: "out-1" }]);

    await expect(
      ctx.service.createBom(
        { code: "X", name: "X", outputItemId: "out-1", lines: [{ itemId: "ghost", quantity: 1 }] },
        ORG,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("working out what a run needs", () => {
  it("scales the materials by how many are being made", async () => {
    const ctx = build();

    const plan = await ctx.service.requirementsFor("bom-1", 10, "loc-1", ORG);

    expect(plan.requirements.find((r) => r.itemId === "mat-1")!.needed).toBe(20);
    expect(plan.requirements.find((r) => r.itemId === "mat-2")!.needed).toBe(10);
    expect(plan.canProduce).toBe(true);
  });

  it("reports what is short rather than saying it can be made", async () => {
    const ctx = build({ onHand: { "mat-1": 5, "mat-2": 100 } });

    const plan = await ctx.service.requirementsFor("bom-1", 10, "loc-1", ORG);

    expect(plan.canProduce).toBe(false);
    expect(plan.requirements.find((r) => r.itemId === "mat-1")!.short).toBe(15);
  });

  it("refuses a quantity that is not a whole number of batches", async () => {
    const ctx = build({ outputQuantity: 5 });

    // Half a sterilisation cycle is not a thing.
    await expect(ctx.service.requirementsFor("bom-1", 7, "loc-1", ORG)).rejects.toThrow(
      /multiple of 5/i,
    );
  });
});

describe("completing a run", () => {
  it("carries the materials' value into the output rather than inventing it", async () => {
    const ctx = build();

    await ctx.service.complete("run-1", { quantityProduced: 10 }, ORG, "staff-1");

    // 10 packs: 20 drapes at 500 and 10 strips at 200 = 12,000, so 1,200 each.
    const materialValue = 20 * 500 + 10 * 200;
    expect(ctx.received[0].unitCost * ctx.received[0].quantity).toBe(materialValue);
    expect(ctx.writes.at(-1).materialCost.toString()).toBe(String(materialValue));
  });

  it("draws materials as production, so the ledger does not expense them", async () => {
    const ctx = build();

    await ctx.service.complete("run-1", { quantityProduced: 10 }, ORG);

    // Expensing here would write the value off and the finished pack would
    // carry it again — the same money counted out twice.
    expect(ctx.issued.every((i) => i.type === "PRODUCTION")).toBe(true);
    expect(ctx.issued.map((i) => i.quantity)).toEqual([20, 10]);
  });

  it("draws nothing at all when a material is short", async () => {
    const ctx = build({ onHand: { "mat-1": 5, "mat-2": 100 } });

    await expect(
      ctx.service.complete("run-1", { quantityProduced: 10 }, ORG),
    ).rejects.toThrow(/not enough stock/i);

    // Half-consuming a recipe would leave stock wrong and the run unfinishable.
    expect(ctx.issued).toHaveLength(0);
    expect(ctx.received).toHaveLength(0);
  });

  it("works out the expiry from the recipe's shelf life", async () => {
    const ctx = build({ requiresBatch: true, shelfLifeDays: 180 });

    await ctx.service.complete("run-1", { quantityProduced: 10, batchNumber: "B-1" }, ORG);

    const days = Math.round(
      (new Date(ctx.received[0].expiresAt!).getTime() - Date.now()) / 86_400_000,
    );
    expect(days).toBe(180);
  });

  it("refuses to produce a batch-tracked item with no batch and no shelf life", async () => {
    const ctx = build({ requiresBatch: true, shelfLifeDays: null });

    await expect(
      ctx.service.complete("run-1", { quantityProduced: 10 }, ORG),
    ).rejects.toThrow(/batch-tracked/i);
  });

  it("costs a short yield over what was actually made", async () => {
    const ctx = build();

    // Eight packs from the materials for eight: still 1,200 each, because the
    // requirement scales with what is produced rather than what was planned.
    await ctx.service.complete("run-1", { quantityProduced: 8 }, ORG);

    expect(ctx.received[0].quantity).toBe(8);
    expect(ctx.received[0].unitCost).toBe(1200);
  });

  it("refuses to complete a run twice", async () => {
    const ctx = build({ run: { status: "COMPLETED" } });

    await expect(ctx.service.complete("run-1", {}, ORG)).rejects.toThrow(/already completed/i);
  });

  it("refuses to complete a cancelled run", async () => {
    const ctx = build({ run: { status: "CANCELLED" } });

    await expect(ctx.service.complete("run-1", {}, ORG)).rejects.toThrow(/cancelled/i);
  });
});

describe("cancelling a run", () => {
  it("refuses without a reason", async () => {
    const ctx = build();

    await expect(ctx.service.cancel("run-1", "  ", ORG)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("refuses to cancel one already completed", async () => {
    const ctx = build({ run: { status: "COMPLETED" } });

    // The materials are gone and the output is on a shelf; that is a stock
    // correction, not a cancellation.
    await expect(ctx.service.cancel("run-1", "mistake", ORG)).rejects.toThrow(
      /adjust the stock/i,
    );
  });
});
