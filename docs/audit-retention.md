# Audit retention

Every change in the system is recorded in `audit_logs`, and those records are
held for seven years. The table is partitioned by month so that holding them
for seven years remains possible.

## Why it is partitioned

Four days of light use in development produced 3,389 rows, roughly five per
chart opened. A working hospital generates orders of magnitude more, so a
seven-year trail runs to tens of millions of rows and tens of gigabytes.

The size is not really the problem. The problem is removing the oldest year once
it is no longer needed. From a single table that means a `DELETE` across tens of
millions of rows: hours of work, locks on the one table every write in the
system touches, bloated indexes afterwards, and a `VACUUM FULL` to get the disk
back.

With monthly partitions, retiring a month is `DROP TABLE` on one partition. It
is instant, takes no locks on the rest, and returns the space immediately.

Queries benefit too. Anything filtered by date reads only the months it needs —
the Audit Trail screen, which is always looking at a date range, stops caring
how much history exists.

## How it is laid out

- One partition per month, named `audit_logs_YYYY_MM`.
- A catch-all `audit_logs_default`.
- Primary key `(id, createdAt)`. Postgres requires the partition key to be part
  of the primary key. Nothing looks an audit row up by id alone — create,
  findMany and count are the only operations — so the Prisma schema carries the
  same composite key and stays in step with the database.

### The default partition matters more than it looks

It is the one partition whose absence loses data. Without it, a row dated
outside every existing month is **rejected**, and the interceptor that writes
audit rows deliberately swallows its own errors so that auditing can never break
a clinical action. The trail would simply stop recording, with nothing anywhere
to say so.

So its existence is checked on every maintenance run rather than assumed from
the migration. That is not theoretical: it was found missing once during
development, dropped by a retention sweep that had lost the rule about leaving
non-dated partitions alone.

Rows **in** the default partition are a different problem. They mean a month
went by without a partition of its own, and while they sit there that month's
partition cannot be created. The maintenance run reports the count and leaves
them alone — where a medical record belongs is not a decision for a cron job at
2am. Moving them is a manual job: create the month's partition after relocating
the rows.

## Maintenance

The API does this itself:

- at startup, so a deployment coming up on the first of a month — or one
  restored from a months-old backup — has its partitions before it serves the
  first request;
- on the first of each month at 02:00.

It creates the current month plus `AUDIT_PARTITION_MONTHS_AHEAD` (default 3),
and drops partitions lying entirely outside the retention window.

A failure here never stops the API booting. Writes still land in the default
partition, so a broken sweep is something to fix, not a reason to refuse to
serve the hospital.

### By hand

```
cd apps/api
npm run audit:partitions              # show what exists, and what has aged out
npm run audit:partitions -- --maintain # create the months ahead, drop what has aged out
```

## Retention is guarded against typos

`AUDIT_RETENTION_YEARS` defaults to 7.

Setting it **lower** drops nothing at all. The API logs an error and refuses,
because this deletes records the hospital is required to hold and a mistyped
environment variable should not be able to do that. Values that are not positive
numbers are refused the same way.

If a shorter period is genuinely correct for your jurisdiction, say so
explicitly:

```
AUDIT_RETENTION_YEARS=5
AUDIT_RETENTION_BELOW_STATUTORY="yes-i-have-checked-the-law"
```

A partition is only eligible once its **upper** bound has passed the cutoff, so
the month in which records start falling out of retention is kept until every
row in it has.

## What is in an audit row

Not the patient data itself. The request body that caused a change is recorded
as metadata, but the fields the database encrypts are replaced with
`[encrypted]` before the row is written — the field name is kept so the trail
still shows what a change touched, without this table becoming a second,
unprotected copy of the record. See
[encryption-at-rest.md](encryption-at-rest.md).

## Backups

Partitioning does not change backups: `pg_dump` handles a partitioned table like
any other, and the restore check counts rows through the parent. See
[backup-and-restore.md](backup-and-restore.md).
