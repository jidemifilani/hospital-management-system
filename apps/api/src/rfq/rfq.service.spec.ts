import { BadRequestException, NotFoundException } from "@nestjs/common";
import { RfqService } from "./rfq.service";

/**
 * An RFQ decides who gets paid, so the guards that matter are the ones that
 * stop a quote being priced against someone else's RFQ, and stop an award
 * landing on anything but a real, received quote.
 */

const ORG = "org-1";

const item = (id: string, quantity = 10) => ({
  id, itemName: `Item ${id}`, category: null, unit: "box", quantity, specification: null, sortOrder: 0,
});

const line = (rfqItemId: string, unitPrice: number, quantity: number) => ({
  id: `line-${rfqItemId}`,
  rfqItemId,
  unitPrice: { toString: () => String(unitPrice) } as never,
  quantity,
  totalPrice: { toString: () => String(unitPrice * quantity) } as never,
  notes: null,
});

function build(overrides: Record<string, unknown> = {}) {
  const created: any[] = [];
  const quoteUpdates: any[] = [];
  const rejectedMany: any[] = [];

  const tx = {
    purchaseOrder: {
      create: jest.fn().mockImplementation(({ data }) => {
        created.push(data);
        return Promise.resolve({ id: "po-1", poNumber: "PO-123", items: [] });
      }),
    },
    rfqQuote: {
      update: jest.fn().mockImplementation((args) => { quoteUpdates.push(args); return Promise.resolve({}); }),
      updateMany: jest.fn().mockImplementation((args) => { rejectedMany.push(args); return Promise.resolve({ count: 1 }); }),
    },
    rfqQuoteLine: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    rfq: { update: jest.fn().mockResolvedValue({ id: "rfq-1", status: "AWARDED" }) },
  };

  const prisma = {
    rfq: {
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    rfqQuote: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    rfqQuoteLine: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    $transaction: jest.fn().mockImplementation((fn: any) => fn(tx)),
    ...overrides,
  };

  const mail = { sendHtml: jest.fn().mockResolvedValue(true) };

  return {
    service: new RfqService(prisma as never, mail as never),
    prisma, tx, mail, created, quoteUpdates, rejectedMany,
  };
}

describe("RfqService.submitQuote", () => {
  it("refuses lines that reference an item from a different RFQ", async () => {
    const { service, prisma } = build();
    prisma.rfqQuote.findFirst = jest.fn().mockResolvedValue({
      id: "q-1",
      rfq: { status: "SENT", items: [item("i-1")] },
    });

    await expect(
      service.submitQuote("q-1", { lines: [{ rfqItemId: "i-from-another-rfq", unitPrice: 50 }] }, ORG),
    ).rejects.toThrow(BadRequestException);
  });

  it("refuses the same item priced twice in one quote", async () => {
    const { service, prisma } = build();
    prisma.rfqQuote.findFirst = jest.fn().mockResolvedValue({
      id: "q-1",
      rfq: { status: "SENT", items: [item("i-1")] },
    });

    await expect(
      service.submitQuote("q-1", {
        lines: [
          { rfqItemId: "i-1", unitPrice: 50 },
          { rfqItemId: "i-1", unitPrice: 40 },
        ],
      }, ORG),
    ).rejects.toThrow(BadRequestException);
  });

  it("defaults a line's quantity to the quantity the RFQ asked for", async () => {
    const { service, prisma, tx } = build();
    prisma.rfqQuote.findFirst = jest.fn().mockResolvedValue({
      id: "q-1",
      rfq: { status: "SENT", items: [item("i-1", 25)] },
    });

    await service.submitQuote("q-1", { lines: [{ rfqItemId: "i-1", unitPrice: 4 }] }, ORG);

    const data = tx.rfqQuote.update.mock.calls[0]![0].data;
    expect(data.lines.create[0].quantity).toBe(25);
    expect(data.totalAmount.toString()).toBe("100"); // 4 x 25
    expect(data.status).toBe("RECEIVED");
  });

  it("replaces previous pricing instead of appending to it", async () => {
    const { service, prisma, tx } = build();
    prisma.rfqQuote.findFirst = jest.fn().mockResolvedValue({
      id: "q-1",
      rfq: { status: "SENT", items: [item("i-1")] },
    });

    await service.submitQuote("q-1", { lines: [{ rfqItemId: "i-1", unitPrice: 9 }] }, ORG);

    expect(tx.rfqQuoteLine.deleteMany).toHaveBeenCalledWith({ where: { rfqQuoteId: "q-1" } });
  });

  it("refuses a quote on an RFQ that has not been sent", async () => {
    const { service, prisma } = build();
    prisma.rfqQuote.findFirst = jest.fn().mockResolvedValue({
      id: "q-1",
      rfq: { status: "DRAFT", items: [item("i-1")] },
    });

    await expect(
      service.submitQuote("q-1", { lines: [{ rfqItemId: "i-1", unitPrice: 5 }] }, ORG),
    ).rejects.toThrow(BadRequestException);
  });
});

describe("RfqService.award", () => {
  const sentRfq = (quotes: any[], status = "CLOSED") => ({
    id: "rfq-1",
    rfqNumber: "RFQ-001",
    status,
    items: [item("i-1", 10), item("i-2", 4)],
    quotes,
  });

  it("raises a purchase order from the winning quote's lines", async () => {
    const { service, prisma, created, quoteUpdates, rejectedMany } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue(
      sentRfq([
        {
          id: "q-win", vendorName: "Alpha Supplies", vendorContact: null, vendorEmail: "a@x.com",
          status: "RECEIVED", notes: "net 30", leadTimeDays: 7,
          totalAmount: { toString: () => "140" } as never,
          lines: [line("i-1", 10, 10), line("i-2", 10, 4)],
        },
      ]),
    );

    const result = await service.award("rfq-1", "q-win", "staff-1", ORG);

    expect(created).toHaveLength(1);
    expect(created[0].vendorName).toBe("Alpha Supplies");
    expect(created[0].items.create).toHaveLength(2);
    expect(created[0].items.create[0].itemName).toBe("Item i-1");
    expect(created[0].items.create[0].quantity).toBe(10);
    expect(created[0].notes).toContain("RFQ-001");
    expect(result.purchaseOrder.poNumber).toBe("PO-123");

    // The winner is marked awarded and every other received quote rejected.
    expect(quoteUpdates[0]).toMatchObject({ where: { id: "q-win" }, data: { status: "AWARDED" } });
    expect(rejectedMany[0]).toMatchObject({
      where: { rfqId: "rfq-1", id: { not: "q-win" }, status: "RECEIVED" },
      data: { status: "REJECTED" },
    });
  });

  it("does all of it in one transaction, so an award cannot exist without its order", async () => {
    const { service, prisma } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue(
      sentRfq([{
        id: "q-win", vendorName: "Alpha", vendorContact: null, vendorEmail: null,
        status: "RECEIVED", notes: null, leadTimeDays: null,
        totalAmount: { toString: () => "100" } as never,
        lines: [line("i-1", 10, 10)],
      }]),
    );

    await service.award("rfq-1", "q-win", undefined, ORG);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("refuses to award a quote that was never received", async () => {
    const { service, prisma } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue(
      sentRfq([{ id: "q-pending", status: "PENDING", lines: [] }]),
    );

    await expect(service.award("rfq-1", "q-pending", undefined, ORG))
      .rejects.toThrow(BadRequestException);
  });

  it("refuses to award a received quote carrying no priced lines", async () => {
    const { service, prisma } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue(
      sentRfq([{ id: "q-empty", status: "RECEIVED", lines: [] }]),
    );

    await expect(service.award("rfq-1", "q-empty", undefined, ORG))
      .rejects.toThrow(BadRequestException);
  });

  it("refuses a second award on an RFQ already awarded", async () => {
    const { service, prisma } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue(
      sentRfq([{ id: "q-1", status: "RECEIVED", lines: [line("i-1", 1, 1)] }], "AWARDED"),
    );

    await expect(service.award("rfq-1", "q-1", undefined, ORG))
      .rejects.toThrow(BadRequestException);
  });

  it("refuses to award a draft RFQ that was never issued to anyone", async () => {
    const { service, prisma } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue(
      sentRfq([{ id: "q-1", status: "RECEIVED", lines: [line("i-1", 1, 1)] }], "DRAFT"),
    );

    await expect(service.award("rfq-1", "q-1", undefined, ORG))
      .rejects.toThrow(BadRequestException);
  });

  it("refuses a quote id that belongs to a different RFQ", async () => {
    const { service, prisma } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue(sentRfq([]));

    await expect(service.award("rfq-1", "q-elsewhere", undefined, ORG))
      .rejects.toThrow(NotFoundException);
  });
});

describe("RfqService.sendRfq", () => {
  it("refuses to send an RFQ with nobody invited", async () => {
    const { service, prisma } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue({
      id: "rfq-1", rfqNumber: "RFQ-001", status: "DRAFT", dueDate: null, items: [item("i-1")], quotes: [],
    });

    await expect(service.sendRfq("rfq-1", ORG)).rejects.toThrow(BadRequestException);
  });

  it("reports how many vendors were actually emailed, not how many were invited", async () => {
    const { service, prisma, mail } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue({
      id: "rfq-1", rfqNumber: "RFQ-001", title: "Restock", status: "DRAFT", dueDate: null,
      items: [item("i-1")],
      quotes: [
        { id: "q-1", vendorName: "Alpha", vendorEmail: "a@x.com" },
        { id: "q-2", vendorName: "Beta",  vendorEmail: null },
      ],
    });

    const result = await service.sendRfq("rfq-1", ORG);

    expect(result.invited).toBe(2);
    expect(result.emailed).toBe(1);
    expect(result.withoutEmail).toBe(1);
    expect(mail.sendHtml).toHaveBeenCalledWith(["a@x.com"], expect.stringContaining("RFQ-001"), expect.any(String));
  });

  it("still sends when mail is unavailable, and says nothing was emailed", async () => {
    const { service, prisma, mail } = build();
    mail.sendHtml = jest.fn().mockResolvedValue(false);
    prisma.rfq.findFirst = jest.fn().mockResolvedValue({
      id: "rfq-1", rfqNumber: "RFQ-001", title: "Restock", status: "DRAFT", dueDate: null,
      items: [item("i-1")],
      quotes: [{ id: "q-1", vendorName: "Alpha", vendorEmail: "a@x.com" }],
    });

    const result = await service.sendRfq("rfq-1", ORG);

    expect(result.emailed).toBe(0);
    expect(result.invited).toBe(1);
  });

  it("refuses to send the same RFQ twice", async () => {
    const { service, prisma } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue({
      id: "rfq-1", rfqNumber: "RFQ-001", status: "SENT", dueDate: null,
      items: [item("i-1")], quotes: [{ id: "q-1", vendorName: "A", vendorEmail: "a@x.com" }],
    });

    await expect(service.sendRfq("rfq-1", ORG)).rejects.toThrow(BadRequestException);
  });

  it("escapes vendor-controlled text in the invitation email", async () => {
    const { service, prisma, mail } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue({
      id: "rfq-1", rfqNumber: "RFQ-001", title: "Restock", status: "DRAFT", dueDate: null,
      items: [{ ...item("i-1"), itemName: '<script>alert(1)</script>' }],
      quotes: [{ id: "q-1", vendorName: "Alpha", vendorEmail: "a@x.com" }],
    });

    await service.sendRfq("rfq-1", ORG);

    const html = mail.sendHtml.mock.calls[0]![2];
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("RfqService.comparison", () => {
  it("marks the cheapest unit price on each row and flags a partial quote", async () => {
    const { service, prisma } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue({
      id: "rfq-1", rfqNumber: "RFQ-001", title: "Restock", status: "CLOSED", awardedQuoteId: null,
      items: [item("i-1"), item("i-2")],
      quotes: [
        {
          id: "q-cheap", vendorName: "Alpha", status: "RECEIVED", leadTimeDays: 5, validUntil: null,
          totalAmount: { toString: () => "100" } as never,
          lines: [line("i-1", 5, 10), line("i-2", 12, 4)],
        },
        {
          id: "q-partial", vendorName: "Beta", status: "RECEIVED", leadTimeDays: 2, validUntil: null,
          totalAmount: { toString: () => "30" } as never,
          lines: [line("i-1", 3, 10)], // priced only one of the two items
        },
      ],
    });

    const result = await service.comparison("rfq-1", ORG);

    const row1 = result.rows.find((r) => r.rfqItemId === "i-1")!;
    expect(row1.cells.find((c) => c.quoteId === "q-partial")!.isLowest).toBe(true);
    expect(row1.cells.find((c) => c.quoteId === "q-cheap")!.isLowest).toBe(false);

    // Beta left i-2 unpriced, so that cell is empty and Alpha wins the row.
    const row2 = result.rows.find((r) => r.rfqItemId === "i-2")!;
    expect(row2.cells.find((c) => c.quoteId === "q-partial")!.unitPrice).toBeNull();
    expect(row2.cells.find((c) => c.quoteId === "q-cheap")!.isLowest).toBe(true);

    const beta = result.vendors.find((v) => v.quoteId === "q-partial")!;
    expect(beta.complete).toBe(false);
    expect(beta.itemsQuoted).toBe(1);
  });

  it("does not call a partial quote the lowest total even when its number is smallest", async () => {
    const { service, prisma } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue({
      id: "rfq-1", rfqNumber: "RFQ-001", title: "Restock", status: "CLOSED", awardedQuoteId: null,
      items: [item("i-1"), item("i-2")],
      quotes: [
        {
          id: "q-complete", vendorName: "Alpha", status: "RECEIVED", leadTimeDays: null, validUntil: null,
          totalAmount: { toString: () => "100" } as never,
          lines: [line("i-1", 5, 10), line("i-2", 12, 4)],
        },
        {
          id: "q-partial", vendorName: "Beta", status: "RECEIVED", leadTimeDays: null, validUntil: null,
          totalAmount: { toString: () => "30" } as never, // cheaper, but incomplete
          lines: [line("i-1", 3, 10)],
        },
      ],
    });

    const result = await service.comparison("rfq-1", ORG);

    expect(result.vendors.find((v) => v.quoteId === "q-partial")!.lowestTotal).toBe(false);
    expect(result.vendors.find((v) => v.quoteId === "q-complete")!.lowestTotal).toBe(true);
  });

  it("surfaces vendors who have not answered and those who declined", async () => {
    const { service, prisma } = build();
    prisma.rfq.findFirst = jest.fn().mockResolvedValue({
      id: "rfq-1", rfqNumber: "RFQ-001", title: "Restock", status: "SENT", awardedQuoteId: null,
      items: [item("i-1")],
      quotes: [
        { id: "q-1", vendorName: "Alpha", status: "RECEIVED", leadTimeDays: null, validUntil: null,
          totalAmount: { toString: () => "50" } as never, lines: [line("i-1", 5, 10)] },
        { id: "q-2", vendorName: "Silent Co", status: "PENDING", lines: [] },
        { id: "q-3", vendorName: "No Thanks", status: "DECLINED", lines: [] },
      ],
    });

    const result = await service.comparison("rfq-1", ORG);

    expect(result.awaiting).toEqual([{ quoteId: "q-2", vendorName: "Silent Co" }]);
    expect(result.declined).toEqual([{ quoteId: "q-3", vendorName: "No Thanks" }]);
    expect(result.vendors).toHaveLength(1);
  });
});
