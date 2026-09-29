import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { BomType, ProductionStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";

const genRunNo = customAlphabet("0123456789", 6);
const ZERO = new Decimal(0);

/**
 * Sterile services and the pharmacy bench.
 *
 * A production run draws several items from stock and puts a different one
 * back. The value does not change hands with anybody, so it must not change
 * amount either: what the materials were worth becomes what the output is
 * worth. Materials are drawn as PRODUCTION moves, which the ledger listener
 * deliberately does not expense — otherwise the value would be written off on
 * the way in and carried again by the finished item.
 */
@Injectable()
export class ProductionService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
  ) {}

  // ── Recipes ────────────────────────────────────────────────────────────────

  async createBom(
    dto: {
      code: string;
      name: string;
      type?: BomType;
      outputItemId: string;
      outputQuantity?: number;
      shelfLifeDays?: number;
      instructions?: string;
      lines: { itemId: string; quantity: number }[];
    },
    organizationId: string,
  ) {
    if (!dto.lines?.length) {
      throw new BadRequestException("A recipe needs at least one material");
    }
    if (dto.lines.some((l) => l.quantity <= 0)) {
      throw new BadRequestException("Every material needs a positive quantity");
    }

    const itemIds = [...new Set([dto.outputItemId, ...dto.lines.map((l) => l.itemId)])];
    const items = await this.prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, organizationId },
      select: { id: true },
    });
    if (items.length !== itemIds.length) {
      throw new NotFoundException("One or more items on this recipe do not exist");
    }

    // Making a thing out of itself would consume the output it just produced.
    if (dto.lines.some((l) => l.itemId === dto.outputItemId)) {
      throw new BadRequestException("A recipe cannot use its own output as a material");
    }

    const existing = await this.prisma.billOfMaterials.findFirst({
      where: { code: dto.code, organizationId },
    });
    if (existing) throw new BadRequestException(`Recipe ${dto.code} already exists`);

    return this.prisma.billOfMaterials.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type ?? "ASSEMBLY",
        outputItemId: dto.outputItemId,
        outputQuantity: dto.outputQuantity ?? 1,
        shelfLifeDays: dto.shelfLifeDays,
        instructions: dto.instructions,
        organizationId,
        lines: {
          create: dto.lines.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity,
            organizationId,
          })),
        },
      },
      include: this.bomInclude(),
    });
  }

  private bomInclude() {
    return {
      outputItem: { select: { id: true, code: true, name: true, unit: true, requiresBatch: true } },
      lines: {
        include: {
          item: { select: { id: true, code: true, name: true, unit: true, averageCost: true } },
        },
      },
    } as const;
  }

  listBoms(organizationId: string, includeInactive = false) {
    return this.prisma.billOfMaterials.findMany({
      where: { organizationId, ...(includeInactive ? {} : { isActive: true }) },
      include: this.bomInclude(),
      orderBy: { name: "asc" },
    });
  }

  // ── Runs ───────────────────────────────────────────────────────────────────

  /**
   * How much of each material a run needs, and whether it is there.
   *
   * Checked before anything is drawn. Consuming half a recipe and then
   * discovering a shortfall would leave stock wrong and the run unfinishable.
   */
  async requirementsFor(bomId: string, quantity: number, locationId: string, organizationId: string) {
    const bom = await this.prisma.billOfMaterials.findFirst({
      where: { id: bomId, organizationId },
      include: this.bomInclude(),
    });
    if (!bom) throw new NotFoundException("Recipe not found");
    if (quantity <= 0) throw new BadRequestException("Quantity must be positive");

    // Whole units only: half a sterilisation cycle is not a thing.
    const batches = quantity / bom.outputQuantity;
    if (!Number.isInteger(batches)) {
      throw new BadRequestException(
        `This recipe makes ${bom.outputQuantity} at a time, so the quantity must be a multiple of ${bom.outputQuantity}`,
      );
    }

    const levels = await this.prisma.stockLevel.findMany({
      where: { locationId, itemId: { in: bom.lines.map((l) => l.itemId) }, organizationId },
      select: { itemId: true, quantity: true },
    });
    const onHand = new Map(levels.map((l) => [l.itemId, l.quantity]));

    const requirements = bom.lines.map((line) => {
      const needed = line.quantity * batches;
      const available = onHand.get(line.itemId) ?? 0;
      return {
        itemId: line.itemId,
        name: line.item.name,
        unit: line.item.unit,
        needed,
        available,
        short: Math.max(needed - available, 0),
        unitCost: line.item.averageCost.toString(),
      };
    });

    return {
      bom: { id: bom.id, code: bom.code, name: bom.name, outputItem: bom.outputItem },
      quantity,
      requirements,
      canProduce: requirements.every((r) => r.short === 0),
    };
  }

  async plan(
    dto: { bomId: string; quantity: number; locationId: string },
    organizationId: string,
    staffId?: string | null,
  ) {
    const location = await this.prisma.stockLocation.findFirst({
      where: { id: dto.locationId, organizationId },
    });
    if (!location) throw new NotFoundException("Location not found");

    // Validates the recipe and the multiple, and tells the planner what is
    // short rather than letting them start something that cannot finish.
    await this.requirementsFor(dto.bomId, dto.quantity, dto.locationId, organizationId);

    return this.prisma.productionRun.create({
      data: {
        runNumber: `RUN-${genRunNo()}`,
        bomId: dto.bomId,
        locationId: dto.locationId,
        quantityPlanned: dto.quantity,
        producedById: staffId ?? undefined,
        organizationId,
      },
      include: { bom: { include: this.bomInclude() } },
    });
  }

  /**
   * Draws the materials and puts the finished item into stock.
   *
   * The output is costed at what the materials were worth, so the total value
   * held is the same before and after. Nothing is expensed on the way through:
   * a pack on a shelf is still stock, not a cost, until it is used.
   */
  async complete(
    id: string,
    dto: { quantityProduced?: number; batchNumber?: string; expiresAt?: string; notes?: string },
    organizationId: string,
    staffId?: string | null,
  ) {
    const run = await this.prisma.productionRun.findFirst({
      where: { id, organizationId },
      include: { bom: { include: this.bomInclude() } },
    });
    if (!run) throw new NotFoundException("Production run not found");
    if (run.status === "COMPLETED") {
      throw new BadRequestException("This run was already completed");
    }
    if (run.status === "CANCELLED") {
      throw new BadRequestException("This run was cancelled");
    }

    const produced = dto.quantityProduced ?? run.quantityPlanned;
    if (produced <= 0) throw new BadRequestException("Produced quantity must be positive");

    const requirements = await this.requirementsFor(
      run.bomId,
      produced,
      run.locationId,
      organizationId,
    );

    const short = requirements.requirements.filter((r) => r.short > 0);
    if (short.length) {
      throw new BadRequestException(
        `Not enough stock at this location: ${short
          .map((r) => `${r.name} (need ${r.needed}, have ${r.available})`)
          .join("; ")}`,
      );
    }

    const outputItem = run.bom.outputItem;
    const expiresAt =
      dto.expiresAt ??
      (run.bom.shelfLifeDays
        ? new Date(Date.now() + run.bom.shelfLifeDays * 86_400_000).toISOString()
        : undefined);

    if (outputItem.requiresBatch && (!dto.batchNumber || !expiresAt)) {
      throw new BadRequestException(
        `${outputItem.name} is batch-tracked, so this run needs a batch number and an expiry ` +
          `(set a shelf life on the recipe to have one worked out for you)`,
      );
    }

    // Draw each material. These are PRODUCTION moves, so the ledger leaves
    // their value in stock rather than expensing it.
    let materialCost = ZERO;
    const consumptions: { itemId: string; quantity: number; unitCost: Decimal; cost: Decimal }[] = [];

    for (const requirement of requirements.requirements) {
      await this.inventory.issue(
        {
          itemId: requirement.itemId,
          locationId: run.locationId,
          quantity: requirement.needed,
          type: "PRODUCTION",
          reason: `Production run ${run.runNumber}`,
          sourceType: "PRODUCTION_RUN",
          sourceId: run.id,
        },
        organizationId,
        staffId,
      );

      const unitCost = new Decimal(requirement.unitCost);
      const cost = unitCost.mul(requirement.needed);
      materialCost = materialCost.add(cost);
      consumptions.push({ itemId: requirement.itemId, quantity: requirement.needed, unitCost, cost });
    }

    // Value carried across, not invented: the output is worth what went in.
    const unitCost = materialCost.div(produced);

    await this.inventory.receive(
      {
        itemId: outputItem.id,
        locationId: run.locationId,
        quantity: produced,
        unitCost: unitCost.toNumber(),
        reference: `Production run ${run.runNumber}`,
        sourceType: "PRODUCTION_RUN",
        sourceId: run.id,
        ...(dto.batchNumber && { batchNumber: dto.batchNumber }),
        ...(expiresAt && { expiresAt }),
      },
      organizationId,
      staffId,
    );

    return this.prisma.productionRun.update({
      where: { id },
      data: {
        status: "COMPLETED",
        quantityProduced: produced,
        materialCost,
        batchNumber: dto.batchNumber,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        completedAt: new Date(),
        startedAt: run.startedAt ?? new Date(),
        producedById: staffId ?? run.producedById,
        consumptions: {
          create: consumptions.map((c) => ({
            itemId: c.itemId,
            quantity: c.quantity,
            unitCost: c.unitCost,
            cost: c.cost,
            organizationId,
          })),
        },
      },
      include: {
        bom: { include: this.bomInclude() },
        consumptions: { include: { item: { select: { name: true, unit: true } } } },
      },
    });
  }

  async cancel(id: string, reason: string, organizationId: string) {
    if (!reason?.trim()) throw new BadRequestException("Cancelling a run needs a reason");

    const run = await this.prisma.productionRun.findFirst({
      where: { id, organizationId },
    });
    if (!run) throw new NotFoundException("Production run not found");
    if (run.status === "COMPLETED") {
      // Materials are already drawn and the output is on a shelf; undoing that
      // is a stock correction, not a cancellation.
      throw new BadRequestException(
        "This run was completed. Adjust the stock instead of cancelling it",
      );
    }

    return this.prisma.productionRun.update({
      where: { id },
      data: { status: "CANCELLED", cancelReason: reason.trim() },
    });
  }

  listRuns(organizationId: string, status?: ProductionStatus) {
    return this.prisma.productionRun.findMany({
      where: { organizationId, ...(status && { status }) },
      include: {
        bom: {
          select: {
            code: true,
            name: true,
            type: true,
            outputItem: { select: { name: true, unit: true } },
          },
        },
        location: { select: { code: true, name: true } },
        producedBy: { select: { firstName: true, lastName: true } },
        _count: { select: { consumptions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async findRun(id: string, organizationId: string) {
    const run = await this.prisma.productionRun.findFirst({
      where: { id, organizationId },
      include: {
        bom: { include: this.bomInclude() },
        location: { select: { code: true, name: true } },
        consumptions: { include: { item: { select: { name: true, unit: true } } } },
      },
    });
    if (!run) throw new NotFoundException("Production run not found");
    return run;
  }

  async summary(organizationId: string) {
    const runs = await this.prisma.productionRun.findMany({
      where: { organizationId },
      select: { status: true, materialCost: true, quantityProduced: true, expiresAt: true },
    });

    const completed = runs.filter((r) => r.status === "COMPLETED");
    const soon = new Date(Date.now() + 30 * 86_400_000);

    return {
      planned: runs.filter((r) => r.status === "PLANNED").length,
      completed: completed.length,
      cancelled: runs.filter((r) => r.status === "CANCELLED").length,
      unitsProduced: completed.reduce((a, r) => a + (r.quantityProduced ?? 0), 0),
      materialValue: completed.reduce((a, r) => a.add(r.materialCost), ZERO).toString(),
      // Packs made in-house expire too, and an expired sterile pack is a
      // patient safety problem rather than a stock one.
      expiringWithin30Days: completed.filter(
        (r) => r.expiresAt && r.expiresAt > new Date() && r.expiresAt <= soon,
      ).length,
      alreadyExpired: completed.filter((r) => r.expiresAt && r.expiresAt <= new Date()).length,
    };
  }
}
