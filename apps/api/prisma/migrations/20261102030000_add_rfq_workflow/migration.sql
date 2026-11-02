-- Gap #10: Vendor RFQ workflow

DO $$ BEGIN
  CREATE TYPE "RfqStatus" AS ENUM ('DRAFT','SENT','CLOSED','AWARDED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RfqQuoteStatus" AS ENUM ('PENDING','RECEIVED','DECLINED','AWARDED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS rfqs (
  id                 VARCHAR(30)  NOT NULL PRIMARY KEY,
  "rfqNumber"        VARCHAR(40)  NOT NULL UNIQUE,
  title              VARCHAR(200) NOT NULL,
  description        TEXT,
  status             "RfqStatus"  NOT NULL DEFAULT 'DRAFT',
  "dueDate"          TIMESTAMPTZ,
  "sentAt"           TIMESTAMPTZ,
  "closedAt"         TIMESTAMPTZ,
  "awardedAt"        TIMESTAMPTZ,
  "awardedQuoteId"   VARCHAR(30) UNIQUE,
  "purchaseOrderId"  VARCHAR(30) UNIQUE REFERENCES purchase_orders(id),
  notes              TEXT,
  "createdById"      VARCHAR(30) REFERENCES staff(id),
  "organizationId"   VARCHAR(30)  NOT NULL REFERENCES organizations(id),
  "createdAt"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rfqs_org_status_idx ON rfqs ("organizationId", status);

CREATE TABLE IF NOT EXISTS rfq_items (
  id              VARCHAR(30)  NOT NULL PRIMARY KEY,
  "rfqId"         VARCHAR(30)  NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  "itemName"      VARCHAR(200) NOT NULL,
  category        VARCHAR(100),
  unit            VARCHAR(40),
  quantity        INTEGER      NOT NULL,
  specification   TEXT,
  "sortOrder"     INTEGER      NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS rfq_items_rfq_idx ON rfq_items ("rfqId");

CREATE TABLE IF NOT EXISTS rfq_quotes (
  id               VARCHAR(30)      NOT NULL PRIMARY KEY,
  "rfqId"          VARCHAR(30)      NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  "vendorName"     VARCHAR(200)     NOT NULL,
  "vendorContact"  VARCHAR(100),
  "vendorEmail"    VARCHAR(200),
  status           "RfqQuoteStatus" NOT NULL DEFAULT 'PENDING',
  "totalAmount"    NUMERIC(12,2)    NOT NULL DEFAULT 0,
  "leadTimeDays"   INTEGER,
  "validUntil"     TIMESTAMPTZ,
  notes            TEXT,
  "invitedAt"      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "respondedAt"    TIMESTAMPTZ,
  "organizationId" VARCHAR(30)      NOT NULL REFERENCES organizations(id)
);
CREATE INDEX IF NOT EXISTS rfq_quotes_rfq_status_idx ON rfq_quotes ("rfqId", status);

CREATE TABLE IF NOT EXISTS rfq_quote_lines (
  id            VARCHAR(30)   NOT NULL PRIMARY KEY,
  "rfqQuoteId"  VARCHAR(30)   NOT NULL REFERENCES rfq_quotes(id) ON DELETE CASCADE,
  "rfqItemId"   VARCHAR(30)   NOT NULL REFERENCES rfq_items(id) ON DELETE CASCADE,
  "unitPrice"   NUMERIC(12,2) NOT NULL,
  quantity      INTEGER       NOT NULL,
  "totalPrice"  NUMERIC(12,2) NOT NULL,
  notes         TEXT,
  CONSTRAINT rfq_quote_lines_quote_item_key UNIQUE ("rfqQuoteId", "rfqItemId")
);
CREATE INDEX IF NOT EXISTS rfq_quote_lines_item_idx ON rfq_quote_lines ("rfqItemId");

-- awardedQuoteId points at rfq_quotes, so this is added after that table
-- exists. Prisma does not model the relation (it would be circular), but the
-- constraint is still worth having: an award can only ever name a real quote.
DO $$ BEGIN
  ALTER TABLE rfqs
    ADD CONSTRAINT rfqs_awarded_quote_fkey
    FOREIGN KEY ("awardedQuoteId") REFERENCES rfq_quotes(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
