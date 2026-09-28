import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { RecallService } from "./recall.service";

/**
 * Marks follow-ups that came and went without being booked.
 *
 * Doing this on a schedule rather than when someone opens the screen means
 * the count of missed follow-ups is true whether or not anyone is looking,
 * which is the point of counting them.
 */
@Injectable()
export class RecallScheduler {
  private readonly logger = new Logger(RecallScheduler.name);

  constructor(
    private prisma: PrismaService,
    private recall: RecallService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async sweepMissedFollowUps() {
    const organizations = await this.prisma.organization.findMany({ select: { id: true } });

    for (const org of organizations) {
      try {
        const { marked } = await this.recall.sweepMissed(org.id);
        if (marked) {
          this.logger.warn(`${marked} follow-up(s) missed in organization ${org.id}`);
        }
      } catch (err) {
        this.logger.error(
          `Could not sweep missed follow-ups for ${org.id}`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
  }
}
