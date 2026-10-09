-- Rename table: hmo_providers → payers
-- Hand-written to avoid Prisma generating a DROP/CREATE that would lose live rows.
-- All FK constraints and indexes on the old table are automatically carried over
-- by PostgreSQL when a table is renamed.

ALTER TABLE "hmo_providers" RENAME TO "payers";
