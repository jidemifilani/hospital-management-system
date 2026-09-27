import { BadRequestException } from "@nestjs/common";
import { AccountingService } from "./accounting.service";

/**
 * The ledger rests on one invariant: debits equal credits, always. These cover
 * the ways a caller might break it, because a ledger that silently accepts an
 * unbalanced entry is worse than no ledger at all.
 */

const account = (code: string, isPostable = true) => ({
  id: `acc-${code}`,
  code,
  name: `Account ${code}`,
  type: code.startsWith("1") ? "ASSET" : "INCOME",
  isPostable,
});

function build(accounts = [account("1010"), account("4010")]) {
  const created: any[] = [];

  const prisma = {
    account: { findMany: jest.fn().mockResolvedValue(accounts) },
    fiscalPeriod: { findFirst: jest.fn().mockResolvedValue(null) },
    journalEntry: {
      create: jest.fn().mockImplementation(({ data }) => {
        created.push(data);
        return Promise.resolve({ id: "je-1", ...data });
      }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  return { service: new AccountingService(prisma as never), prisma, created };
}

const org = "org-1";

describe("AccountingService posting", () => {
  it("accepts an entry whose debits equal its credits", async () => {
    const { service, created } = build();

    await service.postEntry({
      description: "Consultation billed",
      organizationId: org,
      lines: [
        { accountCode: "1010", debit: 25000 },
        { accountCode: "4010", credit: 25000 },
      ],
    });

    expect(created).toHaveLength(1);
    expect(created[0].lines.create).toHaveLength(2);
  });

  it("refuses an entry that does not balance", async () => {
    const { service, prisma } = build();

    await expect(
      service.postEntry({
        description: "Lopsided",
        organizationId: org,
        lines: [
          { accountCode: "1010", debit: 5000 },
          { accountCode: "4010", credit: 4000 },
        ],
      }),
    ).rejects.toThrow(/does not balance/);

    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  it("refuses a posting to a group account", async () => {
    const { service } = build([account("1000", false), account("4010")]);

    await expect(
      service.postEntry({
        description: "Posting to a rolled-up total",
        organizationId: org,
        lines: [
          { accountCode: "1000", debit: 100 },
          { accountCode: "4010", credit: 100 },
        ],
      }),
    ).rejects.toThrow(/group account/);
  });

  it("refuses a line carrying both a debit and a credit", async () => {
    const { service } = build();

    await expect(
      service.postEntry({
        description: "Both sides at once",
        organizationId: org,
        lines: [
          { accountCode: "1010", debit: 100, credit: 100 },
          { accountCode: "4010", credit: 100 },
        ],
      }),
    ).rejects.toThrow(/either a debit or a credit/);
  });

  it("refuses negative amounts, which would fake a balanced entry", async () => {
    const { service } = build();

    await expect(
      service.postEntry({
        description: "Negative credit",
        organizationId: org,
        lines: [
          { accountCode: "1010", debit: -100 },
          { accountCode: "4010", credit: -100 },
        ],
      }),
    ).rejects.toThrow(/must not be negative/);
  });

  it("refuses a single-sided entry", async () => {
    const { service } = build();

    await expect(
      service.postEntry({
        description: "One line only",
        organizationId: org,
        lines: [{ accountCode: "1010", debit: 100 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuses an unknown account code rather than inventing one", async () => {
    const { service } = build([account("1010")]);

    await expect(
      service.postEntry({
        description: "Typo in the code",
        organizationId: org,
        lines: [
          { accountCode: "1010", debit: 100 },
          { accountCode: "9999", credit: 100 },
        ],
      }),
    ).rejects.toThrow(/Unknown account code/);
  });

  it("refuses to post into a closed period", async () => {
    const { service, prisma } = build();
    prisma.fiscalPeriod.findFirst.mockResolvedValue({ name: "2026-01" });

    await expect(
      service.postEntry({
        description: "Back-dated into a closed month",
        organizationId: org,
        lines: [
          { accountCode: "1010", debit: 100 },
          { accountCode: "4010", credit: 100 },
        ],
      }),
    ).rejects.toThrow(/closed/);
  });

  it("balances across many lines, not just a pair", async () => {
    const { service, created } = build([
      account("1010"),
      account("4010"),
      account("4020"),
    ]);

    await service.postEntry({
      description: "Invoice with two revenue lines",
      organizationId: org,
      lines: [
        { accountCode: "1010", debit: 41000 },
        { accountCode: "4010", credit: 25000 },
        { accountCode: "4020", credit: 16000 },
      ],
    });

    expect(created).toHaveLength(1);
  });
});
