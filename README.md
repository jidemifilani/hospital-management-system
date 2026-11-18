# CareSync HMS

Full-stack Hospital Management System built with Next.js 14, NestJS, PostgreSQL, and Redis.

---

## Project Structure

```
hospital-website-and-management/
├── apps/
│   ├── api/          # NestJS REST API  (port 4000)
│   └── web/          # Next.js 14 staff console + patient portal  (port 3000)
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── utils/        # Shared utility functions
│   └── config/       # Shared constants (permissions, HMS_CONFIG)
├── docker-compose.yml
└── .env.example
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20 LTS |
| npm | 10+ |
| Docker + Docker Compose | v2+ |
| PostgreSQL | 16 (via Docker) |
| Redis | 7 (via Docker) |

---

## Quick Start (Local Development)

### 1. Clone & install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
- `JWT_ACCESS_SECRET` — random 64-char string
- `JWT_REFRESH_SECRET` — different random 64-char string
- `NEXTAUTH_SECRET` — random 32-char string

### 3. Start infrastructure (Postgres + Redis)

```bash
docker compose up postgres redis -d
```

### 4. Run database migrations and seed

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed
```

Default accounts after seed:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@caresync.ng | Admin@123456 |
| Doctor | dr.adeyemi@caresync.ng | Doctor@123456 |

### 5. Start development servers

```bash
# From repo root — starts both api and web with hot reload
npm run dev
```

- Web console: http://localhost:3000
- API: http://localhost:4000

---

## Running with Docker (All Services)

```bash
docker compose up --build
```

Three keys have no defaults, because a shared default key is the same as no
key at all. Generate them before the first run and put them in `.env`:

```bash
openssl rand -hex 32     # FIELD_ENCRYPTION_KEY
openssl rand -hex 32     # BACKUP_ENCRYPTION_KEY  (a different one)
openssl rand -base64 32  # NEXTAUTH_SECRET
```

The stack brings up `migrate` first, which runs `prisma migrate deploy` and
exits; the API waits for it to finish, so a deploy can never start against a
schema it does not match. `backup` takes an encrypted dump once a day at
`BACKUP_HOUR`, into the `backup_data` volume. Uploaded documents live in
`documents_data` — in production those are patient records, and without the
volume a redeploy would destroy them.

---

## Deploying to a Server

Everything above, plus four things that are specific to a real deployment.

**Set the public URLs before building, not after.** `NEXT_PUBLIC_API_URL` is
compiled into the browser bundle by `next build`, so supplying it only to the
running container leaves every browser calling whatever was baked in. The
build fails rather than produce that bundle. In `.env`:

```
NEXT_PUBLIC_API_URL=https://hms.example.ng
NEXTAUTH_URL=https://hms.example.ng
WEB_URL=https://hms.example.ng
CORS_ORIGINS=https://hms.example.ng
```

**Terminate TLS.** `DOMAIN=hms.example.ng docker compose --profile tls up -d`
adds Caddy on 80/443, which obtains and renews the certificate itself. It
routes `/api/v1/*` to the API and everything else to the web app — `/api/auth/*`
belongs to the web app, since that is next-auth.

**Do not seed.** The seed creates accounts whose passwords are in this README;
it refuses to run when `NODE_ENV=production` for that reason. Create the real
organisation, staff and price list instead, and if you do want demo data on a
live deployment, say so explicitly with
`SEED_PRODUCTION="yes-this-is-demo-data"`.

**Keep the keys somewhere other than the server.** Losing
`FIELD_ENCRYPTION_KEY` loses every encrypted patient column, including in the
backups; a backup stored with its own key is one theft rather than two.

---

## API Endpoints Summary

All endpoints are prefixed with `/api/v1` in production. Development runs without a prefix.

| Module | Base Path | Key Operations |
|--------|-----------|---------------|
| Auth | `POST /auth/login` | Login, refresh, logout, MFA setup/enable |
| Dashboard | `GET /dashboard/stats` | KPI stats, recent patients, today's appointments, bed occupancy |
| Patients | `/patients` | CRUD, search by name/MRN/phone, duplicate detection |
| Appointments | `/appointments` | Create with clash detection, status updates, today's list |
| Staff | `/staff` | List, doctor directory, status toggle |
| Departments | `/departments` | CRUD + staff/bed counts |
| Users | `/users` | Account management, password reset |
| Audit | `GET /audit` | Append-only audit log viewer (Auditor role only) |

---

## Environment Variables

See `.env.example` for the full list. Key variables:

```
DATABASE_URL=postgresql://caresync:caresync_secret@localhost:5432/caresync
REDIS_URL=redis://:redis_secret@localhost:6379

JWT_ACCESS_SECRET=<64-char random>
JWT_REFRESH_SECRET=<64-char random>
JWT_ACCESS_EXPIRES_IN=15m

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<32-char random>
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Phase 2 Roadmap

- EMR / Encounter notes (SOAP format, e-prescriptions)
- Laboratory module (test orders, results, HL7 analyser integration)
- Radiology module (DICOM viewer via OHIF + Orthanc PACS)
- Billing & Insurance (Paystack/Flutterwave, NHIS/HMO claims)
- Pharmacy & Inventory (FEFO dispensing, narcotics register)
- Telemedicine (LiveKit WebRTC, in-call notes)
- HR & Rostering (shift planning, leave management)
- SMS/Email notifications (Termii + Postmark)
- Patient Portal (self-service booking, results, bill payment)
- Analytics & Reporting dashboard

---

## Security Notes

- All PHI is soft-deleted (never hard-deleted)
- Audit log is append-only (no update/delete routes)
- JWT access tokens expire in 15 minutes; refresh tokens in 7 days
- MFA (TOTP) is available for all staff accounts
- Role-based + permission-based access control on every endpoint
- Passwords hashed with bcrypt (12 rounds)
- Organization isolation on all queries (multi-branch ready)
