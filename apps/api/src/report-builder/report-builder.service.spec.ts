import { BadRequestException, NotFoundException } from "@nestjs/common";
import { isEncryptedField } from "../common/crypto/encrypted-fields";
import { ReportBuilderService } from "./report-builder.service";
import { REPORT_SOURCES } from "./report-sources";

const ORG = "org-1";

function service(prisma: Record<string, unknown> = {}) {
  return new ReportBuilderService(prisma as never);
}

describe("the source registry", () => {
  it("exposes no encrypted column", () => {
    // Ciphertext cannot be grouped or matched -- two encryptions of the same
    // value differ -- so a report on one would return a row per patient
    // instead of a total, and PrismaService would refuse the filter outright.
    // The damage is not the error: it is a report that looks like an answer.
    const encrypted = REPORT_SOURCES.flatMap((source) =>
      source.fields
        .filter((field) => isEncryptedField(field.model, field.field))
        .map((field) => `${source.key}.${field.key} -> ${field.model}.${field.field}`),
    );

    expect(encrypted).toEqual([]);
  });

  it("names a real Prisma model and field for every column", () => {
    // The encryption check above is only as good as these names: a typo in
    // either would make isEncryptedField() return false for a column that is
    // in fact encrypted.
    const { Prisma } = jest.requireActual("@prisma/client");
    const models = new Map<string, Set<string>>(
      Prisma.dmmf.datamodel.models.map((m: { name: string; fields: { name: string }[] }) => [
        m.name,
        new Set(m.fields.map((f) => f.name)),
      ]),
    );

    const unknown = REPORT_SOURCES.flatMap((source) =>
      source.fields
        .filter((field) => !models.get(field.model)?.has(field.field))
        .map((field) => `${source.key}.${field.key} -> ${field.model}.${field.field}`),
    );

    expect(unknown).toEqual([]);
  });

  it("builds every fragment from identifiers alone", () => {
    // Nothing here may contain a quote, a semicolon or a comment marker: this
    // file is pasted into SQL, and it is the only thing that is.
    const suspicious = REPORT_SOURCES.flatMap((source) => {
      const fragments = [source.table, source.alias, ...source.joins, ...source.fields.map((f) => f.sql)];
      return fragments
        .filter((fragment) => /;|--|\/\*/.test(fragment))
        .map((fragment) => `${source.key}: ${fragment}`);
    });

    expect(suspicious).toEqual([]);
  });

  it("gives every source a unique key, and every field within it too", () => {
    const sourceKeys = REPORT_SOURCES.map((s) => s.key);
    expect(new Set(sourceKeys).size).toBe(sourceKeys.length);

    for (const source of REPORT_SOURCES) {
      const fieldKeys = source.fields.map((f) => f.key);
      expect(new Set(fieldKeys).size).toBe(fieldKeys.length);
    }
  });

  it("only offers measures on numbers", () => {
    const wrong = REPORT_SOURCES.flatMap((source) =>
      source.fields
        .filter((f) => f.measurable && f.kind !== "number")
        .map((f) => `${source.key}.${f.key} is ${f.kind}`),
    );

    expect(wrong).toEqual([]);
  });
});

