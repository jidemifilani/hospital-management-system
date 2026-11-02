-- Gap #6: Multi-currency support
-- currencies master table (shared, no org FK)
CREATE TABLE IF NOT EXISTS currencies (
  code      VARCHAR(10)  PRIMARY KEY,
  name      VARCHAR(120) NOT NULL,
  symbol    VARCHAR(10)  NOT NULL,
  "isActive" BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Seed common currencies
INSERT INTO currencies (code, name, symbol) VALUES
  ('NGN', 'Nigerian Naira',     '₦'),
  ('USD', 'US Dollar',          '$'),
  ('EUR', 'Euro',               '€'),
  ('GBP', 'British Pound',      '£'),
  ('JPY', 'Japanese Yen',       '¥'),
  ('CNY', 'Chinese Yuan',       '¥'),
  ('GHS', 'Ghanaian Cedi',      '₵'),
  ('KES', 'Kenyan Shilling',    'KSh'),
  ('ZAR', 'South African Rand', 'R'),
  ('CAD', 'Canadian Dollar',    'CA$'),
  ('AUD', 'Australian Dollar',  'A$'),
  ('CHF', 'Swiss Franc',        'CHF'),
  ('AED', 'UAE Dirham',         'د.إ'),
  ('SAR', 'Saudi Riyal',        '﷼')
ON CONFLICT (code) DO NOTHING;

-- exchange_rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id               VARCHAR(30)    NOT NULL PRIMARY KEY,
  "currencyCode"   VARCHAR(10)    NOT NULL REFERENCES currencies(code),
  "rateToBase"     NUMERIC(18,6)  NOT NULL,
  "effectiveDate"  DATE           NOT NULL,
  source           VARCHAR(20)    NOT NULL DEFAULT 'MANUAL',
  "organizationId" VARCHAR(30)    NOT NULL REFERENCES organizations(id),
  "createdAt"      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT exchange_rates_currency_date_org_key UNIQUE ("currencyCode", "effectiveDate", "organizationId")
);

CREATE INDEX IF NOT EXISTS exchange_rates_org_currency_date_idx
  ON exchange_rates ("organizationId", "currencyCode", "effectiveDate");

-- baseCurrencyCode column on organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS "baseCurrencyCode" VARCHAR(10) NOT NULL DEFAULT 'NGN';
