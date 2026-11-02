-- Odoo gap #5: scheduled reports by email

-- Enums
DO $$ BEGIN
  CREATE TYPE "ScheduledReportType" AS ENUM (
    'BILLING_SUMMARY', 'INVENTORY_VALUATION', 'LOW_STOCK',
    'PAYROLL_SUMMARY', 'PROCUREMENT_SUMMARY', 'PATIENT_ADMISSIONS'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ScheduledReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Scheduled reports table
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id               TEXT                          NOT NULL PRIMARY KEY,
  name             TEXT                          NOT NULL,
  type             "ScheduledReportType"         NOT NULL,
  frequency        "ScheduledReportFrequency"    NOT NULL,
  recipients       JSONB                         NOT NULL DEFAULT '[]',
  "isActive"       BOOLEAN                       NOT NULL DEFAULT TRUE,
  "lastRunAt"      TIMESTAMPTZ,
  "nextRunAt"      TIMESTAMPTZ,
  "organizationId" TEXT                          NOT NULL,
  "createdAt"      TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_sr_org FOREIGN KEY ("organizationId") REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS sr_org_active_next_idx
  ON scheduled_reports ("organizationId", "isActive", "nextRunAt");
