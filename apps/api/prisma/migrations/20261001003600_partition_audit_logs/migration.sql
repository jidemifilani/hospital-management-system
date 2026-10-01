-- Audit rows are kept for seven years and nothing was ever going to remove
-- them. Four days of light use in development produced 3,389 rows, around five
-- per chart opened; a working hospital generates orders of magnitude more, so
-- the seven-year table runs to tens of gigabytes in one heap.
--
-- The cost of that is not really the size, it is the pruning. Deleting the
-- oldest year from a single table of that size means a DELETE touching tens of
-- millions of rows, holding locks, bloating indexes and needing a VACUUM FULL
-- afterwards — on the one table that must not be unavailable, because every
-- write in the system records to it. Monthly range partitions turn that job
-- into DROP TABLE on one partition: instant, and it reclaims the space.
--
-- Postgres requires the partition key to be part of any primary key, so the key
-- becomes ("id", "createdAt"). Nothing looks an audit row up by id alone — the
-- only operations are create, findMany and count — so the schema carries the
-- same composite key and stays in step with the database.

CREATE TABLE "audit_logs_partitioned" (
  LIKE "audit_logs" INCLUDING DEFAULTS
) PARTITION BY RANGE ("createdAt");

-- A default partition means an audit write can never fail for want of a
-- partition. Without it, a row dated outside every range is rejected, and the
-- interceptor that writes it deliberately swallows its own errors — so the
-- first symptom would be an audit trail that had quietly stopped recording.
-- The maintenance job keeps months ahead of time and warns if anything lands
-- here, because rows sitting in the default block that month's partition from
-- being created later.
CREATE TABLE "audit_logs_default" PARTITION OF "audit_logs_partitioned" DEFAULT;

-- One partition per month, from the oldest row that exists through three
-- months ahead, so a deployment that never runs the maintenance job still has
-- somewhere to put the next quarter's rows.
DO $$
DECLARE
  month_start date;
  last_month date;
BEGIN
  SELECT coalesce(date_trunc('month', min("createdAt"))::date,
                  date_trunc('month', now())::date)
    INTO month_start
    FROM "audit_logs";

  last_month := (date_trunc('month', now()) + interval '3 months')::date;

  WHILE month_start <= last_month LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF "audit_logs_partitioned" FOR VALUES FROM (%L) TO (%L)',
      'audit_logs_' || to_char(month_start, 'YYYY_MM'),
      month_start,
      (month_start + interval '1 month')::date
    );
    month_start := (month_start + interval '1 month')::date;
  END LOOP;
END $$;

INSERT INTO "audit_logs_partitioned" SELECT * FROM "audit_logs";

-- Dropping the old table frees the index and constraint names so the
-- partitioned one can take them, which keeps the database describable by the
-- same schema afterwards. Nothing references audit_logs by foreign key, so
-- there is nothing else to re-point.
DROP TABLE "audit_logs";

ALTER TABLE "audit_logs_partitioned" RENAME TO "audit_logs";

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id", "createdAt");

CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId")
  REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId")
  REFERENCES "organizations"("id") ON UPDATE CASCADE ON DELETE SET NULL;
