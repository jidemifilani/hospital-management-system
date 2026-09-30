import { PrismaClient, Prisma } from "@prisma/client";
import { loadKey, encryptValue, isEncrypted } from "../src/common/crypto/field-cipher";
import { ENCRYPTED_FIELDS } from "../src/common/crypto/encrypted-fields";

/**
 * Encrypts rows written before field encryption existed.
 *
 * Reads are deliberately raw. Going through PrismaService would decrypt on the
 * way out and leave no way to tell an already-encrypted row from a plaintext
 * one, so the script would rewrite every row on every run. Writes are raw for
 * the same reason: what to encrypt is already decided here.
 *
 * Safe to run more than once, and safe to run while the API is serving, since
 * a row that is already ciphertext is skipped and reads tolerate both forms.
 */

const BATCH = 500;

function tableOf(model: string): string {
  const meta = Prisma.dmmf.datamodel.models.find((m) => m.name === model);
  if (!meta) throw new Error(`No such model: ${model}`);
  return meta.dbName ?? meta.name;
}

async function main() {
  const key = loadKey(process.env.FIELD_ENCRYPTION_KEY);
  const prisma = new PrismaClient();
  let total = 0;

  try {
    for (const [model, fields] of Object.entries(ENCRYPTED_FIELDS)) {
      const table = tableOf(model);
      const columns = fields.map((f) => `"${f}"`).join(", ");
      const anyPlaintext = fields
        .map((f) => `("${f}" IS NOT NULL AND "${f}" NOT LIKE 'enc:%')`)
        .join(" OR ");

      let done = 0;
      for (;;) {
        const rows = await prisma.$queryRawUnsafe<Record<string, string | null>[]>(
          `SELECT "id", ${columns} FROM "${table}" WHERE ${anyPlaintext} LIMIT ${BATCH}`,
        );
        if (rows.length === 0) break;

        for (const row of rows) {
          const sets: string[] = [];
          const values: unknown[] = [];
          for (const field of fields) {
            const value = row[field];
            if (typeof value !== "string" || isEncrypted(value)) continue;
            values.push(encryptValue(value, key));
            sets.push(`"${field}" = $${values.length}`);
          }
          if (sets.length === 0) continue;
          values.push(row.id);
          await prisma.$executeRawUnsafe(
            `UPDATE "${table}" SET ${sets.join(", ")} WHERE "id" = $${values.length}`,
            ...values,
          );
          done += 1;
        }
      }

      total += done;
      console.log(`${model}: encrypted ${done} row(s)`);
    }

    const scrubbed = await scrubAuditTrail(prisma);
    console.log(`audit_logs: scrubbed ${scrubbed} value(s)`);

    console.log(`Done. ${total} row(s) rewritten.`);
  } finally {
    await prisma.$disconnect();
  }
}


/**
 * Removes plaintext copies of encrypted fields from the audit trail.
 *
 * Every change is recorded with the request body that caused it, so a patient
 * registered or edited before this existed wrote their NIN, address, allergies
 * and next of kin into audit_logs in the clear. Encrypting the patients table
 * while leaving that behind protects very little, and audit_logs is kept for
 * seven years.
 *
 * The key is kept and only the value replaced, so the trail still shows which
 * fields a change touched and who made it. The values themselves remain in the
 * patients table, encrypted, which is the only place they need to be.
 */
async function scrubAuditTrail(prisma: PrismaClient): Promise<number> {
  const fields = [...new Set(Object.values(ENCRYPTED_FIELDS).flat())];
  let changed = 0;

  for (const field of fields) {
    changed += await prisma.$executeRawUnsafe(
      `UPDATE "audit_logs"
          SET "metadata" = jsonb_set("metadata", $1::text[], '"[encrypted]"'::jsonb)
        WHERE "metadata" ->> $2 IS NOT NULL
          AND "metadata" ->> $2 <> '[encrypted]'`,
      [field],
      field,
    );
  }
  return changed;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
