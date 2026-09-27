import { Injectable, BadRequestException, NotFoundException, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PaymentMethod } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";

const genSessionNo = customAlphabet("0123456789", 6);
const genReceiptNo = customAlphabet("0123456789", 8);

const ZERO = new Decimal(0);

export interface SaleLineInput {
  itemId: string;
  quantity: number;
  /** Overrides the item's selling price, for an agreed discount on the line. */
  unitPrice?: number;
}

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private events: EventEmitter2,
  ) {}

  // ── Sessions ───────────────────────────────────────────────────────────────

  /** Opens a till. One cashier may not hold two open sessions at once. */
  async openSession(
    dto: { terminalName: string; openingFloat: number },
    organizationId: string,
    cashierId: string,
  ) {
    const existing = await this.prisma.posSession.findFirst({
      where: { cashierId, organizationId, status: "OPEN" },
      select: { sessionNumber: true },
    });
    if (existing) {
      throw new BadRequestException(
        `You already have an open till (${existing.sessionNumber}) — close it first`,
      );
    }

    if (dto.openingFloat < 0) throw new BadRequestException("Opening float cannot be negative");

    return this.prisma.posSession.create({
      data: {
        sessionNumber: `TILL-${genSessionNo()}`,
        terminalName: dto.terminalName,
        cashierId,
        openingFloat: new Decimal(dto.openingFloat),
        organizationId,
      },
    });
  }

  /**
   * Closes a till against a physical count.
   *
   * The variance is recorded rather than hidden: a till that is short needs to
   * be visible, not quietly reconciled away.
   */
  async closeSession(
    id: string,
    dto: { closingCounted: number; notes?: string },
    organizationId: string,
  ) {
    const session = await this.prisma.posSession.findFirst({
      where: { id, organizationId },
      include: {
        sales: {
          where: { status: { not: "VOIDED" }, method: "CASH" },
          select: { total: true },
        },
      },
    });
    if (!session) throw new NotFoundException("Till session not found");
    if (session.status !== "OPEN") throw new BadRequestException("Till is already closed");

    const cashTaken = session.sales.reduce((sum, s) => sum.add(s.total), ZERO);
    const expected = session.openingFloat.add(cashTaken);
    const counted = new Decimal(dto.closingCounted);

    return this.prisma.posSession.update({
      where: { id },
      data: {
        closingCounted: counted,
        closingExpected: expected,
        variance: counted.sub(expected),
        status: "CLOSED",
        closedAt: new Date(),
        notes: dto.notes ?? null,
      },
    });
  }

  async currentSession(organizationId: string, cashierId: string) {
    return this.prisma.posSession.findFirst({
      where: { cashierId, organizationId, status: "OPEN" },
      include: { _count: { select: { sales: true } } },
    });
  }

  // ── Selling ────────────────────────────────────────────────────────────────

  /**
   * Rings up a sale: prices the lines, takes the stock and records the money.
   *
   * Stock is moved before the sale is written, so a sale can never exist for
   * goods that were not on the shelf.
   */
  async sell(
    dto: {
      sessionId: string;
      lines: SaleLineInput[];
      method?: PaymentMethod;
      patientId?: string;
      discount?: number;
      amountTendered?: number;
      locationId?: string;
    },
    organizationId: string,
    staffId?: string | null,
  ) {
    if (!dto.lines?.length) throw new BadRequestException("A sale needs at least one line");

    const session = await this.prisma.posSession.findFirst({
      where: { id: dto.sessionId, organizationId },
    });
    if (!session) throw new NotFoundException("Till session not found");
    if (session.status !== "OPEN") {
      throw new BadRequestException("Till is closed — open a session before selling");
    }

    const items = await this.prisma.inventoryItem.findMany({
      where: { id: { in: dto.lines.map((l) => l.itemId) }, organizationId },
    });
    const byId = new Map(items.map((i) => [i.id, i]));

    const missing = dto.lines.filter((l) => !byId.has(l.itemId));
    if (missing.length) {
      throw new BadRequestException(`Unknown item(s): ${missing.map((m) => m.itemId).join(", ")}`);
    }

    const location = await this.sellingLocation(dto.locationId, organizationId);

    const priced = dto.lines.map((line) => {
      const item = byId.get(line.itemId)!;
      const unitPrice =
        line.unitPrice !== undefined ? new Decimal(line.unitPrice) : (item.sellingPrice ?? ZERO);

      if (unitPrice.lessThanOrEqualTo(0)) {
        throw new BadRequestException(`${item.name} has no selling price set`);
      }
      if (line.quantity <= 0) {
        throw new BadRequestException(`${item.name}: quantity must be positive`);
      }

      return {
        itemId: item.id,
        description: item.name,
        quantity: line.quantity,
        unitPrice,
        total: unitPrice.mul(line.quantity),
      };
    });

    const subtotal = priced.reduce((sum, l) => sum.add(l.total), ZERO);
    const discount = new Decimal(dto.discount ?? 0);
    if (discount.greaterThan(subtotal)) {
      throw new BadRequestException("Discount cannot exceed the sale total");
    }
    const total = subtotal.sub(discount);

    const method = dto.method ?? "CASH";
    const tendered = dto.amountTendered !== undefined ? new Decimal(dto.amountTendered) : null;
    if (method === "CASH" && tendered && tendered.lessThan(total)) {
      throw new BadRequestException(
        `Tendered ${tendered} is less than the total ${total}`,
      );
    }

    // Stock first: if the shelf cannot supply it, no sale is recorded.
    for (const line of priced) {
      await this.inventory.issue(
        {
          itemId: line.itemId,
          locationId: location.id,
          quantity: line.quantity,
          type: "ISSUE",
          reason: "Counter sale",
          sourceType: "POS_SALE",
        },
        organizationId,
        staffId,
      );
    }

    const sale = await this.prisma.posSale.create({
      data: {
        receiptNumber: `RCP-${genReceiptNo()}`,
        sessionId: dto.sessionId,
        patientId: dto.patientId ?? null,
        locationId: location.id,
        subtotal,
        discount,
        total,
        method,
        amountTendered: tendered,
        changeGiven: tendered ? tendered.sub(total) : null,
        soldById: staffId ?? null,
        organizationId,
        lines: { create: priced.map((l) => ({ ...l, organizationId })) },
      },
      include: { lines: true },
    });

    this.events.emit("pos.sale.completed", {
      saleId: sale.id,
      total: total.toString(),
      method,
      organizationId,
    });

    return sale;
  }

  /** Reverses a sale, returning the goods to stock. */
  async refund(id: string, reason: string, organizationId: string, staffId?: string | null) {
    const sale = await this.prisma.posSale.findFirst({
      where: { id, organizationId },
      include: { lines: true, session: true },
    });
    if (!sale) throw new NotFoundException("Sale not found");
    if (sale.status !== "COMPLETED") {
      throw new BadRequestException(`Sale is already ${sale.status.toLowerCase()}`);
    }

    // Goods go back where they came from. Defaulting to the main counter would
    // silently move stock between locations every time something was returned.
    const location = await this.sellingLocation(sale.locationId ?? undefined, organizationId);

    for (const line of sale.lines) {
      const item = await this.prisma.inventoryItem.findUnique({ where: { id: line.itemId } });
      await this.inventory.receive(
        {
          itemId: line.itemId,
          locationId: location.id,
          quantity: line.quantity,
          unitCost: Number(item?.averageCost ?? 0),
          reference: `Refund of ${sale.receiptNumber}`,
          // A returned batch-tracked item needs a lot to go back into.
          ...(item?.requiresBatch
            ? {
                batchNumber: `RETURN-${sale.receiptNumber}`,
                expiresAt: new Date(Date.now() + 365 * 86_400_000),
              }
            : {}),
        },
        organizationId,
        staffId,
      );
    }

    const [, refund] = await this.prisma.$transaction([
      this.prisma.posSale.update({ where: { id }, data: { status: "REFUNDED" } }),
      this.prisma.posSale.create({
        data: {
          receiptNumber: `RFD-${genReceiptNo()}`,
          sessionId: sale.sessionId,
          patientId: sale.patientId,
          subtotal: sale.subtotal.negated(),
          discount: sale.discount.negated(),
          total: sale.total.negated(),
          method: sale.method,
          status: "COMPLETED",
          refundedSaleId: sale.id,
          soldById: staffId ?? null,
          organizationId,
          lines: {
            create: sale.lines.map((l) => ({
              itemId: l.itemId,
              description: `Refund: ${l.description} (${reason})`,
              quantity: l.quantity,
              unitPrice: l.unitPrice.negated(),
              total: l.total.negated(),
              organizationId,
            })),
          },
        },
        include: { lines: true },
      }),
    ]);

    this.events.emit("pos.sale.refunded", {
      saleId: refund.id,
      originalSaleId: sale.id,
      total: refund.total.toString(),
      method: sale.method,
      organizationId,
    });

    return refund;
  }

  // ── Reporting ──────────────────────────────────────────────────────────────

  async sales(organizationId: string, filters: { sessionId?: string; limit?: number } = {}) {
    return this.prisma.posSale.findMany({
      where: { organizationId, ...(filters.sessionId && { sessionId: filters.sessionId }) },
      include: {
        lines: true,
        patient: { select: { mrn: true, firstName: true, lastName: true } },
      },
      orderBy: { soldAt: "desc" },
      take: Math.min(filters.limit ?? 50, 200),
    });
  }

  /** What a cashier took, split by tender, for the shift just worked. */
  async sessionSummary(id: string, organizationId: string) {
    const session = await this.prisma.posSession.findFirst({
      where: { id, organizationId },
      include: { sales: { where: { status: { not: "VOIDED" } }, include: { lines: true } } },
    });
    if (!session) throw new NotFoundException("Till session not found");

    const byMethod = new Map<string, Decimal>();
    let total = ZERO;

    for (const sale of session.sales) {
      byMethod.set(sale.method, (byMethod.get(sale.method) ?? ZERO).add(sale.total));
      total = total.add(sale.total);
    }

    const cash = byMethod.get("CASH") ?? ZERO;

    return {
      sessionNumber: session.sessionNumber,
      terminal: session.terminalName,
      status: session.status,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      saleCount: session.sales.length,
      openingFloat: session.openingFloat.toString(),
      byMethod: [...byMethod.entries()].map(([method, amount]) => ({
        method,
        amount: amount.toString(),
      })),
      totalTaken: total.toString(),
      expectedInDrawer: session.openingFloat.add(cash).toString(),
      countedInDrawer: session.closingCounted?.toString() ?? null,
      variance: session.variance?.toString() ?? null,
    };
  }

  /** Counter sales come out of the pharmacy store unless told otherwise. */
  private async sellingLocation(locationId: string | undefined, organizationId: string) {
    if (locationId) {
      const chosen = await this.prisma.stockLocation.findFirst({
        where: { id: locationId, organizationId },
      });
      if (!chosen) throw new NotFoundException("Stock location not found");
      return chosen;
    }

    const existing = await this.prisma.stockLocation.findUnique({
      where: { code_organizationId: { code: "PHARMACY", organizationId } },
    });
    if (existing) return existing;

    return this.prisma.stockLocation.create({
      data: { code: "PHARMACY", name: "Pharmacy Store", type: "PHARMACY", organizationId },
    });
  }
}
