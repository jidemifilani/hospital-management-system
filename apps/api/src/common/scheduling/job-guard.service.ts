import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export type JobOutcome = "ran" | "skipped" | "failed";

/**
 * Runs a scheduled job once per period, however many copies of the API exist.
 *
 * Every @Cron fires on every instance. One instance is the normal case, but a
 * managed host runs the old and new copies together during a zero-downtime
 * deploy — two instances for about a minute, several times a week — and a job
 * that fires in that window runs twice. Four of these jobs send email, so
 * twice means staff and patients get the same digest twice and every
 * scheduled report is delivered twice.
 *
 * The guard is a unique constraint on (jobName, periodKey). The first
 * instance inserts its claim and runs; the second's insert fails and it
 * skips. There is no window between checking and claiming, because the check
 * *is* the claim.
 *
 * Deliberately the database rather than a Redis lock. The rate limiter
 * already falls back to in-memory counting when Redis is unreachable; a lock
 * that disappears in the same outage would let exactly the duplicates this
 * exists to prevent through, at the moment nobody is watching. The database
 * is the one thing every instance must agree on to function at all.
 */
@Injectable()
export class JobGuardService {
  private readonly logger = new Logger(JobGuardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Claims `periodKey` for `jobName` and runs `work` if the claim succeeded.
   *
   * A job that throws deletes its claim, so the next tick retries it: a
   * failed run must not be left recorded as done. That does mean a job
   * failing *while* a second instance is starting could run twice, which is
   * the right way round — a missed nightly billing run is worse than a
   * retried one, and the jobs that send email are the ones least likely to
   * throw after the send.
   */
  async runOnce(jobName: string, periodKey: string, work: () => Promise<void>): Promise<JobOutcome> {
    let claimId: string;

    try {
      const claim = await this.prisma.scheduledJobRun.create({
        data: { jobName, periodKey },
        select: { id: true },
      });
      claimId = claim.id;
    } catch (error) {
      if (this.isDuplicate(error)) {
        this.logger.debug(`${jobName} for ${periodKey} is already being handled; skipping`);
        return "skipped";
      }
      throw error;
    }

    try {
      await work();
      await this.prisma.scheduledJobRun.update({
        where: { id: claimId },
        data: { finishedAt: new Date() },
      });
      return "ran";
    } catch (error) {
      await this.prisma.scheduledJobRun
        .delete({ where: { id: claimId } })
        .catch(() => undefined);
      this.logger.error(
        `${jobName} for ${periodKey} failed and will be retried: ${String(error)}`,
      );
      return "failed";
    }
  }

  private isDuplicate(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
    );
  }
}

/* ───────────────────────── period keys ───────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-27" — for a job that runs once a day. */
export function dailyKey(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2026-11-27T14" — for a job that runs every hour. */
export function hourlyKey(now = new Date()): string {
  return `${dailyKey(now)}T${pad(now.getHours())}`;
}

/** "2026-11" — for a job that runs once a month. */
export function monthlyKey(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

/**
 * "2026-W48" — for a job that runs once a week.
 *
 * ISO week numbering, so the key does not change identity at a year boundary:
 * the week containing 1 January often belongs to the previous year, and a
 * naive key would let the Monday job run twice in that week.
 */
export function weeklyKey(now = new Date()): string {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  // Thursday decides the week's year, per ISO 8601.
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${pad(week)}`;
}
