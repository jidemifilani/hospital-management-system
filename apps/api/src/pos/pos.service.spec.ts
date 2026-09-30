import { BadRequestException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { PosService } from "./pos.service";

/**
 * A till has to reconcile. These cover the arithmetic a cashier is held to at
 * the end of a shift, and the two things that quietly break it: a refund that
 * returns stock somewhere other than where it came from, and a reversal
 * counted twice.
 */

function build(opts: { sales?: { total: number; method: string; status?: string }[] } = {}) {
  const issued: any[] = [];
  const received: any[] = [];
  let saved: any = null;

  const session = {
    id: "sess-1",
    sessionNumber: "TILL-001",
    terminalName: "Front Desk",
    status: "OPEN",
    openingFloat: new Decimal(5000),
    openedAt: new Date(),
    closedAt: null,
    closingCounted: null,
    variance: null,
    sales: (opts.sales ?? []).map((s) => ({
      total: new Decimal(s.total),
      method: s.method,
      status: s.status ?? "COMPLETED",
      lines: [],
    })),
  };

  const prisma = {
    posSession: {
      // Honour the query's filters, or the harness lies about what the
      // service actually sees.
      findFirst: jest.fn().mockImplementation((args?: any) => {
        const want = args?.include?.sales?.where;
        if (!want) return Promise.resolve(session);
        return Promise.resolve({
          ...session,
          sales: session.sales.filter(
            (sale) =>
              (want.method === undefined || sale.method === want.method) &&
              (want.status?.not === undefined || sale.status !== want.status.not),
          ),
        });
      }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "sess-1", ...data })),
      update: jest.fn().mockImplementation(({ data }) => {
        saved = data;
        return Promise.resolve({ ...session, ...data });
      }),
    },
    inventoryItem: {
      findMany: jest.fn().mockResolvedValue([
        { id: "item-1", name: "Adhesive Plaster", sellingPrice: new Decimal(1500), averageCost: new Decimal(900) },
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: "item-1",
        averageCost: new Decimal(900),
        requiresBatch: false,
      }),
      findFirst: jest.fn().mockResolvedValue({
        id: "item-1",
        averageCost: new Decimal(900),
        requiresBatch: false,
      }),
    },
    stockLocation: {
      findFirst: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve({ id: where.id ?? "loc-default" }),
      ),
      findUnique: jest.fn().mockResolvedValue({ id: "loc-default" }),
      create: jest.fn().mockResolvedValue({ id: "loc-default" }),
    },
    posSale: {
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "sale-1", ...data })),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn().mockResolvedValue([{}, { id: "refund-1", total: new Decimal(-4500), lines: [] }]),
  };

  const inventory = {
    issue: jest.fn().mockImplementation((dto: any) => {
      issued.push(dto);
      return Promise.resolve({});
    }),
    receive: jest.fn().mockImplementation((dto: any) => {
      received.push(dto);
      return Promise.resolve({});
    }),
  };

  const service = new PosService(prisma as never, inventory as never, { emit: jest.fn() } as never);

  return { service, prisma, issued, received, saved: () => saved, session };
}

const org = "org-1";

