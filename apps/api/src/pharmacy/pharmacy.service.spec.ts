import { BadRequestException } from "@nestjs/common";
import { PharmacyService } from "./pharmacy.service";

/**
 * Dispensing must take short-dated stock first, and must refuse rather than
 * go negative. Before this logic existed the service claimed in a comment to
 * reduce stock and never did, so these assert the deduction actually happens.
 */

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  expiresAt: Date;
}

function build(batches: Batch[], quantity = 12, status = "PENDING") {
  const decrements: { id: string; by: number }[] = [];
  const emitted: { event: string; payload: any }[] = [];

  const prescription = {
    id: "rx-1",
    status,
    encounterId: "enc-1",
    items: [
      {
        id: "item-1",
        drugItemId: "drug-1",
        quantity,
        drugItem: { name: "Amoxicillin 500mg", sellingPrice: { toString: () => "250" } },
      },
    ],
  };

  const tx = {
    drugStock: {
      findMany: jest.fn().mockImplementation(() =>
        // The service relies on the query ordering by expiry; mirror that here.
        Promise.resolve([...batches].sort((a, b) => +a.expiresAt - +b.expiresAt)),
      ),
      update: jest.fn().mockImplementation(({ where, data }) => {
        decrements.push({ id: where.id, by: data.quantity.decrement });
        return Promise.resolve({});
      }),
    },
    prescriptionItem: { update: jest.fn().mockResolvedValue({}) },
    prescription: { update: jest.fn().mockResolvedValue({}) },
  };

  const prisma = {
    prescription: { findFirst: jest.fn().mockResolvedValue(prescription) },
    $transaction: jest.fn().mockImplementation((cb: (t: unknown) => unknown) => cb(tx)),
  };

  const service = new PharmacyService(
    prisma as never,
    {} as never,
    {} as never,
    { emit: (event: string, payload: unknown) => emitted.push({ event, payload }) } as never,
  );

  // findOnePrescription runs after the transaction; stub it out.
  jest.spyOn(service, "findOnePrescription").mockResolvedValue({} as never);

  return { service, decrements, emitted, tx };
}

const day = (n: number) => new Date(Date.now() + n * 86_400_000);

describe("PharmacyService dispensing", () => {
  it("drains the earliest-expiring batch before touching longer-dated stock", async () => {
    const { service, decrements } = build([
      { id: "late", batchNumber: "LATE", quantity: 100, expiresAt: day(400) },
      { id: "early", batchNumber: "EARLY", quantity: 10, expiresAt: day(20) },
    ]);

    await service.dispensePrescription("rx-1", "staff-1", "org-1");

    expect(decrements).toEqual([
      { id: "early", by: 10 },
      { id: "late", by: 2 },
    ]);
  });

  it("takes everything from one batch when it covers the quantity", async () => {
    const { service, decrements } = build([
      { id: "only", batchNumber: "ONLY", quantity: 50, expiresAt: day(90) },
    ]);

    await service.dispensePrescription("rx-1", "staff-1", "org-1");

    expect(decrements).toEqual([{ id: "only", by: 12 }]);
  });

  it("refuses to dispense more than is on the shelf", async () => {
    const { service, decrements } = build([
      { id: "short", batchNumber: "SHORT", quantity: 5, expiresAt: day(30) },
    ]);

    await expect(
      service.dispensePrescription("rx-1", "staff-1", "org-1"),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Nothing is decremented on a refusal — no partial deduction.
    expect(decrements).toEqual([]);
  });

  it("names the drug and the shortfall so the pharmacist can act", async () => {
    const { service } = build([
      { id: "short", batchNumber: "SHORT", quantity: 5, expiresAt: day(30) },
    ]);

    await expect(
      service.dispensePrescription("rx-1", "staff-1", "org-1"),
    ).rejects.toThrow(/Amoxicillin 500mg.*need 12.*have 5/);
  });

  it("announces the dispense so it can be billed", async () => {
    const { service, emitted } = build([
      { id: "only", batchNumber: "ONLY", quantity: 50, expiresAt: day(90) },
    ]);

    await service.dispensePrescription("rx-1", "staff-1", "org-1");

    const event = emitted.find((e) => e.event === "pharmacy.dispensed");
    expect(event).toBeDefined();
    expect(event!.payload.encounterId).toBe("enc-1");
    expect(event!.payload.items[0]).toMatchObject({
      name: "Amoxicillin 500mg",
      quantity: 12,
      unitPrice: "250",
    });
  });

  it("will not dispense a prescription twice", async () => {
    const { service, decrements } = build(
      [{ id: "only", batchNumber: "ONLY", quantity: 50, expiresAt: day(90) }],
      12,
      "DISPENSED",
    );

    await expect(
      service.dispensePrescription("rx-1", "staff-1", "org-1"),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(decrements).toEqual([]);
  });
});
