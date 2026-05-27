# BataraSec Portal — Technical Design Document

**Version**: 0.1.0  
**Status**: Living document — update when architecture changes  
**Audience**: Engineer, DevOps, Security Reviewer  
**Last updated**: 2026-05-26

---

## 1. Overview

BataraSec Portal is an internal BataraSec operations tool. It manages customer records, customer license keys, and Central Knowledge Base (KB) entries consumed by deployed BataraSec platform instances.

This repo is separate from the main BataraSec platform. The main platform remains customer self-hosted; this portal is the central internal service used by BataraSec operators and, later, by customer instances for license validation and KB lookup/contribution.

### Core problems solved

- BataraSec needs a controlled internal system to issue, revoke, resend, and audit customer licenses.
- Customer self-hosted BataraSec instances need a central license validation endpoint.
- BataraSec needs a future-ready Central KB that can receive sanitized AI/security analysis and serve curated vulnerability remediation knowledge.

### Roadmap fit

- Phase 1: Portal license management + KB endpoints — current work.
- Phase 2: KB local cache in the main BataraSec platform.
- Phase 3: Central KB platform integration.
- Phase 4: CVE crawler in portal worker.
- Phase 5: Risk Score with EPSS + CISA KEV.

---

## 2. Architecture

### 2.1 High-level overview

```text
Admin Browser
  |
  | HTTPS portal.batarasec.com
  v
Nginx / Cloudflare
  |
  v
Next.js 15 Portal UI (port 4000)
  |
  | /api/*
  v
Hono.js API
  |-------------------|
  v                   v
PostgreSQL 16         Valkey 8
(data/migrations)     (cache/rate limit/revocation/queue)
                      |
                      v
                    BullMQ workers
                    (email, future KB jobs)

BataraSec Customer Instance
  |
  | Authorization: Bearer <licenseKey>
  v
/api/licenses/validate
/api/kb/lookup
/api/kb/contribute
```

### 2.2 Main components

| Component | Responsibility |
|---|---|
| Next.js App Router | Admin UI pages, protected layouts, server components/actions where appropriate |
| Hono.js API | Internal admin APIs and public license/KB APIs |
| PostgreSQL 16 | Source of truth for admins, customers, licenses, KB entries, contributions, audit logs |
| Drizzle ORM | Schema, migrations, typed DB access |
| Valkey 8 | Redis-compatible cache, rate limit counters, revoked token/session entries, BullMQ backend |
| BullMQ | Async jobs, especially license email delivery |
| SMTP | License email delivery through Hostinger or configured SMTP |

---

## 3. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js 22 LTS | Production runtime |
| Package manager | pnpm | Monorepo not required in Phase 1 |
| Language | TypeScript strict | All app files `.ts` / `.tsx` |
| Frontend | Next.js 15 + React 19 | App Router |
| API | Hono.js | Lightweight TS-native API layer |
| Database | PostgreSQL 16 | Persistent data |
| ORM | Drizzle ORM | Schema + migrations |
| Cache | Valkey 8 | Redis-compatible, BSD licensed |
| Queue | BullMQ | Valkey-backed jobs |
| Auth | `jose` | JWT signing/verification |
| Password hash | Argon2id | Portal admin passwords |
| Validation | Zod | All external input |
| Security headers | nosecone, @hono/secure-headers | Browser/API hardening |
| Rate limiting | @hono/rate-limiter + Valkey | Endpoint-specific limits |
| UI | shadcn/ui + Tailwind CSS | Dark admin console |
| Icons | lucide-react | UI icons |

---

## 4. Repository Structure

