import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Keeps the audit table's monthly partitions in order.
 *
 * Two things have to keep happening for the seven-year retention to work at
 * all: the months ahead must exist before rows need them, and the months that
 * have aged out must be dropped. Dropping a partition is instant and returns
 * the disk; deleting the same rows out of one unpartitioned table would run for
 * hours, hold locks on the table every write touches, and leave the space
 * behind.
 *
 * The month arithmetic is deliberately separate from the SQL so it can be
 * tested without a database. An error in the creating direction is an
 * inconvenience; an error in the dropping direction destroys records the
 * hospital is required to hold.
 */

export const STATUTORY_RETENTION_YEARS = 7;
const OVERRIDE = "yes-i-have-checked-the-law";

/** audit_logs_2026_09 — the convention this service and the migration share. */
export function partitionName(month: Date): string {
  const year = month.getUTCFullYear();
  const mm = String(month.getUTCMonth() + 1).padStart(2, "0");
  return `audit_logs_${year}_${mm}`;
}

/** First day of the month in UTC, which is how the partition bounds are written. */
export function monthStart(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
}

export function addMonths(at: Date, count: number): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + count, 1));
}

/**
 * The months that should exist: this one, and the next `monthsAhead`.
 *
 * The current month is included because a deployment restored from an old
 * backup may have no partition covering today at all.
 */
export function monthsToEnsure(now: Date, monthsAhead: number): Date[] {
  const first = monthStart(now);
  return Array.from({ length: monthsAhead + 1 }, (_, i) => addMonths(first, i));
}

/**
 * Picks the partitions lying entirely outside the retention window.
 *
 * A partition only becomes eligible once its *upper* bound has passed the
 * cutoff, so the month in which records start falling out of retention is kept
 * until every row in it has. Anything not matching the naming convention — the
 * default partition above all — is left alone rather than guessed at.
 */
export function expiredPartitions(
  existing: string[],
  now: Date,
  retentionYears: number,
): string[] {
  const cutoff = new Date(
    Date.UTC(now.getUTCFullYear() - retentionYears, now.getUTCMonth(), 1),
  );

  return existing
    .map((name) => {
      const match = /^audit_logs_(\d{4})_(\d{2})$/.exec(name);
      if (!match) return null;
      const start = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
      return { name, end: addMonths(start, 1) };
    })
    .filter((p): p is { name: string; end: Date } => p !== null)
    .filter((p) => p.end <= cutoff)
    .map((p) => p.name);
}

@Injectable()
export class AuditPartitionsService implements OnModuleInit {
  private readonly logger = new Logger(AuditPartitionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs at startup as well as on the schedule. A deployment coming up on the
   * first of a month, or one restored from a backup taken months ago, needs its
   * partitions before it serves the first request rather than at 2am.
   */
  async onModuleInit() {
    try {
      await this.maintain();
    } catch (err) {
      // A partition problem must not stop the API booting. The default
      // partition means writes still land somewhere in the meantime.
      this.logger.error(`Could not prepare audit partitions: ${(err as Error).message}`);
    }
  }

  @Cron("0 2 1 * *", { name: "audit-partition-maintenance" })
  async monthly() {
    await this.maintain();
  }

  async maintain() {
    const monthsAhead = Number(process.env.AUDIT_PARTITION_MONTHS_AHEAD ?? 3);
    await this.ensureDefaultPartition();
    const created = await this.ensurePartitions(monthsAhead);
    if (created.length) this.logger.log(`Audit partitions ready: ${created.join(", ")}`);

    await this.warnOnDefaultPartition();
    await this.dropExpired();
  }

  /**
   * Makes sure the catch-all partition exists.
   *
   * It is the one partition whose absence loses data: without it a row dated
   * outside every month is rejected outright, and the interceptor that writes
   * audit rows swallows its own errors by design, so the trail would simply
   * stop recording with nothing to show for it.
   *
   * Checked on every run rather than assumed from the migration, because it is
   * the safety net and a safety net nobody checks is not one. Found missing
   * once already, dropped by a retention sweep that had lost the rule about
   * leaving non-dated partitions alone.
   */
  async ensureDefaultPartition(): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "audit_logs_default" PARTITION OF "audit_logs" DEFAULT`,
    );
  }

  /** Creates any missing partition for this month and the next few. */
  async ensurePartitions(monthsAhead: number): Promise<string[]> {
    const ensured: string[] = [];

    for (const month of monthsToEnsure(new Date(), monthsAhead)) {
      const name = partitionName(month);
      const from = month.toISOString().slice(0, 10);
      const to = addMonths(month, 1).toISOString().slice(0, 10);

      // IF NOT EXISTS rather than checking first: two instances starting at the
      // same moment would otherwise race, and one of them would fail.
      await this.prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "${name}" PARTITION OF "audit_logs" ` +
          `FOR VALUES FROM ('${from}') TO ('${to}')`,
      );
      ensured.push(name);
    }
    return ensured;
  }

  /**
   * Rows in the default partition mean a month went by without one of its own,
   * and while they sit there that month's partition cannot be created. Worth
   * saying loudly; not worth moving automatically, because where a medical
   * record belongs is not a decision to make at 2am without a person.
   */
  async warnOnDefaultPartition(): Promise<number> {
    const rows = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT count(*) AS count FROM "audit_logs_default"`,
    );
    const count = Number(rows[0]?.count ?? 0);

    if (count > 0) {
      this.logger.warn(
        `${count} audit row(s) sit in the default partition. They need moving into ` +
          `their own month before that month's partition can be created. ` +
          `See docs/audit-retention.md.`,
      );
    }
    return count;
  }

  /**
   * Drops the partitions that have aged out.
   *
   * Refuses to drop anything at all when the configured retention is below the
   * statutory seven years, unless that is explicitly overridden. This deletes
   * records the hospital is required to hold, and a mistyped environment
   * variable should not be able to do it.
   */
  async dropExpired(): Promise<string[]> {
    const configured = process.env.AUDIT_RETENTION_YEARS;
    const years = Number(configured ?? STATUTORY_RETENTION_YEARS);

    if (!Number.isFinite(years) || years <= 0) {
      this.logger.error(
        `AUDIT_RETENTION_YEARS is "${configured}", which is not a positive number. ` +
          `Nothing dropped.`,
      );
      return [];
    }

    if (
      years < STATUTORY_RETENTION_YEARS &&
      process.env.AUDIT_RETENTION_BELOW_STATUTORY !== OVERRIDE
    ) {
      this.logger.error(
        `AUDIT_RETENTION_YEARS is ${years}, below the ${STATUTORY_RETENTION_YEARS} years ` +
          `this data is held under. Nothing dropped. If that is genuinely intended, ` +
          `set AUDIT_RETENTION_BELOW_STATUTORY="${OVERRIDE}".`,
      );
      return [];
    }

    const expired = expiredPartitions(await this.listPartitions(), new Date(), years);

    for (const name of expired) {
      await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${name}"`);
      this.logger.log(`Dropped audit partition ${name}, past the ${years}-year retention`);
    }
    return expired;
  }

  async listPartitions(): Promise<string[]> {
    const rows = await this.prisma.$queryRawUnsafe<{ relname: string }[]>(
      `SELECT c.relname FROM pg_class c
         JOIN pg_inherits i ON i.inhrelid = c.oid
        WHERE i.inhparent = 'audit_logs'::regclass
        ORDER BY c.relname`,
    );
    return rows.map((r) => r.relname);
  }
}
