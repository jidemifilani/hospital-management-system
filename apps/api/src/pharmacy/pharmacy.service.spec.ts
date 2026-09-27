import { BadRequestException } from "@nestjs/common";
import { PharmacyService } from "./pharmacy.service";

/**
 * Dispensing now delegates stock handling to inventory, which owns FEFO and
 * expiry. These assert pharmacy still refuses to dispense twice, still passes
 * the whole prescription through, and still surfaces a stock refusal instead
 * of marking a prescription dispensed that never left the shelf.
 */

function build(opts: { status?: string; issueFails?: boolean } = {}) {
  const issued: { itemId: string; quantity: number; type?: string }[] = [];
  const emitted: { event: string; payload: any }[] = [];
  const updates: string[] = [];

  const prescription = {
    id: "rx-1",
    prescriptionNo: "RX-001",
    status: opts.status ?? "PENDING",
    encounterId: "enc-1",
    items: [
      {
        id: "item-1",
        drugItemId: "drug-1",
        quantity: 12,
        drugItem: { name: "Amoxicillin 500mg", sellingPrice: { toString: () => "250" } },
      },
      {
        id: "item-2",
        drugItemId: "drug-2",
        quantity: 6,
        drugItem: { name: "Paracetamol 500mg", sellingPrice: { toString: () => "50" } },
      },
    ],
  };

  const tx = {
    prescriptionItem: {
      update: jest.fn().mockImplementation(({ where }) => {
        updates.push(where.id);
        return Promise.resolve({});
      }),
    },
    prescription: { update: jest.fn().mockResolvedValue({}) },
  };

  const prisma = {
    prescription: { findFirst: jest.fn().mockResolvedValue(prescription) },
    stockLocation: {
      findUnique: jest.fn().mockResolvedValue({ id: "loc-pharmacy" }),
      create: jest.fn().mockResolvedValue({ id: "loc-pharmacy" }),
    },
    $transaction: jest.fn().mockImplementation((cb: (t: unknown) => unknown) => cb(tx)),
  };

  const inventory = {
    issue: jest.fn().mockImplementation((dto: any) => {
      if (opts.issueFails) {
        throw new BadRequestException(
          "Insufficient stock for Amoxicillin 500mg: need 12, have 5",
        );
      }
      issued.push({ itemId: dto.itemId, quantity: dto.quantity, type: dto.type });
      return Promise.resolve({ id: "mv-1" });
    }),
  };

  const service = new PharmacyService(
    prisma as never,
    {} as never,
    inventory as never,
    {} as never,
    { emit: (event: string, payload: unknown) => emitted.push({ event, payload }) } as never,
  );

  jest.spyOn(service, "findOnePrescription").mockResolvedValue({} as never);

  return { service, issued, emitted, updates, inventory, tx };
}

describe("PharmacyService dispensing", () => {
  it("issues every line of the prescription from the pharmacy store", async () => {
    const { service, issued } = build();

    await service.dispensePrescription("rx-1", "staff-1", "org-1");

    expect(issued).toEqual([
      { itemId: "drug-1", quantity: 12, type: "CONSUMPTION" },
      { itemId: "drug-2", quantity: 6, type: "CONSUMPTION" },
    ]);
  });

  it("records the issue as consumption, so it leaves stock and hits expense", async () => {
    const { service, inventory } = build();

    await service.dispensePrescription("rx-1", "staff-1", "org-1");

    expect(inventory.issue).toHaveBeenCalledWith(
      expect.objectContaining({ type: "CONSUMPTION", locationId: "loc-pharmacy" }),
      "org-1",
      "staff-1",
    );
  });

  it("marks each line dispensed once stock has actually moved", async () => {
    const { service, updates } = build();

    await service.dispensePrescription("rx-1", "staff-1", "org-1");

    expect(updates).toEqual(["item-1", "item-2"]);
  });

  it("surfaces a stock shortfall rather than marking it dispensed", async () => {
    const { service, updates, tx } = build({ issueFails: true });

    await expect(
      service.dispensePrescription("rx-1", "staff-1", "org-1"),
    ).rejects.toThrow(/Insufficient stock for Amoxicillin 500mg/);

    // Nothing is marked dispensed when the shelf could not supply it.
    expect(updates).toEqual([]);
    expect(tx.prescription.update).not.toHaveBeenCalled();
  });

  it("will not dispense a prescription twice", async () => {
    const { service, issued } = build({ status: "DISPENSED" });

    await expect(
      service.dispensePrescription("rx-1", "staff-1", "org-1"),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(issued).toEqual([]);
  });

  it("announces the dispense so it can be billed", async () => {
    const { service, emitted } = build();

    await service.dispensePrescription("rx-1", "staff-1", "org-1");

    const event = emitted.find((e) => e.event === "pharmacy.dispensed");
    expect(event!.payload.encounterId).toBe("enc-1");
    expect(event!.payload.items).toHaveLength(2);
    expect(event!.payload.items[0]).toMatchObject({
      name: "Amoxicillin 500mg",
      quantity: 12,
      unitPrice: "250",
    });
  });
});