```text
batarasec-portal/
├── app/
│   ├── (auth)/
│   │   └── login/
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

---

## 5. Database Schema

### 5.1 Tables

#### `portal_admins`

Internal portal admin users.

| Column | Type | Notes |
|---|---|---|
| id | text PK | `createId()` |
| email | text unique | Login identifier |
| passwordHash | text | Argon2id hash |
| name | text | Display name |
| lastLoginAt | timestamp nullable | Updated on successful login |
| createdAt | timestamp | Default now |

#### `portal_customers`

Customer records managed by BataraSec operators.

| Column | Type | Notes |
|---|---|---|
| id | text PK | `createId()` |
| name | text | Contact/customer name |
| email | text unique | Customer email |
| company | text nullable | Company name |
| phone | text nullable | Contact phone |
| notes | text nullable | Internal notes |
| status | text | `active`, `suspended`, `deleted` |
| createdAt / updatedAt | timestamp | Lifecycle timestamps |

#### `portal_licenses`

Issued licenses for customers.

| Column | Type | Notes |
|---|---|---|
| id | text PK | `createId()` |
| customerId | text FK | References `portal_customers.id` |
| licenseKey | text unique | Signed JWT license key |
| tier | text | `community`, `pro`, `enterprise`, `demo` |
| status | text | `active`, `revoked`, `expired` |
| maxUsers | integer nullable | Optional user limit |
| features | jsonb string[] | Feature flags |
| issuedAt | timestamp | Default now |
| expiresAt | timestamp nullable | Optional expiry |
| revokedAt | timestamp nullable | Revocation timestamp |
| revokedBy | text nullable | Admin ID/email |
| revokeReason | text nullable | Operator reason |
| lastValidatedAt | timestamp nullable | Last platform validation |
| lastInstanceId | text nullable | Customer instance identifier |
| emailSentAt | timestamp nullable | Last successful license email |

#### `kb_entries`

Central Knowledge Base entries by CVE.

| Column | Type | Notes |
|---|---|---|
| id | text PK | `createId()` |
| cveId | text unique | CVE identifier |
| severity | text | Normalized severity |
| riskSummary | text | Short technical/business risk summary |
| businessImpact | text nullable | Business context |
| mitigationSteps | jsonb string[] | Remediation list |
| affectedPackages | jsonb string[] | Known affected packages |
| priority | text nullable | Operator/AI priority label |
| source | text | `crawler`, `customer_contribution`, `manual_curation` |
| modelUsed | text nullable | AI model metadata |
| confidence | text | `high`, `medium`, `low` |
| version | integer | Starts at 1 |
| reportCount | integer | Lookup/report counter |
| curatedByTeam | boolean | Manual curation marker |
| contributionCount | integer | Accepted contribution count |
| createdAt / updatedAt | timestamp | Lifecycle timestamps |

#### `kb_contributions`

Sanitized contributions from licensed customer instances.

| Column | Type | Notes |
|---|---|---|
| id | text PK | `createId()` |
| kbEntryId | text FK nullable | Linked entry if accepted/upserted |
| licenseId | text FK nullable | Source license |
| cveId | text | CVE identifier |
| analysisHash | text | Duplicate detection key |
| accepted | boolean | Whether contribution was accepted |
| createdAt | timestamp | Default now |

#### `portal_audit_log`

Append-only audit log for sensitive actions.

| Column | Type | Notes |
|---|---|---|
| id | text PK | `createId()` |
| actor | text | Admin email/id, license id, or system |
| action | text | e.g. `login`, `generate_license` |
| target | text nullable | Target resource |
| metadata | jsonb nullable | Safe structured metadata only |
| ipAddress | text nullable | Request IP |
| userAgent | text nullable | User agent |
| createdAt | timestamp | Default now |

---

## 6. API Design

### 6.1 Response shape

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid credentials"
  }
}
```

### 6.2 Auth endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Validate admin credentials, set access/refresh cookies |
| POST | `/api/auth/refresh` | Refresh cookie | Issue new access token |
| POST | `/api/auth/logout` | Admin cookie | Revoke current token/session and clear cookies |

### 6.3 Customer endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/customers?page=&search=` | Admin | List customers |
| POST | `/api/customers` | Admin | Create customer |
| GET | `/api/customers/:id` | Admin | Detail + licenses |
| PATCH | `/api/customers/:id` | Admin | Update customer |
| DELETE | `/api/customers/:id` | Admin | Soft delete customer |

### 6.4 License endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/licenses?page=&status=&tier=` | Admin | List/filter licenses |
| POST | `/api/licenses/generate` | Admin | Generate signed license and queue email |
| POST | `/api/licenses/:id/revoke` | Admin | Revoke license |
| POST | `/api/licenses/:id/resend-email` | Admin | Queue license email again |
| GET | `/api/licenses/expiring?days=30` | Admin | Expiring license list |
| POST | `/api/licenses/validate` | License bearer | Validate license for customer instance |

### 6.5 Knowledge Base endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/kb/lookup?cveId=CVE-...` | License bearer | Lookup KB by CVE |
| POST | `/api/kb/contribute` | License bearer | Submit sanitized customer contribution |
| GET | `/api/kb/stats` | License bearer or Admin | KB aggregate stats |

### 6.6 Dashboard endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard` | Admin | Customer/license/KB/audit overview |
| GET | `/api/audit` | Admin | Filtered audit log |

---

## 7. Security Design

### 7.1 Middleware is not a security boundary

Next.js middleware can improve UX through redirects, but every protected handler and server action must verify authentication itself. This is mandatory because middleware bypasses have existed in Next.js, including CVE-2025-29927.

