import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { ChargesService } from "./charges.service";

/**
 * These cover the two places a silent error costs real money: which tariff a
 * patient is billed at, and whether a repeated event bills them twice.
 */

type Encounter = {
  id: string;
  isBillable: boolean;
  patientId: string;
  patient: { nhisNumber: string | null; hmoProvider: string | null };
};

const serviceItem = (over: Partial<Record<string, unknown>> = {}) => ({
  id: "svc-1",
  name: "Full Blood Count",
  category: "LABORATORY",
  unitPrice: new Decimal(8000),
  nhisPrice: new Decimal(3000),
  hmoPrice: new Decimal(5000),
  ...over,
});

function build(encounter: Encounter | null, item: unknown = serviceItem()) {
  const created: Record<string, unknown>[] = [];

  const prisma = {
    encounter: { findFirst: jest.fn().mockResolvedValue(encounter) },
    serviceItem: {
      findFirst: jest.fn().mockResolvedValue(item),
      findUnique: jest.fn().mockResolvedValue(item),
    },
    charge: {
      create: jest.fn().mockImplementation(({ data }) => {
        created.push(data);
        return Promise.resolve({ id: "chg-1", ...data });
      }),
      findFirst: jest.fn().mockResolvedValue({ id: "existing-charge" }),
    },
  };

  return { service: new ChargesService(prisma as never), prisma, created };
}

const PRIVATE: Encounter = {
  id: "enc-1",
  isBillable: true,
  patientId: "pat-1",
  patient: { nhisNumber: null, hmoProvider: null },
};

const base = { encounterId: "enc-1", organizationId: "org-1", source: "LAB_ORDER" as const };

describe("ChargesService pricing", () => {
  it("bills a self-paying patient at the private tariff", async () => {
    const { service, created } = build(PRIVATE);
    await service.post({ ...base, serviceItemId: "svc-1" });
    expect(created[0]!.unitPrice).toEqual(new Decimal(8000));
  });

  it("bills an NHIS patient at the NHIS tariff", async () => {
    const { service, created } = build({
      ...PRIVATE,
      patient: { nhisNumber: "NHIS-99", hmoProvider: null },
    });
    await service.post({ ...base, serviceItemId: "svc-1" });
    expect(created[0]!.unitPrice).toEqual(new Decimal(3000));
  });

  it("bills an HMO patient at the HMO tariff", async () => {
    const { service, created } = build({
      ...PRIVATE,
      patient: { nhisNumber: null, hmoProvider: "Hygeia" },
    });
    await service.post({ ...base, serviceItemId: "svc-1" });
    expect(created[0]!.unitPrice).toEqual(new Decimal(5000));
  });

  it("prefers NHIS over HMO when a patient carries both", async () => {
    const { service, created } = build({
      ...PRIVATE,
      patient: { nhisNumber: "NHIS-99", hmoProvider: "Hygeia" },
    });
    await service.post({ ...base, serviceItemId: "svc-1" });
    expect(created[0]!.unitPrice).toEqual(new Decimal(3000));
  });

  it("falls back to the private tariff when the scheme has no negotiated price", async () => {
    const { service, created } = build(
      { ...PRIVATE, patient: { nhisNumber: "NHIS-99", hmoProvider: null } },
      serviceItem({ nhisPrice: null }),
    );
    await service.post({ ...base, serviceItemId: "svc-1" });
    expect(created[0]!.unitPrice).toEqual(new Decimal(8000));
  });

  it("multiplies by quantity", async () => {
    const { service, created } = build(PRIVATE);
    await service.post({ ...base, serviceItemId: "svc-1", quantity: 3 });
    expect(created[0]!.total).toEqual(new Decimal(24000));
  });

  it("lets an explicit unit price override the catalogue, for drugs", async () => {
    const { service, created } = build(PRIVATE);
    await service.post({
      ...base,
      source: "PHARMACY_DISPENSE",
      description: "Amoxicillin",
      category: "PHARMACY",
      unitPrice: 250,
      quantity: 12,
    });
    expect(created[0]!.unitPrice).toEqual(new Decimal(250));
    expect(created[0]!.total).toEqual(new Decimal(3000));
  });
});

describe("ChargesService guards", () => {
  it("posts nothing against an encounter flagged non-billable", async () => {
    const { service, prisma } = build({ ...PRIVATE, isBillable: false });
    await expect(service.post({ ...base, serviceItemId: "svc-1" })).resolves.toBeNull();
    expect(prisma.charge.create).not.toHaveBeenCalled();
  });

  it("refuses a charge it cannot price", async () => {
    const { service } = build(PRIVATE, null);
    await expect(service.post({ ...base })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an unknown encounter rather than billing into the void", async () => {
    const { service } = build(null);
    await expect(service.post({ ...base, serviceItemId: "svc-1" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("returns the existing charge when the same event is posted twice", async () => {
    const { service, prisma } = build(PRIVATE);
    prisma.charge.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "5.22.0",
      }),
    );

    const result = await service.post({
      ...base,
      serviceItemId: "svc-1",
      sourceRef: "lab-1:item-1",
    });

    // The duplicate is swallowed and the original returned, so a replayed
    // event never bills the patient a second time.
    expect(result).toEqual({ id: "existing-charge" });
    expect(prisma.charge.findFirst).toHaveBeenCalled();
  });
});