describe("PosService till reconciliation", () => {
  it("expects the float plus cash taken", async () => {
    const { service, saved } = build({
      sales: [
        { total: 4500, method: "CASH" },
        { total: 3000, method: "POS_CARD" },
      ],
    });

    await service.closeSession("sess-1", { closingCounted: 9500 }, org);

    // Card takings never reach the drawer.
    expect(saved().closingExpected.toString()).toBe("9500");
    expect(saved().variance.toString()).toBe("0");
  });

  it("nets a refund against the sale it reverses", async () => {
    const { service, saved } = build({
      sales: [
        { total: 4500, method: "CASH", status: "REFUNDED" },
        { total: -4500, method: "CASH" },
      ],
    });

    await service.closeSession("sess-1", { closingCounted: 5000 }, org);

    // Money came in and went back out, so only the float should remain.
    // Counting the refund without the original reversed it twice.
    expect(saved().closingExpected.toString()).toBe("5000");
    expect(saved().variance.toString()).toBe("0");
  });

  it("reports a shortfall as a negative variance", async () => {
    const { service, saved } = build({ sales: [{ total: 4500, method: "CASH" }] });

    await service.closeSession("sess-1", { closingCounted: 9000 }, org);

    expect(saved().closingExpected.toString()).toBe("9500");
    expect(saved().variance.toString()).toBe("-500");
  });

  it("refuses to close a till twice", async () => {
    const { service, prisma } = build();
    prisma.posSession.findFirst.mockResolvedValue({ ...build().session, status: "CLOSED" });

    await expect(
      service.closeSession("sess-1", { closingCounted: 5000 }, org),
    ).rejects.toThrow(/already closed/);
  });
});

describe("PosService selling", () => {
  it("takes stock from the counter it sold from", async () => {
    const { service, issued } = build();

    await service.sell(
      { sessionId: "sess-1", lines: [{ itemId: "item-1", quantity: 3 }], locationId: "loc-counter" },
      org,
    );

    expect(issued[0]).toMatchObject({ itemId: "item-1", quantity: 3, locationId: "loc-counter" });
  });

  it("refuses a cash sale tendered short", async () => {
    const { service } = build();

    await expect(
      service.sell(
        {
          sessionId: "sess-1",
          lines: [{ itemId: "item-1", quantity: 2 }],
          method: "CASH",
          amountTendered: 100,
        },
        org,
      ),
    ).rejects.toThrow(/less than the total/);
  });

  it("refuses a discount larger than the sale", async () => {
    const { service } = build();

    await expect(
      service.sell(
        { sessionId: "sess-1", lines: [{ itemId: "item-1", quantity: 1 }], discount: 99999 },
        org,
      ),
    ).rejects.toThrow(/cannot exceed/);
  });

  it("refuses to sell against a closed till", async () => {
    const { service, prisma } = build();
    prisma.posSession.findFirst.mockResolvedValue({ id: "sess-1", status: "CLOSED" });

    await expect(
      service.sell({ sessionId: "sess-1", lines: [{ itemId: "item-1", quantity: 1 }] }, org),
    ).rejects.toThrow(/Till is closed/);
  });

  it("gives change on an over-tender", async () => {
    const { service, prisma } = build();

    await service.sell(
      {
        sessionId: "sess-1",
        lines: [{ itemId: "item-1", quantity: 3 }],
        method: "CASH",
        amountTendered: 5000,
      },
      org,
    );

    const written = prisma.posSale.create.mock.calls[0]![0].data;
    expect(written.total.toString()).toBe("4500");
    expect(written.changeGiven.toString()).toBe("500");
  });
});

describe("PosService refunds", () => {
  it("returns goods to the location they were sold from", async () => {
    const { service, prisma, received } = build();
    prisma.posSale.findFirst.mockResolvedValue({
      id: "sale-1",
      receiptNumber: "RCP-1",
      status: "COMPLETED",
      sessionId: "sess-1",
      patientId: null,
      locationId: "loc-counter",
      subtotal: new Decimal(4500),
      discount: new Decimal(0),
      total: new Decimal(4500),
      method: "CASH",
      lines: [
        { itemId: "item-1", description: "Adhesive Plaster", quantity: 3, unitPrice: new Decimal(1500), total: new Decimal(4500) },
      ],
    });

    await service.refund("sale-1", "Wrong item", org);

    // Defaulting elsewhere would quietly shift stock between locations.
    expect(received[0]).toMatchObject({ itemId: "item-1", quantity: 3, locationId: "loc-counter" });
  });

  it("refuses to refund the same sale twice", async () => {
    const { service, prisma } = build();
    prisma.posSale.findFirst.mockResolvedValue({ id: "sale-1", status: "REFUNDED", lines: [] });

    await expect(service.refund("sale-1", "again", org)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