describe("compiling a report", () => {
  it("scopes every query to the organisation, as the first parameter", () => {
    const { sql, params } = service().compile(
      { source: "invoices", measures: [{ fn: "count" }] },
      ORG,
    );

    expect(params[0]).toBe(ORG);
    expect(sql).toContain('i."organizationId" = $1');
  });

  it("excludes soft-deleted rows without being asked", () => {
    // A report that counts deleted invoices is wrong in a way nobody checks.
    const { sql } = service().compile({ source: "invoices", measures: [{ fn: "count" }] }, ORG);

    expect(sql).toContain('i."deletedAt" IS NULL');
  });

  it("leaves the clause out for a table that has no such column", () => {
    const { sql } = service().compile({ source: "stock_moves", measures: [{ fn: "count" }] }, ORG);

    expect(sql).not.toContain("deletedAt");
  });

  it("groups a date by the bucket asked for", () => {
    const { sql, columns } = service().compile(
      {
        source: "invoices",
        dimensions: [{ field: "createdAt", bucket: "month" }],
        measures: [{ fn: "sum", field: "total" }],
      },
      ORG,
    );

    expect(sql).toContain(`date_trunc('month', i."createdAt")`);
    expect(columns.map((c) => c.key)).toEqual(["createdAt_month", "sum_total"]);
  });

  it("binds filter values rather than writing them into the statement", () => {
    const { sql, params } = service().compile(
      {
        source: "invoices",
        measures: [{ fn: "count" }],
        filters: [{ field: "status", op: "eq", value: "PAID" }],
      },
      ORG,
    );

    expect(sql).toContain('i."status" = $2');
    expect(sql).not.toContain("PAID");
    expect(params).toEqual([ORG, "PAID"]);
  });

  it("puts the wildcards of a contains into the parameter, not the pattern", () => {
    // Otherwise a search for "%" matches everything rather than a per cent sign.
    const { sql, params } = service().compile(
      {
        source: "patients",
        measures: [{ fn: "count" }],
        filters: [{ field: "state", op: "contains", value: "%" }],
      },
      ORG,
    );

    expect(sql).toContain("ILIKE $2");
    expect(params[1]).toBe("%%%");
  });

  it("casts an enum parameter to the enum's own type", async () => {
    // Postgres refuses `"InvoiceStatus" = text`: without the cast, filtering
    // invoices by status failed outright. Checked against the real database
    // too, where eq and in both returned the same counts as the unfiltered
    // breakdown -- a cast that silently matched nothing would look like this
    // test passing.
    const { sql, params } = service().compile(
      {
        source: "invoices",
        measures: [{ fn: "count" }],
        filters: [{ field: "status", op: "eq", value: "PAID" }],
      },
      ORG,
    );

    expect(sql).toContain('i."status" = $2::"InvoiceStatus"');
    expect(params[1]).toBe("PAID");
  });

  it("casts every value of an enum IN list", () => {
    const { sql } = service().compile(
      {
        source: "invoices",
        measures: [{ fn: "count" }],
        filters: [{ field: "status", op: "in", values: ["PAID", "ISSUED"] }],
      },
      ORG,
    );

    expect(sql).toContain('IN ($2::"InvoiceStatus", $3::"InvoiceStatus")');
  });

  it("does not cast a column that is not an enum", () => {
    const { sql } = service().compile(
      {
        source: "invoices",
        measures: [{ fn: "count" }],
        filters: [{ field: "total", op: "gte", value: "10" }],
      },
      ORG,
    );

    expect(sql).toContain('i."total" >= $2');
    expect(sql).not.toContain("::");
  });

  it("converts a value to the type its column holds", () => {
    const { params } = service().compile(
      {
        source: "invoices",
        measures: [{ fn: "count" }],
        filters: [
          { field: "total", op: "gte", value: "5000" },
          { field: "createdAt", op: "lt", value: "2026-01-01" },
        ],
      },
      ORG,
    );

    expect(params[1]).toBe(5000);
    expect(params[2]).toBeInstanceOf(Date);
  });

  it("orders by position, so no alias of the caller's can reach the statement", () => {
    const { sql } = service().compile(
      {
        source: "invoices",
        dimensions: [{ field: "status" }],
        measures: [{ fn: "sum", field: "total" }],
        sort: { key: "sum_total", direction: "desc" },
      },
      ORG,
    );

    expect(sql).toContain("ORDER BY 2 DESC");
  });

  it("clamps the row limit", () => {
    const { sql } = service().compile(
      { source: "invoices", measures: [{ fn: "count" }], limit: 999_999 },
      ORG,
    );

    expect(sql).toContain("LIMIT 5000");
  });
});

describe("what it refuses", () => {
  const run = (dto: Parameters<ReportBuilderService["compile"]>[0]) => () =>
    service().compile(dto, ORG);

  it("an unknown source", () => {
    expect(run({ source: "'; DROP TABLE patients; --", measures: [{ fn: "count" }] })).toThrow(
      BadRequestException,
    );
  });

  it("an unknown field, however it is spelled", () => {
    expect(
      run({ source: "invoices", dimensions: [{ field: 'i."total"; DROP TABLE patients; --' }] }),
    ).toThrow(BadRequestException);
  });

  it("an unknown bucket", () => {
    expect(
      run({
        source: "invoices",
        dimensions: [{ field: "createdAt", bucket: "epoch' || (SELECT 1) || '" as never }],
      }),
    ).toThrow(BadRequestException);
  });

  it("an unknown measure function", () => {
    expect(
      run({ source: "invoices", measures: [{ fn: "sum); DROP TABLE patients; --" as never }] }),
    ).toThrow(BadRequestException);
  });

  it("an unknown comparison", () => {
    expect(
      run({
        source: "invoices",
        measures: [{ fn: "count" }],
        filters: [{ field: "status", op: "=1 OR 1" as never, value: "x" }],
      }),
    ).toThrow(BadRequestException);
  });

  it("a measure on something that is not a number", () => {
    expect(run({ source: "invoices", measures: [{ fn: "sum", field: "status" }] })).toThrow(
      /not a number/,
    );
  });

  it("a grouping on something that is not groupable", () => {
    expect(run({ source: "invoices", dimensions: [{ field: "balance" }] })).toThrow(
      /cannot be grouped/,
    );
  });

  it("a bucket on something that is not a date", () => {
    expect(
      run({ source: "invoices", dimensions: [{ field: "status", bucket: "month" }] }),
    ).toThrow(/not a date/);
  });

  it("an enum value the column does not have", () => {
    expect(
      run({
        source: "invoices",
        measures: [{ fn: "count" }],
        filters: [{ field: "status", op: "eq", value: "WHATEVER" }],
      }),
    ).toThrow(/not a value/);
  });

  it("a date filter carrying something that is not a date", () => {
    expect(
      run({
        source: "invoices",
        measures: [{ fn: "count" }],
        filters: [{ field: "createdAt", op: "lt", value: "not-a-date" }],
      }),
    ).toThrow(/not a date/);
  });

  it("a report that asks for nothing at all", () => {
    expect(run({ source: "invoices" })).toThrow(/at least one/);
  });

  it("sorting by a column the report does not select", () => {
    expect(
      run({
        source: "invoices",
        measures: [{ fn: "count" }],
        sort: { key: "total; DROP TABLE patients", direction: "asc" },
      }),
    ).toThrow(/Cannot sort/);
  });
});

