import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../reports/mail.service";
import type {
  CreateRfqDto, UpdateRfqDto, InviteVendorDto, SubmitQuoteDto,
} from "./dto/rfq.dto";

const genNum = customAlphabet("0123456789", 8);

const DETAIL = {
  items: { orderBy: { sortOrder: "asc" } },
  quotes: {
    orderBy: { invitedAt: "asc" },
    include: { lines: true },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  purchaseOrder: { select: { id: true, poNumber: true, status: true } },
} as const;

@Injectable()
export class RfqService {
  private readonly logger = new Logger(RfqService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // ── RFQ lifecycle ───────────────────────────────────────────────────────────

  listRfqs(organizationId: string, status?: string) {
    return this.prisma.rfq.findMany({
      where: { organizationId, ...(status ? { status: status as any } : {}) },
      include: {
        _count: { select: { items: true, quotes: true } },
        purchaseOrder: { select: { id: true, poNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getRfq(id: string, organizationId: string) {
    const rfq = await this.prisma.rfq.findFirst({
      where: { id, organizationId },
      include: DETAIL,
    });
    if (!rfq) throw new NotFoundException("RFQ not found");
    return rfq;
  }

  async createRfq(dto: CreateRfqDto, createdById: string | undefined, organizationId: string) {
    return this.prisma.rfq.create({
      data: {
        rfqNumber: `RFQ-${genNum()}`,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        createdById,
        organizationId,
        items: {
          create: dto.items.map((item, index) => ({
            itemName: item.itemName,
            category: item.category,
            unit: item.unit,
            quantity: item.quantity,
            specification: item.specification,
            sortOrder: index,
          })),
        },
      },
      include: DETAIL,
    });
  }

  async updateRfq(id: string, dto: UpdateRfqDto, organizationId: string) {
    const rfq = await this.requireRfq(id, organizationId);
    if (rfq.status !== "DRAFT") {
      throw new BadRequestException("Only a draft RFQ can be edited");
    }
    return this.prisma.rfq.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: DETAIL,
    });
  }

  /**
   * Issue the RFQ to every invited vendor. Email delivery is best-effort: if
   * SMTP is not configured the RFQ still goes out as SENT, and the result says
   * how many notifications actually left, so the caller is never told vendors
   * were emailed when they were not.
   */
  async sendRfq(id: string, organizationId: string) {
    const rfq = await this.prisma.rfq.findFirst({
      where: { id, organizationId },
      include: { items: { orderBy: { sortOrder: "asc" } }, quotes: true },
    });
    if (!rfq) throw new NotFoundException("RFQ not found");
    if (rfq.status !== "DRAFT") throw new BadRequestException("RFQ has already been sent");
    if (rfq.quotes.length === 0) {
      throw new BadRequestException("Invite at least one vendor before sending");
    }

    const updated = await this.prisma.rfq.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
      include: DETAIL,
    });

    const recipients = rfq.quotes
      .map((q) => q.vendorEmail)
      .filter((e): e is string => Boolean(e));

    let emailed = 0;
    if (recipients.length > 0) {
      const html = this.invitationHtml(rfq.rfqNumber, rfq.title, rfq.dueDate, rfq.items);
      const sent = await this.mail.sendHtml(recipients, `Request for Quotation ${rfq.rfqNumber}`, html);
      if (sent) emailed = recipients.length;
      else this.logger.warn(`RFQ ${rfq.rfqNumber} sent but email delivery unavailable`);
    }

    return {
      rfq: updated,
      invited: rfq.quotes.length,
      emailed,
      withoutEmail: rfq.quotes.length - recipients.length,
    };
  }

  async closeRfq(id: string, organizationId: string) {
    const rfq = await this.requireRfq(id, organizationId);
    if (rfq.status !== "SENT") throw new BadRequestException("Only a sent RFQ can be closed");
    return this.prisma.rfq.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() },
      include: DETAIL,
    });
  }

  async cancelRfq(id: string, organizationId: string) {
    const rfq = await this.requireRfq(id, organizationId);
    if (rfq.status === "AWARDED") {
      throw new BadRequestException("An awarded RFQ cannot be cancelled");
    }
    return this.prisma.rfq.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: DETAIL,
    });
  }

  // ── Vendors and quotes ──────────────────────────────────────────────────────

  async inviteVendor(rfqId: string, dto: InviteVendorDto, organizationId: string) {
    const rfq = await this.requireRfq(rfqId, organizationId);
    if (rfq.status !== "DRAFT" && rfq.status !== "SENT") {
      throw new BadRequestException("Vendors can only be invited while the RFQ is open");
    }
    return this.prisma.rfqQuote.create({
      data: {
        rfqId,
        vendorName: dto.vendorName,
        vendorContact: dto.vendorContact,
        vendorEmail: dto.vendorEmail,
        organizationId,
      },
    });
  }

  async removeVendor(quoteId: string, organizationId: string) {
    const quote = await this.prisma.rfqQuote.findFirst({
      where: { id: quoteId, organizationId },
      include: { rfq: { select: { status: true } } },
    });
    if (!quote) throw new NotFoundException("Vendor invitation not found");
    if (quote.status === "AWARDED") {
      throw new BadRequestException("The awarded vendor cannot be removed");
    }
    return this.prisma.rfqQuote.delete({ where: { id: quoteId } });
  }

  /**
   * Record a vendor's pricing. Quote lines must reference items that belong to
   * this RFQ, so a stale or hand-crafted payload cannot price a line from a
   * different RFQ. Re-submitting replaces the previous lines.
   */
  async submitQuote(quoteId: string, dto: SubmitQuoteDto, organizationId: string) {
    const quote = await this.prisma.rfqQuote.findFirst({
      where: { id: quoteId, organizationId },
      include: { rfq: { select: { status: true, items: { select: { id: true, quantity: true } } } } },
    });
    if (!quote) throw new NotFoundException("Vendor invitation not found");
    if (quote.rfq.status !== "SENT" && quote.rfq.status !== "CLOSED") {
      throw new BadRequestException("Quotes can only be recorded on a sent or closed RFQ");
    }

    const itemById = new Map(quote.rfq.items.map((i) => [i.id, i]));
    const unknown = dto.lines.filter((l) => !itemById.has(l.rfqItemId));
    if (unknown.length > 0) {
      throw new BadRequestException("Quote references items that do not belong to this RFQ");
    }

    const seen = new Set<string>();
    for (const line of dto.lines) {
      if (seen.has(line.rfqItemId)) {
        throw new BadRequestException("Each RFQ item may only be priced once per quote");
      }
      seen.add(line.rfqItemId);
    }

    const lines = dto.lines.map((line) => {
      // Default to the quantity the RFQ asked for, so a vendor pricing the
      // requested amount does not have to restate it.
      const quantity = line.quantity ?? itemById.get(line.rfqItemId)!.quantity;
      const unitPrice = new Decimal(line.unitPrice);
      return {
        rfqItemId: line.rfqItemId,
        unitPrice,
        quantity,
        totalPrice: unitPrice.mul(quantity),
        notes: line.notes,
      };
    });

    const totalAmount = lines.reduce((sum, l) => sum.add(l.totalPrice), new Decimal(0));

    return this.prisma.$transaction(async (tx) => {
      await tx.rfqQuoteLine.deleteMany({ where: { rfqQuoteId: quoteId } });
      return tx.rfqQuote.update({
        where: { id: quoteId },
        data: {
          status: "RECEIVED",
          respondedAt: new Date(),
          totalAmount,
          leadTimeDays: dto.leadTimeDays,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          notes: dto.notes,
          lines: { create: lines },
        },
        include: { lines: true },
      });
    });
  }

  async declineQuote(quoteId: string, organizationId: string) {
    const quote = await this.prisma.rfqQuote.findFirst({ where: { id: quoteId, organizationId } });
    if (!quote) throw new NotFoundException("Vendor invitation not found");
    return this.prisma.rfqQuote.update({
      where: { id: quoteId },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
  }

  // ── Comparison ──────────────────────────────────────────────────────────────

  /**
   * Side-by-side matrix of every RFQ item against every responding vendor.
   * `isLowest` marks the cheapest unit price per item so the best line on each
   * row is visible at a glance; `lowestTotal` flags the cheapest quote overall,
   * which is not always the same vendor.
   */
  async comparison(rfqId: string, organizationId: string) {
    const rfq = await this.prisma.rfq.findFirst({
      where: { id: rfqId, organizationId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        quotes: { include: { lines: true }, orderBy: { invitedAt: "asc" } },
      },
    });
    if (!rfq) throw new NotFoundException("RFQ not found");

    const responding = rfq.quotes.filter((q) => q.status === "RECEIVED" || q.status === "AWARDED");

    const vendors = responding.map((q) => ({
      quoteId: q.id,
      vendorName: q.vendorName,
      status: q.status,
      totalAmount: q.totalAmount.toString(),
      leadTimeDays: q.leadTimeDays,
      validUntil: q.validUntil,
      /// A vendor that did not price every item cannot be compared on total alone.
      itemsQuoted: q.lines.length,
      complete: q.lines.length === rfq.items.length,
    }));

    const rows = rfq.items.map((item) => {
      const cells = responding.map((q) => {
        const line = q.lines.find((l) => l.rfqItemId === item.id);
        return line
          ? {
              quoteId: q.id,
              unitPrice: line.unitPrice.toString(),
              quantity: line.quantity,
              totalPrice: line.totalPrice.toString(),
              notes: line.notes,
            }
          : { quoteId: q.id, unitPrice: null, quantity: null, totalPrice: null, notes: null };
      });

      const priced = cells.filter((c) => c.unitPrice !== null);
      const lowest = priced.length
        ? priced.reduce((min, c) =>
            new Decimal(c.unitPrice!).lt(new Decimal(min.unitPrice!)) ? c : min,
          )
        : null;

      return {
        rfqItemId: item.id,
        itemName: item.itemName,
        unit: item.unit,
        quantity: item.quantity,
        specification: item.specification,
        cells: cells.map((c) => ({
          ...c,
          isLowest: lowest !== null && c.quoteId === lowest.quoteId && c.unitPrice !== null,
        })),
      };
    });

    const completeVendors = vendors.filter((v) => v.complete);
    const cheapest = completeVendors.length
      ? completeVendors.reduce((min, v) =>
          new Decimal(v.totalAmount).lt(new Decimal(min.totalAmount)) ? v : min,
        )
      : null;

    return {
      rfqId: rfq.id,
      rfqNumber: rfq.rfqNumber,
      title: rfq.title,
      status: rfq.status,
      awardedQuoteId: rfq.awardedQuoteId,
      vendors: vendors.map((v) => ({ ...v, lowestTotal: cheapest?.quoteId === v.quoteId })),
      rows,
      /// Invited vendors who have not answered — visible so a decision is not
      /// taken while a quote is still outstanding.
      awaiting: rfq.quotes
        .filter((q) => q.status === "PENDING")
        .map((q) => ({ quoteId: q.id, vendorName: q.vendorName })),
      declined: rfq.quotes
        .filter((q) => q.status === "DECLINED")
        .map((q) => ({ quoteId: q.id, vendorName: q.vendorName })),
    };
  }

  // ── Award ───────────────────────────────────────────────────────────────────

  /**
   * Award the RFQ to one quote and raise the purchase order for it. Everything
   * happens in one transaction: the PO, the RFQ status, the winning quote and
   * the rejection of the others either all land or none do, so an RFQ can never
   * end up marked awarded with no order behind it.
   */
  async award(rfqId: string, quoteId: string, createdById: string | undefined, organizationId: string) {
    const rfq = await this.prisma.rfq.findFirst({
      where: { id: rfqId, organizationId },
      include: {
        items: true,
        quotes: { include: { lines: true } },
      },
    });
    if (!rfq) throw new NotFoundException("RFQ not found");
    if (rfq.status === "AWARDED") throw new BadRequestException("This RFQ has already been awarded");
    if (rfq.status === "CANCELLED") throw new BadRequestException("A cancelled RFQ cannot be awarded");
    if (rfq.status === "DRAFT") throw new BadRequestException("Send the RFQ before awarding it");

    const winner = rfq.quotes.find((q) => q.id === quoteId);
    if (!winner) throw new NotFoundException("Quote not found on this RFQ");
    if (winner.status !== "RECEIVED") {
      throw new BadRequestException("Only a received quote can be awarded");
    }
    if (winner.lines.length === 0) {
      throw new BadRequestException("The winning quote has no priced lines");
    }

    const itemById = new Map(rfq.items.map((i) => [i.id, i]));

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber: `PO-${genNum()}`,
          vendorName: winner.vendorName,
          vendorContact: winner.vendorContact,
          vendorEmail: winner.vendorEmail,
          notes: `Awarded from ${rfq.rfqNumber}${winner.notes ? ` — ${winner.notes}` : ""}`,
          totalAmount: winner.totalAmount,
          expectedAt: winner.leadTimeDays
            ? new Date(Date.now() + winner.leadTimeDays * 86_400_000)
            : undefined,
          createdById,
          organizationId,
          items: {
            create: winner.lines.map((line) => {
              const item = itemById.get(line.rfqItemId);
              return {
                itemName: item?.itemName ?? "Unknown item",
                category: item?.category,
                unit: item?.unit,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                totalPrice: line.totalPrice,
                notes: line.notes,
              };
            }),
          },
        },
        include: { items: true },
      });

      await tx.rfqQuote.update({ where: { id: quoteId }, data: { status: "AWARDED" } });
      await tx.rfqQuote.updateMany({
        where: { rfqId, id: { not: quoteId }, status: "RECEIVED" },
        data: { status: "REJECTED" },
      });

      const updated = await tx.rfq.update({
        where: { id: rfqId },
        data: {
          status: "AWARDED",
          awardedAt: new Date(),
          awardedQuoteId: quoteId,
          purchaseOrderId: po.id,
        },
        include: DETAIL,
      });

      return { rfq: updated, purchaseOrder: po };
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async requireRfq(id: string, organizationId: string) {
    const rfq = await this.prisma.rfq.findFirst({ where: { id, organizationId } });
    if (!rfq) throw new NotFoundException("RFQ not found");
    return rfq;
  }

  private invitationHtml(
    rfqNumber: string,
    title: string,
    dueDate: Date | null,
    items: { itemName: string; quantity: number; unit: string | null; specification: string | null }[],
  ) {
    const rows = items
      .map(
        (i) => `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${escapeHtml(i.itemName)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${i.quantity}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${escapeHtml(i.unit ?? "")}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#666">${escapeHtml(i.specification ?? "")}</td>
        </tr>`,
      )
      .join("");

    return `<div style="font-family:system-ui,sans-serif;max-width:640px">
      <h2 style="margin:0 0 4px">Request for Quotation ${escapeHtml(rfqNumber)}</h2>
      <p style="margin:0 0 16px;color:#555">${escapeHtml(title)}</p>
      ${dueDate ? `<p style="margin:0 0 16px"><strong>Quotes due:</strong> ${dueDate.toISOString().split("T")[0]}</p>` : ""}
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:8px 10px;text-align:left">Item</th>
          <th style="padding:8px 10px;text-align:right">Qty</th>
          <th style="padding:8px 10px;text-align:left">Unit</th>
          <th style="padding:8px 10px;text-align:left">Specification</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:20px 0 0;color:#666;font-size:13px">
        Please reply with your unit prices, lead time and quote validity.
      </p>
    </div>`;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
