-- Gap #8: Budget vs Actuals

CREATE TABLE IF NOT EXISTS budgets (
  id               VARCHAR(30)    NOT NULL PRIMARY KEY,
  "accountId"      VARCHAR(30)    NOT NULL REFERENCES accounts(id),
  year             INTEGER        NOT NULL,
  month            INTEGER        CHECK (month BETWEEN 1 AND 12),
  "budgetedAmount" NUMERIC(14,2)  NOT NULL,
  notes            TEXT,
  "organizationId" VARCHAR(30)    NOT NULL REFERENCES organizations(id),
  "createdAt"      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT budgets_account_year_month_org_key UNIQUE ("accountId", year, month, "organizationId")
);

CREATE INDEX IF NOT EXISTS budgets_org_year_idx ON budgets ("organizationId", year);
