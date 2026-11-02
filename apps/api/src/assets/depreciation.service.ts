import { Injectable, BadRequestException, NotFoundException, Logger } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../prisma/prisma.service";
import { AccountingService } from "../accounting/accounting.service";
import { ACCOUNTS } from "../accounting/chart-of-accounts";
import type { SetupDepreciationDto } from "./dto/depreciation.dto";

const ZERO = new Decimal(0);

/** Statuses for which an asset is no longer in service and stops depreciating. */
const RETIRED_STATUSES = ["DECOMMISSIONED", "LOST", "STOLEN"] as const;

interface DepreciableAsset {
  id: string;
  name: string;
  assetNumber: string;
  purchasePrice: Decimal | null;
  salvageValue: Decimal | null;
  usefulLifeMonths: number | null;
  depreciationMethod: "STRAIGHT_LINE" | "DECLINING_BALANCE" | null;
  depreciationStartDate: Date | null;
  purchaseDate: Date | null;
  depreciationEndedAt: Date | null;
  status: string;
}

@Injectable()
export class DepreciationService {
  private readonly logger = new Logger(DepreciationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
  ) {}

  // ── Setup ───────────────────────────────────────────────────────────────────

  async setup(assetId: string, dto: SetupDepreciationDto, organizationId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, organizationId } });
    if (!asset) throw new NotFoundException("Asset not found");

    if (!asset.purchasePrice) {
      throw new BadRequestException("Set the asset's purchase price before configuring depreciation");
    }

    const start = dto.depreciationStartDate
      ? new Date(dto.depreciationStartDate)
      : asset.purchaseDate;
    if (!start) {
      throw new BadRequestException("A start date is required when the asset has no purchase date");
    }

    const salvage = new Decimal(dto.salvageValue ?? 0);
    if (salvage.gte(asset.purchasePrice)) {
      throw new BadRequestException("Salvage value must be below the purchase price");
    }

    const charged = await this.prisma.depreciationEntry.count({ where: { assetId } });
    if (charged > 0) {
      throw new BadRequestException(
        "This asset has already been depreciated. Reverse its entries before changing the basis.",
      );
    }

    return this.prisma.asset.update({
      where: { id: assetId },
      data: {
        depreciationMethod: dto.depreciationMethod,
        usefulLifeMonths: dto.usefulLifeMonths,
        salvageValue: salvage,
        depreciationStartDate: start,
        depreciationEndedAt: null,
      },
    });
  }

  // ── Projection ──────────────────────────────────────────────────────────────

  /**
   * Full projected schedule for one asset. Nothing is written — this is what the
   * asset *will* be charged, so the basis can be checked before any posting.
   */
  async schedule(assetId: string, organizationId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, organizationId },
      select: {
        id: true, name: true, assetNumber: true, purchasePrice: true, salvageValue: true,
        usefulLifeMonths: true, depreciationMethod: true, depreciationStartDate: true,
        purchaseDate: true, depreciationEndedAt: true, status: true,
      },
    });
    if (!asset) throw new NotFoundException("Asset not found");
    this.requireBasis(asset);

    const cost = new Decimal(asset.purchasePrice!);
    const salvage = new Decimal(asset.salvageValue ?? 0);
    const start = asset.depreciationStartDate!;

    const posted = await this.prisma.depreciationEntry.findMany({
      where: { assetId },
      select: { year: true, month: true, amount: true, postedAt: true },
    });
    const postedKeys = new Set(posted.map((p) => `${p.year}-${p.month}`));

    const rows: {
      year: number; month: number; amount: string;
      accumulated: string; bookValue: string; charged: boolean;
    }[] = [];

    let accumulated = ZERO;
    let bookValue = cost;

    // Walk one month at a time rather than dividing the life up front: the
    // declining-balance charge depends on the book value carried forward, and
    // the last period of either method has to be clamped to land exactly on
    // salvage value.
    for (let i = 0; i < asset.usefulLifeMonths!; i++) {
      const periodDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const year = periodDate.getFullYear();
      const month = periodDate.getMonth() + 1;

      const charge = this.monthlyCharge(asset.depreciationMethod!, cost, salvage, bookValue, asset.usefulLifeMonths!);
      if (charge.lte(ZERO)) break;

      accumulated = accumulated.add(charge);
      bookValue = bookValue.sub(charge);

      rows.push({
        year, month,
        amount: charge.toString(),
        accumulated: accumulated.toString(),
        bookValue: bookValue.toString(),
        charged: postedKeys.has(`${year}-${month}`),
      });

      if (bookValue.lte(salvage)) break;
    }

    return {
      assetId: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
      method: asset.depreciationMethod,
      cost: cost.toString(),
      salvageValue: salvage.toString(),
      usefulLifeMonths: asset.usefulLifeMonths,
      startDate: start.toISOString().split("T")[0],
      totalDepreciable: cost.sub(salvage).toString(),
      rows,
    };
  }

  /**
   * One month's charge, clamped so book value can never fall below salvage.
   * Without the clamp, straight line overshoots whenever rounding leaves a
   * remainder and declining balance never terminates at all.
   */
  private monthlyCharge(
    method: "STRAIGHT_LINE" | "DECLINING_BALANCE",
    cost: Decimal,
    salvage: Decimal,
    bookValue: Decimal,
    usefulLifeMonths: number,
  ): Decimal {
    const remaining = bookValue.sub(salvage);
    if (remaining.lte(ZERO)) return ZERO;

    const raw =
      method === "STRAIGHT_LINE"
        ? cost.sub(salvage).div(usefulLifeMonths)
        // Double-declining: twice the straight-line rate, applied to the
        // written-down value rather than to cost.
        : bookValue.mul(2).div(usefulLifeMonths);

    const charge = raw.toDecimalPlaces(2);
    return charge.gt(remaining) ? remaining : charge;
  }

  private requireBasis(asset: {
    purchasePrice: Decimal | null;
    usefulLifeMonths: number | null;
    depreciationMethod: string | null;
    depreciationStartDate: Date | null;
  }) {
    if (!asset.depreciationMethod || !asset.usefulLifeMonths || !asset.purchasePrice || !asset.depreciationStartDate) {
      throw new BadRequestException("Depreciation has not been configured for this asset");
    }
    if (asset.usefulLifeMonths <= 0) {
      throw new BadRequestException("Useful life must be at least one month");
    }
  }

  // ── Monthly run ─────────────────────────────────────────────────────────────

  /**
   * Charge every eligible asset for one period and post each charge to the
   * ledger. Safe to re-run: an asset already charged for the period is skipped
   * on the unique key, so a second run adds nothing rather than double-charging.
   */
  async runMonth(year: number, month: number, organizationId: string, postedById?: string) {
    if (month < 1 || month > 12) throw new BadRequestException("Month must be between 1 and 12");

    // End of the period being charged; an asset whose depreciation starts after
    // this is not yet in service.
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    const assets = await this.prisma.asset.findMany({
      where: {
        organizationId,
        depreciationEndedAt: null,
        depreciationMethod: { not: null },
        usefulLifeMonths: { not: null },
        purchasePrice: { not: null },
        depreciationStartDate: { lte: periodEnd },
        status: { notIn: RETIRED_STATUSES as unknown as never[] },
      },
      select: {
        id: true, name: true, assetNumber: true, purchasePrice: true, salvageValue: true,
        usefulLifeMonths: true, depreciationMethod: true, depreciationStartDate: true,
        purchaseDate: true, depreciationEndedAt: true, status: true,
      },
    });

    const charged: { assetId: string; assetNumber: string; amount: string }[] = [];
    const skipped: { assetId: string; assetNumber: string; reason: string }[] = [];
    const failed: { assetId: string; assetNumber: string; error: string }[] = [];
    let totalCharged = ZERO;

    for (const asset of assets) {
      try {
        const result = await this.chargeOne(asset, year, month, organizationId, postedById);
        if (result.charged) {
          charged.push({ assetId: asset.id, assetNumber: asset.assetNumber, amount: result.amount! });
          totalCharged = totalCharged.add(result.amount!);
        } else {
          skipped.push({ assetId: asset.id, assetNumber: asset.assetNumber, reason: result.reason! });
        }
      } catch (error) {
        // One asset failing must not abandon the rest of the run, so the
        // failure is collected and reported instead of thrown.
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Depreciation failed for ${asset.assetNumber}: ${message}`);
        failed.push({ assetId: asset.id, assetNumber: asset.assetNumber, error: message });
      }
    }

    return {
      year, month,
      eligible: assets.length,
      chargedCount: charged.length,
      totalCharged: totalCharged.toString(),
      charged, skipped, failed,
    };
  }

  private async chargeOne(
    asset: DepreciableAsset,
    year: number,
    month: number,
    organizationId: string,
    postedById?: string,
  ): Promise<{ charged: boolean; amount?: string; reason?: string }> {
    const existing = await this.prisma.depreciationEntry.findFirst({
      where: { assetId: asset.id, year, month },
    });
    if (existing) return { charged: false, reason: "Already charged for this period" };

    const cost = new Decimal(asset.purchasePrice!);
    const salvage = new Decimal(asset.salvageValue ?? 0);

    const prior = await this.prisma.depreciationEntry.aggregate({
      where: { assetId: asset.id },
      _sum: { amount: true },
    });
    const accumulatedBefore = new Decimal(prior._sum.amount?.toString() ?? "0");
    const bookValueBefore = cost.sub(accumulatedBefore);

    // Months already charged, not elapsed months: a run skipped in a past
    // period should still charge the remaining life rather than lose it.
    const periodsCharged = await this.prisma.depreciationEntry.count({ where: { assetId: asset.id } });
    if (periodsCharged >= asset.usefulLifeMonths!) {
      await this.endDepreciation(asset.id);
      return { charged: false, reason: "Useful life exhausted" };
    }

    const amount = this.monthlyCharge(
      asset.depreciationMethod!, cost, salvage, bookValueBefore, asset.usefulLifeMonths!,
    );

    if (amount.lte(ZERO)) {
      await this.endDepreciation(asset.id);
      return { charged: false, reason: "Already at salvage value" };
    }

    const accumulated = accumulatedBefore.add(amount);
    const bookValue = cost.sub(accumulated);

    // The entry is written first so the journal can carry its id as sourceId,
    // which is what makes the posting traceable back to this exact charge.
    const entry = await this.prisma.depreciationEntry.create({
      data: {
        assetId: asset.id,
        year, month, amount,
        accumulated, bookValue,
        organizationId,
      },
    });

    try {
      const journal = await this.accounting.postEntry({
        description: `Depreciation — ${asset.assetNumber} ${asset.name} (${month}/${year})`,
        organizationId,
        entryDate: new Date(year, month - 1, 1),
        source: "DEPRECIATION",
        sourceId: entry.id,
        postedById: postedById ?? null,
        lines: [
          { accountCode: ACCOUNTS.EXP_DEPRECIATION, debit: amount, description: asset.name },
          { accountCode: ACCOUNTS.ACCUM_DEPRECIATION, credit: amount, description: asset.name },
        ],
      });

      // postEntry returns the existing entry on a duplicate source+sourceId and
      // null if it cannot find one. sourceId here is this charge's own id, so
      // that path should be unreachable — but an unverified posting must not be
      // recorded as posted, so it is treated as a failure like any other.
      if (!journal) throw new Error("Depreciation journal entry could not be confirmed");

      await this.prisma.depreciationEntry.update({
        where: { id: entry.id },
        data: { journalEntryId: journal.id, postedAt: new Date() },
      });
    } catch (error) {
      // An unposted charge would understate the ledger while appearing settled
      // in the register, so the entry is removed and the asset reported as
      // failed rather than left half-applied.
      await this.prisma.depreciationEntry.delete({ where: { id: entry.id } });
      throw error;
    }

    if (bookValue.lte(salvage)) await this.endDepreciation(asset.id);

    return { charged: true, amount: amount.toString() };
  }

  private endDepreciation(assetId: string) {
    return this.prisma.asset.update({
      where: { id: assetId },
      data: { depreciationEndedAt: new Date() },
    });
  }

  // ── Register and history ────────────────────────────────────────────────────

  /** Asset register: cost, accumulated depreciation and net book value. */
  async register(organizationId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { organizationId, purchasePrice: { not: null } },
      select: {
        id: true, assetNumber: true, name: true, category: true, status: true,
        purchasePrice: true, salvageValue: true, usefulLifeMonths: true,
        depreciationMethod: true, depreciationStartDate: true, depreciationEndedAt: true,
      },
      orderBy: { assetNumber: "asc" },
    });

    const sums = await this.prisma.depreciationEntry.groupBy({
      by: ["assetId"],
      where: { organizationId },
      _sum: { amount: true },
      _count: { _all: true },
    });
    const byAsset = new Map(sums.map((s) => [s.assetId, s]));

    let totalCost = ZERO;
    let totalAccumulated = ZERO;

    const rows = assets.map((a) => {
      const cost = new Decimal(a.purchasePrice!);
      const agg = byAsset.get(a.id);
      const accumulated = new Decimal(agg?._sum.amount?.toString() ?? "0");
      const bookValue = cost.sub(accumulated);

      totalCost = totalCost.add(cost);
      totalAccumulated = totalAccumulated.add(accumulated);

      return {
        assetId: a.id,
        assetNumber: a.assetNumber,
        name: a.name,
        category: a.category,
        status: a.status,
        method: a.depreciationMethod,
        cost: cost.toString(),
        salvageValue: a.salvageValue ? new Decimal(a.salvageValue).toString() : "0",
        accumulated: accumulated.toString(),
        bookValue: bookValue.toString(),
        periodsCharged: agg?._count._all ?? 0,
        usefulLifeMonths: a.usefulLifeMonths,
        configured: Boolean(a.depreciationMethod && a.usefulLifeMonths),
        fullyDepreciated: Boolean(a.depreciationEndedAt),
      };
    });

    return {
      rows,
      totals: {
        cost: totalCost.toString(),
        accumulated: totalAccumulated.toString(),
        bookValue: totalCost.sub(totalAccumulated).toString(),
      },
    };
  }

  entries(assetId: string, organizationId: string) {
    return this.prisma.depreciationEntry.findMany({
      where: { assetId, organizationId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  }

  periodEntries(year: number, month: number, organizationId: string) {
    return this.prisma.depreciationEntry.findMany({
      where: { organizationId, year, month },
      include: { asset: { select: { assetNumber: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
  }
}
