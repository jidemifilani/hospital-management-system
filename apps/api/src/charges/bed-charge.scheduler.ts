import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { ChargesService } from "./charges.service";

const MAX_CATCHUP_DAYS = 60;

const dateKey = (d: Date) => d.toISOString().slice(0, 10);
const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

@Injectable()
export class BedChargeScheduler {
  private readonly logger = new Logger(BedChargeScheduler.name);

  constructor(
    private prisma: PrismaService,
    private charges: ChargesService,
  ) {}

  /**
   * Posts one bed charge per night occupied, for every active admission.
   *
   * Runs at 00:30 daily but backfills from the last charged date, so a server
   * outage doesn't silently lose bed revenue. Idempotent via (source, sourceRef).
   */
  @Cron("30 0 * * *")
  async postNightlyBedCharges() {
    const today = startOfDay(new Date());

    const admissions = await this.prisma.admission.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        encounterId: true,
        admittedAt: true,
        lastBedChargeOn: true,
        organizationId: true,
        admittingDoctorId: true,
        bedAssignments: {
          where: { releasedAt: null },
          orderBy: { assignedAt: "desc" },
          take: 1,
          select: {
            bed: {
              select: {
                bedNumber: true,
                ward: true,
                serviceItemId: true,
              },
            },
          },
        },
      },
    });

    let posted = 0;

    for (const adm of admissions) {
      const bed = adm.bedAssignments[0]?.bed;
      if (!bed?.serviceItemId) continue;

      const firstNight = adm.lastBedChargeOn
        ? addDays(startOfDay(adm.lastBedChargeOn), 1)
        : startOfDay(adm.admittedAt);

      let cursor = firstNight;
      let guard = 0;

      while (cursor <= today && guard < MAX_CATCHUP_DAYS) {
        try {
          const charge = await this.charges.post({
            encounterId: adm.encounterId,
            organizationId: adm.organizationId,
            source: "BED_DAY",
            sourceRef: `${adm.id}:${dateKey(cursor)}`,
            serviceItemId: bed.serviceItemId,
            description: `${bed.ward} — bed ${bed.bedNumber} (${dateKey(cursor)})`,
            incurredAt: cursor,
            createdById: adm.admittingDoctorId,
          });
          if (charge) posted++;
        } catch (err) {
          this.logger.error(
            `Bed charge failed for admission ${adm.id} on ${dateKey(cursor)}`,
            err instanceof Error ? err.stack : err,
          );
        }
        cursor = addDays(cursor, 1);
        guard++;
      }

      await this.prisma.admission.update({
        where: { id: adm.id },
        data: { lastBedChargeOn: today },
      });
    }

    if (posted > 0) {
      this.logger.log(`Posted ${posted} bed charge(s) across ${admissions.length} active admission(s)`);
    }
  }
}
