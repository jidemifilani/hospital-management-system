-- Postgres will not allow a new enum value to be used in the transaction that
-- adds it, so this lands on its own ahead of the data migration.
ALTER TYPE "InventoryCategory" ADD VALUE 'DRUG';
