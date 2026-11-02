import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "./mail.service";
import { Decimal } from "@prisma/client/runtime/library";
import type { ScheduledReportType, ScheduledReportFrequency } from "@prisma/client";

const TYPE_LABELS: Record<string, string> = {
  BILLING_SUMMARY:     "Billing Summary",
  INVENTORY_VALUATION: "Inventory Valuation",
  LOW_STOCK:           "Low Stock",
  PAYROLL_SUMMARY:     "Payroll Summary",
  PROCUREMENT_SUMMARY: "Procurement Summary",
  PATIENT_ADMISSIONS:  "Patient Admissions",
};

const fmtN = (v: Decimal | number | string) =>
  `₦${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function nextRunDate(freq: ScheduledReportFrequency): Date {
  const d = new Date();
  if (freq === "DAILY")   d.setDate(d.getDate() + 1);
  if (freq === "WEEKLY")  d.setDate(d.getDate() + 7);
  if (freq === "MONTHLY") d.setMonth(d.getMonth() + 1);
  d.setHours(7, 0, 0, 0);
  return d;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  listScheduled(organizationId: string) {
    return this.prisma.scheduledReport.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createScheduled(
    dto: { name: string; type: ScheduledReportType; frequency: ScheduledReportFrequency; recipients: string[] },
    organizationId: string,
  ) {
    return this.prisma.scheduledReport.create({
      data: {
        name: dto.name,
        type: dto.type,
        frequency: dto.frequency,
        recipients: dto.recipients,
        nextRunAt: nextRunDate(dto.frequency),
        organizationId,
      },
    });
  }

  async updateScheduled(
    id: string,
    dto: Partial<{ name: string; type: ScheduledReportType; frequency: ScheduledReportFrequency; recipients: string[]; isActive: boolean }>,
    organizationId: string,
  ) {
    const r = await this.prisma.scheduledReport.findFirst({ where: { id, organizationId } });
    if (!r) throw new NotFoundException("Scheduled report not found");
    const data: any = { ...dto };
    if (dto.frequency) data.nextRunAt = nextRunDate(dto.frequency);
    return this.prisma.scheduledReport.update({ where: { id }, data });
  }

  async deleteScheduled(id: string, organizationId: string) {
    const r = await this.prisma.scheduledReport.findFirst({ where: { id, organizationId } });
    if (!r) throw new NotFoundException("Scheduled report not found");
    await this.prisma.scheduledReport.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Run ────────────────────────────────────────────────────────────────────

  async runNow(id: string, organizationId: string) {
    const report = await this.prisma.scheduledReport.findFirst({ where: { id, organizationId } });
    if (!report) throw new NotFoundException("Scheduled report not found");
    const { sent, html } = await this._sendReport(report);
    return { sent, previewHtml: html };
  }

  // ── Cron: runs daily at 07:00, dispatches any due reports ─────────────────

  @Cron("0 7 * * *")
  async runDue() {
    const now = new Date();
    const due = await this.prisma.scheduledReport.findMany({
      where: {
        isActive: true,
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
      },
    });

    for (const report of due) {
      try {
        await this._sendReport(report);
      } catch (err: any) {
        this.logger.error(`Report ${report.id} (${report.name}) failed: ${err?.message}`);
      }
    }
  }

  private async _sendReport(report: any): Promise<{ sent: boolean; html: string }> {
    const orgId = report.organizationId;
    const html = await this._generateHtml(report.type as ScheduledReportType, orgId);

    const to: string[] = Array.isArray(report.recipients) ? report.recipients : [];
    const sent = to.length > 0 ? await this.mail.sendHtml(to, `[CareSync] ${report.name}`, html) : false;

    await this.prisma.scheduledReport.update({
      where: { id: report.id },
      data: { lastRunAt: new Date(), nextRunAt: nextRunDate(report.frequency) },
    });

    return { sent, html };
  }

  // ── Report generators ──────────────────────────────────────────────────────

  private async _generateHtml(type: ScheduledReportType, organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    const title = TYPE_LABELS[type] ?? type.replace(/_/g, " ");
    let body = "";

    switch (type) {
      case "BILLING_SUMMARY":     body = await this._billingHtml(organizationId); break;
      case "INVENTORY_VALUATION": body = await this._inventoryHtml(organizationId); break;
      case "LOW_STOCK":           body = await this._lowStockHtml(organizationId); break;
      case "PAYROLL_SUMMARY":     body = await this._payrollHtml(organizationId); break;
      case "PROCUREMENT_SUMMARY": body = await this._procurementHtml(organizationId); break;
      case "PATIENT_ADMISSIONS":  body = await this._admissionsHtml(organizationId); break;
    }

    return `<!doctype html><html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; color: #1a1a2e; background: #f8f9fa; margin: 0; padding: 0; }
  .wrap { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
  .hdr  { background: #1d4ed8; color: #fff; padding: 24px 32px; }
  .hdr h1 { margin: 0; font-size: 20px; font-weight: 700; }
  .hdr p  { margin: 4px 0 0; font-size: 12px; opacity: .75; }
  .body { padding: 24px 32px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-weight: 600; }
  td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  .num { text-align: right; }
  .ftr  { background: #f1f5f9; padding: 16px 32px; font-size: 11px; color: #64748b; text-align: center; }
  .stat { display: inline-block; margin: 0 12px 12px 0; padding: 12px 20px; background: #f8fafc; border-left: 3px solid #3b82f6; border-radius: 4px; }
  .stat .lbl { font-size: 11px; color: #64748b; }
  .stat .val { font-size: 20px; font-weight: 700; }
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <h1>${org?.name ?? "CareSync"} — ${title}</h1>
    <p>Generated ${new Date().toLocaleString("en-NG", { dateStyle: "full", timeStyle: "short" })}</p>
  </div>
  <div class="body">${body}</div>
  <div class="ftr">CareSync HMS &bull; This is an automated report. Do not reply to this email.</div>
</div></body></html>`;
  }

  private async _billingHtml(orgId: string) {
    const thirty = new Date(Date.now() - 30 * 86_400_000);
    const [total, paid, overdue, counts] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { organizationId: orgId }, _sum: { total: true } }),
      this.prisma.invoice.aggregate({ where: { organizationId: orgId, status: "PAID" }, _sum: { total: true } }),
      this.prisma.invoice.aggregate({ where: { organizationId: orgId, status: "OVERDUE" }, _sum: { total: true } }),
      this.prisma.invoice.groupBy({ by: ["status"], where: { organizationId: orgId }, _count: true }),
    ]);

    const recent = await this.prisma.invoice.findMany({
      where: { organizationId: orgId, createdAt: { gte: thirty } },
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const rows = recent.map((i) => `
      <tr>
        <td>${i.invoiceNumber}</td>
        <td>${i.patient?.firstName ?? ""} ${i.patient?.lastName ?? ""}</td>
        <td>${i.status}</td>
        <td class="num">${fmtN(i.total)}</td>
        <td>${new Date(i.createdAt).toLocaleDateString("en-NG")}</td>
      </tr>`).join("");

    return `
      <div style="margin-bottom:20px">
        <div class="stat"><div class="lbl">Total Billed (all time)</div><div class="val">${fmtN(total._sum.total ?? 0)}</div></div>
        <div class="stat"><div class="lbl">Collected</div><div class="val">${fmtN(paid._sum.total ?? 0)}</div></div>
        <div class="stat"><div class="lbl">Overdue</div><div class="val" style="color:#ef4444">${fmtN(overdue._sum.total ?? 0)}</div></div>
      </div>
      <h3 style="font-size:13px;margin-bottom:8px">Recent 10 Invoices (last 30 days)</h3>
      <table><thead><tr><th>Invoice</th><th>Patient</th><th>Status</th><th class="num">Amount</th><th>Date</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='5' style='text-align:center;color:#94a3b8'>No invoices in the last 30 days</td></tr>"}</tbody></table>`;
  }

  private async _inventoryHtml(orgId: string) {
    const levels = await this.prisma.stockLevel.findMany({
      where: { organizationId: orgId },
      include: { item: { select: { name: true, code: true, unit: true, averageCost: true } } },
      orderBy: { quantity: "asc" },
      take: 20,
    });

    let totalValue = new Decimal(0);
    const rows = levels.map((l) => {
      const val = l.item.averageCost.mul(l.quantity);
      totalValue = totalValue.add(val);
      return `<tr><td>${l.item.name}</td><td class="num">${l.quantity} ${l.item.unit}</td><td class="num">${fmtN(l.item.averageCost)}</td><td class="num">${fmtN(val)}</td></tr>`;
    }).join("");

    return `
      <div class="stat"><div class="lbl">Total Stock Value</div><div class="val">${fmtN(totalValue)}</div></div>
      <h3 style="font-size:13px;margin:16px 0 8px">Stock Levels (bottom 20 by quantity)</h3>
      <table><thead><tr><th>Item</th><th class="num">On Hand</th><th class="num">Unit Cost</th><th class="num">Value</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='4' style='text-align:center;color:#94a3b8'>No stock levels recorded</td></tr>"}</tbody></table>`;
  }

  private async _lowStockHtml(orgId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { organizationId: orgId, isActive: true },
      include: { levels: { select: { quantity: true } } },
    });

    const low = items
      .map((i) => ({ ...i, onHand: i.levels.reduce((s, l) => s + l.quantity, 0) }))
      .filter((i) => i.onHand <= i.reorderLevel)
      .sort((a, b) => a.onHand - b.onHand);

    const rows = low.map((i) => `
      <tr>
        <td>${i.name} <span style="color:#94a3b8;font-size:11px">${i.code}</span></td>
        <td class="num" style="color:#ef4444;font-weight:600">${i.onHand} ${i.unit}</td>
        <td class="num">${i.reorderLevel}</td>
        <td class="num" style="color:#f97316">${i.reorderLevel - i.onHand}</td>
      </tr>`).join("");

    return `
      <div class="stat"><div class="lbl">Items Below Reorder Level</div><div class="val" style="color:#ef4444">${low.length}</div></div>
      <h3 style="font-size:13px;margin:16px 0 8px">Low Stock Items</h3>
      <table><thead><tr><th>Item</th><th class="num">On Hand</th><th class="num">Reorder At</th><th class="num">Shortfall</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='4' style='text-align:center;color:#22c55e'>All items are above reorder levels</td></tr>"}</tbody></table>`;
  }

  private async _payrollHtml(orgId: string) {
    const recent = await this.prisma.payroll.findMany({
      where: { organizationId: orgId },
      include: { staff: { select: { firstName: true, lastName: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12,
    });

    const totalGross = recent.reduce((s, p) => s + Number(p.grossPay), 0);
    const totalNet   = recent.reduce((s, p) => s + Number(p.netPay), 0);

    const rows = recent.map((p) => `
      <tr>
        <td>${p.staff?.firstName ?? ""} ${p.staff?.lastName ?? ""}</td>
        <td>${p.month}/${p.year}</td>
        <td class="num">${fmtN(p.grossPay)}</td>
        <td class="num">${fmtN(p.payeTax)}</td>
        <td class="num">${fmtN(p.netPay)}</td>
        <td>${p.status}</td>
      </tr>`).join("");

    return `
      <div style="margin-bottom:20px">
        <div class="stat"><div class="lbl">Total Gross (last 12)</div><div class="val">${fmtN(totalGross)}</div></div>
        <div class="stat"><div class="lbl">Total Net</div><div class="val">${fmtN(totalNet)}</div></div>
      </div>
      <table><thead><tr><th>Staff</th><th>Pay Period</th><th class="num">Gross</th><th class="num">PAYE</th><th class="num">Net</th><th>Status</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='6' style='text-align:center;color:#94a3b8'>No payroll records yet</td></tr>"}</tbody></table>`;
  }

  private async _procurementHtml(orgId: string) {
    const [summary, recent] = await Promise.all([
      this.prisma.purchaseOrder.groupBy({ by: ["status"], where: { organizationId: orgId }, _count: true, _sum: { totalAmount: true } }),
      this.prisma.purchaseOrder.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 10 }),
    ]);

    const statRows = summary.map((s) => `<tr><td>${s.status}</td><td class="num">${s._count}</td><td class="num">${fmtN(s._sum.totalAmount ?? 0)}</td></tr>`).join("");
    const poRows   = recent.map((p) => `<tr><td>${p.poNumber}</td><td>${p.vendorName}</td><td>${p.status}</td><td class="num">${fmtN(p.totalAmount)}</td><td>${new Date(p.createdAt).toLocaleDateString("en-NG")}</td></tr>`).join("");

    return `
      <h3 style="font-size:13px;margin-bottom:8px">PO Status Summary</h3>
      <table><thead><tr><th>Status</th><th class="num">Count</th><th class="num">Value</th></tr></thead>
      <tbody>${statRows}</tbody></table>
      <h3 style="font-size:13px;margin:16px 0 8px">Recent Purchase Orders</h3>
      <table><thead><tr><th>PO #</th><th>Vendor</th><th>Status</th><th class="num">Value</th><th>Date</th></tr></thead>
      <tbody>${poRows || "<tr><td colspan='5' style='text-align:center;color:#94a3b8'>No purchase orders yet</td></tr>"}</tbody></table>`;
  }

  private async _admissionsHtml(orgId: string) {
    const thirty = new Date(Date.now() - 30 * 86_400_000);
    const [total, active, discharged] = await Promise.all([
      this.prisma.admission.count({ where: { organizationId: orgId, admittedAt: { gte: thirty } } }),
      this.prisma.admission.count({ where: { organizationId: orgId, dischargedAt: null } }),
      this.prisma.admission.count({ where: { organizationId: orgId, dischargedAt: { gte: thirty } } }),
    ]);

    const recent = await this.prisma.admission.findMany({
      where: { organizationId: orgId, admittedAt: { gte: thirty } },
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { admittedAt: "desc" },
      take: 10,
    });

    const rows = recent.map((a) => `
      <tr>
        <td>${a.patient?.firstName ?? ""} ${a.patient?.lastName ?? ""}</td>
        <td>${new Date(a.admittedAt).toLocaleDateString("en-NG")}</td>
        <td>${a.dischargedAt ? new Date(a.dischargedAt).toLocaleDateString("en-NG") : "<em>active</em>"}</td>
        <td>${a.status}</td>
      </tr>`).join("");

    return `
      <div style="margin-bottom:20px">
        <div class="stat"><div class="lbl">Admitted (last 30 days)</div><div class="val">${total}</div></div>
        <div class="stat"><div class="lbl">Currently Active</div><div class="val" style="color:#3b82f6">${active}</div></div>
        <div class="stat"><div class="lbl">Discharged (last 30 days)</div><div class="val">${discharged}</div></div>
      </div>
      <h3 style="font-size:13px;margin-bottom:8px">Recent Admissions</h3>
      <table><thead><tr><th>Patient</th><th>Admitted</th><th>Discharged</th><th>Status</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='4' style='text-align:center;color:#94a3b8'>No admissions in the last 30 days</td></tr>"}</tbody></table>`;
  }
}
