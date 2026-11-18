import { isEncryptedField } from "../common/crypto/encrypted-fields";

/**
 * What the report builder is allowed to ask the database.
 *
 * Everything a report can name -- table, column, join, expression -- is a
 * constant declared here. A request names a *field key*; the engine looks the
 * key up and uses this file's SQL for it. Nothing a user types ever reaches
 * the query as an identifier, and every value they supply is a bound
 * parameter. That is the whole security model, and it is why the engine can
 * build SQL at all: the alternative, letting the UI send column names, is a
 * SQL injection hole into a database of patient records.
 *
 * Two rules are enforced by report-sources.spec.ts rather than by review:
 * no field may map to an encrypted column, and every identifier must look
 * like an identifier.
 */

export type FieldKind = "string" | "number" | "date" | "enum" | "boolean";

export interface SourceField {
  /** What the API and the UI call it. */
  key: string;
  label: string;
  kind: FieldKind;
  /** The SQL that selects it. A constant, always. */
  sql: string;
  /** Prisma model and field, so the encryption check can be mechanical. */
  model: string;
  field: string;
  /** Dimensions are grouped by; measures are aggregated. Dates are both. */
  groupable?: boolean;
  measurable?: boolean;
  filterable?: boolean;
  /** For enums, the values the UI offers. */
  options?: readonly string[];
}

export interface ReportSource {
  key: string;
  label: string;
  description: string;
  table: string;
  alias: string;
  /** Constant JOIN clauses. Only ever these. */
  joins: readonly string[];
  /**
   * Whether the table carries deletedAt. Every source that does is filtered
   * to the living rows automatically -- a report that counts deleted
   * invoices is not a report anyone asked for, and nobody would notice.
   */
  softDelete: boolean;
  fields: readonly SourceField[];
}

const dateField = (
  key: string,
  label: string,
  sql: string,
  model: string,
  field: string,
): SourceField => ({
  key,
  label,
  kind: "date",
  sql,
  model,
  field,
  groupable: true,
  filterable: true,
});

