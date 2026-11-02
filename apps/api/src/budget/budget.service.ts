import { Injectable } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import type { SetBudgetDto } from "./dto/budget.dto";

const genId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 20);

// Credit-normal account types: actual = credits - debits
const CREDIT_NORMAL = new Set(["INCOME", "LIABILITY", "EQUITY"]);

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  listBudgets(orgId: string, year: number, month?: number) {
    return this.prisma.budget.findMany({
      where: {
        organizationId: orgId,
        year,
        ...(month !== undefined ? { month } : {}),
      },
      include: { account: { select: { code: true, name: true, type: true } } },
      orderBy: [{ account: { code: "asc" } }],
    });
  }

  async setBudget(dto: SetBudgetDto, orgId: string) {
    const month = dto.month ?? null;
    const existing = await this.prisma.budget.findFirst({
      where: { accountId: dto.accountId, year: dto.year, month, organizationId: orgId },
    });
    if (existing) {
      return this.prisma.budget.update({
        where: { id: existing.id },
        data: { budgetedAmount: new Decimal(dto.budgetedAmount), notes: dto.notes },
      });
    }
    return this.prisma.budget.create({
      data: {
        id: genId(),
        accountId: dto.accountId,
        year: dto.year,
        month,
        budgetedAmount: new Decimal(dto.budgetedAmount),
        notes: dto.notes,
        organizationId: orgId,
      },
    });
  }

  async deleteBudget(id: string, orgId: string) {
    return this.prisma.budget.deleteMany({ where: { id, organizationId: orgId } });
  }

  /**
   * Compare budgeted amounts vs. actual GL movements for a given year (and
   * optionally one month). Returns one row per account that has a budget line
   * or any actual postings in the period.
   */
  async budgetVsActuals(orgId: string, year: number, month?: number) {
    const periodStart = month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    const periodEnd = month
      ? new Date(year, month, 1)
      : new Date(year + 1, 0, 1);

    // Pull all budget lines for the period
    const budgets = await this.prisma.budget.findMany({
      where: {
        organizationId: orgId,
        year,
        ...(month !== undefined ? { month } : { month: null }),
      },
      include: { account: { select: { id: true, code: true, name: true, type: true } } },
    });

    // Pull all posted journal lines in the period, aggregated by account
    const actuals = await this.prisma.journalLine.groupBy({
      by: ["accountId"],
      where: {
        organizationId: orgId,
        // Not "POSTED": a reversed entry keeps its lines and its reversal
        // cancels them out. Filtering to POSTED alone would count the
        // reversal without the original it undoes.
        journalEntry: {
          status: { not: "DRAFT" },
          entryDate: { gte: periodStart, lt: periodEnd },
        },
      },
      _sum: { debit: true, credit: true },
    });

    // Build a lookup of accountId → actual net movement
    const actualsMap = new Map<string, { debit: Decimal; credit: Decimal }>();
    for (const a of actuals) {
      actualsMap.set(a.accountId, {
        debit:  new Decimal(a._sum.debit?.toString()  ?? "0"),
        credit: new Decimal(a._sum.credit?.toString() ?? "0"),
      });
    }

    // Fetch account details for any accounts with actuals but no budget line
    const budgetedAccountIds = new Set(budgets.map((b) => b.account.id));
    const unbodgetedActualIds = [...actualsMap.keys()].filter((id) => !budgetedAccountIds.has(id));
    const extraAccounts = unbodgetedActualIds.length
      ? await this.prisma.account.findMany({
          where: { id: { in: unbodgetedActualIds }, organizationId: orgId },
          select: { id: true, code: true, name: true, type: true },
        })
      : [];

    const rows: {
      accountId: string; code: string; name: string; type: string;
      budgeted: string; actual: string; variance: string; variancePct: string | null;
    }[] = [];

    // Accounts with budget lines
    for (const b of budgets) {
      const act = actualsMap.get(b.account.id);
      const debit  = act?.debit  ?? new Decimal(0);
      const credit = act?.credit ?? new Decimal(0);
      const actual = CREDIT_NORMAL.has(b.account.type)
        ? credit.sub(debit)
        : debit.sub(credit);
      const budgeted = new Decimal(b.budgetedAmount.toString());
      const variance = budgeted.sub(actual);
      const variancePct = budgeted.isZero()
        ? null
        : variance.div(budgeted).mul(100).toDecimalPlaces(1).toString();

      rows.push({
        accountId: b.account.id,
        code: b.account.code,
        name: b.account.name,
        type: b.account.type,
        budgeted: budgeted.toString(),
        actual: actual.toString(),
        variance: variance.toString(),
        variancePct,
      });
    }

    // Accounts with actuals but no budget
    for (const acc of extraAccounts) {
      const act = actualsMap.get(acc.id)!;
      const actual = CREDIT_NORMAL.has(acc.type)
        ? act.credit.sub(act.debit)
        : act.debit.sub(act.credit);

      rows.push({
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        budgeted: "0",
        actual: actual.toString(),
        variance: new Decimal(0).sub(actual).toString(),
        variancePct: null,
      });
    }

    rows.sort((a, b) => a.code.localeCompare(b.code));

    const totalBudgeted = rows.reduce((s, r) => s.add(r.budgeted), new Decimal(0));
    const totalActual   = rows.reduce((s, r) => s.add(r.actual),   new Decimal(0));

    return {
      year,
      month: month ?? null,
      rows,
      totals: {
        budgeted: totalBudgeted.toString(),
        actual:   totalActual.toString(),
        variance: totalBudgeted.sub(totalActual).toString(),
      },
    };
  }

  availableYears(orgId: string) {
    return this.prisma.budget.findMany({
      where: { organizationId: orgId },
      distinct: ["year"],
      select: { year: true },
      orderBy: { year: "desc" },
    });
  }
}
