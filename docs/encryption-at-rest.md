# Encryption at rest

Patient records are protected at rest by two separate things. Only one of them
lives in this repository, and a deployment that has just the one is not
finished.

| Layer | Protects against | Where it is configured |
| --- | --- | --- |
| Column encryption | A leaked dump, a copied backup file, a read replica, anyone with a database login | This repo, `FIELD_ENCRYPTION_KEY` |
| Volume encryption | A stolen disk or a decommissioned server | The host, outside this repo |

## What the application encrypts

Encrypted with AES-256-GCM, a fresh 12-byte IV per value, written as
`enc:1:<base64>`:

- **`patients`** — `ninNumber`, `nhisNumber`, `hmoNumber`, `address`,
  `allergies`, `emergencyContactName`, `emergencyContactPhone`,
  `emergencyContactRelation`
- **`clinical_notes`** — `subjective`, `objective`, `assessment`, `plan`,
  `content`

GCM authenticates as well as encrypts, so a value altered in the database fails
to decrypt rather than returning something that looks like a real answer.

The list lives in `apps/api/src/common/crypto/encrypted-fields.ts`. Encryption
is applied in Prisma middleware, not in the services that own each table, so a
row reached through `include` from some other module is encrypted and decrypted
the same way as one read directly. There is no route that writes these columns
in the clear.

## The audit trail

Every change is audited with the request body that caused it, which meant a
patient registered through the API wrote their NIN, address, allergies and next
of kin into `audit_logs` in the clear — the same values the `patients` table
encrypts, in a table kept for seven years. Encrypting one while leaving the
other would have protected very little.

The interceptor now replaces those values with `[encrypted]` before the entry
is written. The field name is kept, so the trail still shows which fields a
change touched and who made it; the value itself lives in `patients`,
encrypted, which is the only place it needs to be.

Entries written before this need the backfill below, which scrubs them in
place.

## What it does not encrypt, and why

`firstName`, `lastName`, `mrn`, `phone` and `email` stay readable in the
database.

Patient search matches all five with `contains`, and phone is matched exactly
to catch duplicate registrations. Ciphertext supports neither: two encryptions
of the same number differ, so equality fails, and a substring test against
base64 is meaningless. Encrypting them would leave the search box silently
returning nothing.

If one of these ever has to be protected, it needs a **blind index** — an HMAC
of the normalised value in its own indexed column, matched exactly — not this
mechanism. Substring search cannot be preserved at all.

Because these columns are readable to anyone holding the database, column
encryption alone does not make a stolen dump harmless: it still identifies
patients by name and phone number. That is the gap volume encryption closes.

## Volume encryption

This is host configuration and cannot be done from the repository. It has to be
set up once per environment:

- **Managed Postgres** (RDS, Cloud SQL, Azure Database) — enable storage
  encryption when the instance is created. It cannot be turned on afterwards;
  the instance has to be replaced.
- **Postgres in Docker on your own server** — put the data directory on an
  encrypted filesystem (LUKS on Linux, BitLocker on Windows Server) and mount it
  before the container starts.
- **Backups** — encrypt them separately. A backup written from an encrypted
  volume is plaintext once it leaves that volume.

## The key

`FIELD_ENCRYPTION_KEY` is 32 bytes as 64 hex characters:

```
openssl rand -hex 32
```

The API validates it at startup and refuses to boot if it is missing or
malformed, so a misconfigured deployment fails immediately instead of coming up
and writing plaintext.

**Keep it somewhere other than the database backup.** Restoring a backup
without the key gives you rows nothing can read. It belongs in a secret manager,
not in the same store as the data it protects.

## Rotating the key

The stored format carries a version (`enc:1:`), which is what makes rotation
possible without a flag day. Decrypt each value with the old key and write it
back with the new one, then retire the old key. Reads tolerate a column holding
both forms at once, so this can run against a live system.

## Encrypting rows written before this existed

```
cd apps/api
npx ts-node prisma/encrypt-backfill.ts
```

It does two things: encrypts the listed columns, and scrubs plaintext copies of
them out of `audit_logs`. It reads raw, skips anything already done, and can be
run repeatedly and while the API is serving. Rows it has not reached yet still
read correctly, because decryption passes through any value without the `enc:`
prefix — so this is not a flag day with the database offline.

Run it after seeding a new environment as well.

## Adding a field to the list

1. Confirm nothing filters, sorts or groups on it. If something does, stop —
   you need a blind index instead.
2. Add it to `ENCRYPTED_FIELDS`.
3. Run the backfill.

Step 1 is enforced at runtime: a query with an encrypted column in `where`,
`orderBy`, `cursor`, `distinct` or `by` throws `EncryptedFieldQueryError`
naming the field. That is deliberate. Such a query is otherwise accepted and
comes back empty, which reads as "no such patient" rather than "you cannot ask
that", and the mistake only surfaces much later as a record that appears not to
exist.

## The one way to bypass it

Encryption is installed on `PrismaService`. A script that constructs its own
`new PrismaClient()` — as `prisma/seed.ts` does — does not go through it and
will write plaintext.

Nothing does that today: the seed touches neither `patients` nor
`clinical_notes`, and the backfill reads and writes raw on purpose. If you add a
script that writes either table directly, either route it through
`PrismaService` or run the backfill afterwards.