describe("reading the result", () => {
  it("turns numerics into numbers and an empty sum into zero", async () => {
    const prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        { status: "PAID", sum_total: "1500.50" },
        { status: "DRAFT", sum_total: null },
      ]),
    };

    const result = await service(prisma).run(
      {
        source: "invoices",
        dimensions: [{ field: "status" }],
        measures: [{ fn: "sum", field: "total" }],
      },
      ORG,
    );

    expect(result.rows).toEqual([
      { status: "PAID", sum_total: 1500.5 },
      { status: "DRAFT", sum_total: 0 },
    ]);
    expect(result.rowCount).toBe(2);
  });

  it("formats a bucketed date as a date", async () => {
    const prisma = {
      $queryRawUnsafe: jest
        .fn()
        .mockResolvedValue([{ createdAt_month: new Date("2026-03-01T00:00:00Z"), count_0: 7 }]),
    };

    const result = await service(prisma).run(
      {
        source: "invoices",
        dimensions: [{ field: "createdAt", bucket: "month" }],
        measures: [{ fn: "count" }],
      },
      ORG,
    );

    expect(result.rows[0]).toEqual({ createdAt_month: "2026-03-01", count_0: 7 });
  });

  it("says when the answer was cut short", async () => {
    const prisma = { $queryRawUnsafe: jest.fn().mockResolvedValue([{ count_0: 1 }, { count_0: 2 }]) };

    const result = await service(prisma).run(
      { source: "invoices", measures: [{ fn: "count" }], limit: 2 },
      ORG,
    );

    expect(result.truncated).toBe(true);
  });
});

describe("saved reports", () => {
  it("refuses to store a definition that cannot run", async () => {
    const prisma = { reportDefinition: { findFirst: jest.fn(), create: jest.fn() } };

    await expect(
      service(prisma).save(
        { name: "Broken", source: "invoices", dimensions: [{ field: "nonsense" }] },
        "staff-1",
        ORG,
      ),
    ).rejects.toThrow(BadRequestException);

    // A definition that is stored and then fails sits in the list looking
    // usable, which is worse than being told now.
    expect(prisma.reportDefinition.create).not.toHaveBeenCalled();
  });

  it("refuses a duplicate name within the organisation", async () => {
    const prisma = {
      reportDefinition: {
        findFirst: jest.fn().mockResolvedValue({ id: "existing" }),
        create: jest.fn(),
      },
    };

    await expect(
      service(prisma).save(
        { name: "Monthly billing", source: "invoices", measures: [{ fn: "count" }] },
        "staff-1",
        ORG,
      ),
    ).rejects.toThrow(/already exists/);
  });

  it("will not open another organisation's report", async () => {
    const prisma = { reportDefinition: { findFirst: jest.fn().mockResolvedValue(null) } };

    await expect(service(prisma).getSaved("report-1", ORG)).rejects.toThrow(NotFoundException);
    expect(prisma.reportDefinition.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "report-1", organizationId: ORG } }),
    );
  });

  it("runs a stored definition through the same compiler", async () => {
    const prisma = {
      reportDefinition: {
        findFirst: jest.fn().mockResolvedValue({
          id: "report-1",
          name: "Billing by month",
          description: null,
          source: "invoices",
          dimensions: [{ field: "createdAt", bucket: "month" }],
          measures: [{ fn: "sum", field: "total" }],
          filters: [],
          sort: null,
          limit: null,
        }),
      },
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    };

    const result = await service(prisma).runSaved("report-1", ORG);

    expect(result.report.name).toBe("Billing by month");
    const [sql, ...params] = prisma.$queryRawUnsafe.mock.calls[0]!;
    expect(sql).toContain(`date_trunc('month', i."createdAt")`);
    expect(params).toEqual([ORG]);
  });
});

describe("the catalogue the UI reads", () => {
  it("describes every source without handing over any SQL", () => {
    const sources = service().listSources();

    expect(sources.length).toBe(REPORT_SOURCES.length);
    expect(JSON.stringify(sources)).not.toContain("SELECT");
    expect(JSON.stringify(sources)).not.toContain("JOIN");
    for (const source of sources) {
      for (const field of source.fields) {
        expect(field).not.toHaveProperty("sql");
      }
    }
  });
});
