# Backup and restore

A backup nobody has restored is a file, not a backup. The restore here is
checked on every push in CI, and the same check can be run against your own
backups on a schedule.

## Taking one

```
npm run backup
```

Writes `caresync-<timestamp>.dump.enc` into `BACKUP_DIR`, alongside a small
encrypted `caresync-<timestamp>.manifest.enc` recording what the database held
at that moment — see [checking that a restore works](#checking-that-a-restore-works).
Then it deletes backups older than `BACKUP_RETENTION_DAYS`, each with its
manifest. The newest is never deleted whatever the retention is set to, so a
misconfigured `0` cannot leave you with nothing.

The dump is written to a `.partial` name and renamed only once it completes, so
a backup interrupted half way cannot be mistaken for a whole one by the restore
or by the retention sweep.

### Why it is encrypted

Column encryption does not make a dump safe. Names, MRNs, phone numbers and
every appointment are in it in the clear, because those columns have to stay
searchable — see [encryption-at-rest.md](encryption-at-rest.md). So the dump is
encrypted with AES-256-GCM as it streams, before it reaches disk.

`BACKUP_ENCRYPTION_KEY` is deliberately **not** the same key as
`FIELD_ENCRYPTION_KEY`:

- whoever restores a backup does not thereby get the key to the live patient
  columns, and
- rotating one does not force rotating the other.

Both are 64 hex characters, from `openssl rand -hex 32`.

**Store the keys somewhere other than the backups.** A backup and its key in
the same place is a single theft. A key lost along with the database it
protects makes every copy unreadable.

## Restoring

```
node scripts/restore.js backups/caresync-20260930T170858Z.dump.enc --to "postgres://..."
```

`--to` defaults to `DATABASE_URL`. Restoring over a database that already has
tables **requires `--force`**, because the restore drops and recreates what it
touches and there is no undo. CI checks that this refusal actually happens
rather than trusting that it does.

## Checking that a restore works

```
npm run backup:verify          # the newest backup
npm run backup:verify -- --fresh   # take one first, then verify that
```

It restores into a throwaway database beside the real one and checks the result
against **what the backup recorded when it was taken**, not against the live
database. Each backup is written with a small encrypted manifest beside it
(`caresync-<timestamp>.manifest.enc`) holding the table count and row counts for
patients, users, invoices, audit logs and the migration history.

Comparing against the live database instead would be wrong, and quietly so: a
hospital that admits one patient between the backup and the check would see the
check fail, every time, for no reason. An alarm that is always ringing is one
nobody looks at.

Row counts must be **at least** what was recorded. Fewer means the dump or the
restore lost rows, which is a real failure. More is expected and reported as
such — the counts are taken just before `pg_dump` starts, so a write landing in
that instant appears in the dump's snapshot but not in the manifest. The
asymmetry is deliberate: it means "fewer rows than recorded" can be treated as
data loss without ever crying wolf over ordinary traffic.

Then the check that is easiest to forget: an encrypted column in the restored
copy **still decrypts with the current `FIELD_ENCRYPTION_KEY`**. That is the
difference between a restore that worked and one that merely completed. A dump
restored without a working field key gives back rows nobody can read, and it
looks like a success right up until someone opens a chart.

A backup with no manifest beside it — one taken before manifests existed, or
one whose manifest was lost — is still checked, but only for structure: the
schema came back and the core tables are not empty. It says so when it does
that, rather than implying it proved more than it did.

The throwaway database is dropped afterwards, including when the check fails.
Exit status is non-zero on any mismatch, so this belongs on a schedule where
something will notice.

## Running it on a machine with no postgres tools

A developer on Windows has the database in a container and nothing on `PATH`.
Set:

```
PG_DOCKER_CONTAINER="caresync-postgres"
```

and `pg_dump`, `pg_restore` and `psql` are run inside that container instead.
The host and port from `DATABASE_URL` describe how to reach postgres from
outside, so when the tools run inside the container they are rewritten to its
own `127.0.0.1:5432`.

Leave it empty on a server or a CI runner, which have the binaries.

## Scheduling

Not configured by this repo, because it belongs to the host.

- **Linux** — a cron entry or a systemd timer running `npm run backup`, and a
  weekly `npm run backup:verify`.
- **Windows Server** — two Task Scheduler tasks doing the same.
- **Managed Postgres** — use the provider's snapshots *as well*. They protect
  against losing the server; these protect against losing the provider, and
  they are the ones you can restore onto a laptop to check.

Whatever runs it needs its failure to reach a person. A backup job that has
been failing silently for a month is the usual way this goes wrong.

## What is not covered

- **Uploaded documents** under `FILE_STORAGE_ROOT` — scans, letters, consent
  forms — are on disk, not in the database, and are not in this dump. They need
  their own copy.
- **Redis** holds sessions and cached values, all rebuildable, so it is not
  backed up.
- **The keys themselves.** Back them up separately, somewhere the database
  backup is not.
