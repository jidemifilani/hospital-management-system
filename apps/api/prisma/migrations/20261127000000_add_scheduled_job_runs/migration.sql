-- CreateTable
CREATE TABLE "scheduled_job_runs" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "scheduled_job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_job_runs_jobName_startedAt_idx" ON "scheduled_job_runs"("jobName", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_job_runs_jobName_periodKey_key" ON "scheduled_job_runs"("jobName", "periodKey");

