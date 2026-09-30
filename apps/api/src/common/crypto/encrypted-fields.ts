import { Prisma } from "@prisma/client";
import { decryptValue, encryptValue, isEncrypted } from "./field-cipher";

/**
 * Which columns are held as ciphertext.
 *
 * The list is deliberately short, and what is missing from it matters as much
 * as what is on it. A column can only be encrypted here if nothing ever
 * filters, sorts or matches on it, because ciphertext supports none of those:
 * two encryptions of the same number differ, so an equality test fails and a
 * substring test is meaningless.
 *
 * That rules out the fields patient lookup runs on — firstName, lastName, mrn,
 * phone, email are all searched with `contains` from the patient list — and the
 * phone number is additionally matched exactly to catch duplicate
 * registrations. Encrypting any of them would leave the search box quietly
 * returning nothing. Those columns stay readable in the database and are
 * protected by disk encryption and access control instead; see
 * docs/encryption-at-rest.md.
 *
 * What is here is the material that is damaging to disclose and is only ever
 * displayed: national identity and insurance numbers, home address, allergies,
 * next of kin, and the free text of a clinical note.
 */
export const ENCRYPTED_FIELDS: Readonly<Record<string, readonly string[]>> = {
  Patient: [
    "ninNumber",
    "nhisNumber",
    "hmoNumber",
    "address",
    "allergies",
    "emergencyContactName",
    "emergencyContactPhone",
    "emergencyContactRelation",
  ],
  ClinicalNote: ["subjective", "objective", "assessment", "plan", "content"],
};

/** Nested-write wrappers whose payload is itself a row of the related model. */
const NESTED_WRITE_KEYS = ["create", "update", "upsert", "connectOrCreate", "createMany"];

type RelationMap = Record<string, Record<string, string>>;

let relationMap: RelationMap | null = null;

/** field name -> related model, per model, read from the generated schema. */
function relations(): RelationMap {
  if (relationMap) return relationMap;
  const built: RelationMap = {};
  for (const model of Prisma.dmmf.datamodel.models) {
    const fields: Record<string, string> = {};
    for (const field of model.fields) {
      if (field.kind === "object") fields[field.name] = field.type;
    }
    built[model.name] = fields;
  }
  relationMap = built;
  return built;
}

export function isEncryptedField(model: string | undefined, field: string): boolean {
  return !!model && (ENCRYPTED_FIELDS[model]?.includes(field) ?? false);
}

/* ─────────────────────────── reads ─────────────────────────── */

/**
 * Walks a query result and decrypts in place.
 *
 * It recurses through relations because a patient is very often read as part of
 * something else — an invoice, a claim, a queue entry — and a value returned
 * through `include` is the same value that would have come back on its own.
 */
export function decryptResult(model: string | undefined, result: unknown, key: Buffer): void {
  if (!model || result === null || typeof result !== "object") return;

  if (Array.isArray(result)) {
    for (const row of result) decryptResult(model, row, key);
    return;
  }

  const row = result as Record<string, unknown>;

  for (const field of ENCRYPTED_FIELDS[model] ?? []) {
    const value = row[field];
    if (isEncrypted(value)) row[field] = decryptValue(value, key);
  }

  const related = relations()[model] ?? {};
  for (const [field, relatedModel] of Object.entries(related)) {
    if (row[field] != null) decryptResult(relatedModel, row[field], key);
  }
}

/* ────────────────────────── writes ─────────────────────────── */

/**
 * Walks the data of a write and encrypts in place, following nested writes so
 * that a row created through its parent is stored the same way as one created
 * directly.
 */
