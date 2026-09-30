import { Injectable, BadRequestException, NotFoundException, Logger } from "@nestjs/common";
import { AccountType, JournalSource, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";

const genEntryNo = customAlphabet("0123456789", 8);

const ZERO = new Decimal(0);

/** Accounts whose balance rises with a debit. */
const DEBIT_NORMAL: AccountType[] = ["ASSET", "EXPENSE"];

export interface PostLine {
  accountCode: string;
  debit?: number | Decimal;
  credit?: number | Decimal;
  description?: string;
  partnerType?: string;
  partnerId?: string;
}

export interface PostEntryInput {
  description: string;
  lines: PostLine[];
  organizationId: string;
  entryDate?: Date;
  reference?: string;
  source?: JournalSource;
  sourceId?: string;
  postedById?: string | null;
}

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(private prisma: PrismaService) {}

  // ── Posting ────────────────────────────────────────────────────────────────

  /**
   * Posts a balanced journal entry.
   *
   * Idempotent on (source, sourceId), so a replayed domain event cannot post
   * the same transaction to the ledger twice.
   */
  async postEntry(input: PostEntryInput) {
    if (input.lines.length < 2) {
      throw new BadRequestException("A journal entry needs at least two lines");
    }

    const entryDate = input.entryDate ?? new Date();
    await this.assertPeriodOpen(entryDate, input.organizationId);

    const accounts = await this.resolveAccounts(
      input.lines.map((l) => l.accountCode),
      input.organizationId,
    );

    let totalDebit = ZERO;
    let totalCredit = ZERO;

    const lines = input.lines.map((line) => {
      const account = accounts.get(line.accountCode)!;
      if (!account.isPostable) {
        throw new BadRequestException(
          `Account ${line.accountCode} is a group account and cannot be posted to`,
        );
      }

      const debit = new Decimal(line.debit ?? 0);
      const credit = new Decimal(line.credit ?? 0);

      if (debit.isNegative() || credit.isNegative()) {
        throw new BadRequestException("Debits and credits must not be negative");
      }
      if (debit.greaterThan(0) && credit.greaterThan(0)) {
        throw new BadRequestException("A line carries either a debit or a credit, not both");
      }
      if (debit.isZero() && credit.isZero()) {
        throw new BadRequestException("A line must carry a debit or a credit");
      }

      totalDebit = totalDebit.add(debit);
      totalCredit = totalCredit.add(credit);

      return {
        accountId: account.id,
        debit,
        credit,
        description: line.description ?? null,
        partnerType: line.partnerType ?? null,
        partnerId: line.partnerId ?? null,
        organizationId: input.organizationId,
      };
    });

    // The invariant the whole ledger rests on.
    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException(
        `Entry does not balance: debits ${totalDebit} vs credits ${totalCredit}`,
      );
    }

    try {
      return await this.prisma.journalEntry.create({
        data: {
          entryNumber: `JE-${genEntryNo()}`,
          entryDate,
          description: input.description,
          reference: input.reference ?? null,
          source: input.source ?? "MANUAL",
          sourceId: input.sourceId ?? null,
          postedById: input.postedById ?? null,
          organizationId: input.organizationId,
          lines: { create: lines },
        },
        include: { lines: { include: { account: true } } },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        this.logger.debug(`Entry already posted for ${input.source}:${input.sourceId} — skipping`);
        return this.prisma.journalEntry.findFirst({
          where: { source: input.source ?? "MANUAL", sourceId: input.sourceId ?? null },
          include: { lines: { include: { account: true } } },
        });
      }
      throw err;
    }
  }

  /** Corrects a posted entry by writing its mirror image, never by editing it. */
  async reverseEntry(id: string, organizationId: string, postedById?: string | null) {
    const original = await this.prisma.journalEntry.findFirst({
      where: { id, organizationId },
      include: { lines: { include: { account: true } } },
    });
    if (!original) throw new NotFoundException("Journal entry not found");
    if (original.status === "REVERSED") {
      throw new BadRequestException("Entry has already been reversed");
    }

    const reversal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.journalEntry.create({
        data: {
          entryNumber: `JE-${genEntryNo()}`,
          entryDate: new Date(),
          description: `Reversal of ${original.entryNumber}: ${original.description}`,
          source: "ADJUSTMENT",
          reversesId: original.id,
          postedById: postedById ?? null,
          organizationId,
          lines: {
            create: original.lines.map((l) => ({
              accountId: l.accountId,
              debit: l.credit,
              credit: l.debit,
              description: l.description,
              partnerType: l.partnerType,
              partnerId: l.partnerId,
              organizationId,
            })),
          },
        },
        include: { lines: true },
      });

      await tx.journalEntry.update({
        where: { id: original.id },
        data: { status: "REVERSED" },
      });

      return created;
    });

    return reversal;
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  /** Every account with its debit and credit totals; the two columns must agree. */
  async trialBalance(organizationId: string, asOf?: Date) {
    const grouped = await this.prisma.journalLine.groupBy({
      by: ["accountId"],
      where: this.postedLineFilter(organizationId, undefined, asOf),
      _sum: { debit: true, credit: true },
    });

    const accounts = await this.prisma.account.findMany({
      where: { organizationId },
      orderBy: { code: "asc" },
    });

    const byId = new Map(grouped.map((g) => [g.accountId, g._sum]));
    let totalDebit = ZERO;
    let totalCredit = ZERO;

    const rows = accounts
      .map((account) => {
        const sums = byId.get(account.id);
        const debit = sums?.debit ?? ZERO;
        const credit = sums?.credit ?? ZERO;
        const net = debit.sub(credit);
        const balance = DEBIT_NORMAL.includes(account.type) ? net : net.negated();

        totalDebit = totalDebit.add(debit);
        totalCredit = totalCredit.add(credit);

        return {
          accountId: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          debit: debit.toString(),
          credit: credit.toString(),
          balance: balance.toString(),
        };
      })
      .filter((r) => r.debit !== "0" || r.credit !== "0");

    return {
      asOf: asOf ?? new Date(),
      rows,
      totals: { debit: totalDebit.toString(), credit: totalCredit.toString() },
      balanced: totalDebit.equals(totalCredit),
    };
  }

  /** Transactions against one account, with a running balance. */
  async ledger(accountId: string, organizationId: string, from?: Date, to?: Date) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, organizationId },
    });
    if (!account) throw new NotFoundException("Account not found");

    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId,
        organizationId,
        journalEntry: {
          status: { not: "DRAFT" },
          ...(from || to
            ? { entryDate: { ...(from && { gte: from }), ...(to && { lte: to }) } }
            : {}),
        },
      },
      include: { journalEntry: true },
      orderBy: { journalEntry: { entryDate: "asc" } },
    });

    const debitNormal = DEBIT_NORMAL.includes(account.type);
    let running = ZERO;

    return {
      account: { id: account.id, code: account.code, name: account.name, type: account.type },
      entries: lines.map((l) => {
        const movement = debitNormal ? l.debit.sub(l.credit) : l.credit.sub(l.debit);
        running = running.add(movement);
        return {
          // The id and source are what make a line actionable: without them a
          // finance officer can see a wrong entry but cannot reverse it.
          entryId: l.journalEntryId,
          entryNumber: l.journalEntry.entryNumber,
          source: l.journalEntry.source,
          date: l.journalEntry.entryDate,
          description: l.description ?? l.journalEntry.description,
          partnerType: l.partnerType,
          partnerId: l.partnerId,
          debit: l.debit.toString(),
          credit: l.credit.toString(),
          balance: running.toString(),
        };
      }),
      closingBalance: running.toString(),
    };
  }

  /** Income and expense for a period. */
  async profitAndLoss(organizationId: string, from: Date, to: Date) {
    const rows = await this.balancesByType(organizationId, ["INCOME", "EXPENSE"], from, to);

    const income = rows.filter((r) => r.type === "INCOME");
    const expense = rows.filter((r) => r.type === "EXPENSE");
    const sum = (list: typeof rows) =>
      list.reduce((acc, r) => acc.add(new Decimal(r.balance)), ZERO);

    const totalIncome = sum(income);
    const totalExpense = sum(expense);

    return {
      from,
      to,
      income,
      expense,
      totals: {
        income: totalIncome.toString(),
        expense: totalExpense.toString(),
        netProfit: totalIncome.sub(totalExpense).toString(),
      },
    };
  }

  /** Assets, liabilities and equity as at a date. */
  async balanceSheet(organizationId: string, asOf: Date) {
    const rows = await this.balancesByType(
      organizationId,
      ["ASSET", "LIABILITY", "EQUITY"],
      undefined,
      asOf,
    );

    const pick = (type: AccountType) => rows.filter((r) => r.type === type);
    const sum = (list: typeof rows) =>
      list.reduce((acc, r) => acc.add(new Decimal(r.balance)), ZERO);

    const assets = pick("ASSET");
    const liabilities = pick("LIABILITY");
    const equity = pick("EQUITY");

    // Retained earnings are not posted anywhere yet, so fold the period result
    // in rather than presenting a sheet that cannot balance.
    const pl = await this.profitAndLoss(organizationId, new Date(0), asOf);
    const retained = new Decimal(pl.totals.netProfit);

    const totalAssets = sum(assets);
    const totalLiabilities = sum(liabilities);
    const totalEquity = sum(equity).add(retained);

    return {
      asOf,
      assets,
      liabilities,
      equity,
      retainedEarnings: retained.toString(),
      totals: {
        assets: totalAssets.toString(),
        liabilities: totalLiabilities.toString(),
        equity: totalEquity.toString(),
        liabilitiesAndEquity: totalLiabilities.add(totalEquity).toString(),
      },
      balanced: totalAssets.equals(totalLiabilities.add(totalEquity)),
    };
  }

  /**
   * Outstanding receivables or payables bucketed by age.
   *
   * "HMO" is its own kind rather than part of "AR": once a claim is submitted
   * the covered share is owed by the insurer, and totalling it against the
   * patient — as this did when it only knew about PATIENT partners — hid the
   * insurer's debt entirely and overstated what patients owed.
   */
  async aging(organizationId: string, kind: "AR" | "AP" | "HMO", asOf = new Date()) {
    const accountType: AccountType = kind === "AP" ? "LIABILITY" : "ASSET";
    const partnerType =
      kind === "AP" ? "SUPPLIER" : kind === "HMO" ? "HMO" : "PATIENT";

    const lines = await this.prisma.journalLine.findMany({
      where: {
        organizationId,
        partnerType,
        account: { type: accountType },
        journalEntry: { status: { not: "DRAFT" }, entryDate: { lte: asOf } },
      },
      include: { journalEntry: { select: { entryDate: true } } },
    });

    type Bucket = "current" | "d31_60" | "d61_90" | "d90_plus";
    const byPartner = new Map<
      string,
      { partnerId: string; total: Decimal } & Record<Bucket, Decimal>
    >();

    for (const line of lines) {
      const id = line.partnerId ?? "UNATTRIBUTED";
      const row =
        byPartner.get(id) ??
        ({
          partnerId: id,
          total: ZERO,
          current: ZERO,
          d31_60: ZERO,
          d61_90: ZERO,
          d90_plus: ZERO,
        } as never);

      // Receivables rise with debits, payables with credits.
      const movement =
        kind === "AP" ? line.credit.sub(line.debit) : line.debit.sub(line.credit);

      const ageDays = Math.floor(
        (asOf.getTime() - line.journalEntry.entryDate.getTime()) / 86_400_000,
      );
      const bucket =
        ageDays <= 30 ? "current" : ageDays <= 60 ? "d31_60" : ageDays <= 90 ? "d61_90" : "d90_plus";

      row[bucket] = row[bucket].add(movement);
      row.total = row.total.add(movement);
      byPartner.set(id, row);
    }

    const outstanding = [...byPartner.values()].filter((r) => !r.total.isZero());

    // A ledger id is no use to whoever has to chase the debt, so resolve the
    // partner to something a person can act on. Suppliers are already recorded
    // by name; patients are recorded by id and have to be looked up.
    const names = new Map<string, string>();
    const ids = outstanding.map((r) => r.partnerId).filter((id) => id !== "UNATTRIBUTED");

    if (kind === "AR" && ids.length) {
      const patients = await this.prisma.patient.findMany({
        where: { id: { in: ids } },
        select: { id: true, firstName: true, lastName: true, mrn: true },
      });
      for (const p of patients) {
        names.set(p.id, `${p.firstName} ${p.lastName} (${p.mrn})`);
      }
    }

    if (kind === "HMO" && ids.length) {
      const providers = await this.prisma.hmoProvider.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, code: true },
      });
      for (const p of providers) names.set(p.id, `${p.name} (${p.code})`);
    }

    const rows = outstanding.map((r) => ({
      partnerId: r.partnerId,
      partnerName:
        r.partnerId === "UNATTRIBUTED"
          ? "Unattributed"
          : r.partnerId === "UNSPECIFIED"
            ? "Supplier not recorded"
            : (names.get(r.partnerId) ?? r.partnerId),
      current: r.current.toString(),
      d31_60: r.d31_60.toString(),
      d61_90: r.d61_90.toString(),
      d90_plus: r.d90_plus.toString(),
      total: r.total.toString(),
    }));

    const totalOf = (key: keyof (typeof rows)[number]) =>
      rows.reduce((acc, r) => acc.add(new Decimal(r[key] as string)), ZERO).toString();

    return {
      kind,
      asOf,
      rows,
      totals: {
        current: totalOf("current"),
        d31_60: totalOf("d31_60"),
        d61_90: totalOf("d61_90"),
        d90_plus: totalOf("d90_plus"),
        total: totalOf("total"),
      },
    };
  }

  // ── Chart of accounts ──────────────────────────────────────────────────────

  async listAccounts(organizationId: string, type?: AccountType) {
    return this.prisma.account.findMany({
      where: { organizationId, ...(type && { type }) },
      orderBy: { code: "asc" },
    });
  }

  async createAccount(
    dto: {
      code: string;
      name: string;
      type: AccountType;
      parentId?: string;
      description?: string;
      isPostable?: boolean;
    },
    organizationId: string,
  ) {
    const existing = await this.prisma.account.findUnique({
      where: { code_organizationId: { code: dto.code, organizationId } },
    });
    if (existing) throw new BadRequestException(`Account ${dto.code} already exists`);

    return this.prisma.account.create({ data: { ...dto, organizationId } });
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private async resolveAccounts(codes: string[], organizationId: string) {
    const unique = [...new Set(codes)];
    const accounts = await this.prisma.account.findMany({
      where: { code: { in: unique }, organizationId },
    });

    const found = new Map(accounts.map((a) => [a.code, a]));
    const missing = unique.filter((c) => !found.has(c));
    if (missing.length > 0) {
      throw new BadRequestException(`Unknown account code(s): ${missing.join(", ")}`);
    }
    return found;
  }

  private async assertPeriodOpen(date: Date, organizationId: string) {
    const closed = await this.prisma.fiscalPeriod.findFirst({
      where: {
        organizationId,
        isClosed: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: { name: true },
    });
    if (closed) {
      throw new BadRequestException(`Period ${closed.name} is closed — post an adjustment instead`);
    }
  }

  /**
   * Lines that count towards a balance.
   *
   * Reversed entries are included on purpose. Reversing does not erase an
   * entry — it posts an opposite one and marks the original — so both sit in
   * the books and net to zero, which is what an audit trail is for. Excluding
   * the original while counting its reversal applied the correction twice:
   * reversing a 12,000 posting moved the accounts by 24,000. Only a draft,
   * which was never posted at all, is left out.
   */
  private postedLineFilter(organizationId: string, from?: Date, to?: Date) {
    return {
      organizationId,
      journalEntry: {
        status: { not: "DRAFT" as const },
        ...(from || to
          ? { entryDate: { ...(from && { gte: from }), ...(to && { lte: to }) } }
          : {}),
      },
    };
  }

  private async balancesByType(
    organizationId: string,
    types: AccountType[],
    from?: Date,
    to?: Date,
  ) {
    const grouped = await this.prisma.journalLine.groupBy({
      by: ["accountId"],
      where: {
        ...this.postedLineFilter(organizationId, from, to),
        account: { type: { in: types } },
      },
      _sum: { debit: true, credit: true },
    });

    const accounts = await this.prisma.account.findMany({
      where: { organizationId, type: { in: types } },
      orderBy: { code: "asc" },
    });

    const byId = new Map(grouped.map((g) => [g.accountId, g._sum]));

    return accounts
      .map((account) => {
        const sums = byId.get(account.id);
        const net = (sums?.debit ?? ZERO).sub(sums?.credit ?? ZERO);
        const balance = DEBIT_NORMAL.includes(account.type) ? net : net.negated();
        return {
          code: account.code,
          name: account.name,
          type: account.type,
          balance: balance.toString(),
        };
      })
      .filter((r) => r.balance !== "0");
  }
}
