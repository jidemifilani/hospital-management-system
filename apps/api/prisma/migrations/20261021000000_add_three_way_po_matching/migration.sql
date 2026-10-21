-- Odoo gap #3: 3-way PO matching (GRN → Supplier Invoice → PO reconciliation)

-- Goods Receipt Notes
CREATE TABLE IF NOT EXISTS goods_receipt_notes (
  id                TEXT        NOT NULL PRIMARY KEY,
  "grnNumber"       TEXT        NOT NULL UNIQUE,
  "purchaseOrderId" TEXT        NOT NULL,
  "receivedById"    TEXT,
  "receivedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes             TEXT,
  "organizationId"  TEXT        NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_grn_po  FOREIGN KEY ("purchaseOrderId") REFERENCES purchase_orders(id),
  CONSTRAINT fk_grn_org FOREIGN KEY ("organizationId")  REFERENCES organizations(id),
  CONSTRAINT fk_grn_staff FOREIGN KEY ("receivedById")  REFERENCES staff(id)
);

CREATE INDEX IF NOT EXISTS grn_po_idx  ON goods_receipt_notes ("purchaseOrderId");
CREATE INDEX IF NOT EXISTS grn_org_idx ON goods_receipt_notes ("organizationId");

-- Goods Receipt Lines
CREATE TABLE IF NOT EXISTS goods_receipt_lines (
  id          TEXT           NOT NULL PRIMARY KEY,
  "grnId"     TEXT           NOT NULL,
  "poItemId"  TEXT           NOT NULL,
  quantity    DECIMAL(10, 3) NOT NULL,
  "unitCost"  DECIMAL(12, 2) NOT NULL,
  notes       TEXT,
  CONSTRAINT fk_grl_grn    FOREIGN KEY ("grnId")    REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
  CONSTRAINT fk_grl_poitem FOREIGN KEY ("poItemId") REFERENCES purchase_order_items(id)
);

CREATE INDEX IF NOT EXISTS grl_grn_idx    ON goods_receipt_lines ("grnId");
CREATE INDEX IF NOT EXISTS grl_poitem_idx ON goods_receipt_lines ("poItemId");

-- Supplier Invoice status enum
DO $$ BEGIN
  CREATE TYPE "SupplierInvoiceStatus" AS ENUM ('PENDING', 'MATCHED', 'DISCREPANCY', 'APPROVED', 'PAID', 'DISPUTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Supplier Invoices
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id                TEXT                      NOT NULL PRIMARY KEY,
  "siNumber"        TEXT                      NOT NULL UNIQUE,
  "vendorInvoiceNo" TEXT,
  "purchaseOrderId" TEXT                      NOT NULL,
  "invoiceDate"     TIMESTAMPTZ               NOT NULL,
  "dueDate"         TIMESTAMPTZ,
  "totalAmount"     DECIMAL(12, 2)            NOT NULL,
  status            "SupplierInvoiceStatus"   NOT NULL DEFAULT 'PENDING',
  "matchStatus"     TEXT                      NOT NULL DEFAULT 'UNMATCHED',
  notes             TEXT,
  "organizationId"  TEXT                      NOT NULL,
  "createdAt"       TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_si_po  FOREIGN KEY ("purchaseOrderId") REFERENCES purchase_orders(id),
  CONSTRAINT fk_si_org FOREIGN KEY ("organizationId")  REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS si_po_idx        ON supplier_invoices ("purchaseOrderId");
CREATE INDEX IF NOT EXISTS si_org_status_idx ON supplier_invoices ("organizationId", status);

-- Supplier Invoice Lines
CREATE TABLE IF NOT EXISTS supplier_invoice_lines (
  id            TEXT           NOT NULL PRIMARY KEY,
  "invoiceId"   TEXT           NOT NULL,
  "poItemId"    TEXT,
  description   TEXT           NOT NULL,
  quantity      DECIMAL(10, 3) NOT NULL,
  "unitPrice"   DECIMAL(12, 2) NOT NULL,
  total         DECIMAL(12, 2) NOT NULL,
  CONSTRAINT fk_sil_invoice FOREIGN KEY ("invoiceId") REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_sil_poitem  FOREIGN KEY ("poItemId")  REFERENCES purchase_order_items(id)
);

CREATE INDEX IF NOT EXISTS sil_invoice_idx ON supplier_invoice_lines ("invoiceId");
CREATE INDEX IF NOT EXISTS sil_poitem_idx  ON supplier_invoice_lines ("poItemId");
