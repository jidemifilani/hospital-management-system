import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";
import { Decimal } from "@prisma/client/runtime/library";

const genNum = customAlphabet("0123456789", 8);
const genAlpha = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

const INCLUDE = {
  items: true,
  createdBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class ProcurementService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    vendorName: string; vendorContact?: string; vendorEmail?: string;
    notes?: string; expectedAt?: string;
    items: Array<{ itemName: string; category?: string; unit?: string; quantity: number; unitPrice: number; notes?: string }>;
  }, createdById: string | undefined, organizationId: string) {
    const totalAmount = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    return this.prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-${genNum()}`,
        vendorName: data.vendorName,
        vendorContact: data.vendorContact,
        vendorEmail: data.vendorEmail,
        notes: data.notes,
        expectedAt: data.expectedAt ? new Date(data.expectedAt) : undefined,
        totalAmount,
        createdById,
        organizationId,
        items: {
          create: data.items.map((i) => ({
            itemName: i.itemName,
            category: i.category,
            unit: i.unit,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.quantity * i.unitPrice,
            notes: i.notes,
          })),
        },
      },
      include: INCLUDE,
    });
  }

  async findAll(organizationId: string, status?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { organizationId, ...(status ? { status: status as any } : {}) },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, organizationId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, organizationId }, include: INCLUDE });
    if (!po) throw new NotFoundException("Purchase order not found");
    return po;
  }

  async updateStatus(id: string, status: string, organizationId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, organizationId } });
    if (!po) throw new NotFoundException("Purchase order not found");

    const update: any = { status };
    if (status === "ORDERED") update.orderedAt = new Date();
    if (status === "RECEIVED" || status === "PARTIALLY_RECEIVED") update.receivedAt = new Date();

    return this.prisma.purchaseOrder.update({ where: { id }, data: update, include: INCLUDE });
  }

  async receiveItem(id: string, itemId: string, receivedQuantity: number, organizationId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!po) throw new NotFoundException("Purchase order not found");

    await this.prisma.purchaseOrderItem.update({
      where: { id: itemId },
      data: { receivedQuantity },
    });

    const updatedItems = await this.prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
    const allReceived = updatedItems.every((i) => i.receivedQuantity >= i.quantity);
    const anyReceived = updatedItems.some((i) => i.receivedQuantity > 0);

    const newStatus = allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : po.status;
    const update: any = { status: newStatus };
    if (allReceived || anyReceived) update.receivedAt = new Date();

    return this.prisma.purchaseOrder.update({ where: { id }, data: update, include: INCLUDE });
  }

  async getSummary(organizationId: string) {
    const [draft, submitted, approved, ordered, received, cancelled] = await Promise.all([
      this.prisma.purchaseOrder.count({ where: { organizationId, status: "DRAFT" } }),
      this.prisma.purchaseOrder.count({ where: { organizationId, status: "SUBMITTED" } }),
      this.prisma.purchaseOrder.count({ where: { organizationId, status: "APPROVED" } }),
      this.prisma.purchaseOrder.count({ where: { organizationId, status: "ORDERED" } }),
      this.prisma.purchaseOrder.count({ where: { organizationId, status: "RECEIVED" } }),
      this.prisma.purchaseOrder.count({ where: { organizationId, status: "CANCELLED" } }),
    ]);

    const totalValue = await this.prisma.purchaseOrder.aggregate({
      where: { organizationId, status: { notIn: ["DRAFT", "CANCELLED"] } },
      _sum: { totalAmount: true },
    });

    return { draft, submitted, approved, ordered, received, cancelled, totalValue: totalValue._sum.totalAmount ?? 0 };
  }

  // ── Goods Receipt Notes ────────────────────────────────────────────────────

  async createGrn(
    poId: string,
    organizationId: string,
    receivedById: string | undefined,
    data: { receivedAt?: string; notes?: string; lines: { poItemId: string; quantity: number; unitCost: number; notes?: string }[] },
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id: poId, organizationId }, include: { items: true } });
    if (!po) throw new NotFoundException("Purchase order not found");

    const grn = await this.prisma.goodsReceiptNote.create({
      data: {
        grnNumber: `GRN-${genAlpha()}`,
        purchaseOrderId: poId,
        receivedById,
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
        notes: data.notes,
        organizationId,
        lines: {
          create: data.lines.map((l) => ({
            poItemId: l.poItemId,
            quantity: new Decimal(l.quantity),
            unitCost: new Decimal(l.unitCost),
            notes: l.notes,
          })),
        },
      },
      include: { lines: { include: { poItem: true } }, receivedBy: { select: { firstName: true, lastName: true } } },
    });

    // Update receivedQuantity on each PO item (accumulate)
    for (const line of data.lines) {
      const existing = po.items.find((i) => i.id === line.poItemId);
      if (existing) {
        await this.prisma.purchaseOrderItem.update({
          where: { id: line.poItemId },
          data: { receivedQuantity: { increment: Math.round(line.quantity) } },
        });
      }
    }

    // Refresh items to check overall status
    const updatedItems = await this.prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: poId } });
    const allReceived = updatedItems.every((i) => i.receivedQuantity >= i.quantity);
    const anyReceived = updatedItems.some((i) => i.receivedQuantity > 0);
    const newStatus = allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : po.status;

    if (newStatus !== po.status) {
      await this.prisma.purchaseOrder.update({ where: { id: poId }, data: { status: newStatus as any, receivedAt: new Date() } });
    }

    return grn;
  }

  listGrns(poId: string, organizationId: string) {
    return this.prisma.goodsReceiptNote.findMany({
      where: { purchaseOrderId: poId, organizationId },
      include: { lines: { include: { poItem: true } }, receivedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { receivedAt: "desc" },
    });
  }

  // ── Supplier Invoices ──────────────────────────────────────────────────────

  async createSupplierInvoice(
    poId: string,
    organizationId: string,
    data: {
      vendorInvoiceNo?: string;
      invoiceDate: string;
      dueDate?: string;
      notes?: string;
      lines: { poItemId?: string; description: string; quantity: number; unitPrice: number }[];
    },
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id: poId, organizationId } });
    if (!po) throw new NotFoundException("Purchase order not found");

    const totalAmount = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

    return this.prisma.supplierInvoice.create({
      data: {
        siNumber: `SI-${genAlpha()}`,
        vendorInvoiceNo: data.vendorInvoiceNo,
        purchaseOrderId: poId,
        invoiceDate: new Date(data.invoiceDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        totalAmount: new Decimal(totalAmount),
        organizationId,
        lines: {
          create: data.lines.map((l) => ({
            poItemId: l.poItemId,
            description: l.description,
            quantity: new Decimal(l.quantity),
            unitPrice: new Decimal(l.unitPrice),
            total: new Decimal(l.quantity * l.unitPrice),
          })),
        },
      },
      include: { lines: { include: { poItem: true } } },
    });
  }

  listSupplierInvoices(poId: string, organizationId: string) {
    return this.prisma.supplierInvoice.findMany({
      where: { purchaseOrderId: poId, organizationId },
      include: { lines: { include: { poItem: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // ── 3-Way Match ─────────────────────────────────────────────────────────────

  async runThreeWayMatch(siId: string, organizationId: string) {
    const si = await this.prisma.supplierInvoice.findFirst({
      where: { id: siId, organizationId },
      include: { lines: true, purchaseOrder: { include: { items: true } } },
    });
    if (!si) throw new NotFoundException("Supplier invoice not found");

    // Aggregate GRN quantities per PO item
    const grnLines = await this.prisma.goodsReceiptLine.findMany({
      where: { grn: { purchaseOrderId: si.purchaseOrderId, organizationId } },
    });
    const grnByItem = new Map<string, number>();
    for (const line of grnLines) {
      grnByItem.set(line.poItemId, (grnByItem.get(line.poItemId) ?? 0) + Number(line.quantity));
    }

    // Build per-item match rows
    const rows = si.purchaseOrder.items.map((poItem) => {
      const siLine = si.lines.find((l) => l.poItemId === poItem.id);
      const poQty       = poItem.quantity;
      const poUnitPrice = Number(poItem.unitPrice);
      const grnQty      = grnByItem.get(poItem.id) ?? 0;
      const invQty      = siLine ? Number(siLine.quantity) : 0;
      const invUnitPrice = siLine ? Number(siLine.unitPrice) : 0;

      const qtyVariance   = invQty - grnQty;
      const priceVariance = (invUnitPrice - poUnitPrice) * invQty;

      const hasQtyVar   = Math.abs(qtyVariance)   > 0.001;
      const hasPriceVar = Math.abs(priceVariance)  > 0.01;

      const matchStatus =
        !siLine         ? "NOT_INVOICED" :
        hasQtyVar && hasPriceVar ? "BOTH_VARIANCE" :
        hasQtyVar       ? "QTY_VARIANCE"   :
        hasPriceVar     ? "PRICE_VARIANCE" :
                          "OK";

      return {
        poItemId: poItem.id,
        itemName: poItem.itemName,
        poQty,
        poUnitPrice,
        grnQty,
        invoicedQty: invQty,
        invoicedUnitPrice: invUnitPrice,
        qtyVariance,
        priceVariance: Math.round(priceVariance * 100) / 100,
        matchStatus,
      };
    });

    const overallOk = rows.every((r) => r.matchStatus === "OK" || r.matchStatus === "NOT_INVOICED");
    const overallMatchStatus = overallOk ? "MATCHED" : "DISCREPANCY";
    const newStatus = overallOk ? "MATCHED" : "DISCREPANCY";

    await this.prisma.supplierInvoice.update({
      where: { id: siId },
      data: { matchStatus: overallMatchStatus, status: newStatus as any },
    });

    return { matchStatus: overallMatchStatus, rows, invoiceId: siId };
  }

  async approveSupplierInvoice(siId: string, organizationId: string) {
    const si = await this.prisma.supplierInvoice.findFirst({ where: { id: siId, organizationId } });
    if (!si) throw new NotFoundException("Supplier invoice not found");
    if (si.matchStatus !== "MATCHED")
      throw new BadRequestException("Invoice must be fully matched before approval. Run 3-way match first.");

    return this.prisma.supplierInvoice.update({
      where: { id: siId },
      data: { status: "APPROVED" },
      include: { lines: true },
    });
  }
}
