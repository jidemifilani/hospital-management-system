import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { StatementsService } from "./statements.service";

/**
 * A statement bills a payer once for a period instead of per visit. The risk
 * it carries is double counting: the receivable already exists from the
 * claims, so anything that recognised it again — or that recorded a lump sum
 * without settling the claims underneath — would leave the books wrong in a
 * way nobody would notice until a reconciliation.
 */

function build(opts: {
  claims?: { id: string; approved: number; paid?: number }[];
  statement?: any;
  payer?: any;
  terms?: number;
} = {}) {
  const writes: any[] = [];
  const claimPayments: { claimId: string; amount: number }[] = [];

  const claims = (opts.claims ?? [
    { id: "clm-1", approved: 5000 },
    { id: "clm-2", approved: 3000 },
  ]).map((c) => ({
    id: c.id,
    approvedAmount: new Decimal(c.approved),
    paidAmount: c.paid === undefined ? null : new Decimal(c.paid),
  }));

  const statement = {
    id: "stm-1",
    statementNumber: "STM-000001",
    status: "ISSUED",
    totalApproved: new Decimal(8000),
    paidAmount: new Decimal(0),
    claims,
    ...opts.statement,
  };

  const tx = {
    payerStatement: {
      create: jest.fn().mockImplementation(({ data }) => {
        writes.push(data);
        return Promise.resolve({ id: "stm-new", ...data });
      }),
      update: jest.fn().mockImplementation(({ data }) => {
        writes.push(data);
        return Promise.resolve({ ...statement, ...data });
      }),
    },
    insuranceClaim: {
      updateMany: jest.fn().mockImplementation((args) => {
        writes.push(args.data);
        return Promise.resolve({ count: claims.length });
      }),
    },
  };

  const prisma = {
    hmoProvider: {
      findFirst: jest.fn().mockResolvedValue(
        opts.payer === null
          ? null
          : { id: "pay-1", name: "Acme Ltd", contracts: [{ paymentTermsDays: opts.terms ?? 30 }] },
      ),
    },
    insuranceClaim: {
      findMany: jest.fn().mockResolvedValue(claims),
      updateMany: tx.insuranceClaim.updateMany,
    },
    payerStatement: {
      findFirst: jest.fn().mockResolvedValue(statement),
      findMany: jest.fn().mockResolvedValue([statement]),
      create: tx.payerStatement.create,
      update: tx.payerStatement.update,
    },
    $transaction: jest.fn().mockImplementation((fn: any) =>
      typeof fn === "function" ? fn(tx) : Promise.all(fn),
    ),
  } as any;

  const hmo = {
    recordPayment: jest.fn().mockImplementation((claimId: string, dto: any) => {
      claimPayments.push({ claimId, amount: dto.amount });
      return Promise.resolve({});
    }),
  } as any;

  return { service: new StatementsService(prisma, hmo), prisma, hmo, writes, claimPayments };
}

const ORG = "org-1";
const period = { periodStart: "2026-09-01", periodEnd: "2026-09-30" };

