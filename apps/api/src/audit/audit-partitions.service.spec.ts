import {
  AuditPartitionsService,
  STATUTORY_RETENTION_YEARS,
  expiredPartitions,
  monthsToEnsure,
  partitionName,
} from "./audit-partitions.service";

/**
 * The audit trail is held for seven years because it has to be. These cover the
 * two ways this service could break that: failing to make somewhere for new
 * rows to go, and dropping a month that is still within retention.
 */

const at = (iso: string) => new Date(iso);

function build(partitions: string[] = []) {
  const executed: string[] = [];
  const prisma = {
    $executeRawUnsafe: jest.fn().mockImplementation((sql: string) => {
      executed.push(sql);
      return Promise.resolve(1);
    }),
    $queryRawUnsafe: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes("audit_logs_default")) return Promise.resolve([{ count: BigInt(0) }]);
      return Promise.resolve(partitions.map((relname) => ({ relname })));
    }),
  } as any;

  return { service: new AuditPartitionsService(prisma), prisma, executed };
}

describe("naming", () => {
  it("pads the month so partitions sort chronologically", () => {
    // audit_logs_2026_9 would sort after audit_logs_2026_10, and the retention
    // sweep reads this order.
    expect(partitionName(at("2026-09-01T00:00:00Z"))).toBe("audit_logs_2026_09");
    expect(partitionName(at("2026-10-01T00:00:00Z"))).toBe("audit_logs_2026_10");
  });
});

describe("making room for new rows", () => {
  it("covers this month and the months ahead", () => {
    const months = monthsToEnsure(at("2026-10-01T12:00:00Z"), 3).map(partitionName);

    // This month included: a deployment restored from an old backup may have no
    // partition covering today.
    expect(months).toEqual([
      "audit_logs_2026_10",
      "audit_logs_2026_11",
      "audit_logs_2026_12",
      "audit_logs_2027_01",
    ]);
  });

  it("rolls the year over", () => {
    expect(monthsToEnsure(at("2026-12-15T00:00:00Z"), 2).map(partitionName)).toEqual([
      "audit_logs_2026_12",
      "audit_logs_2027_01",
      "audit_logs_2027_02",
    ]);
  });

  it("still makes the current month when asked for none ahead", () => {
    expect(monthsToEnsure(at("2026-10-20T00:00:00Z"), 0).map(partitionName)).toEqual([
      "audit_logs_2026_10",
    ]);
  });

  it("creates them idempotently, so two instances starting together do not clash", async () => {
    const ctx = build();
    await ctx.service.ensurePartitions(1);

    expect(ctx.executed).toHaveLength(2);
    for (const sql of ctx.executed) expect(sql).toContain("CREATE TABLE IF NOT EXISTS");
  });

  it("gives each partition a one-month range", async () => {
    const ctx = build();
    await ctx.service.ensurePartitions(0);

    const [sql] = ctx.executed;
    const [, from, to] = /FROM \('([\d-]+)'\) TO \('([\d-]+)'\)/.exec(sql!)!;
    const span = Date.parse(to!) - Date.parse(from!);
    expect(span).toBeGreaterThanOrEqual(28 * 86_400_000);
    expect(span).toBeLessThanOrEqual(31 * 86_400_000);
  });
});

describe("dropping what has aged out", () => {
  const now = at("2026-10-15T00:00:00Z");

  it("drops a month whose last row is past retention", () => {
    expect(expiredPartitions(["audit_logs_2019_09"], now, 7)).toEqual(["audit_logs_2019_09"]);
  });

  it("keeps the month retention is still running out in", () => {
    // Cutoff is 2019-10-01. September 2019 ends exactly there and goes; October
    // 2019 still holds rows inside the window and must not.
    expect(expiredPartitions(["audit_logs_2019_10"], now, 7)).toEqual([]);
  });

  it("keeps everything inside the window", () => {
    const inside = ["audit_logs_2020_01", "audit_logs_2024_06", "audit_logs_2026_10"];
    expect(expiredPartitions(inside, now, 7)).toEqual([]);
  });

  it("never touches the default partition, whatever its age", () => {
    // It has no date in its name, so there is no way to know what is in it.
    expect(expiredPartitions(["audit_logs_default", "audit_logs_2018_01"], now, 7)).toEqual([
      "audit_logs_2018_01",
    ]);
  });

  it("ignores anything not following the convention", () => {
    expect(
      expiredPartitions(["audit_logs_old_backup", "audit_logs_2017", "audit_logs"], now, 7),
    ).toEqual([]);
  });
});

