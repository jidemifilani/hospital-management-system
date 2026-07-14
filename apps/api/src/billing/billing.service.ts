import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { customAlphabet } from "nanoid";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../prisma/prisma.service";
import { PaystackService } from "./paystack.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { RecordPaymentDto } from "./dto/record-payment.dto";

const genInvoiceNo = customAlphabet("0123456789", 8);
const genRef = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 16);
const toD = (n: number) => new Decimal(n);

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private paystack: PaystackService,
    private config: ConfigService,
    private events: EventEmitter2,
  ) {}

  async createInvoice(dto: CreateInvoiceDto, createdById: string, organizationId: string) {
    const subtotal = dto.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const discount = dto.discount ?? 0;
    const tax = dto.tax ?? 0;
    const total = subtotal - discount + tax;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${genInvoiceNo()}`,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        subtotal: toD(subtotal),
        discount: toD(discount),
        tax: toD(tax),
        total: toD(total),
        notes: dto.notes,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: "ISSUED",
        createdById,
        organizationId,
        items: {
          create: dto.items.map((i) => ({
            description: i.description,
            category: i.category,
            quantity: i.quantity,
            unitPrice: toD(i.unitPrice),
            total: toD(i.unitPrice * i.quantity),
          })),
        },
      },
      include: {
        items: true,
        patient: { select: { firstName: true, lastName: true, mrn: true, phone: true, email: true } },
      },
    });

    const webUrl = this.config.get<string>("WEB_URL", "http://localhost:3000");
    this.events.emit("invoice.created", {
      patientPhone: invoice.patient.phone,
      patientEmail: invoice.patient.email ?? undefined,
      patientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
      invoiceNumber: invoice.invoiceNumber,
      total: Number(invoice.total),
      paymentLink: `${webUrl}/billing/payment-callback`,
    });

    return invoice;
  }

  async findAll(
    organizationId: string,
    page = 1,
    limit = 20,
    filters: { status?: string; patientId?: string; search?: string } = {},
  ) {
    const skip = (page - 1) * limit;
    const where = {
      organizationId,
      deletedAt: null as null,
      ...(filters.status && { status: filters.status as any }),
      ...(filters.patientId && { patientId: filters.patientId }),
      ...(filters.search && {
        OR: [
          { invoiceNumber: { contains: filters.search, mode: "insensitive" as const } },
          { patient: { firstName: { contains: filters.search, mode: "insensitive" as const } } },
          { patient: { lastName: { contains: filters.search, mode: "insensitive" as const } } },
          { patient: { mrn: { contains: filters.search, mode: "insensitive" as const } } },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
          payments: { select: { id: true, amount: true, method: true, paidAt: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, organizationId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        items: true,
        payments: {
          include: { receivedBy: { select: { firstName: true, lastName: true } } },
        },
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true, phone: true, nhisNumber: true } },
        appointment: { select: { id: true, scheduledAt: true, type: true } },
      },
    });
    if (!inv) throw new NotFoundException("Invoice not found");
    return inv;
  }

  async recordPayment(invoiceId: string, dto: RecordPaymentDto, staffId: string, organizationId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId, deletedAt: null },
    });
    if (!inv) throw new NotFoundException("Invoice not found");
    if (inv.status === "PAID" || inv.status === "CANCELLED") {
      throw new BadRequestException(`Cannot record payment on a ${inv.status.toLowerCase()} invoice`);
    }

    const amountPaid = Number(inv.amountPaid) + dto.amount;
    const newStatus =
      amountPaid >= Number(inv.total)
        ? "PAID"
        : amountPaid > 0
        ? "PARTIALLY_PAID"
        : inv.status;

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          invoiceId,
          amount: toD(dto.amount),
          method: dto.method,
          reference: dto.reference,
          notes: dto.notes,
          receivedById: staffId,
          organizationId,
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid: toD(amountPaid), status: newStatus as any },
      }),
    ]);

    return payment;
  }

  async initiateOnlinePayment(invoiceId: string, organizationId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId, deletedAt: null },
      include: { patient: { select: { firstName: true, lastName: true, email: true, phone: true } } },
    });
    if (!inv) throw new NotFoundException("Invoice not found");
    if (inv.status === "PAID") throw new BadRequestException("Invoice is already paid");
    if (inv.status === "CANCELLED") throw new BadRequestException("Invoice is cancelled");

    const outstanding = Number(inv.total) - Number(inv.amountPaid);
    if (outstanding <= 0) throw new BadRequestException("No outstanding balance");

    const email = inv.patient.email ?? `${inv.patient.phone}@caresync.ng`;
    const reference = `INV-${inv.invoiceNumber}-${genRef()}`;
    const webUrl = this.config.get<string>("WEB_URL", "http://localhost:3000");
    const callbackUrl = `${webUrl}/billing/payment-callback?ref=${reference}&invoice=${invoiceId}`;

    const result = await this.paystack.initializeTransaction({
      email,
      amount: outstanding,
      reference,
      invoiceId,
      patientName: `${inv.patient.firstName} ${inv.patient.lastName}`,
      callbackUrl,
    });

    return { ...result, outstanding, invoiceNumber: inv.invoiceNumber };
  }

  async handlePaystackWebhook(event: {
    event: string;
    data: { reference: string; amount: number; channel: string; metadata: Record<string, unknown> };
  }) {
    if (event.event !== "charge.success") return { received: true };

    const { reference, amount, channel, metadata } = event.data;
    const invoiceId = metadata?.invoice_id as string;
    if (!invoiceId) return { received: true };

    const inv = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
    });
    if (!inv || inv.status === "PAID") return { received: true };

    // Check we haven't already processed this reference
    const existing = await this.prisma.payment.findFirst({ where: { reference } });
    if (existing) return { received: true };

    const amountNaira = amount / 100;
    const newAmountPaid = Number(inv.amountPaid) + amountNaira;
    const newStatus = newAmountPaid >= Number(inv.total) ? "PAID" : "PARTIALLY_PAID";

    await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          invoiceId,
          amount: toD(amountNaira),
          method: channel.toUpperCase() === "CARD" ? "POS_CARD" : "BANK_TRANSFER",
          reference,
          notes: `Paystack online payment (${channel})`,
          receivedById: inv.createdById,
          organizationId: inv.organizationId,
        },
      }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid: toD(newAmountPaid), status: newStatus as any },
      }),
    ]);

    return { received: true };
  }

  async getDailySummary(organizationId: string, date?: string) {
    const d = date ? new Date(date) : new Date();
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);

    const [payments, invoices] = await Promise.all([
      this.prisma.payment.findMany({
        where: { organizationId, paidAt: { gte: start, lte: end } },
        select: { amount: true, method: true },
      }),
      this.prisma.invoice.findMany({
        where: { organizationId, createdAt: { gte: start, lte: end }, deletedAt: null },
        select: { total: true, status: true },
      }),
    ]);

    const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
    const byMethod = payments.reduce((acc: Record<string, number>, p) => {
      acc[p.method] = (acc[p.method] ?? 0) + Number(p.amount);
      return acc;
    }, {});

    return {
      date: start.toISOString().split("T")[0],
      totalCollected,
      byMethod,
      invoicesRaised: invoices.length,
      outstandingTotal: invoices
        .filter((i) => i.status !== "PAID" && i.status !== "CANCELLED")
        .reduce((s, i) => s + Number(i.total), 0),
    };
  }
}
