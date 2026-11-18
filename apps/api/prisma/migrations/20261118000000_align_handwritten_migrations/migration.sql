-- Brings the database the migrations build into line with schema.prisma.
--
-- The migrations for gaps #5 to #11 were written by hand against a running
-- database rather than generated, and hand-written SQL drifts from what the
-- ORM expects in ways nothing notices until a fresh deployment: VARCHAR(n)
-- where Prisma wants TEXT, TIMESTAMP where it wants TIMESTAMP(3), a
-- DEFAULT now() on updatedAt that Prisma sets itself, and index names of a
-- different shape.
--
-- Most of that is cosmetic. The foreign keys are not: Prisma declares nine of
-- these relations ON DELETE CASCADE and four ON DELETE SET NULL, and the
-- hand-written versions left them at the database default. Deleting an RFQ
-- would have failed on its own quote lines rather than removing them.
--
-- Generated with prisma migrate diff, from the migrations to the datamodel,
-- so it is exactly what Prisma considers the difference. Nothing here drops a
-- table, a column or a row.

-- DropForeignKey
ALTER TABLE "budgets" DROP CONSTRAINT "budgets_accountId_fkey";

-- DropForeignKey
ALTER TABLE "budgets" DROP CONSTRAINT "budgets_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "depreciation_entries" DROP CONSTRAINT "depreciation_entries_assetId_fkey";

-- DropForeignKey
ALTER TABLE "depreciation_entries" DROP CONSTRAINT "depreciation_entries_journalEntryId_fkey";

-- DropForeignKey
ALTER TABLE "depreciation_entries" DROP CONSTRAINT "depreciation_entries_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "exchange_rates" DROP CONSTRAINT "exchange_rates_currencyCode_fkey";

-- DropForeignKey
ALTER TABLE "exchange_rates" DROP CONSTRAINT "exchange_rates_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "goods_receipt_lines" DROP CONSTRAINT "fk_grl_grn";

-- DropForeignKey
ALTER TABLE "goods_receipt_lines" DROP CONSTRAINT "fk_grl_poitem";

-- DropForeignKey
ALTER TABLE "goods_receipt_notes" DROP CONSTRAINT "fk_grn_org";

-- DropForeignKey
ALTER TABLE "goods_receipt_notes" DROP CONSTRAINT "fk_grn_po";

-- DropForeignKey
ALTER TABLE "goods_receipt_notes" DROP CONSTRAINT "fk_grn_staff";

-- DropForeignKey
ALTER TABLE "reorder_rules" DROP CONSTRAINT "fk_rr_item";

-- DropForeignKey
ALTER TABLE "reorder_rules" DROP CONSTRAINT "fk_rr_org";

-- DropForeignKey
ALTER TABLE "replenishment_suggestions" DROP CONSTRAINT "fk_rs_item";

-- DropForeignKey
ALTER TABLE "replenishment_suggestions" DROP CONSTRAINT "fk_rs_org";

-- DropForeignKey
ALTER TABLE "replenishment_suggestions" DROP CONSTRAINT "fk_rs_rule";

-- DropForeignKey
ALTER TABLE "rfq_items" DROP CONSTRAINT "rfq_items_rfqId_fkey";

-- DropForeignKey
ALTER TABLE "rfq_quote_lines" DROP CONSTRAINT "rfq_quote_lines_rfqItemId_fkey";

-- DropForeignKey
ALTER TABLE "rfq_quote_lines" DROP CONSTRAINT "rfq_quote_lines_rfqQuoteId_fkey";

-- DropForeignKey
ALTER TABLE "rfq_quotes" DROP CONSTRAINT "rfq_quotes_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "rfq_quotes" DROP CONSTRAINT "rfq_quotes_rfqId_fkey";

-- DropForeignKey
ALTER TABLE "rfqs" DROP CONSTRAINT "rfqs_awarded_quote_fkey";

-- DropForeignKey
ALTER TABLE "rfqs" DROP CONSTRAINT "rfqs_createdById_fkey";

-- DropForeignKey
ALTER TABLE "rfqs" DROP CONSTRAINT "rfqs_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "rfqs" DROP CONSTRAINT "rfqs_purchaseOrderId_fkey";

-- DropForeignKey
ALTER TABLE "salary_grades" DROP CONSTRAINT "fk_salary_grade_org";

-- DropForeignKey
ALTER TABLE "scheduled_reports" DROP CONSTRAINT "fk_sr_org";

-- DropForeignKey
ALTER TABLE "supplier_invoice_lines" DROP CONSTRAINT "fk_sil_invoice";

-- DropForeignKey
ALTER TABLE "supplier_invoice_lines" DROP CONSTRAINT "fk_sil_poitem";

-- DropForeignKey
ALTER TABLE "supplier_invoices" DROP CONSTRAINT "fk_si_org";

-- DropForeignKey
ALTER TABLE "supplier_invoices" DROP CONSTRAINT "fk_si_po";

-- DropForeignKey
ALTER TABLE "tax_applications" DROP CONSTRAINT "tax_applications_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "tax_applications" DROP CONSTRAINT "tax_applications_taxCodeId_fkey";

