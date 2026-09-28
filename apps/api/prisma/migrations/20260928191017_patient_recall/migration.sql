-- CreateEnum
CREATE TYPE "RecallSource" AS ENUM ('DISCHARGE', 'WARD_ROUND', 'MANUAL', 'PROTOCOL');

-- CreateEnum
CREATE TYPE "RecallStatus" AS ENUM ('DUE', 'BOOKED', 'ATTENDED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutreachChannel" AS ENUM ('PHONE', 'SMS', 'EMAIL', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "OutreachOutcome" AS ENUM ('REACHED', 'NO_ANSWER', 'WRONG_NUMBER', 'DECLINED', 'RESCHEDULED');

-- CreateTable
CREATE TABLE "patient_recalls" (
    "id" TEXT NOT NULL,
    "recallNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "instructions" TEXT,
    "dueOn" TIMESTAMP(3) NOT NULL,
    "source" "RecallSource" NOT NULL DEFAULT 'MANUAL',
    "sourceRef" TEXT,
    "status" "RecallStatus" NOT NULL DEFAULT 'DUE',
    "appointmentId" TEXT,
    "assignedToId" TEXT,
    "attendedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closeReason" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_recalls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_attempts" (
    "id" TEXT NOT NULL,
    "recallId" TEXT NOT NULL,
    "channel" "OutreachChannel" NOT NULL,
    "outcome" "OutreachOutcome" NOT NULL,
    "note" TEXT,
    "contactedById" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_recalls_appointmentId_key" ON "patient_recalls"("appointmentId");

-- CreateIndex
CREATE INDEX "patient_recalls_organizationId_status_idx" ON "patient_recalls"("organizationId", "status");

-- CreateIndex
CREATE INDEX "patient_recalls_organizationId_dueOn_idx" ON "patient_recalls"("organizationId", "dueOn");

-- CreateIndex
CREATE INDEX "patient_recalls_patientId_idx" ON "patient_recalls"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_recalls_recallNumber_organizationId_key" ON "patient_recalls"("recallNumber", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_recalls_source_sourceRef_key" ON "patient_recalls"("source", "sourceRef");

-- CreateIndex
CREATE INDEX "outreach_attempts_recallId_idx" ON "outreach_attempts"("recallId");

-- AddForeignKey
ALTER TABLE "patient_recalls" ADD CONSTRAINT "patient_recalls_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_recalls" ADD CONSTRAINT "patient_recalls_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_recalls" ADD CONSTRAINT "patient_recalls_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_recalls" ADD CONSTRAINT "patient_recalls_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_attempts" ADD CONSTRAINT "outreach_attempts_recallId_fkey" FOREIGN KEY ("recallId") REFERENCES "patient_recalls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_attempts" ADD CONSTRAINT "outreach_attempts_contactedById_fkey" FOREIGN KEY ("contactedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_attempts" ADD CONSTRAINT "outreach_attempts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
