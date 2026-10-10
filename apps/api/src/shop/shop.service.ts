import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PaystackService } from "../billing/paystack.service";
import { Decimal } from "@prisma/client/runtime/library";

interface CartItem {
  itemId: string;
  quantity: number;
}

interface PlaceOrderDto {
  items: CartItem[];
  deliveryMethod?: "PICKUP" | "DELIVERY";
  deliveryAddress?: string;
  notes?: string;
}

@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
  ) {}

  async getCatalog(organizationId: string) {
    return this.prisma.inventoryItem.findMany({
      where: {
        organizationId,
        isActive: true,
        sellingPrice: { not: null },
        category: { in: ["DRUG", "CONSUMABLE", "OTHER"] },
      },
      select: {
        id: true,
        name: true,
        code: true,
        unit: true,
        sellingPrice: true,
        category: true,
        genericName: true,
        levels: {
          select: { quantity: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async placeOrder(patientId: string, organizationId: string, dto: PlaceOrderDto) {
    const { items, deliveryMethod = "PICKUP", deliveryAddress, notes } = dto;
    if (!items?.length) throw new BadRequestException("Order must have at least one item");

    const itemIds = items.map((i) => i.itemId);
    const catalogItems = await this.prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, organizationId, isActive: true, sellingPrice: { not: null } },
      select: { id: true, name: true, sellingPrice: true },
    });

    if (catalogItems.length !== itemIds.length) {
      throw new BadRequestException("One or more items are unavailable");
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    const priceMap = new Map(catalogItems.map((c) => [c.id, new Decimal(c.sellingPrice!)]));

    let total = new Decimal(0);
    const lineItems = items.map((i) => {
      const price = priceMap.get(i.itemId)!;
      const lineTotal = price.mul(i.quantity);
      total = total.add(lineTotal);
      return { itemId: i.itemId, quantity: i.quantity, unitPrice: price, total: lineTotal };
    });

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const systemStaff = await this.prisma.staff.findFirst({
      where: { organizationId, isActive: true },
      select: { id: true },
    });
    if (!systemStaff) throw new BadRequestException("Organization has no active staff to process orders");

    const order = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${orderNumber}`,
          patientId,
          organizationId,
          subtotal: total.toDecimalPlaces(2),
          total: total.toDecimalPlaces(2),
          amountPaid: new Decimal(0),
          status: "ISSUED",
          dueDate: new Date(Date.now() + 7 * 86_400_000),
          createdById: systemStaff.id,
        },
      });

      return tx.onlineOrder.create({
        data: {
          orderNumber,
          patientId,
          invoiceId: invoice.id,
          organizationId,
          status: "PENDING_PAYMENT",
          deliveryMethod,
          deliveryAddress,
          notes,
          items: {
            create: lineItems.map((l) => ({
              itemId: l.itemId,
              quantity: l.quantity,
              unitPrice: l.unitPrice.toDecimalPlaces(2),
              total: l.total.toDecimalPlaces(2),
            })),
          },
        },
        include: { items: true },
      });
    });

    const email = patient.email ?? `${patient.phone}@caresync.local`;
    const reference = `SHOP-${orderNumber}`;
    const paystackRef = await this.paystack.initializeTransaction({
      email,
      amount: total.toNumber(),
      reference,
      invoiceId: order.invoiceId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      callbackUrl: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/portal/shop/callback`,
    });

    return { order, paymentUrl: paystackRef.authorization_url, reference };
  }

  async getOrders(patientId: string) {
    return this.prisma.onlineOrder.findMany({
      where: { patientId },
      include: {
        items: {
          include: { item: { select: { name: true, unit: true } } },
        },
        invoice: { select: { invoiceNumber: true, status: true, total: true, amountPaid: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async confirmPayment(reference: string) {
    const result = await this.paystack.verifyTransaction(reference);
    if (result.status !== "success") return { confirmed: false };

    const invoiceId = (result as any).metadata?.invoice_id ?? "";
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, onlineOrder: { isNot: null } },
      include: { onlineOrder: true },
    });
    if (!invoice?.onlineOrder) return { confirmed: false };

    await this.prisma.$transaction([
      this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "PAID", amountPaid: invoice.total },
      }),
      this.prisma.onlineOrder.update({
        where: { id: invoice.onlineOrder.id },
        data: { status: "PAID" },
      }),
    ]);

    return { confirmed: true, orderId: invoice.onlineOrder.id };
  }
}
