-- CreateEnum
CREATE TYPE "StatementLineType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id"             TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "bankName"       TEXT NOT NULL,
    "accountNumber"  TEXT NOT NULL,
    "currency"       TEXT NOT NULL DEFAULT 'NGN',
    "glAccountId"    TEXT NOT NULL,
    "isActive"       BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statement_lines" (
    "id"               TEXT NOT NULL,
    "bankAccountId"    TEXT NOT NULL,
    "valueDate"        TIMESTAMP(3) NOT NULL,
    "description"      TEXT NOT NULL,
    "reference"        TEXT,
    "amount"           DECIMAL(14,2) NOT NULL,
    "lineType"         "StatementLineType" NOT NULL,
    "isReconciled"     BOOLEAN NOT NULL DEFAULT false,
    "matchedPaymentId" TEXT,
    "matchedEntryId"   TEXT,
    "reconciledById"   TEXT,
    "reconciledAt"     TIMESTAMP(3),
    "organizationId"   TEXT NOT NULL,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_statement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_glAccountId_key" ON "bank_accounts"("glAccountId");

-- CreateIndex
CREATE INDEX "bank_accounts_organizationId_idx" ON "bank_accounts"("organizationId");

-- CreateIndex
CREATE INDEX "bank_statement_lines_bankAccountId_isReconciled_idx" ON "bank_statement_lines"("bankAccountId", "isReconciled");

-- CreateIndex
CREATE INDEX "bank_statement_lines_bankAccountId_valueDate_idx" ON "bank_statement_lines"("bankAccountId", "valueDate");

-- CreateIndex
CREATE INDEX "bank_statement_lines_organizationId_idx" ON "bank_statement_lines"("organizationId");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_glAccountId_fkey"
    FOREIGN KEY ("glAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_bankAccountId_fkey"
    FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_matchedPaymentId_fkey"
    FOREIGN KEY ("matchedPaymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_reconciledById_fkey"
    FOREIGN KEY ("reconciledById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
