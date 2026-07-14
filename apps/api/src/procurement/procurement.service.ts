import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { customAlphabet } from "nanoid";

const genNum = customAlphabet("0123456789", 8);

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
}