describe("building a statement", () => {
  it("totals only what is still owed on each claim", async () => {
    const ctx = build({
      claims: [
        { id: "clm-1", approved: 5000 },
        { id: "clm-2", approved: 3000, paid: 1000 },
      ],
    });

    await ctx.service.build({ payerId: "pay-1", ...period }, ORG);

    // Billing the full 8,000 would ask for the 1,000 already received.
    expect(ctx.writes[0].totalApproved.toString()).toBe("7000");
    expect(ctx.writes[0].claimCount).toBe(2);
  });

  it("only gathers claims that are approved and not already billed", async () => {
    const ctx = build();

    await ctx.service.build({ payerId: "pay-1", ...period }, ORG);

    const where = ctx.prisma.insuranceClaim.findMany.mock.calls[0][0].where;
    // A claim still under review has no agreed figure to bill for.
    expect(where.status).toBe("APPROVED");
    expect(where.statementId).toBeNull();
  });

  it("sets the due date from the payer's agreed terms", async () => {
    const ctx = build({ terms: 45 });

    await ctx.service.build({ payerId: "pay-1", ...period }, ORG);

    const days = Math.round((ctx.writes[0].dueOn.getTime() - Date.now()) / 86_400_000);
    expect(days).toBe(45);
  });

  it("refuses a period that ends before it starts", async () => {
    const ctx = build();

    await expect(
      ctx.service.build({ payerId: "pay-1", periodStart: "2026-09-30", periodEnd: "2026-09-01" }, ORG),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuses when there is nothing to bill", async () => {
    const ctx = build();
    ctx.prisma.insuranceClaim.findMany.mockResolvedValue([]);

    await expect(
      ctx.service.build({ payerId: "pay-1", ...period }, ORG),
    ).rejects.toThrow(/no approved claims/i);
  });

  it("refuses an unknown payer", async () => {
    const ctx = build({ payer: null });

    await expect(
      ctx.service.build({ payerId: "nope", ...period }, ORG),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("paying a statement", () => {
  it("spreads the money across the claims underneath it", async () => {
    const ctx = build();

    await ctx.service.recordPayment("stm-1", { amount: 8000, reference: "RMT-1" }, ORG);

    // Recorded only on the statement, every claim below would still read as
    // unpaid and the insurer ageing would never clear.
    expect(ctx.claimPayments).toEqual([
      { claimId: "clm-1", amount: 5000 },
      { claimId: "clm-2", amount: 3000 },
    ]);
  });

  it("settles claims in order and leaves the rest outstanding on a part payment", async () => {
    const ctx = build();

    await ctx.service.recordPayment("stm-1", { amount: 6000 }, ORG);

    expect(ctx.claimPayments).toEqual([
      { claimId: "clm-1", amount: 5000 },
      { claimId: "clm-2", amount: 1000 },
    ]);
    expect(ctx.writes.at(-1).status).toBe("PART_PAID");
  });

  it("marks the statement paid once it is fully settled", async () => {
    const ctx = build();

    await ctx.service.recordPayment("stm-1", { amount: 8000 }, ORG);

    expect(ctx.writes.at(-1).status).toBe("PAID");
    expect(ctx.writes.at(-1).paidAmount.toString()).toBe("8000");
  });

  it("refuses more than the statement still owes", async () => {
    const ctx = build({ statement: { paidAmount: new Decimal(6000) } });

    await expect(
      ctx.service.recordPayment("stm-1", { amount: 5000 }, ORG),
    ).rejects.toThrow(/still outstanding/i);
  });

  it("refuses payment against a statement that was never issued", async () => {
    const ctx = build({ statement: { status: "DRAFT" } });

    await expect(
      ctx.service.recordPayment("stm-1", { amount: 100 }, ORG),
    ).rejects.toThrow(/issue the statement/i);
  });

  it("refuses a payment of nothing", async () => {
    const ctx = build();

    await expect(
      ctx.service.recordPayment("stm-1", { amount: 0 }, ORG),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("voiding a statement", () => {
  it("puts the claims back so they can be billed again", async () => {
    const ctx = build();

    await ctx.service.void("stm-1", "Wrong period", ORG);

    // Left attached to a void statement they would be invisible to both.
    expect(ctx.writes.some((w) => w.statementId === null)).toBe(true);
    expect(ctx.writes.at(-1).status).toBe("VOID");
  });

  it("refuses to void one that has already been paid against", async () => {
    const ctx = build({ statement: { paidAmount: new Decimal(500) } });

    await expect(ctx.service.void("stm-1", "Mistake", ORG)).rejects.toThrow(
      /already been received/i,
    );
  });

  it("refuses to void without a reason", async () => {
    const ctx = build();

    await expect(ctx.service.void("stm-1", "  ", ORG)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
