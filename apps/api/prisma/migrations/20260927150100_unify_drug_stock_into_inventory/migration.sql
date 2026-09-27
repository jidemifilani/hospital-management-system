-- Folds pharmacy's DrugItem/DrugStock into the general inventory so there is
-- one stock system. Item ids are preserved, so prescription_items."drugItemId"
-- keeps resolving and no prescription is orphaned.

-- DropForeignKey
ALTER TABLE "drug_items" DROP CONSTRAINT "drug_items_organizationId_fkey";
ALTER TABLE "drug_stock" DROP CONSTRAINT "drug_stock_drugItemId_fkey";
ALTER TABLE "drug_stock" DROP CONSTRAINT "drug_stock_organizationId_fkey";
ALTER TABLE "prescription_items" DROP CONSTRAINT "prescription_items_drugItemId_fkey";

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "genericName" TEXT,
ADD COLUMN     "requiresBatch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sellingPrice" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "supplierName" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "stock_batches_itemId_expiresAt_idx" ON "stock_batches"("itemId", "expiresAt");
CREATE INDEX "stock_batches_organizationId_expiresAt_idx" ON "stock_batches"("organizationId", "expiresAt");

-- ── Data migration ──────────────────────────────────────────────────────────

-- Every organisation holding drugs needs somewhere to hold them.
INSERT INTO "stock_locations" ("id", "code", "name", "type", "isActive", "organizationId", "createdAt", "updatedAt")
SELECT 'loc_pharmacy_' || o."id", 'PHARMACY', 'Pharmacy Store', 'PHARMACY', true, o."id", NOW(), NOW()
FROM "organizations" o
WHERE EXISTS (SELECT 1 FROM "drug_items" di WHERE di."organizationId" = o."id")
  AND NOT EXISTS (
    SELECT 1 FROM "stock_locations" sl
    WHERE sl."organizationId" = o."id" AND sl."code" = 'PHARMACY'
  );

-- Drugs become inventory items, keeping their id. Cost is the weighted average
-- of the batches on hand, matching how inventory values everything else.
INSERT INTO "inventory_items" (
  "id", "code", "name", "genericName", "category", "unit", "reorderLevel",
  "averageCost", "sellingPrice", "requiresBatch", "isActive", "organizationId",
  "createdAt", "updatedAt"
)
SELECT
  di."id", di."code", di."name", di."genericName", 'DRUG', di."unit", di."reorderLevel",
  COALESCE((
    SELECT SUM(ds."costPerUnit" * ds."quantity") / NULLIF(SUM(ds."quantity"), 0)
    FROM "drug_stock" ds WHERE ds."drugItemId" = di."id"
  ), 0),
  di."sellingPrice", true, di."isActive", di."organizationId", di."createdAt", di."updatedAt"
FROM "drug_items" di;

-- Batches carry over with their expiry, which is what FEFO depends on.
INSERT INTO "stock_batches" (
  "id", "itemId", "locationId", "batchNumber", "quantity", "expiresAt",
  "unitCost", "supplierName", "receivedAt", "organizationId", "createdAt", "updatedAt"
)
SELECT
  ds."id", ds."drugItemId", sl."id", ds."batchNumber", ds."quantity", ds."expiresAt",
  ds."costPerUnit", ds."supplierName", ds."receivedAt", ds."organizationId", ds."createdAt", NOW()
FROM "drug_stock" ds
JOIN "stock_locations" sl
  ON sl."organizationId" = ds."organizationId" AND sl."code" = 'PHARMACY';

-- Levels are derived from the batches so the two agree from the outset.
INSERT INTO "stock_levels" ("id", "itemId", "locationId", "quantity", "organizationId", "updatedAt")
SELECT
  'lvl_' || sb."itemId" || '_' || sb."locationId",
  sb."itemId", sb."locationId", SUM(sb."quantity"), sb."organizationId", NOW()
FROM "stock_batches" sb
GROUP BY sb."itemId", sb."locationId", sb."organizationId"
ON CONFLICT ("itemId", "locationId")
DO UPDATE SET "quantity" = "stock_levels"."quantity" + EXCLUDED."quantity";

-- ── Retire the old tables ───────────────────────────────────────────────────
DROP TABLE "drug_stock";
DROP TABLE "drug_items";

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_drugItemId_fkey" FOREIGN KEY ("drugItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "stock_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
