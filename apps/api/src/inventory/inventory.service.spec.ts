import { BadRequestException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { InventoryService } from "./inventory.service";

/**
 * Stock levels, the move log and the ledger have to agree. These cover the
 * arithmetic behind that: costing on receipt, refusing to go negative, and
 * a count producing the right correction and the right accounting signal.
 */

function build(opts: { onHand?: number; averageCost?: number; levelQty?: number } = {}) {
  const emitted: { event: string; payload: any }[] = [];
  const levelWrites: { delta: number }[] = [];
  let savedAverage: Decimal | null = null;

  const item = {
    id: "item-1",
    name: "Examination Gloves",
    averageCost: new Decimal(opts.averageCost ?? 2000),
  };

  const tx = {
    stockLevel: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: opts.onHand ?? 0 } }),
      findUnique: jest.fn().mockResolvedValue(
        opts.levelQty === undefined ? null : { quantity: opts.levelQty },
      ),
      upsert: jest.fn().mockImplementation(({ create }) => {
        levelWrites.push({ delta: create.quantity });
        return Promise.resolve({});
      }),
    },
    inventoryItem: {
      update: jest.fn().mockImplementation(({ data }) => {
        savedAverage = data.averageCost;
        return Promise.resolve({});
      }),
    },
    stockMove: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "mv-1", ...data })),
    },
  };

  const prisma = {
    inventoryItem: { findFirst: jest.fn().mockResolvedValue(item) },
    stockLocation: { findFirst: jest.fn().mockResolvedValue({ id: "loc-1" }) },
    $transaction: jest.fn().mockImplementation((cb: (t: unknown) => unknown) => cb(tx)),
  };

  const service = new InventoryService(prisma as never, {
    emit: (event: string, payload: unknown) => emitted.push({ event, payload }),
  } as never);

  return { service, tx, emitted, levelWrites, average: () => savedAverage };
}

const org = "org-1";

describe("InventoryService receiving", () => {
  it("blends the moving average across two receipts at different prices", async () => {
    // 100 already on hand at 2,000, receiving 50 at 2,600.
    const { service, average } = build({ onHand: 100, averageCost: 2000 });

    await service.receive(
      { itemId: "item-1", locationId: "loc-1", quantity: 50, unitCost: 2600 },
      org,
    );

    // (100×2000 + 50×2600) / 150 = 2,200
    expect(average()!.toString()).toBe("2200");
  });

  it("takes the receipt price as the average for a first receipt", async () => {
    const { service, average } = build({ onHand: 0, averageCost: 0 });

    await service.receive(
      { itemId: "item-1", locationId: "loc-1", quantity: 40, unitCost: 1500 },
      org,
    );

    expect(average()!.toString()).toBe("1500");
  });

  it("refuses a non-positive receipt", async () => {
    const { service } = build();
    await expect(
      service.receive({ itemId: "item-1", locationId: "loc-1", quantity: 0, unitCost: 100 }, org),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("InventoryService issuing", () => {
  it("refuses to issue more than the location holds", async () => {
    const { service, tx } = build({ levelQty: 25 });

    await expect(
      service.issue({ itemId: "item-1", locationId: "loc-1", quantity: 999 }, org),
    ).rejects.toThrow(/need 999, have 25/);

    expect(tx.stockLevel.upsert).not.toHaveBeenCalled();
  });

  it("values the issue at the moving average, for the ledger", async () => {
    const { service, emitted } = build({ levelQty: 40, averageCost: 2200 });

    await service.issue(
      { itemId: "item-1", locationId: "loc-1", quantity: 15, type: "CONSUMPTION" },
      org,
    );

    const event = emitted.find((e) => e.event === "inventory.issued");
    expect(event!.payload.value).toBe("33000");
  });
});

describe("InventoryService counting", () => {
  it("works out the correction from the counted figure", async () => {
    // Book says 25, the shelf has 22.
    const { service, levelWrites } = build({ levelQty: 25, averageCost: 2200 });

    const move = await service.adjust(
      { itemId: "item-1", locationId: "loc-1", countedQuantity: 22, reason: "Quarterly count" },
      org,
    );

    expect(move.quantity).toBe(3);
    expect(levelWrites[0]!.delta).toBe(-3);
    expect(move.reason).toContain("book 25 → counted 22");
  });

  it("signals a shortfall so the ledger can write it off", async () => {
    const { service, emitted } = build({ levelQty: 25, averageCost: 2200 });

    await service.adjust(
      { itemId: "item-1", locationId: "loc-1", countedQuantity: 22, reason: "Count" },
      org,
    );

    const event = emitted.find((e) => e.event === "inventory.adjusted");
    expect(event!.payload.delta).toBe(-3);
    expect(event!.payload.value).toBe("6600");
  });

  it("signals a surplus the other way", async () => {
    const { service, emitted } = build({ levelQty: 20, averageCost: 1000 });

    await service.adjust(
      { itemId: "item-1", locationId: "loc-1", countedQuantity: 23, reason: "Count" },
      org,
    );

    const event = emitted.find((e) => e.event === "inventory.adjusted");
    expect(event!.payload.delta).toBe(3);
    expect(event!.payload.value).toBe("3000");
  });

  it("refuses a count that changes nothing", async () => {
    const { service } = build({ levelQty: 25 });
    await expect(
      service.adjust(
        { itemId: "item-1", locationId: "loc-1", countedQuantity: 25, reason: "Count" },
        org,
      ),
    ).rejects.toThrow(/already matches/);
  });

  it("requires a reason, since an unexplained correction is not auditable", async () => {
    const { service } = build({ levelQty: 25 });
    await expect(
      service.adjust(
        { itemId: "item-1", locationId: "loc-1", countedQuantity: 22, reason: "  " },
        org,
      ),
    ).rejects.toThrow(/needs a reason/);
  });
});

describe("InventoryService transfers", () => {
  it("refuses a transfer to the same location", async () => {
    const { service } = build({ levelQty: 50 });
    await expect(
      service.transfer(
        { itemId: "item-1", fromLocationId: "loc-1", toLocationId: "loc-1", quantity: 5 },
        org,
      ),
    ).rejects.toThrow(/must differ/);
  });

  it("moves stock out of one location and into the other", async () => {
    const { service, levelWrites } = build({ levelQty: 50 });

    await service.transfer(
      { itemId: "item-1", fromLocationId: "loc-1", toLocationId: "loc-2", quantity: 40 },
      org,
    );

    // Net zero: the holding moved, it did not change.
    expect(levelWrites.map((w) => w.delta)).toEqual([-40, 40]);
  });
});
