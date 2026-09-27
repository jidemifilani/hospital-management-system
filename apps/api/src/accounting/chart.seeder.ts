import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DEFAULT_CHART } from "./chart-of-accounts";

/** Installs the default chart of accounts, parents before children. */
@Injectable()
export class ChartSeeder {
  private readonly logger = new Logger(ChartSeeder.name);

  constructor(private prisma: PrismaService) {}

  async seed(organizationId: string) {
    const ids = new Map<string, string>();
    let created = 0;

    // DEFAULT_CHART is ordered so a parent always precedes its children.
    for (const seed of DEFAULT_CHART) {
      const existing = await this.prisma.account.findUnique({
        where: { code_organizationId: { code: seed.code, organizationId } },
      });

      if (existing) {
        ids.set(seed.code, existing.id);
        continue;
      }

      const account = await this.prisma.account.create({
        data: {
          code: seed.code,
          name: seed.name,
          type: seed.type,
          isPostable: seed.isPostable ?? true,
          parentId: seed.parent ? (ids.get(seed.parent) ?? null) : null,
          organizationId,
        },
      });
      ids.set(seed.code, account.id);
      created++;
    }

    this.logger.log(`Chart of accounts: ${created} created, ${DEFAULT_CHART.length - created} already present`);
    return { created, total: DEFAULT_CHART.length };
  }
}
