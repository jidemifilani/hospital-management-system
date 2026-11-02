-- Gap #7: VAT / Tax management

DO $$ BEGIN
  CREATE TYPE "TaxCodeType" AS ENUM ('OUTPUT_VAT','INPUT_VAT','WITHHOLDING','CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TaxReturnStatus" AS ENUM ('DRAFT','SUBMITTED','PAID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS tax_codes (
  id               VARCHAR(30)    NOT NULL PRIMARY KEY,
  code             VARCHAR(30)    NOT NULL,
  name             VARCHAR(120)   NOT NULL,
  rate             NUMERIC(6,4)   NOT NULL,
  type             "TaxCodeType"  NOT NULL DEFAULT 'OUTPUT_VAT',
  "isActive"       BOOLEAN        NOT NULL DEFAULT TRUE,
  "organizationId" VARCHAR(30)    NOT NULL REFERENCES organizations(id),
  "createdAt"      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT tax_codes_code_org_key UNIQUE (code, "organizationId")
);
CREATE INDEX IF NOT EXISTS tax_codes_org_active_idx ON tax_codes ("organizationId", "isActive");

-- Seed common Nigerian tax codes (inserted once per org on first use via service)

CREATE TABLE IF NOT EXISTS tax_applications (
  id                VARCHAR(30)   NOT NULL PRIMARY KEY,
  "taxCodeId"       VARCHAR(30)   NOT NULL REFERENCES tax_codes(id),
  "referenceType"   VARCHAR(30)   NOT NULL,
  "referenceId"     VARCHAR(30)   NOT NULL,
  "baseAmount"      NUMERIC(12,2) NOT NULL,
  "taxAmount"       NUMERIC(12,2) NOT NULL,
  "organizationId"  VARCHAR(30)   NOT NULL REFERENCES organizations(id),
  "createdAt"       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tax_applications_org_ref_idx ON tax_applications ("organizationId", "referenceType", "referenceId");
CREATE INDEX IF NOT EXISTS tax_applications_org_code_idx ON tax_applications ("organizationId", "taxCodeId");

CREATE TABLE IF NOT EXISTS tax_returns (
  id               VARCHAR(30)       NOT NULL PRIMARY KEY,
  year             INTEGER           NOT NULL,
  month            INTEGER           NOT NULL CHECK (month BETWEEN 1 AND 12),
  "outputVat"      NUMERIC(12,2)     NOT NULL DEFAULT 0,
  "inputVat"       NUMERIC(12,2)     NOT NULL DEFAULT 0,
  "netVat"         NUMERIC(12,2)     NOT NULL DEFAULT 0,
  status           "TaxReturnStatus" NOT NULL DEFAULT 'DRAFT',
  "dueDate"        DATE,
  "submittedAt"    TIMESTAMPTZ,
  notes            TEXT,
  "organizationId" VARCHAR(30)       NOT NULL REFERENCES organizations(id),
  "createdAt"      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT tax_returns_year_month_org_key UNIQUE (year, month, "organizationId")
);
CREATE INDEX IF NOT EXISTS tax_returns_org_status_idx ON tax_returns ("organizationId", status);
