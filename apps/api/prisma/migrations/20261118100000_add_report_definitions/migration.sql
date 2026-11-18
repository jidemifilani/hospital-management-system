-- CreateTable
CREATE TABLE "report_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "dimensions" JSONB NOT NULL,
    "measures" JSONB NOT NULL,
    "filters" JSONB NOT NULL,
    "sort" JSONB,
    "limit" INTEGER,
    "createdById" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_definitions_organizationId_idx" ON "report_definitions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "report_definitions_name_organizationId_key" ON "report_definitions"("name", "organizationId");

-- AddForeignKey
ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_definitions" ADD CONSTRAINT "report_definitions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