export function encryptData(model: string | undefined, data: unknown, key: Buffer): void {
  if (!model || data === null || typeof data !== "object") return;

  if (Array.isArray(data)) {
    for (const row of data) encryptData(model, row, key);
    return;
  }

  const row = data as Record<string, unknown>;

  for (const field of ENCRYPTED_FIELDS[model] ?? []) {
    const value = row[field];
    if (typeof value === "string" && !isEncrypted(value)) {
      row[field] = encryptValue(value, key);
    } else if (value !== null && typeof value === "object" && "set" in (value as object)) {
      // Prisma's explicit update form: { field: { set: "..." } }
      const wrapper = value as { set?: unknown };
      if (typeof wrapper.set === "string" && !isEncrypted(wrapper.set)) {
        wrapper.set = encryptValue(wrapper.set, key);
      }
    }
  }

  const related = relations()[model] ?? {};
  for (const [field, relatedModel] of Object.entries(related)) {
    const nested = row[field];
    if (nested === null || typeof nested !== "object") continue;

    for (const verb of NESTED_WRITE_KEYS) {
      const payload = (nested as Record<string, unknown>)[verb];
      if (payload == null) continue;
      if (verb === "upsert") {
        const both = payload as Record<string, unknown>;
        encryptData(relatedModel, both.create, key);
        encryptData(relatedModel, both.update, key);
      } else if (verb === "connectOrCreate") {
        const wrapper = payload as Record<string, unknown>;
        encryptData(relatedModel, wrapper.create, key);
      } else if (verb === "createMany") {
        const wrapper = payload as Record<string, unknown>;
        encryptData(relatedModel, wrapper.data, key);
      } else {
        encryptData(relatedModel, payload, key);
      }
    }
  }
}

/* ───────────────────── querying on ciphertext ───────────────────── */

export class EncryptedFieldQueryError extends Error {
  constructor(model: string, field: string, clause: string) {
    super(
      `Cannot use ${clause} on ${model}.${field}: it is stored encrypted, so the ` +
        `comparison would run against ciphertext and silently match nothing. ` +
        `Filter on an unencrypted column, or remove the field from ENCRYPTED_FIELDS ` +
        `and re-read docs/encryption-at-rest.md before doing so.`,
    );
  }
}

const WHERE_COMBINATORS = ["AND", "OR", "NOT"];
const RELATION_FILTERS = ["is", "isNot", "some", "every", "none"];

function checkWhere(model: string | undefined, where: unknown, key = "where"): void {
  if (!model || where === null || typeof where !== "object") return;

  if (Array.isArray(where)) {
    for (const entry of where) checkWhere(model, entry, key);
    return;
  }

  const related = relations()[model] ?? {};

  for (const [field, value] of Object.entries(where as Record<string, unknown>)) {
    if (WHERE_COMBINATORS.includes(field)) {
      checkWhere(model, value, key);
      continue;
    }
    if (isEncryptedField(model, field)) {
      throw new EncryptedFieldQueryError(model, field, key);
    }
    if (related[field] && value !== null && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      let descended = false;
      for (const filter of RELATION_FILTERS) {
        if (nested[filter] != null) {
          checkWhere(related[field], nested[filter], key);
          descended = true;
        }
      }
      if (!descended) checkWhere(related[field], nested, key);
    }
  }
}

function checkFieldList(model: string | undefined, value: unknown, clause: string): void {
  if (!model || value == null) return;

  if (Array.isArray(value)) {
    for (const entry of value) checkFieldList(model, entry, clause);
    return;
  }
  if (typeof value === "string") {
    if (isEncryptedField(model, value)) throw new EncryptedFieldQueryError(model, value, clause);
    return;
  }
  if (typeof value === "object") {
    for (const field of Object.keys(value as object)) {
      if (isEncryptedField(model, field)) throw new EncryptedFieldQueryError(model, field, clause);
    }
  }
}

/**
 * Refuses a query that tries to match, sort or group on ciphertext.
 *
 * Without this the query is accepted and comes back empty, which reads as "no
 * such patient" rather than "you cannot ask that" — the failure is invisible
 * at the point it happens and surfaces later as a patient who appears not to
 * exist. Failing the call puts the error where the mistake is.
 */
export function assertNotQueriedOnCiphertext(model: string | undefined, args: unknown): void {
  if (!model || args === null || typeof args !== "object") return;
  const query = args as Record<string, unknown>;

  checkWhere(model, query.where);
  checkFieldList(model, query.orderBy, "orderBy");
  checkFieldList(model, query.cursor, "cursor");
  checkFieldList(model, query.distinct, "distinct");
  checkFieldList(model, query.by, "groupBy");
}
