-- Gap #11: Fixed asset depreciation

DO $$ BEGIN
  CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE','DECLINING_BALANCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Depreciation postings get their own source so they are traceable in the
-- ledger rather than lumped in with manual adjustments.
ALTER TYPE "JournalSource" ADD VALUE IF NOT EXISTS 'DEPRECIATION';

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS "depreciationMethod"    "DepreciationMethod",
  ADD COLUMN IF NOT EXISTS "usefulLifeMonths"      INTEGER,
  ADD COLUMN IF NOT EXISTS "salvageValue"          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS "depreciationStartDate" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "depreciationEndedAt"   TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS depreciation_entries (
  id               VARCHAR(30)   NOT NULL PRIMARY KEY,
  "assetId"        VARCHAR(30)   NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  year             INTEGER       NOT NULL,
  month            INTEGER       NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount           NUMERIC(12,2) NOT NULL,
  accumulated      NUMERIC(12,2) NOT NULL,
  "bookValue"      NUMERIC(12,2) NOT NULL,
  "journalEntryId" VARCHAR(30) UNIQUE REFERENCES journal_entries(id),
  "postedAt"       TIMESTAMPTZ,
  "organizationId" VARCHAR(30)   NOT NULL REFERENCES organizations(id),
  "createdAt"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- A period already charged for an asset cannot be charged again. This is the
  -- guard that makes re-running a monthly depreciation job safe.
  CONSTRAINT depreciation_entries_asset_period_key UNIQUE ("assetId", year, month)
);

CREATE INDEX IF NOT EXISTS depreciation_entries_org_period_idx
  ON depreciation_entries ("organizationId", year, month);

-- Contra-asset account for accumulated depreciation. Every organisation that
-- already has a chart gets it here, so a depreciation run does not fail on a
-- missing account code; new organisations get it from DEFAULT_CHART.
INSERT INTO accounts (id, code, name, type, "parentId", "isActive", "isPostable", "organizationId", "createdAt", "updatedAt")
SELECT
  substr(md5(random()::text || o.id), 1, 25),
  '1450',
  'Accumulated Depreciation',
  'ASSET',
  (SELECT a.id FROM accounts a WHERE a.code = '1000' AND a."organizationId" = o.id LIMIT 1),
  TRUE, TRUE,
  o.id, NOW(), NOW()
FROM organizations o
WHERE EXISTS (SELECT 1 FROM accounts a WHERE a."organizationId" = o.id)
  AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.code = '1450' AND a."organizationId" = o.id);
