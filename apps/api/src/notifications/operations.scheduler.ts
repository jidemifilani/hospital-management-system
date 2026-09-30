import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";

const EXPIRY_WARNING_DAYS = 60;
const CLAIM_AGING_DAYS = 30;

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The background jobs that keep a hospital's operations honest: stock that is
 * about to expire or run out, claims that have gone unpaid, and maintenance
 * that has fallen due. Each one writes a digest rather than paging individuals,
 * so it stays useful rather than becoming noise people learn to ignore.
 */
@Injectable()
export class OperationsScheduler {
  private readonly logger = new Logger(OperationsScheduler.name);

  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  /** 07:00 daily — drugs expiring soon, and anything already expired still on shelf. */
  @Cron("0 7 * * *")
  async drugExpiryDigest() {
    const horizon = addDays(new Date(), EXPIRY_WARNING_DAYS);

    const batches = await this.prisma.stockBatch.findMany({
      where: { quantity: { gt: 0 }, expiresAt: { lte: horizon } },
      include: { item: { select: { name: true, organizationId: true } } },
      orderBy: { expiresAt: "asc" },
    });
    if (batches.length === 0) return;

    const now = new Date();
    const byOrg = new Map<string, string[]>();

    for (const b of batches) {
      const expired = b.expiresAt < now;
      const line = `${expired ? "EXPIRED" : "expires"} ${fmtDate(b.expiresAt)} — ${b.item.name} (qty ${b.quantity})`;
      const list = byOrg.get(b.item.organizationId) ?? [];
      list.push(line);
      byOrg.set(b.item.organizationId, list);
    }

    for (const [organizationId, lines] of byOrg) {
      await this.notifyPharmacy(
        organizationId,
        `Drug expiry report — ${lines.length} batch(es)`,
        lines.join("\n"),
      );
    }

    this.logger.log(`Drug expiry digest sent for ${byOrg.size} organisation(s)`);
  }

  /** 07:15 daily — anything at or below its reorder level. */
  @Cron("15 7 * * *")
  async lowStockDigest() {
    const drugs = await this.prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: {
        name: true,
        reorderLevel: true,
        organizationId: true,
        requiresBatch: true,
        batches: {
          where: { quantity: { gt: 0 }, expiresAt: { gt: new Date() } },
          select: { quantity: true },
        },
        levels: { select: { quantity: true } },
      },
    });

    const byOrg = new Map<string, string[]>();
    for (const d of drugs) {
      const onHand = d.requiresBatch
        ? d.batches.reduce((s, b) => s + b.quantity, 0)
        : d.levels.reduce((s, l) => s + l.quantity, 0);
      if (onHand > d.reorderLevel) continue;
      const list = byOrg.get(d.organizationId) ?? [];
      list.push(`${d.name}: ${onHand} on hand (reorder at ${d.reorderLevel})`);
      byOrg.set(d.organizationId, list);
    }

    for (const [organizationId, lines] of byOrg) {
      await this.notifyPharmacy(
        organizationId,
        `Low stock — ${lines.length} item(s) need reordering`,
        lines.join("\n"),
      );
    }

    if (byOrg.size > 0) this.logger.log(`Low-stock digest sent for ${byOrg.size} organisation(s)`);
  }

  /** Monday 08:00 — insurance claims submitted but still unsettled. */
  @Cron("0 8 * * 1")
  async agingClaimsDigest() {
    const cutoff = addDays(new Date(), -CLAIM_AGING_DAYS);

    const claims = await this.prisma.insuranceClaim.findMany({
      where: {
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] },
        submittedAt: { lt: cutoff },
      },
      select: {
        claimNumber: true,
        provider: true,
        amount: true,
        status: true,
        submittedAt: true,
        organizationId: true,
      },
      orderBy: { submittedAt: "asc" },
    });
    if (claims.length === 0) return;

    const byOrg = new Map<string, string[]>();
    for (const c of claims) {
      const days = Math.floor((Date.now() - c.submittedAt!.getTime()) / 86_400_000);
      const list = byOrg.get(c.organizationId) ?? [];
      list.push(`${c.claimNumber} — ${c.provider} — NGN ${c.amount} — ${c.status} — ${days} days old`);
      byOrg.set(c.organizationId, list);
    }

    for (const [organizationId, lines] of byOrg) {
      await this.notifyRole(
        organizationId,
        ["CASHIER", "HOSPITAL_ADMIN"],
        `${lines.length} insurance claim(s) unsettled beyond ${CLAIM_AGING_DAYS} days`,
        lines.join("\n"),
      );
    }

    this.logger.log(
      `Aging-claims digest: ${claims.length} claim(s) across ${byOrg.size} organisation(s)`,
    );
  }

  /** 07:30 daily — scheduled asset maintenance that has fallen due. */
  @Cron("30 7 * * *")
  async maintenanceDueDigest() {
    const due = await this.prisma.assetMaintenance.findMany({
      where: {
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        scheduledDate: { lte: new Date() },
        asset: { status: { not: "DECOMMISSIONED" } },
      },
      select: {
        scheduledDate: true,
        type: true,
        asset: { select: { name: true, assetNumber: true, organizationId: true } },
      },
      orderBy: { scheduledDate: "asc" },
    });
    if (due.length === 0) return;

    const byOrg = new Map<string, string[]>();
    for (const m of due) {
      const list = byOrg.get(m.asset.organizationId) ?? [];
      list.push(`${m.asset.assetNumber} — ${m.asset.name} — ${m.type} due ${fmtDate(m.scheduledDate)}`);
      byOrg.set(m.asset.organizationId, list);
    }

    for (const [organizationId, lines] of byOrg) {
      await this.notifyRole(
        organizationId,
        ["HOSPITAL_ADMIN"],
        `${lines.length} asset(s) due for maintenance`,
        lines.join("\n"),
      );
    }

    this.logger.log(
      `Maintenance-due digest: ${due.length} item(s) across ${byOrg.size} organisation(s)`,
    );
  }

  private notifyPharmacy(organizationId: string, subject: string, body: string) {
    return this.notifyRole(organizationId, ["PHARMACIST", "HOSPITAL_ADMIN"], subject, body);
  }

  private async notifyRole(
    organizationId: string,
    roles: string[],
    subject: string,
    body: string,
  ) {
    const find = (targetRoles: string[]) =>
      this.prisma.user.findMany({
        where: {
          organizationId,
          role: { in: targetRoles as never },
          status: "ACTIVE",
          deletedAt: null,
        },
        select: { email: true, staff: { select: { phone: true } } },
      });

    let recipients = await find(roles);

    // A hospital that has not staffed a role must not lose the alert entirely —
    // an unread low-stock digest is how a ward runs out of something.
    if (recipients.length === 0) {
      recipients = await find(["SUPER_ADMIN"]);
      if (recipients.length > 0) {
        this.logger.warn(
          `No ${roles.join("/")} user in org ${organizationId}; sent "${subject}" to super admin instead`,
        );
      }
    }

    if (recipients.length === 0) {
      this.logger.error(`Nobody to notify for "${subject}" in org ${organizationId} — digest dropped`);
      return 0;
    }

    for (const r of recipients) {
      this.events.emit("notification.send", {
        channel: "email",
        to: { email: r.email, phone: r.staff?.phone },
        subject,
        body,
      });
    }
    return recipients.length;
  }
}
