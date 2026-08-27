# popia-guard-api

NestJS + TypeORM backend for **POPIAGuard** — a POPIA (Protection of Personal Information Act)
compliance tracker for South African businesses and the consultancies that manage compliance for
multiple clients. Same architecture as its sibling project `compliance-pro-api`: real multi-tenant
auth, tenant isolation enforced server-side, file uploads, password reset, team invites, and a
swappable local-disk/S3 storage layer.

## What it tracks

- **Operators** (`operators/`) — third parties who process personal information on your behalf
  (POPIA's own term, s1) — payroll providers, cloud hosts, debt collectors, etc. — each with their
  written s21 agreement(s), including the actual signed file.
- **Processing Activities** (`processing-activities/`) — your Record of Processing Activities
  (ROPA): what personal information you collect, why, on what legal basis (POPIA s11), and for how
  long — the artefact the Information Regulator can request at any time.
- **Assessments** (`assessments/`) — internal POPIA self-audits against a checklist; a failed item
  automatically raises an open Finding.
- **Breaches** (`breaches/`) — the data-breach log (POPIA s22), tracking whether the Information
  Regulator and affected data subjects have been notified — separately from whether the breach
  itself has been contained, since a missed notification is its own compliance failure.
- **Dashboard** (`dashboard/`) — aggregates all of the above into stats + a ranked "needs
  attention" feed.
- **Alerts** (`alerts/`) — a daily email digest of operator agreements and ROPA reviews that are
  overdue or due soon.

## Local setup

```bash
npm install
cp .env.example .env        # set a real JWT_SECRET — see the file's own instructions
npm run migration:run       # applies InitialSchema — creates every table
npm run seed                # loads the demo tenant + 5 operators / 6 processing activities /
                             # 1 assessment / 2 breaches
npm run start:dev           # http://localhost:4011
```

**Demo login:** `demo@popiaguard.co.za` / `POPIAGuard2026!` (tenant: "Sizwe Data Protection Consultants")

Or with Docker — `docker compose up` starts Postgres + this API + `../popia-guard` together.

## Multi-tenancy

Identical mechanism to compliance-pro-api: every top-level entity carries an `organizationId`
column, every service method takes `organizationId` as an explicit parameter sourced only from the
JWT (via `@CurrentUser()`), never from client-supplied input. Child records (OperatorAgreement,
checklist items/findings on Assessment) are scoped by first confirming their parent belongs to the
caller's org.

## Security

Same hardening as compliance-pro-api: helmet, CORS locked to `FRONTEND_URL`, global
`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`, `@nestjs/throttler`
(60 req/min global, 10 req/min on auth endpoints), bcrypt (12 rounds), migration-managed schema,
JWT verified independently on every request (a forged/expired cookie on the frontend gets you
redirected to `/login`, never real data).

## Known gaps (being direct about it)

- No automated CI — tests exist (`npm test`) but aren't wired into a pipeline yet.
- No file upload for policy documents (Privacy Policy, PAIA Manual) yet — only operator agreements
  have file attachments right now.
- No billing/payments integration — by design; first customers get closed and invoiced manually.
- No deployment/hosting done — local-only so far.