### 7.2 Auth model

Admin session:
- Access token JWT: 15 minutes.
- Refresh token JWT: 7 days.
- Both are stored in httpOnly Secure cookies.
- Logout stores a revoked token/session hash in Valkey and clears cookies.
- Passwords are hashed with Argon2id.

License auth:
- Customer instances call selected endpoints with `Authorization: Bearer <licenseKey>`.
- The license key is a signed JWT, but signature alone is not enough.
- Runtime validation must check database status, customer status, revocation, and expiry.

### 7.3 Rate limits

| Endpoint | Limit |
|---|---|
| `POST /api/auth/login` | 5 requests / 15 min / IP |
| `POST /api/licenses/validate` | 100 requests / hour / license |
| `GET /api/kb/lookup` | 1000 requests / day / license |
| `POST /api/kb/contribute` | 100 requests / day / license |
| General `GET /api/*` | 100 requests / 15 min / IP |

### 7.4 Data handling

- Do not store raw customer proprietary code, paths, hostnames, internal URLs, or credentials in KB contributions.
- Contribution ingestion must scrub or reject customer-specific content before storing.
- Audit metadata must be safe and must not include passwords, tokens, full license keys, or SMTP secrets.
- Settings secrets must be encrypted at rest if persisted outside env vars.

---

## 8. UI Design

### 8.1 Theme

```text
Background: #141416
Card:       #1C1C1E
Border:     #3F3F46
Text:       #F4F4F5
Accent:     #185FA5
```

### 8.2 Pages

| Route | Description | Auth |
|---|---|---|
| `/login` | Admin login | Public |
| `/` | Dashboard overview | Admin |
| `/customers` | Customer table/search/pagination | Admin |
| `/customers/new` | Create customer | Admin |
| `/customers/[id]` | Customer detail + licenses | Admin |
| `/licenses` | License table/filter | Admin |
| `/licenses/[id]` | License detail/revoke/resend | Admin |
| `/kb` | KB stats/search/table | Admin |
| `/audit` | Audit log filters | Admin |
| `/settings` | SMTP and portal settings | Admin |

### 8.3 Navigation

```text
BataraSec Portal
────────────────
Dashboard
Customers
Licenses
Knowledge Base
Audit Log
Settings
```

---

## 9. Infrastructure

### 9.1 Docker Compose

Portal compose should include:
- `portal` service on port `4000`.
- `postgres` service using `postgres:16-alpine`.
- `valkey` service using `valkey/valkey:8-alpine`.
- Persistent volumes for PostgreSQL and Valkey.
- Healthchecks for PostgreSQL and Valkey.

### 9.2 Deployment target

The portal is expected to run behind Cloudflare and Nginx:

```text
Cloudflare -> Nginx HTTPS -> portal:4000
```

`PORTAL_URL` defaults to:

```text
https://portal.batarasec.com
```

---

## 10. Seed and Operations

### 10.1 Seed admin

`scripts/seed.ts` should:
- Create `novan.hariman@batarasec.com` if it does not exist.
- Generate a random password.
- Hash it with Argon2id.
- Print the password once to console.
- Never overwrite an existing admin.

### 10.2 Required validation before completion

Security checks:
- Login rate limit blocks 6th attempt.
- Access/refresh cookies are httpOnly.
- Invalid payloads return 400.
- Invalid license bearer returns 401.
- Sensitive actions create audit rows.

Functional checks:
- Create customer.
- Generate license.
- Validate license.
- Revoke license.
- KB contribute with valid license.
- KB contribute with invalid license returns 401.
- KB lookup returns found/not found safely.

Deployment checks:
- `docker compose up` starts services.
- PostgreSQL healthcheck OK.
- Valkey healthcheck OK.
- Migrations run successfully.
- `pnpm typecheck` passes.

---

## 11. Known Gaps and Future Phases

Not in Phase 1 unless explicitly requested:
- Main BataraSec platform local KB cache.
- Platform-to-portal contribution integration.
- CVE crawler worker.
- EPSS and CISA KEV enrichment.
- Risk scoring engine.
- Multi-admin RBAC beyond basic portal admin.
- Multi-tenant portal organization model.

---

## 12. Open Questions

- Should license keys be stored fully in DB, or should Phase 1 store full JWT and later move to hash + one-time display?
- Should portal settings be env-only initially, or editable from UI with encrypted DB storage?
- Should KB contribution scrubbing be strict reject-first, or allow best-effort redaction?
- Should customer instances identify themselves with a required `instanceId` during license validation?
