-- CreateEnum
CREATE TYPE "HmoContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "HmoEnrolmentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'EXPIRED');

-- AlterTable
ALTER TABLE "insurance_claims" ADD COLUMN     "coveredAmount" DECIMAL(12,2),
ADD COLUMN     "encounterId" TEXT,
ADD COLUMN     "enrolmentId" TEXT,
ADD COLUMN     "paidAmount" DECIMAL(12,2),
ADD COLUMN     "patientPortion" DECIMAL(12,2),
ADD COLUMN     "providerId" TEXT;

-- CreateTable
CREATE TABLE "hmo_providers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hmo_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hmo_plans" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coveragePercent" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "annualLimit" DECIMAL(12,2),
    "perVisitLimit" DECIMAL(12,2),
    "requiresPreAuth" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hmo_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hmo_contracts" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "creditLimit" DECIMAL(12,2),
    "status" "HmoContractStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hmo_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hmo_enrolments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "memberNumber" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "HmoEnrolmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPrincipal" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hmo_enrolments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_claim_lines" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "chargeId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "coveredAmount" DECIMAL(12,2) NOT NULL,
    "patientAmount" DECIMAL(12,2) NOT NULL,
    "approvedAmount" DECIMAL(12,2),
    "rejectionNote" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurance_claim_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hmo_providers_organizationId_isActive_idx" ON "hmo_providers"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "hmo_providers_code_organizationId_key" ON "hmo_providers"("code", "organizationId");

-- CreateIndex
CREATE INDEX "hmo_plans_organizationId_isActive_idx" ON "hmo_plans"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "hmo_plans_providerId_code_key" ON "hmo_plans"("providerId", "code");

-- CreateIndex
CREATE INDEX "hmo_contracts_organizationId_status_idx" ON "hmo_contracts"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hmo_contracts_contractNumber_organizationId_key" ON "hmo_contracts"("contractNumber", "organizationId");

-- CreateIndex
CREATE INDEX "hmo_enrolments_organizationId_status_idx" ON "hmo_enrolments"("organizationId", "status");

-- CreateIndex
CREATE INDEX "hmo_enrolments_patientId_idx" ON "hmo_enrolments"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "hmo_enrolments_providerId_memberNumber_key" ON "hmo_enrolments"("providerId", "memberNumber");

-- CreateIndex
CREATE INDEX "insurance_claim_lines_claimId_idx" ON "insurance_claim_lines"("claimId");

-- AddForeignKey
ALTER TABLE "hmo_providers" ADD CONSTRAINT "hmo_providers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hmo_plans" ADD CONSTRAINT "hmo_plans_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "hmo_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hmo_plans" ADD CONSTRAINT "hmo_plans_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hmo_contracts" ADD CONSTRAINT "hmo_contracts_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "hmo_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hmo_contracts" ADD CONSTRAINT "hmo_contracts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hmo_enrolments" ADD CONSTRAINT "hmo_enrolments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hmo_enrolments" ADD CONSTRAINT "hmo_enrolments_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "hmo_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hmo_enrolments" ADD CONSTRAINT "hmo_enrolments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "hmo_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hmo_enrolments" ADD CONSTRAINT "hmo_enrolments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_lines" ADD CONSTRAINT "insurance_claim_lines_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "insurance_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_lines" ADD CONSTRAINT "insurance_claim_lines_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claim_lines" ADD CONSTRAINT "insurance_claim_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "hmo_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_enrolmentId_fkey" FOREIGN KEY ("enrolmentId") REFERENCES "hmo_enrolments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_claims" ADD CONSTRAINT "insurance_claims_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