-- DropForeignKey
ALTER TABLE "tax_codes" DROP CONSTRAINT "tax_codes_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "tax_returns" DROP CONSTRAINT "tax_returns_organizationId_fkey";

-- AlterTable
ALTER TABLE "assets" ALTER COLUMN "depreciationStartDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "depreciationEndedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "budgets" DROP CONSTRAINT "budgets_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "accountId" SET DATA TYPE TEXT,
ALTER COLUMN "organizationId" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "currencies" DROP CONSTRAINT "currencies_pkey",
ALTER COLUMN "code" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "symbol" SET DATA TYPE TEXT,
ADD CONSTRAINT "currencies_pkey" PRIMARY KEY ("code");

-- AlterTable
ALTER TABLE "depreciation_entries" DROP CONSTRAINT "depreciation_entries_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "assetId" SET DATA TYPE TEXT,
ALTER COLUMN "journalEntryId" SET DATA TYPE TEXT,
ALTER COLUMN "postedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "organizationId" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "depreciation_entries_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "exchange_rates" DROP CONSTRAINT "exchange_rates_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "currencyCode" SET DATA TYPE TEXT,
ALTER COLUMN "source" SET DATA TYPE TEXT,
ALTER COLUMN "organizationId" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "goods_receipt_notes" ALTER COLUMN "receivedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "baseCurrencyCode" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "payers" RENAME CONSTRAINT "hmo_providers_pkey" TO "payers_pkey";

-- AlterTable
ALTER TABLE "reorder_rules" ALTER COLUMN "lastTriggeredAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "replenishment_suggestions" ALTER COLUMN "triggeredAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "rfq_items" DROP CONSTRAINT "rfq_items_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "rfqId" SET DATA TYPE TEXT,
ALTER COLUMN "itemName" SET DATA TYPE TEXT,
ALTER COLUMN "category" SET DATA TYPE TEXT,
ALTER COLUMN "unit" SET DATA TYPE TEXT,
ADD CONSTRAINT "rfq_items_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "rfq_quote_lines" DROP CONSTRAINT "rfq_quote_lines_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "rfqQuoteId" SET DATA TYPE TEXT,
ALTER COLUMN "rfqItemId" SET DATA TYPE TEXT,
ADD CONSTRAINT "rfq_quote_lines_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "rfq_quotes" DROP CONSTRAINT "rfq_quotes_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "rfqId" SET DATA TYPE TEXT,
ALTER COLUMN "vendorName" SET DATA TYPE TEXT,
ALTER COLUMN "vendorContact" SET DATA TYPE TEXT,
ALTER COLUMN "vendorEmail" SET DATA TYPE TEXT,
ALTER COLUMN "validUntil" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "invitedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "respondedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "organizationId" SET DATA TYPE TEXT,
ADD CONSTRAINT "rfq_quotes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "rfqs" DROP CONSTRAINT "rfqs_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "rfqNumber" SET DATA TYPE TEXT,
ALTER COLUMN "title" SET DATA TYPE TEXT,
ALTER COLUMN "dueDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "sentAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "closedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "awardedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "awardedQuoteId" SET DATA TYPE TEXT,
ALTER COLUMN "purchaseOrderId" SET DATA TYPE TEXT,
ALTER COLUMN "createdById" SET DATA TYPE TEXT,
ALTER COLUMN "organizationId" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "salary_grades" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "scheduled_reports" ALTER COLUMN "recipients" DROP DEFAULT,
ALTER COLUMN "lastRunAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "nextRunAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "supplier_invoices" ALTER COLUMN "invoiceDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "dueDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tax_applications" DROP CONSTRAINT "tax_applications_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "taxCodeId" SET DATA TYPE TEXT,
ALTER COLUMN "referenceType" SET DATA TYPE TEXT,
ALTER COLUMN "referenceId" SET DATA TYPE TEXT,
ALTER COLUMN "organizationId" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "tax_applications_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tax_codes" DROP CONSTRAINT "tax_codes_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "code" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "organizationId" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "tax_codes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tax_returns" DROP CONSTRAINT "tax_returns_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "dueDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "submittedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "organizationId" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "tax_returns_pkey" PRIMARY KEY ("id");

-- RenameForeignKey
ALTER TABLE "payers" RENAME CONSTRAINT "hmo_providers_organizationId_fkey" TO "payers_organizationId_fkey";

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reorder_rules" ADD CONSTRAINT "reorder_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_suggestions" ADD CONSTRAINT "replenishment_suggestions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "reorder_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_suggestions" ADD CONSTRAINT "replenishment_suggestions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replenishment_suggestions" ADD CONSTRAINT "replenishment_suggestions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_grades" ADD CONSTRAINT "salary_grades_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "goods_receipt_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_lines" ADD CONSTRAINT "supplier_invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "supplier_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoice_lines" ADD CONSTRAINT "supplier_invoice_lines_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "purchase_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_codes" ADD CONSTRAINT "tax_codes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_applications" ADD CONSTRAINT "tax_applications_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "tax_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_applications" ADD CONSTRAINT "tax_applications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_returns" ADD CONSTRAINT "tax_returns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_quotes" ADD CONSTRAINT "rfq_quotes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_quote_lines" ADD CONSTRAINT "rfq_quote_lines_rfqQuoteId_fkey" FOREIGN KEY ("rfqQuoteId") REFERENCES "rfq_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfq_quote_lines" ADD CONSTRAINT "rfq_quote_lines_rfqItemId_fkey" FOREIGN KEY ("rfqItemId") REFERENCES "rfq_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "budgets_account_year_month_org_key" RENAME TO "budgets_accountId_year_month_organizationId_key";

