# AGENTS.md — BataraSec Portal

## Project Context

BataraSec Portal is a separate repository from the main BataraSec platform. It is an internal tool for BataraSec operators to manage customer licenses and host the Central Knowledge Base (KB) API.

Repository: `github.com/novanovn/batarasec-portal`

Roadmap position:
- Phase 1 — Portal license management + KB endpoints — current repo and current phase
- Phase 2 — KB local cache in the main BataraSec platform
- Phase 3 — Central KB integration between platform and portal
- Phase 4 — CVE crawler in portal worker
- Phase 5 — Risk Score with EPSS + CISA KEV

This repo is not the main BataraSec platform monorepo. Do not copy platform architecture by default; follow this portal architecture unless the user explicitly changes it.

## Target Stack

- Runtime: Node.js 22 LTS
- Package manager: pnpm
- Language: TypeScript strict only (`.ts` / `.tsx`)
- Frontend: Next.js 15 App Router + React 19
- API: Hono.js
- Database: PostgreSQL 16 + Drizzle ORM
- Cache/queue backend: Valkey 8
- Queue: BullMQ + Valkey
- Auth: JWT with `jose`, stored in httpOnly Secure cookies
- Password hashing: Argon2id
- Validation: Zod for every external input
- Security headers: `nosecone`, `@hono/secure-headers`
- API rate limiting: `@hono/rate-limiter` backed by Valkey where practical
- UI: shadcn/ui + Tailwind CSS
- Icons: lucide-react

## Intended Repository Structure

```text
batarasec-portal/
├── app/
│   ├── (auth)/login/
│   └── (portal)/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── customers/
│       ├── licenses/
│       ├── kb/
│       ├── audit/
│       └── settings/
├── hono/
│   ├── index.ts
│   └── routes/
│       ├── auth.ts
│       ├── customers.ts
│       ├── licenses.ts
│       ├── kb.ts
│       └── dashboard.ts
├── db/
│   ├── schema.ts
│   ├── index.ts
│   └── migrations/
├── lib/
│   ├── auth.ts
│   ├── license.ts
│   ├── email.ts
│   ├── valkey.ts
│   └── crypto.ts
├── components/
├── scripts/
├── package.json
├── drizzle.config.ts
├── next.config.ts
├── docker-compose.yml
└── .env.example
```

## Security Rules

CVE-2025-29927 means Next.js middleware must not be treated as a security boundary.

Mandatory rules:
- Middleware may redirect unauthenticated browser users, but protected route handlers and server actions must verify auth themselves.
- Every Hono route that reads or mutates protected data must verify either portal admin auth or license bearer auth inside the route/middleware chain.
- Every external input must be validated with Zod before use.
- Never trust request body, query string, headers, cookies, or license claims without verification.
- Use Argon2id for portal admin password hashes.
- Use short-lived access token cookies and refresh token cookies:
  - Access token: 15 minutes, httpOnly, Secure, SameSite=Strict or Lax where needed.
  - Refresh token: 7 days, httpOnly, Secure, SameSite=Strict.
- Store revoked token hashes or session identifiers in Valkey for logout/invalidation.
- License validation must verify JWT signature and database status.
- Do not log secrets, license keys, passwords, raw tokens, SMTP credentials, or encryption keys.
- Audit all sensitive actions: login, failed login, logout, customer create/update/delete, license generate/revoke/resend, KB manual curation, settings changes.
- Keep destructive actions soft-delete or reversible unless the user explicitly asks otherwise.

## API Auth Modes

The portal has two auth modes:

1. Portal admin auth
   - Used by internal UI and admin APIs.
   - Cookie-based JWT access/refresh flow.

2. License bearer auth
   - Used by deployed BataraSec customer instances calling license and KB endpoints.
   - Header: `Authorization: Bearer <licenseKey>`.
   - Must verify license signature, expiry, revocation status, customer/license status, and rate limit by license.

## Rate Limit Targets

- `POST /api/auth/login`: 5 requests per 15 minutes per IP.
- `POST /api/licenses/validate`: 100 requests per hour per license, cache valid response in Valkey for 1 hour.
- `GET /api/kb/lookup`: 1000 requests per day per license.
- `POST /api/kb/contribute`: 100 requests per day per license.
- General `GET /api/*`: 100 requests per 15 minutes per IP.

## Product Scope

Phase 1 must provide:
- Portal admin login/logout/refresh.
- Customer CRUD with soft delete.
- License generation, validation, revocation, resend email, expiry monitoring.
- License JWT signing with `LICENSE_SIGNING_SECRET`.
- SMTP email delivery through queued BullMQ jobs.
- Audit log list/filter.
- KB lookup endpoint authenticated by license.
- KB contribution endpoint authenticated by license, with customer-data scrubbing and duplicate detection via analysis hash.
- Dashboard metrics: customers, active licenses, expiring licenses, KB stats, recent audit activity.

## UI Guidelines

Use a dark theme consistent with BataraSec:

```text
Background: #141416
Card:       #1C1C1E
Border:     #3F3F46
Text:       #F4F4F5
Accent:     #185FA5
```

Primary pages:
- `/login`
- `/`
- `/customers`
- `/customers/new`
- `/customers/[id]`
- `/licenses`
- `/licenses/[id]`
- `/kb`
- `/audit`
- `/settings`

Sidebar navigation:
- Dashboard
- Customers
- Licenses
- Knowledge Base
- Audit Log
- Settings

## Implementation Guidance

- Prefer small, verifiable vertical slices.
- Do not build all roadmap phases at once.
- Start with foundation: project setup, schema, migrations, seed admin, auth, audit log, license generate/validate.
- Add UI after the protected API foundations are in place.
- Keep central KB crawler, EPSS, CISA KEV, and risk scoring out of Phase 1 unless the user explicitly requests them.
- Before reporting completion, run `pnpm typecheck` when package scripts exist.
- For UI changes, run the app and manually verify the browser flow when possible.

## Environment Variables

Required environment variables should be documented in `.env.example`:

```bash
DATABASE_URL=postgresql://portal:password@postgres:5432/batarasec_portal
VALKEY_URL=redis://valkey:6379
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
LICENSE_SIGNING_SECRET=
PORTAL_URL=https://portal.batarasec.com
NODE_ENV=production
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=novan.hariman@batarasec.com
SMTP_FROM=hello@batarasec.com
SMTP_PASS=
SETTINGS_ENCRYPTION_KEY=
```
