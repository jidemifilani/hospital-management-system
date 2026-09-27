import { Injectable, BadRequestException, NotFoundException, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InventoryCategory, Prisma, StockLocationType, StockMoveType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";

const genMoveNo = customAlphabet("0123456789", 8);

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  // ── Catalogue ──────────────────────────────────────────────────────────────

  async createItem(
    dto: {
      code: string;
      name: string;
      category?: InventoryCategory;
      unit: string;
      reorderLevel?: number;
      averageCost?: number;
    },
    organizationId: string,
  ) {
    const existing = await this.prisma.inventoryItem.findUnique({
      where: { code_organizationId: { code: dto.code, organizationId } },
    });
    if (existing) throw new BadRequestException(`Item ${dto.code} already exists`);

    return this.prisma.inventoryItem.create({ data: { ...dto, organizationId } });
  }

  async listItems(
    organizationId: string,
    filters: { category?: InventoryCategory; search?: string } = {},
  ) {
    return this.prisma.inventoryItem.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(filters.category && { category: filters.category }),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" as const } },
            { code: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }),
      },
      include: { levels: { include: { location: { select: { code: true, name: true } } } } },
      orderBy: { name: "asc" },
    });
  }

  async createLocation(
    dto: {
      code: string;
      name: string;
      type?: StockLocationType;
      departmentId?: string;
    },
    organizationId: string,
  ) {
    const existing = await this.prisma.stockLocation.findUnique({
      where: { code_organizationId: { code: dto.code, organizationId } },
    });
    if (existing) throw new BadRequestException(`Location ${dto.code} already exists`);

    return this.prisma.stockLocation.create({ data: { ...dto, organizationId } });
  }

  listLocations(organizationId: string) {
    return this.prisma.stockLocation.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  // ── Movements ──────────────────────────────────────────────────────────────

  /** Goods arriving from a supplier. Recalculates the item's moving average. */
  async receive(
    dto: {
      itemId: string;
      locationId: string;
      quantity: number;
      unitCost: number;
      reference?: string;
      sourceType?: string;
      sourceId?: string;
    },
    organizationId: string,
    staffId?: string | null,
  ) {
    if (dto.quantity <= 0) throw new BadRequestException("Receipt quantity must be positive");

    const [item, location] = await Promise.all([
      this.prisma.inventoryItem.findFirst({ where: { id: dto.itemId, organizationId } }),
      this.prisma.stockLocation.findFirst({ where: { id: dto.locationId, organizationId } }),
    ]);
    if (!item) throw new NotFoundException("Item not found");
    if (!location) throw new NotFoundException("Location not found");

    const move = await this.prisma.$transaction(async (tx) => {
      const onHandBefore = await this.totalOnHand(tx, dto.itemId);

      // Moving average: blend the existing holding with what just arrived.
      const existingValue = item.averageCost.mul(onHandBefore);
      const incomingValue = new Decimal(dto.unitCost).mul(dto.quantity);
      const newQty = onHandBefore + dto.quantity;
      const newAverage = newQty > 0 ? existingValue.add(incomingValue).div(newQty) : new Decimal(0);

      await tx.inventoryItem.update({
        where: { id: dto.itemId },
        data: { averageCost: newAverage },
      });

      await this.adjustLevel(tx, dto.itemId, dto.locationId, dto.quantity, organizationId);

      return tx.stockMove.create({
        data: {
          moveNumber: `MV-${genMoveNo()}`,
          itemId: dto.itemId,
          type: "RECEIPT",
          quantity: dto.quantity,
          toLocationId: dto.locationId,
          unitCost: new Decimal(dto.unitCost),
          reference: dto.reference ?? null,
          sourceType: dto.sourceType ?? null,
          sourceId: dto.sourceId ?? null,
          performedById: staffId ?? null,
          organizationId,
        },
      });
    });

    this.events.emit("inventory.received", {
      moveId: move.id,
      itemId: dto.itemId,
      quantity: dto.quantity,
      value: new Decimal(dto.unitCost).mul(dto.quantity).toString(),
      organizationId,
    });

    return move;
  }

  /** Stock leaving the building or being used up. */
  async issue(
    dto: {
      itemId: string;
      locationId: string;
      quantity: number;
      type?: Extract<StockMoveType, "ISSUE" | "CONSUMPTION" | "WRITE_OFF">;
      reason?: string;
      sourceType?: string;
      sourceId?: string;
    },
    organizationId: string,
    staffId?: string | null,
  ) {
    if (dto.quantity <= 0) throw new BadRequestException("Issue quantity must be positive");

    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.itemId, organizationId },
    });
    if (!item) throw new NotFoundException("Item not found");

    const move = await this.prisma.$transaction(async (tx) => {
      await this.assertAvailable(tx, dto.itemId, dto.locationId, dto.quantity, item.name);
      await this.adjustLevel(tx, dto.itemId, dto.locationId, -dto.quantity, organizationId);

      return tx.stockMove.create({
        data: {
          moveNumber: `MV-${genMoveNo()}`,
          itemId: dto.itemId,
          type: dto.type ?? "ISSUE",
          quantity: dto.quantity,
          fromLocationId: dto.locationId,
          unitCost: item.averageCost,
          reason: dto.reason ?? null,
          sourceType: dto.sourceType ?? null,
          sourceId: dto.sourceId ?? null,
          performedById: staffId ?? null,
          organizationId,
        },
      });
    });

    this.events.emit("inventory.issued", {
      moveId: move.id,
      itemId: dto.itemId,
      quantity: dto.quantity,
      value: item.averageCost.mul(dto.quantity).toString(),
      type: dto.type ?? "ISSUE",
      organizationId,
    });

    return move;
  }

  /** Moves stock between locations without changing total holding or value. */
  async transfer(
    dto: {
      itemId: string;
      fromLocationId: string;
      toLocationId: string;
      quantity: number;
      reason?: string;
    },
    organizationId: string,
    staffId?: string | null,
  ) {
    if (dto.quantity <= 0) throw new BadRequestException("Transfer quantity must be positive");
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException("Source and destination must differ");
    }

    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.itemId, organizationId },
    });
    if (!item) throw new NotFoundException("Item not found");

    return this.prisma.$transaction(async (tx) => {
      await this.assertAvailable(tx, dto.itemId, dto.fromLocationId, dto.quantity, item.name);
      await this.adjustLevel(tx, dto.itemId, dto.fromLocationId, -dto.quantity, organizationId);
      await this.adjustLevel(tx, dto.itemId, dto.toLocationId, dto.quantity, organizationId);

      return tx.stockMove.create({
        data: {
          moveNumber: `MV-${genMoveNo()}`,
          itemId: dto.itemId,
          type: "TRANSFER",
          quantity: dto.quantity,
          fromLocationId: dto.fromLocationId,
          toLocationId: dto.toLocationId,
          unitCost: item.averageCost,
          reason: dto.reason ?? null,
          performedById: staffId ?? null,
          organizationId,
        },
      });
    });
  }

  /**
   * Corrects the book quantity to what a count actually found.
   *
   * Takes the counted figure rather than a delta, because that is what the
   * person holding the clipboard has, and computing the difference for them
   * removes a step where mistakes happen.
   */
  async adjust(
    dto: { itemId: string; locationId: string; countedQuantity: number; reason: string },
    organizationId: string,
    staffId?: string | null,
  ) {
    if (dto.countedQuantity < 0) throw new BadRequestException("A count cannot be negative");
    if (!dto.reason?.trim()) throw new BadRequestException("An adjustment needs a reason");

    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.itemId, organizationId },
    });
    if (!item) throw new NotFoundException("Item not found");

    const { move, delta } = await this.prisma.$transaction(async (tx) => {
      const level = await tx.stockLevel.findUnique({
        where: { itemId_locationId: { itemId: dto.itemId, locationId: dto.locationId } },
      });
      const current = level?.quantity ?? 0;
      const difference = dto.countedQuantity - current;

      if (difference === 0) {
        throw new BadRequestException("Counted quantity already matches the book figure");
      }

      await this.adjustLevel(tx, dto.itemId, dto.locationId, difference, organizationId);

      const created = await tx.stockMove.create({
        data: {
          moveNumber: `MV-${genMoveNo()}`,
          itemId: dto.itemId,
          type: "ADJUSTMENT",
          quantity: Math.abs(difference),
          ...(difference > 0
            ? { toLocationId: dto.locationId }
            : { fromLocationId: dto.locationId }),
          unitCost: item.averageCost,
          reason: `${dto.reason} (book ${current} → counted ${dto.countedQuantity})`,
          performedById: staffId ?? null,
          organizationId,
        },
      });

      return { move: created, delta: difference };
    });

    // A count that changes stock changes what the stock is worth. Without this
    // the ledger's inventory balance drifts away from the shelves.
    this.events.emit("inventory.adjusted", {
      moveId: move.id,
      itemId: dto.itemId,
      delta,
      value: item.averageCost.mul(Math.abs(delta)).toString(),
      organizationId,
    });

    return move;
  }

  // ── Reporting ──────────────────────────────────────────────────────────────

  async stockOnHand(organizationId: string, locationId?: string) {
    const levels = await this.prisma.stockLevel.findMany({
      where: { organizationId, ...(locationId && { locationId }), quantity: { not: 0 } },
      include: {
        item: { select: { code: true, name: true, unit: true, averageCost: true, reorderLevel: true } },
        location: { select: { code: true, name: true } },
      },
      orderBy: { item: { name: "asc" } },
    });

    let totalValue = new Decimal(0);
    const rows = levels.map((l) => {
      const value = l.item.averageCost.mul(l.quantity);
      totalValue = totalValue.add(value);
      return {
        item: l.item.name,
        code: l.item.code,
        location: l.location.name,
        quantity: l.quantity,
        unit: l.item.unit,
        unitCost: l.item.averageCost.toString(),
        value: value.toString(),
      };
    });

    return { rows, totalValue: totalValue.toString() };
  }

  /** Items whose total across all locations has fallen to the reorder level. */
  async lowStock(organizationId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { organizationId, isActive: true },
      include: { levels: { select: { quantity: true } } },
    });

    return items
      .map((i) => ({
        id: i.id,
        code: i.code,
        name: i.name,
        unit: i.unit,
        onHand: i.levels.reduce((sum, l) => sum + l.quantity, 0),
        reorderLevel: i.reorderLevel,
      }))
      .filter((i) => i.onHand <= i.reorderLevel)
      .sort((a, b) => a.onHand - b.onHand);
  }

  async movements(
    organizationId: string,
    filters: { itemId?: string; locationId?: string; limit?: number } = {},
  ) {
    return this.prisma.stockMove.findMany({
      where: {
        organizationId,
        ...(filters.itemId && { itemId: filters.itemId }),
        ...(filters.locationId && {
          OR: [{ fromLocationId: filters.locationId }, { toLocationId: filters.locationId }],
        }),
      },
      include: {
        item: { select: { code: true, name: true, unit: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: Math.min(filters.limit ?? 50, 200),
    });
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private async totalOnHand(tx: Prisma.TransactionClient, itemId: string) {
    const agg = await tx.stockLevel.aggregate({
      where: { itemId },
      _sum: { quantity: true },
    });
    return agg._sum.quantity ?? 0;
  }

  private async assertAvailable(
    tx: Prisma.TransactionClient,
    itemId: string,
    locationId: string,
    quantity: number,
    itemName: string,
  ) {
    const level = await tx.stockLevel.findUnique({
      where: { itemId_locationId: { itemId, locationId } },
    });
    const available = level?.quantity ?? 0;

    if (available < quantity) {
      throw new BadRequestException(
        `Insufficient stock for ${itemName}: need ${quantity}, have ${available}`,
      );
    }
  }

  /** Levels move only here, inside the caller's transaction. */
  private async adjustLevel(
    tx: Prisma.TransactionClient,
    itemId: string,
    locationId: string,
    delta: number,
    organizationId: string,
  ) {
    await tx.stockLevel.upsert({
      where: { itemId_locationId: { itemId, locationId } },
      create: { itemId, locationId, quantity: delta, organizationId },
      update: { quantity: { increment: delta } },
    });
  }
}
