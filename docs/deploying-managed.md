# Deploying to managed services

For whoever puts this live. The alternative — one server running
`docker compose` — is in the README; this is the split-vendor route.

| Piece | Where | Why there |
|---|---|---|
| Web app | Vercel | It is a Next.js app; this is the one obvious fit. |
| API | Render (Docker, always-on) | The scheduled jobs need a long-running process. Functions cannot host it. |
| Postgres | Neon | Branching and point-in-time restore. |
| Redis | Upstash | Rate-limit counters and the job queue. |
| Documents | Cloudflare R2 or AWS S3 | A container filesystem does not survive a deploy. |
| Nightly dump | Render cron → the same bucket | The sidecar in `docker-compose.yml` has nowhere to run here. |

`render.yaml` describes the API and the backup job. Everything marked
`sync: false` there is set in the Render dashboard and never in the repository,
which is public.

---

## Before anything else: three keys

Generate them once, and put them in a password manager **before** pasting them
into a dashboard. Losing `FIELD_ENCRYPTION_KEY` makes every encrypted patient
column unreadable, in the backups as well as in the database.

```bash
openssl rand -hex 32      # FIELD_ENCRYPTION_KEY
openssl rand -hex 32      # BACKUP_ENCRYPTION_KEY  (a different one)
openssl rand -base64 32   # NEXTAUTH_SECRET
openssl rand -hex 32      # JWT_ACCESS_SECRET
```

`BACKUP_ENCRYPTION_KEY` is deliberately not the field key: restoring a backup
should not require handing over the key to the live patient columns.

---

## 1. Neon

Create the project, then copy **both** connection strings from the dashboard:

```
DATABASE_URL   …-pooler.…neon.tech/caresync   ← pooled, for the API
DIRECT_URL     …            .neon.tech/caresync   ← direct, for migrations
```

Both are required and they are not interchangeable. The pooled endpoint runs
pgbouncer in transaction mode, which keeps no session state, and
`prisma migrate deploy` needs an advisory lock — pointed at the pooler it
hangs or fails part-way through a deploy. The datasource in `schema.prisma`
already declares `directUrl`, so the only job here is to set both.

Neon's history retention is the first line of defence for the data. Set it to
the longest your plan allows.

## 2. Upstash

Create a Redis database and copy the `rediss://` URL into `REDIS_URL`. TLS is
handled automatically — ioredis reads the scheme.

If Redis is ever unreachable the API keeps serving: rate-limit counters fall
back to per-instance memory and log once every 30 seconds. **That log line is
worth an alert**, because while it is appearing the login limit is weaker than
it looks.

## 3. The document bucket

Create a **private** bucket. Downloads are streamed back through the API so
every one is permission-checked and audited; a public bucket hands out patient
documents to anyone holding a URL.

```
STORAGE_DRIVER=s3
AWS_S3_BUCKET=caresync-documents
AWS_REGION=auto                     # R2 uses "auto"
AWS_ACCESS_KEY_ID=…
AWS_SECRET_ACCESS_KEY=…
AWS_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com   # empty for AWS
```

`STORAGE_DRIVER=s3` with any of these missing **refuses to start**. That is on
purpose: falling back to local disk on a host that replaces its filesystem
would lose every document, and nothing would say so until someone went looking
for a discharge summary.

## 4. Render — the API

Point Render at the repository and let it read `render.yaml`, then fill in the
`sync: false` values. Two to get right:

- `WEB_URL` — the public address of the web app. Left wrong, Paystack returns a
  patient to `localhost` after they have paid.
- `CORS_ORIGINS` — the same address. Left wrong, the browser is refused by the
  API and the console fills with CORS errors that look like an outage.

The service binds whatever port Render injects as `PORT`. Health checks hit
`/api/v1/health`, which reports database latency as well as liveness.

Migrations run in `preDeployCommand`, before the new version takes traffic, and
a failing migration stops the deploy rather than leaving a half-migrated
database serving requests.

## 5. Vercel — the web app

Root directory `apps/web`. Set, **as build-time environment variables**:

```
NEXT_PUBLIC_API_URL=https://caresync-api.onrender.com   (or your API domain)
NEXTAUTH_URL=https://hms.example.ng
NEXTAUTH_SECRET=…
```

`NEXT_PUBLIC_API_URL` is compiled into the browser bundle, not read when the
server starts. Supplying it only at runtime leaves every browser calling
whatever was baked in. `next.config.mjs` refuses a production build without
it, so this fails loudly rather than shipping an app that works nowhere but
the build machine.

Changing it later means **rebuilding**, not restarting.

## 6. DNS and the order of it

Point the web domain at Vercel and, if you want one, the API domain at Render.
Then go back and correct `WEB_URL`, `CORS_ORIGINS`, `NEXTAUTH_URL` and
`NEXT_PUBLIC_API_URL` to the real names, and **redeploy the web app** so the
new API address is compiled in.

## 7. First-run data

Do **not** seed. The seed creates accounts whose passwords are in the README,
and it refuses to run when `NODE_ENV=production` for that reason. Create the
real organisation, staff, service price list and payer contracts through the
admin screens.

---

## Verifying it

In this order, because each one tells you something different:

1. `GET /api/v1/health` returns `status: ok` with a database latency.
2. Sign in on the web app. A failure here with a 401 and no error usually
   means `NEXTAUTH_URL` does not match the address in the browser.
3. Upload a document, then **redeploy the API and download it again**. This is
   the one test that proves `STORAGE_DRIVER=s3` is really in effect; with local
   disk it will have vanished.
4. Take a payment with a Paystack test key and confirm the callback lands back
   on your own domain.
5. Trigger a scheduled report and confirm it arrives.
6. Run the backup job by hand from the Render dashboard. Check the object
   appears in the bucket, and that the job **fails** if the bucket name is
   wrong — a backup that reports success while uploading nothing is worse than
   no backup.
7. Restore that dump into a scratch Neon branch with `npm run backup:verify`.
   A backup nobody has restored is a file, not a backup.

## Things worth knowing

**Scheduled jobs are safe to run on more than one instance.** Every `@Cron`
claims its period in `scheduled_job_runs` before doing anything, and the
unique constraint means the second instance skips. This matters on a managed
host even at one instance, because a zero-downtime deploy runs the old and new
copies together for about a minute — long enough for a 07:00 digest to go out
twice. `render.yaml` still pins one instance, for Postgres connection limits
rather than correctness.

**Retention of the remote backups is a bucket lifecycle rule**, not something
this code does. Deleting old backups is exactly the permission a compromised
backup job should not hold.

**The `backup`, `proxy` and `migrate` services in `docker-compose.yml` are not
used on this route.** Compose stays as it is for the single-server option and
for local work.