export const REPORT_SOURCES: readonly ReportSource[] = [
  {
    key: "invoices",
    label: "Invoices",
    description: "Billing: what was charged, collected and left outstanding.",
    table: "invoices",
    alias: "i",
    joins: ['LEFT JOIN "patients" p ON p."id" = i."patientId"'],
    softDelete: true,
    fields: [
      {
        key: "status",
        label: "Status",
        kind: "enum",
        sql: 'i."status"',
        model: "Invoice",
        field: "status",
        groupable: true,
        filterable: true,
        options: ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"],
      },
      dateField("createdAt", "Raised on", 'i."createdAt"', "Invoice", "createdAt"),
      dateField("dueDate", "Due on", 'i."dueDate"', "Invoice", "dueDate"),
      {
        key: "patientGender",
        label: "Patient gender",
        kind: "enum",
        sql: 'p."gender"',
        model: "Patient",
        field: "gender",
        groupable: true,
        filterable: true,
        options: ["MALE", "FEMALE", "OTHER"],
      },
      {
        key: "patientState",
        label: "Patient state",
        kind: "string",
        sql: 'p."state"',
        model: "Patient",
        field: "state",
        groupable: true,
        filterable: true,
      },
      {
        key: "total",
        label: "Invoiced",
        kind: "number",
        sql: 'i."total"',
        model: "Invoice",
        field: "total",
        measurable: true,
        filterable: true,
      },
      {
        key: "amountPaid",
        label: "Collected",
        kind: "number",
        sql: 'i."amountPaid"',
        model: "Invoice",
        field: "amountPaid",
        measurable: true,
        filterable: true,
      },
      {
        // Outstanding is the question people actually ask, and asking the
        // database for it is cheaper and more honest than subtracting two
        // measures in the UI.
        key: "balance",
        label: "Outstanding",
        kind: "number",
        sql: '(i."total" - i."amountPaid")',
        model: "Invoice",
        field: "total",
        measurable: true,
      },
      {
        key: "discount",
        label: "Discount",
        kind: "number",
        sql: 'i."discount"',
        model: "Invoice",
        field: "discount",
        measurable: true,
      },
      {
        key: "tax",
        label: "Tax",
        kind: "number",
        sql: 'i."tax"',
        model: "Invoice",
        field: "tax",
        measurable: true,
      },
    ],
  },

  {
    key: "encounters",
    label: "Encounters",
    description: "Clinical activity: episodes of care by type, department and outcome.",
    table: "encounters",
    alias: "e",
    joins: [
      'LEFT JOIN "departments" d ON d."id" = e."departmentId"',
      'LEFT JOIN "patients" p ON p."id" = e."patientId"',
    ],
    softDelete: true,
    fields: [
      {
        key: "type",
        label: "Type",
        kind: "enum",
        sql: 'e."type"',
        model: "Encounter",
        field: "type",
        groupable: true,
        filterable: true,
        options: ["OUTPATIENT", "INPATIENT", "EMERGENCY", "DAY_CASE", "TELEMEDICINE"],
      },
      {
        key: "status",
        label: "Status",
        kind: "enum",
        sql: 'e."status"',
        model: "Encounter",
        field: "status",
        groupable: true,
        filterable: true,
        options: ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      },
      {
        key: "department",
        label: "Department",
        kind: "string",
        sql: 'd."name"',
        model: "Department",
        field: "name",
        groupable: true,
        filterable: true,
      },
      {
        key: "patientGender",
        label: "Patient gender",
        kind: "enum",
        sql: 'p."gender"',
        model: "Patient",
        field: "gender",
        groupable: true,
        filterable: true,
        options: ["MALE", "FEMALE", "OTHER"],
      },
      {
        key: "isBillable",
        label: "Billable",
        kind: "boolean",
        sql: 'e."isBillable"',
        model: "Encounter",
        field: "isBillable",
        groupable: true,
        filterable: true,
      },
      dateField("startedAt", "Started", 'e."startedAt"', "Encounter", "startedAt"),
      dateField("endedAt", "Ended", 'e."endedAt"', "Encounter", "endedAt"),
    ],
  },

  {
    key: "appointments",
    label: "Appointments",
    description: "Scheduling: bookings, attendance and cancellations.",
    table: "appointments",
    alias: "a",
    joins: ['LEFT JOIN "departments" d ON d."id" = a."departmentId"'],
    softDelete: true,
    fields: [
      {
        key: "status",
        label: "Status",
        kind: "enum",
        sql: 'a."status"',
        model: "Appointment",
        field: "status",
        groupable: true,
        filterable: true,
        options: ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"],
      },
      {
        key: "type",
        label: "Type",
        kind: "enum",
        sql: 'a."type"',
        model: "Appointment",
        field: "type",
        groupable: true,
        filterable: true,
        options: ["CONSULTATION", "FOLLOW_UP", "PROCEDURE", "SCREENING", "VACCINATION"],
      },
      {
        key: "department",
        label: "Department",
        kind: "string",
        sql: 'd."name"',
        model: "Department",
        field: "name",
        groupable: true,
        filterable: true,
      },
      {
        key: "isTelemedicine",
        label: "Telemedicine",
        kind: "boolean",
        sql: 'a."isTelemedicine"',
        model: "Appointment",
        field: "isTelemedicine",
        groupable: true,
        filterable: true,
      },
      dateField("scheduledAt", "Scheduled for", 'a."scheduledAt"', "Appointment", "scheduledAt"),
      {
        key: "durationMinutes",
        label: "Duration (minutes)",
        kind: "number",
        sql: 'a."durationMinutes"',
        model: "Appointment",
        field: "durationMinutes",
        measurable: true,
        filterable: true,
      },
    ],
  },

  {
    key: "stock_moves",
    label: "Stock movements",
    description: "Inventory: what moved, in which direction, and what it was worth.",
    table: "stock_moves",
    alias: "sm",
    joins: ['LEFT JOIN "inventory_items" ii ON ii."id" = sm."itemId"'],
    softDelete: false,
    fields: [
      {
        key: "type",
        label: "Movement",
        kind: "enum",
        sql: 'sm."type"',
        model: "StockMove",
        field: "type",
        groupable: true,
        filterable: true,
        options: ["RECEIPT", "ISSUE", "TRANSFER", "ADJUSTMENT", "RETURN", "WASTAGE", "PRODUCTION"],
      },
      {
        key: "item",
        label: "Item",
        kind: "string",
        sql: 'ii."name"',
        model: "InventoryItem",
        field: "name",
        groupable: true,
        filterable: true,
      },
      {
        key: "category",
        label: "Category",
        kind: "enum",
        sql: 'ii."category"',
        model: "InventoryItem",
        field: "category",
        groupable: true,
        filterable: true,
        options: ["DRUG", "CONSUMABLE", "EQUIPMENT", "REAGENT", "OTHER"],
      },
      dateField("occurredAt", "Occurred", 'sm."occurredAt"', "StockMove", "occurredAt"),
      {
        key: "quantity",
        label: "Quantity",
        kind: "number",
        sql: 'sm."quantity"',
        model: "StockMove",
        field: "quantity",
        measurable: true,
        filterable: true,
      },
      {
        key: "value",
        label: "Value",
        kind: "number",
        sql: 'COALESCE(sm."unitCost", 0) * sm."quantity"',
        model: "StockMove",
        field: "unitCost",
        measurable: true,
      },
    ],
  },

  {
    key: "patients",
    label: "Patients",
    description: "Registrations and demographics. Identifying detail is not available here.",
    table: "patients",
    alias: "p",
    joins: [],
    softDelete: true,
    fields: [
      {
        key: "gender",
        label: "Gender",
        kind: "enum",
        sql: 'p."gender"',
        model: "Patient",
        field: "gender",
        groupable: true,
        filterable: true,
        options: ["MALE", "FEMALE", "OTHER"],
      },
      {
        key: "state",
        label: "State",
        kind: "string",
        sql: 'p."state"',
        model: "Patient",
        field: "state",
        groupable: true,
        filterable: true,
      },
      {
        key: "bloodGroup",
        label: "Blood group",
        kind: "enum",
        sql: 'p."bloodGroup"',
        model: "Patient",
        field: "bloodGroup",
        groupable: true,
        filterable: true,
        options: ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG"],
      },
      {
        key: "isActive",
        label: "Active",
        kind: "boolean",
        sql: 'p."isActive"',
        model: "Patient",
        field: "isActive",
        groupable: true,
        filterable: true,
      },
      dateField("createdAt", "Registered", 'p."createdAt"', "Patient", "createdAt"),
      dateField("dateOfBirth", "Date of birth", 'p."dateOfBirth"', "Patient", "dateOfBirth"),
    ],
  },
];

export function findSource(key: string): ReportSource | undefined {
  return REPORT_SOURCES.find((s) => s.key === key);
}

export function findField(source: ReportSource, key: string): SourceField | undefined {
  return source.fields.find((f) => f.key === key);
}

/**
 * Fields that may not be reported on, whatever the registry says.
 *
 * Belt and braces against the registry growing a field whose column is
 * encrypted: ciphertext cannot be grouped or filtered -- two encryptions of
 * the same value differ -- so such a report would silently return one row per
 * patient rather than a total, and PrismaService would reject the filter
 * outright. The spec fails the build if one is ever added; this makes the
 * running system refuse it too.
 */
export function rejectsEncrypted(field: SourceField): boolean {
  return isEncryptedField(field.model, field.field);
}
