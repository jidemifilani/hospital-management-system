import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  DATE_BUCKETS,
  MEASURE_FUNCTIONS,
  ReportDimensionDto,
  ReportFilterDto,
  ReportMeasureDto,
  RunReportDto,
  SaveReportDto,
  UpdateReportDto,
} from "./dto/report-builder.dto";
import {
  findField,
  findSource,
  rejectsEncrypted,
  REPORT_SOURCES,
  ReportSource,
  SourceField,
} from "./report-sources";

/** A column in the result, in the order it is selected. */
export interface ResultColumn {
  key: string;
  label: string;
  kind: "string" | "number" | "date" | "enum" | "boolean";
  role: "dimension" | "measure";
}

export interface CompiledQuery {
  sql: string;
  params: unknown[];
  columns: ResultColumn[];
}

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 5000;

/**
 * An identifier, and nothing else.
 *
 * Applied to every fragment this file takes from the registry. The registry is
 * source code and cannot contain a value from a request, so this can never
 * fail in practice -- which is the point of asserting it anyway: if some later
 * change ever builds a registry entry from input, the query stops rather than
 * runs.
 */
const SAFE_SQL = /^[A-Za-z0-9_". ()*+\-,'=]+$/;

function assertSafe(fragment: string, what: string): string {
  if (!SAFE_SQL.test(fragment)) {
    throw new BadRequestException(`Unusable ${what} in the report definition`);
  }
  return fragment;
}

/**
 * The Postgres type of an enum column, or null if the column is not an enum.
 *
 * Read out of Prisma's own metadata rather than declared a second time in the
 * registry, so it cannot drift from the schema. It is needed because Postgres
 * will not compare an enum column with a text parameter: filtering invoices by
 * status failed with `operator does not exist: "InvoiceStatus" = text`, and no
 * amount of inspecting the SQL in a mocked test would have shown it.
 */
let enumTypeCache: Map<string, string> | null = null;

function enumTypeOf(model: string, field: string): string | null {
  if (!enumTypeCache) {
    enumTypeCache = new Map();
    for (const m of Prisma.dmmf.datamodel.models) {
      for (const f of m.fields) {
        if (f.kind === "enum") enumTypeCache.set(`${m.name}.${f.name}`, f.type);
      }
    }
  }
  const type = enumTypeCache.get(`${model}.${field}`);
  // Generated code, so this cannot fail; asserted because it is pasted in.
  return type && /^[A-Za-z_][A-Za-z0-9_]*$/.test(type) ? type : null;
}

@Injectable()
export class ReportBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  /* ───────────────────────── the catalogue ───────────────────────── */

  /**
   * What the builder offers, with the SQL stripped out.
   *
   * The UI needs to know what can be grouped, measured and filtered; it has no
   * use for the column expressions, and a screen that knows them invites a
   * future version that sends them back.
   */
  listSources() {
    return REPORT_SOURCES.map((source) => ({
      key: source.key,
      label: source.label,
      description: source.description,
      fields: source.fields
        .filter((f) => !rejectsEncrypted(f))
        .map((f) => ({
          key: f.key,
          label: f.label,
          kind: f.kind,
          groupable: !!f.groupable,
          measurable: !!f.measurable,
          filterable: !!f.filterable,
          options: f.options ?? null,
        })),
    }));
  }

  /* ───────────────────────── saved reports ───────────────────────── */

  listSaved(organizationId: string) {
    return this.prisma.reportDefinition.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });
  }

  async getSaved(id: string, organizationId: string) {
    const saved = await this.prisma.reportDefinition.findFirst({
      where: { id, organizationId },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });
    if (!saved) throw new NotFoundException("Report not found");
    return saved;
  }

  async save(dto: SaveReportDto, staffId: string | undefined, organizationId: string) {
    // Compiled before it is stored. A definition that cannot run is worse than
    // one that was refused: it sits in the list looking usable.
    this.compile(dto, organizationId);

    const existing = await this.prisma.reportDefinition.findFirst({
      where: { name: dto.name, organizationId },
      select: { id: true },
    });
    if (existing) throw new BadRequestException("A report with that name already exists");

    return this.prisma.reportDefinition.create({
      data: {
        name: dto.name,
        description: dto.description,
        source: dto.source,
        dimensions: (dto.dimensions ?? []) as unknown as Prisma.InputJsonValue,
        measures: (dto.measures ?? []) as unknown as Prisma.InputJsonValue,
        filters: (dto.filters ?? []) as unknown as Prisma.InputJsonValue,
        sort: (dto.sort ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        limit: dto.limit ?? null,
        createdById: staffId,
        organizationId,
      },
    });
  }

  async update(id: string, dto: UpdateReportDto, organizationId: string) {
    const existing = await this.getSaved(id, organizationId);
    const merged = this.definitionOf({ ...existing, ...dto });
    this.compile(merged, organizationId);

    if (dto.name && dto.name !== existing.name) {
      const clash = await this.prisma.reportDefinition.findFirst({
        where: { name: dto.name, organizationId, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw new BadRequestException("A report with that name already exists");
    }

    return this.prisma.reportDefinition.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        source: merged.source,
        dimensions: merged.dimensions as unknown as Prisma.InputJsonValue,
        measures: merged.measures as unknown as Prisma.InputJsonValue,
        filters: merged.filters as unknown as Prisma.InputJsonValue,
        sort: (merged.sort ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
        limit: merged.limit ?? null,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.getSaved(id, organizationId);
    await this.prisma.reportDefinition.delete({ where: { id } });
    return { deleted: true };
  }

  async runSaved(id: string, organizationId: string) {
    const saved = await this.getSaved(id, organizationId);
    const result = await this.run(this.definitionOf(saved), organizationId);
    return { report: { id: saved.id, name: saved.name, description: saved.description }, ...result };
  }

  /** A stored row, back in the shape the compiler reads. */
  private definitionOf(row: {
    source: string;
    dimensions: unknown;
    measures: unknown;
    filters: unknown;
    sort: unknown;
    limit: number | null;
  }): RunReportDto {
    return {
      source: row.source,
      dimensions: (row.dimensions ?? []) as ReportDimensionDto[],
      measures: (row.measures ?? []) as ReportMeasureDto[],
      filters: (row.filters ?? []) as ReportFilterDto[],
      sort: (row.sort ?? undefined) as RunReportDto["sort"],
      limit: row.limit ?? undefined,
    };
  }

  /* ───────────────────────── running one ───────────────────────── */

  async run(dto: RunReportDto, organizationId: string) {
    const { sql, params, columns } = this.compile(dto, organizationId);

    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params);

    return {
      columns,
      rows: rows.map((row) => this.readable(row, columns)),
      rowCount: rows.length,
      truncated: rows.length >= (dto.limit ?? DEFAULT_LIMIT),
    };
  }

  /**
   * Turns what came back into what a table can show.
   *
   * Postgres hands numerics back as strings and dates as Date objects, and a
   * SUM over no rows is null rather than zero. A report that prints "null" in
   * a money column has failed at the only thing it does.
   */
  private readable(row: Record<string, unknown>, columns: ResultColumn[]) {
    const out: Record<string, string | number | null> = {};
    for (const column of columns) {
      const value = row[column.key];
      if (value === null || value === undefined) {
        out[column.key] = column.role === "measure" ? 0 : null;
        continue;
      }
      if (column.role === "measure") {
        out[column.key] = typeof value === "number" ? value : Number(value);
        continue;
      }
      if (value instanceof Date) {
        out[column.key] = value.toISOString().slice(0, 10);
        continue;
      }
      out[column.key] = typeof value === "string" ? value : String(value);
    }
    return out;
  }

  /* ───────────────────────── compilation ───────────────────────── */

  /**
   * Builds the statement.
   *
   * Every identifier comes from the registry; every value the caller supplied
   * becomes a bound parameter. The organisation is always the first parameter
   * and is never optional -- a report that could be asked for another
   * hospital's rows would be the worst bug in this system.
   */
  compile(dto: RunReportDto, organizationId: string): CompiledQuery {
    const source = findSource(dto.source);
    if (!source) throw new BadRequestException(`Unknown report source "${dto.source}"`);

    const dimensions = dto.dimensions ?? [];
    const measures = dto.measures ?? [];
    if (dimensions.length === 0 && measures.length === 0) {
      throw new BadRequestException("A report needs at least one grouping or one measure");
    }

    const params: unknown[] = [organizationId];
    const columns: ResultColumn[] = [];
    const select: string[] = [];
    const groupBy: string[] = [];

    for (const dimension of dimensions) {
      const field = this.fieldFor(source, dimension.field);
      if (!field.groupable) {
        throw new BadRequestException(`"${field.label}" cannot be grouped by`);
      }
      if (dimension.bucket && field.kind !== "date") {
        throw new BadRequestException(`"${field.label}" is not a date, so it has no ${dimension.bucket}`);
      }

      const expression = dimension.bucket
        ? `date_trunc('${this.bucket(dimension.bucket)}', ${assertSafe(field.sql, "column")})`
        : assertSafe(field.sql, "column");

      const key = dimension.bucket ? `${field.key}_${dimension.bucket}` : field.key;
      select.push(`${expression} AS "${key}"`);
      groupBy.push(expression);
      columns.push({
        key,
        label: dimension.bucket ? `${field.label} (${dimension.bucket})` : field.label,
        kind: field.kind,
        role: "dimension",
      });
    }

    measures.forEach((measure, index) => {
      const { expression, key, label, } = this.measure(source, measure, index);
      select.push(`${expression} AS "${key}"`);
      columns.push({ key, label, kind: "number", role: "measure" });
    });

    // Every source is scoped to the organisation; the soft-deleted rows of
    // those that have them are excluded here rather than left to each report.
    const where: string[] = [`${source.alias}."organizationId" = $1`];
    if (source.softDelete) where.push(`${source.alias}."deletedAt" IS NULL`);

    for (const filter of dto.filters ?? []) {
      where.push(this.condition(source, filter, params));
    }

    const limit = Math.min(Math.max(dto.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    let sql =
      `SELECT ${select.join(", ")} ` +
      `FROM "${assertSafe(source.table, "table")}" ${assertSafe(source.alias, "alias")} ` +
      `${source.joins.map((j) => assertSafe(j, "join")).join(" ")} ` +
      `WHERE ${where.join(" AND ")}`;

    if (groupBy.length) sql += ` GROUP BY ${groupBy.join(", ")}`;
    sql += ` ORDER BY ${this.order(dto, columns)}`;
    sql += ` LIMIT ${limit}`;

    return { sql, params, columns };
  }

  private fieldFor(source: ReportSource, key: string): SourceField {
    const field = findField(source, key);
    if (!field) throw new BadRequestException(`"${key}" is not a field of ${source.label}`);
    if (rejectsEncrypted(field)) {
      // Unreachable while the registry is correct, and the spec keeps it so.
      // Ciphertext cannot be grouped or matched: the report would quietly
      // return one row per patient instead of a total.
      throw new BadRequestException(`"${field.label}" is encrypted and cannot be reported on`);
    }
    return field;
  }

  private bucket(value: string): string {
    if (!(DATE_BUCKETS as readonly string[]).includes(value)) {
      throw new BadRequestException(`Unknown date grouping "${value}"`);
    }
    return value;
  }

  private measure(source: ReportSource, measure: ReportMeasureDto, index: number) {
    if (!(MEASURE_FUNCTIONS as readonly string[]).includes(measure.fn)) {
      throw new BadRequestException(`Unknown measure "${measure.fn}"`);
    }

    if (measure.fn === "count") {
      const key = measure.field ? `count_${measure.field}` : `count_${index}`;
      const expression = measure.field
        ? `COUNT(${assertSafe(this.fieldFor(source, measure.field).sql, "column")})`
        : "COUNT(*)";
      return { expression, key, label: measure.label || "Count" };
    }

    if (!measure.field) {
      throw new BadRequestException(`"${measure.fn}" needs a field to work on`);
    }

    const field = this.fieldFor(source, measure.field);
    if (!field.measurable) {
      throw new BadRequestException(`"${field.label}" is not a number and cannot be ${measure.fn}'d`);
    }

    const fn = measure.fn.toUpperCase();
    return {
      expression: `${fn}(${assertSafe(field.sql, "column")})`,
      key: `${measure.fn}_${field.key}`,
      label: measure.label || `${field.label} (${measure.fn})`,
    };
  }

  /**
   * One WHERE condition.
   *
   * The column is a registry constant; the value is pushed onto `params` and
   * referenced as $n. Nothing the caller sent is ever part of the string.
   */
  private condition(source: ReportSource, filter: ReportFilterDto, params: unknown[]): string {
    const field = this.fieldFor(source, filter.field);
    if (!field.filterable) throw new BadRequestException(`"${field.label}" cannot be filtered on`);
    const column = assertSafe(field.sql, "column");

    const enumType = field.kind === "enum" ? enumTypeOf(field.model, field.field) : null;
    const bind = (value: unknown) => {
      params.push(value);
      // The cast is the enum's own type name, out of the generated client.
      return enumType ? `$${params.length}::"${enumType}"` : `$${params.length}`;
    };

    switch (filter.op) {
      case "isNull":
        return `${column} IS NULL`;
      case "notNull":
        return `${column} IS NOT NULL`;
      case "in": {
        const values = filter.values ?? [];
        if (!values.length) throw new BadRequestException(`"${field.label}" needs at least one value`);
        const placeholders = values.map((v) => bind(this.coerce(field, v))).join(", ");
        return `${column} IN (${placeholders})`;
      }
      case "between": {
        if (filter.value === undefined || filter.value2 === undefined) {
          throw new BadRequestException(`"${field.label}" needs both ends of the range`);
        }
        return `${column} BETWEEN ${bind(this.coerce(field, filter.value))} AND ${bind(
          this.coerce(field, filter.value2),
        )}`;
      }
      case "contains": {
        if (field.kind !== "string") {
          throw new BadRequestException(`"${field.label}" is not text, so it cannot contain anything`);
        }
        if (filter.value === undefined) throw new BadRequestException(`"${field.label}" needs a value`);
        // ILIKE, with the wildcards added to the *parameter* rather than the
        // statement, so a value of "%" matches a literal per cent sign.
        return `${column} ILIKE ${bind(`%${filter.value}%`)}`;
      }
      default: {
        if (filter.value === undefined) throw new BadRequestException(`"${field.label}" needs a value`);
        const operators: Record<string, string> = {
          eq: "=",
          ne: "<>",
          gt: ">",
          gte: ">=",
          lt: "<",
          lte: "<=",
        };
        const operator = operators[filter.op];
        if (!operator) throw new BadRequestException(`Unknown comparison "${filter.op}"`);
        return `${column} ${operator} ${bind(this.coerce(field, filter.value))}`;
      }
    }
  }

  /** Text from the request, turned into the type the column actually holds. */
  private coerce(field: SourceField, raw: string): string | number | boolean | Date {
    switch (field.kind) {
      case "number": {
        const value = Number(raw);
        if (!Number.isFinite(value)) {
          throw new BadRequestException(`"${raw}" is not a number for ${field.label}`);
        }
        return value;
      }
      case "date": {
        const value = new Date(raw);
        if (Number.isNaN(value.getTime())) {
          throw new BadRequestException(`"${raw}" is not a date for ${field.label}`);
        }
        return value;
      }
      case "boolean": {
        if (raw === "true") return true;
        if (raw === "false") return false;
        throw new BadRequestException(`"${raw}" is not true or false for ${field.label}`);
      }
      case "enum": {
        if (field.options && !field.options.includes(raw)) {
          throw new BadRequestException(`"${raw}" is not a value of ${field.label}`);
        }
        return raw;
      }
      default:
        return raw;
    }
  }

  /**
   * ORDER BY, over the aliases this query selects.
   *
   * Ordering by position rather than by name, because a measure's alias is
   * generated and an identifier here would be the one place a caller's string
   * could reach the statement.
   */
  private order(dto: RunReportDto, columns: ResultColumn[]): string {
    if (dto.sort) {
      const index = columns.findIndex((c) => c.key === dto.sort!.key);
      if (index === -1) throw new BadRequestException(`Cannot sort by "${dto.sort.key}"`);
      return `${index + 1} ${dto.sort.direction === "desc" ? "DESC" : "ASC"}`;
    }

    // Sensible default: biggest first when there is something to measure,
    // otherwise in the order the groupings were asked for.
    const firstMeasure = columns.findIndex((c) => c.role === "measure");
    if (firstMeasure !== -1) return `${firstMeasure + 1} DESC`;
    return columns.map((_, i) => `${i + 1} ASC`).join(", ");
  }
}
