import { PrismaService } from "../src/prisma/prisma.service";
import {
  AuditPartitionsService,
  expiredPartitions,
  STATUTORY_RETENTION_YEARS,
} from "../src/audit/audit-partitions.service";

/**
 * Audit partition maintenance, by hand.
 *
 *   npx ts-node prisma/audit-partitions.ts            # show what exists
 *   npx ts-node prisma/audit-partitions.ts --maintain # create ahead, drop aged out
 *
 * The API does this itself at startup and on the first of each month. This is
 * for the times you need to look, or to run it now: after restoring a backup
 * taken months ago, or when the default partition has collected rows.
 */

async function main() {
  const maintain = process.argv.includes("--maintain");
  const prisma = new PrismaService();
  const service = new AuditPartitionsService(prisma);

  try {
    const before = await service.listPartitions();
    const years = Number(process.env.AUDIT_RETENTION_YEARS ?? STATUTORY_RETENTION_YEARS);

    console.log(`Retention: ${years} year(s)`);
    console.log(`Partitions (${before.length}):`);
    for (const name of before) {
      const expired = expiredPartitions([name], new Date(), years).length > 0;
      console.log(`  ${name}${expired ? "   <- past retention" : ""}`);
    }

    const stranded = await service.warnOnDefaultPartition();
    console.log(`Rows in the default partition: ${stranded}`);

    if (!maintain) {
      console.log("\nRe-run with --maintain to create the months ahead and drop what has aged out.");
      return;
    }

    const monthsAhead = Number(process.env.AUDIT_PARTITION_MONTHS_AHEAD ?? 3);
    await service.ensurePartitions(monthsAhead);
    const dropped = await service.dropExpired();

    const after = await service.listPartitions();
    const created = after.filter((n) => !before.includes(n));

    console.log(`\nCreated: ${created.length ? created.join(", ") : "nothing new"}`);
    console.log(`Dropped: ${dropped.length ? dropped.join(", ") : "nothing"}`);
    console.log(`Partitions now: ${after.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
