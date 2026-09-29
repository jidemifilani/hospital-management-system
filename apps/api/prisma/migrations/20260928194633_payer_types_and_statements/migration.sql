-- CreateEnum
CREATE TYPE "PayerType" AS ENUM ('HMO', 'CORPORATE', 'NHIS');

-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('DRAFT', 'ISSUED', 'PART_PAID', 'PAID', 'VOID');

-- AlterTable
ALTER TABLE "hmo_providers" ADD COLUMN     "type" "PayerType" NOT NULL DEFAULT 'HMO';

-- AlterTable
ALTER TABLE "insurance_claims" ADD COLUMN     "statementId" TEXT;

-- CreateTable
CREATE TABLE "payer_statements" (
    "id" TEXT NOT NULL,
    "statementNumber" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "StatementStatus" NOT NULL DEFAULT 'DRAFT',
    "claimCount" INTEGER NOT NULL DEFAULT 0,
    "totalApproved" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3),
    "dueOn" TIMESTAMP(3),
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payer_statements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payer_statements_organizationId_status_idx" ON "payer_statements"("organizationId", "status");

-- CreateIndex
CREATE INDEX "payer_statements_payerId_idx" ON "payer_statements"("payerId");

-- CreateIndex
CREATE UNIQUE INDEX "payer_statements_statementNumber_organizationId_key" ON "payer_statements"("statementNumber", "organizationId");

-- AddForeignKey
ALTER TABLE "payer_statements" ADD CONSTRAINT "payer_statements_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "hmo_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payer_statements" ADD CONSTRAINT "payer_statements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "payer_statements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