-- RenameIndex
ALTER INDEX "budgets_org_year_idx" RENAME TO "budgets_organizationId_year_idx";

-- RenameIndex
ALTER INDEX "depreciation_entries_asset_period_key" RENAME TO "depreciation_entries_assetId_year_month_key";

-- RenameIndex
ALTER INDEX "depreciation_entries_org_period_idx" RENAME TO "depreciation_entries_organizationId_year_month_idx";

-- RenameIndex
ALTER INDEX "exchange_rates_currency_date_org_key" RENAME TO "exchange_rates_currencyCode_effectiveDate_organizationId_key";

-- RenameIndex
ALTER INDEX "exchange_rates_org_currency_date_idx" RENAME TO "exchange_rates_organizationId_currencyCode_effectiveDate_idx";

-- RenameIndex
ALTER INDEX "grl_grn_idx" RENAME TO "goods_receipt_lines_grnId_idx";

-- RenameIndex
ALTER INDEX "grl_poitem_idx" RENAME TO "goods_receipt_lines_poItemId_idx";

-- RenameIndex
ALTER INDEX "grn_org_idx" RENAME TO "goods_receipt_notes_organizationId_idx";

-- RenameIndex
ALTER INDEX "grn_po_idx" RENAME TO "goods_receipt_notes_purchaseOrderId_idx";

-- RenameIndex
ALTER INDEX "hmo_providers_code_organizationId_key" RENAME TO "payers_code_organizationId_key";

-- RenameIndex
ALTER INDEX "hmo_providers_organizationId_isActive_idx" RENAME TO "payers_organizationId_isActive_idx";

-- RenameIndex
ALTER INDEX "rr_item_idx" RENAME TO "reorder_rules_itemId_idx";

-- RenameIndex
ALTER INDEX "rr_org_active_idx" RENAME TO "reorder_rules_organizationId_isActive_idx";

-- RenameIndex
ALTER INDEX "rs_org_status_idx" RENAME TO "replenishment_suggestions_organizationId_status_idx";

-- RenameIndex
ALTER INDEX "rfq_items_rfq_idx" RENAME TO "rfq_items_rfqId_idx";

-- RenameIndex
ALTER INDEX "rfq_quote_lines_item_idx" RENAME TO "rfq_quote_lines_rfqItemId_idx";

-- RenameIndex
ALTER INDEX "rfq_quote_lines_quote_item_key" RENAME TO "rfq_quote_lines_rfqQuoteId_rfqItemId_key";

-- RenameIndex
ALTER INDEX "rfq_quotes_rfq_status_idx" RENAME TO "rfq_quotes_rfqId_status_idx";

-- RenameIndex
ALTER INDEX "rfqs_org_status_idx" RENAME TO "rfqs_organizationId_status_idx";

-- RenameIndex
ALTER INDEX "salary_grades_org_idx" RENAME TO "salary_grades_organizationId_idx";

-- RenameIndex
ALTER INDEX "sr_org_active_next_idx" RENAME TO "scheduled_reports_organizationId_isActive_nextRunAt_idx";

-- RenameIndex
ALTER INDEX "sil_invoice_idx" RENAME TO "supplier_invoice_lines_invoiceId_idx";

-- RenameIndex
ALTER INDEX "sil_poitem_idx" RENAME TO "supplier_invoice_lines_poItemId_idx";

-- RenameIndex
ALTER INDEX "si_org_status_idx" RENAME TO "supplier_invoices_organizationId_status_idx";

-- RenameIndex
ALTER INDEX "si_po_idx" RENAME TO "supplier_invoices_purchaseOrderId_idx";

-- RenameIndex
ALTER INDEX "tax_applications_org_code_idx" RENAME TO "tax_applications_organizationId_taxCodeId_idx";

-- RenameIndex
ALTER INDEX "tax_applications_org_ref_idx" RENAME TO "tax_applications_organizationId_referenceType_referenceId_idx";

-- RenameIndex
ALTER INDEX "tax_codes_code_org_key" RENAME TO "tax_codes_code_organizationId_key";

-- RenameIndex
ALTER INDEX "tax_codes_org_active_idx" RENAME TO "tax_codes_organizationId_isActive_idx";

-- RenameIndex
ALTER INDEX "tax_returns_org_status_idx" RENAME TO "tax_returns_organizationId_status_idx";

-- RenameIndex
ALTER INDEX "tax_returns_year_month_org_key" RENAME TO "tax_returns_year_month_organizationId_key";