describe("guarding against a mistyped retention", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("drops nothing when the retention is below the statutory period", async () => {
    const ctx = build(["audit_logs_2019_01"]);
    process.env.AUDIT_RETENTION_YEARS = "1";
    delete process.env.AUDIT_RETENTION_BELOW_STATUTORY;

    // A typo here would destroy six years of records the hospital must hold.
    expect(await ctx.service.dropExpired()).toEqual([]);
    expect(ctx.executed.some((s) => s.includes("DROP"))).toBe(false);
  });

  it("drops nothing when the retention is not a number", async () => {
    const ctx = build(["audit_logs_2010_01"]);
    process.env.AUDIT_RETENTION_YEARS = "seven";

    expect(await ctx.service.dropExpired()).toEqual([]);
    expect(ctx.executed.some((s) => s.includes("DROP"))).toBe(false);
  });

  it("drops nothing when the retention is zero", async () => {
    const ctx = build(["audit_logs_2010_01"]);
    process.env.AUDIT_RETENTION_YEARS = "0";

    expect(await ctx.service.dropExpired()).toEqual([]);
  });

  it("allows a shorter retention only when it is deliberately overridden", async () => {
    const ctx = build(["audit_logs_2019_01"]);
    process.env.AUDIT_RETENTION_YEARS = "1";
    process.env.AUDIT_RETENTION_BELOW_STATUTORY = "yes-i-have-checked-the-law";

    expect(await ctx.service.dropExpired()).toEqual(["audit_logs_2019_01"]);
  });

  it("uses the statutory period when nothing is configured", async () => {
    const ctx = build(["audit_logs_2010_01", "audit_logs_2026_01"]);
    delete process.env.AUDIT_RETENTION_YEARS;

    expect(STATUTORY_RETENTION_YEARS).toBe(7);
    // 2010 is long gone; this year's stays.
    expect(await ctx.service.dropExpired()).toEqual(["audit_logs_2010_01"]);
  });
});

describe("the default partition", () => {
  it("is recreated if it has gone missing", async () => {
    const ctx = build();
    await ctx.service.ensureDefaultPartition();

    expect(ctx.executed[0]).toContain('CREATE TABLE IF NOT EXISTS "audit_logs_default"');
    expect(ctx.executed[0]).toContain("DEFAULT");
  });

  it("is checked on every maintenance run, not trusted to the migration", async () => {
    const ctx = build();
    await ctx.service.maintain();

    // Without it, a row dated outside every month is rejected and the audit
    // interceptor swallows the error — the trail stops with no sign of it.
    expect(ctx.executed.some((s) => s.includes('"audit_logs_default"'))).toBe(true);
  });
});

describe("rows in the default partition", () => {
  it("are reported, because they block that month's partition being created", async () => {
    const ctx = build();
    ctx.prisma.$queryRawUnsafe.mockResolvedValueOnce([{ count: BigInt(12) }]);

    expect(await ctx.service.warnOnDefaultPartition()).toBe(12);
  });

  it("are not moved automatically", async () => {
    const ctx = build();
    ctx.prisma.$queryRawUnsafe.mockResolvedValueOnce([{ count: BigInt(12) }]);

    await ctx.service.warnOnDefaultPartition();

    // Deciding where a medical record belongs is not a job for a 2am cron.
    expect(ctx.executed).toEqual([]);
  });
});

describe("startup", () => {
  it("does not stop the API booting when partition maintenance fails", async () => {
    const ctx = build();
    ctx.prisma.$executeRawUnsafe.mockRejectedValue(new Error("permission denied"));

    // Writes still land in the default partition, so a broken sweep is a
    // problem to fix, not a reason to refuse to serve the hospital.
    await expect(ctx.service.onModuleInit()).resolves.toBeUndefined();
  });
});
