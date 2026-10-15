-- Odoo gap #2: payroll tax (PAYE, pension, NHF) + salary grades

-- Add NHF_DEDUCTION to PayComponentType enum
ALTER TYPE "PayComponentType" ADD VALUE IF NOT EXISTS 'NHF_DEDUCTION';

-- Add statutory deduction columns to payrolls
ALTER TABLE payrolls
  ADD COLUMN IF NOT EXISTS "payeTax"         DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pensionEmployee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pensionEmployer" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nhf"             DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Salary grades table
CREATE TABLE IF NOT EXISTS salary_grades (
  id                   TEXT         NOT NULL PRIMARY KEY,
  "organizationId"     TEXT         NOT NULL,
  name                 TEXT         NOT NULL,
  "basicSalary"        DECIMAL(12,2) NOT NULL DEFAULT 0,
  "housingAllowance"   DECIMAL(12,2) NOT NULL DEFAULT 0,
  "transportAllowance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "medicalAllowance"   DECIMAL(12,2) NOT NULL DEFAULT 0,
  "otherAllowances"    DECIMAL(12,2) NOT NULL DEFAULT 0,
  "isActive"           BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_salary_grade_org FOREIGN KEY ("organizationId") REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS salary_grades_org_idx ON salary_grades ("organizationId");
