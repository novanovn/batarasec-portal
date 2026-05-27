# BataraSec Portal Worklog

## Active Work
- Task group: Portal Phase 1 license bearer auth
- Branch: `feat/next-features`
- Last worked: 2026-05-27 — completed Phase 1 local/staging validation: LIC-01 through LIC-05, KB-01 through KB-04, SEC-01, UI-01 through UI-07, LRG-01, LRG-02, and LRG-03 are done; live SMTP credential send remains deployment-time validation.
- Current repo: `D:\Ngoprek\ngulik\batarasec-portal`
- Related repos: main platform `D:\Ngoprek\ngulik\BataraSec`; VM agent `D:\Ngoprek\ngulik\batarasec-agent`

## Current State
- 2026-05-26: Created initial portal documentation baseline: `CLAUDE.md`, `TODO.md`, `design.md`, and `WORKLOG.md`.
- 2026-05-26: Reformatted `TODO.md` to match the main BataraSec platform style: metadata block, Legend, estimate-based sections, task fields (`Main task`, `Subtask`, `Owner`, `Status`, `Priority`, `Est`, `Scope`, `Done when`), and `Done Archive`.
- 2026-05-26: Portal is planned as a separate internal service, not part of the main BataraSec platform monorepo.
- 2026-05-26: Primary Phase 1 scope is license management plus Central Knowledge Base endpoints.
- 2026-05-26: Repo was reported as mostly empty before documentation creation.
- 2026-05-27: Implemented foundation app scaffold: `.env.example`, `.gitignore`, `package.json`, Next.js 15 App Router baseline, Tailwind dark tokens, Hono `/api/health`, Docker Compose for PostgreSQL/Valkey, Drizzle schema/migration, and idempotent seed admin script.
- 2026-05-27: Docker host ports use `5433` for PostgreSQL and `6380` for Valkey to avoid likely conflicts with the main BataraSec platform services on the same server.
- 2026-05-27: Added staging Nginx reverse proxy on host port `8080`; portal app port `4000` is exposed only inside Docker network and not published directly.
- 2026-05-27: Implemented AUTH-01 admin auth baseline: Hono login/refresh/logout, Argon2id verify, JWT cookies, Valkey revocation/rate limit, audit logs, login UI, logout button, and protected dashboard server-side auth check.
- 2026-05-27: Started AUTH-02 protected layout: added `requireAdmin()`, `app/(portal)/layout.tsx`, sidebar navigation, placeholder protected pages for Customers/Licenses/KB/Audit/Settings, and dashboard content component.
- 2026-05-27: During AUTH-02 validation, `/customers`, `/licenses`, `/kb`, `/audit`, and `/settings` returned 200 after login, but root `/` returned 500 due to a Next route-group/root page conflict; duplicate `app/page.tsx` was removed and stale `.next` cache was cleared.
- 2026-05-27: Completed AUTH-02 validation: `pnpm typecheck`, `pnpm build`, `docker compose up -d --build`, and authenticated route checks for `/`, `/customers`, `/licenses`, `/kb`, `/audit`, and `/settings` all passed through Nginx staging.
- 2026-05-27: Completed AUTH-03 license bearer auth middleware: added signed license JWT helpers, DB-backed Hono middleware, `/api/licenses/auth-check`, and staging checks for missing/invalid/valid/revoked bearer tokens.
- 2026-05-27: Implemented LIC-02 customer CRUD APIs with Hono admin auth middleware, list/search/pagination, create/detail/update/soft-delete, Zod validation, and audit logs for mutations; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Implemented LIC-03 license management APIs: admin list/filter, generate signed license, detail, revoke, resend-email placeholder, expiring-soon, masked key responses by default, and audit logs for generate/revoke/resend; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Implemented LIC-04 `POST /api/licenses/validate` with license bearer auth, Zod payload validation, Valkey 1-hour cache, and `lastValidatedAt` / `lastInstanceId` DB updates; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Implemented LIC-05 license email queue baseline: added BullMQ queue, Nodemailer SMTP sender, retry-safe `pnpm worker:license-email` worker, license email template, `emailSentAt` update on send, and generate/resend enqueue integration; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Implemented KB-01 `GET /api/kb/lookup?cveId=...` with license bearer auth, Zod CVE query validation, Valkey 1-hour cache, and safe found/not-found DB response; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Implemented KB-02 `POST /api/kb/contribute` with license bearer auth, Zod validation, basic email/IP/URL redaction, analysis hash duplicate detection, contribution insert, KB entry insert/update counters, and lookup cache invalidation; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Implemented KB-03 `GET /api/kb/stats` with license bearer auth, total entry/contribution counts, severity distribution, recent entries, 15-minute Valkey cache, and stats cache invalidation on contribution; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Implemented KB-04 manual KB curation baseline: added admin KB list/detail/update APIs with search/severity/curated filters, cache invalidation, audit logs, and `/kb` curation UI with entry editor and curated toggle; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Implemented SEC-01 endpoint rate limits with reusable Hono Valkey middleware, general API IP limit, per-license `/api/licenses/validate` hourly quota, and per-license KB lookup/contribution daily quotas; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Implemented UI-03 dashboard overview: `/` now has DB-backed metric cards for active customers, active licenses, 30-day expiring licenses, KB totals, operational focus, and recent audit activity; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Implemented UI-04 customer page baseline: `/customers` now has list/search, create form, status toggle, and soft-delete actions wired to customer APIs; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Implemented UI-05 license page baseline: `/licenses` now has list/filter, generate license form with one-time full key display, revoke action, and resend-email action wired to license APIs; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Implemented UI-06 audit log page baseline: added admin-only `GET /api/audit` with action/actor/target filters and pagination, and `/audit` now has filters, table, metadata display, and pagination; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Implemented UI-07 settings page baseline: added admin-only `/api/settings` and `/api/settings/smtp/test` readiness endpoints, and `/settings` now shows portal config, SMTP readiness, and secret configured/not-configured status without exposing secrets; `pnpm typecheck`, `pnpm build`, and Docker staging rebuild passed.
- 2026-05-27: Added `SMTP_DRY_RUN` and `pnpm smoke:license-email`; dry-run license email validation exercised active customer/license lookup, generated email body path without external SMTP delivery, and confirmed `emailSentAt` update.
- 2026-05-27: Completed LRG-03 deployment readiness: final `pnpm typecheck`, `pnpm build`, Docker image rebuild, PostgreSQL/Valkey healthy startup, Nginx staging route smoke, Phase 1 API smoke, rate-limit smoke, UI route smoke, and license-email dry-run smoke all passed. Portal app remains exposed only inside Docker on port `4000`; Nginx publishes staging on `8080`.

## Product Decisions
- Portal stack target: Node.js 22 LTS, TypeScript strict, Next.js 15 App Router + React 19, Hono.js API, PostgreSQL 16 + Drizzle ORM, Valkey 8, BullMQ, `jose`, Argon2id, Zod, shadcn/ui, Tailwind CSS.
- Hono is preferred over Express for this portal.
- Valkey is preferred over Redis for the portal cache/queue service.
- Phase 1 should not implement crawler/risk-score features unless explicitly requested.
- Portal docs should follow the same operational style as `BataraSec/TODO.md` and `BataraSec/WORKLOG.md`.

## Security Decisions
- Next.js middleware is not a security boundary.
- Protected Hono routes and server actions must verify auth directly.
- Middleware may only be used for UX redirects.
- License bearer auth must verify both JWT signature and DB-backed license/customer status.
- All sensitive actions must be audit logged.
- Do not log secrets, full license keys, raw JWTs, passwords, SMTP credentials, or encryption keys.

## Files In Progress
- `package.json`
- `.env.example`
- `docker-compose.yml`
- `Dockerfile`
- `nginx/staging.conf`
- `app/`
- `hono/`
- `db/`
- `lib/`
- `scripts/seed.ts`
- `middleware.ts`
- `app/(portal)/`
- `components/portal-sidebar.tsx`
- `components/dashboard-content.tsx`
- `components/placeholder-page.tsx`
- `TODO.md`
- `WORKLOG.md`

## Last Verification
- 2026-05-26: Documentation files were created successfully in repo root.
- 2026-05-26: `TODO.md` was rewritten to match the platform TODO conventions and includes active sections plus a `Done Archive`.
- 2026-05-27: `pnpm install` passed after replacing nonexistent `@hono/secure-headers` with Hono's built-in `hono/secure-headers` middleware.
- 2026-05-27: `pnpm typecheck` passed.
- 2026-05-27: `pnpm build` passed; Next.js production build completed successfully.
- 2026-05-27: `docker compose up -d postgres valkey` started PostgreSQL and Valkey; `docker compose ps` reported both containers healthy.
- 2026-05-27: `pnpm db:generate` created `db/migrations/0000_curved_christian_walker.sql` for 6 Phase 1 tables.
- 2026-05-27: `pnpm db:migrate` applied migrations successfully to local PostgreSQL.
- 2026-05-27: `pnpm seed` created `novan.hariman@batarasec.com`; rerun reported the admin already exists and did not overwrite the password.
- 2026-05-27: Runtime check against `http://localhost:4000/api/health` returned `{ success: true, data: { status: "ok", service: "batarasec-portal" } }`.
- 2026-05-27: `docker compose up -d --build` built and started full staging stack with Nginx, portal, PostgreSQL, and Valkey.
- 2026-05-27: Runtime check against `http://localhost:8080/api/health` returned OK through Nginx.
- 2026-05-27: `docker compose ps nginx` reported `batarasec-portal-nginx` healthy after switching healthcheck to `nginx -t`.
- 2026-05-27: AUTH-01 verification through Nginx staging: unauthenticated `/` redirects to `/login`; valid admin login returns 200; dashboard returns 200 after login; refresh returns 200; logout returns 200; `/` redirects to `/login` after logout.
- 2026-05-27: Login rate limit verification returned `401,401,401,401,401,429`, proving the 6th request is blocked.
- 2026-05-27: AUTH-02 partial validation before root fix: authenticated `/customers`, `/licenses`, `/kb`, `/audit`, and `/settings` returned 200 through Nginx staging; root `/` returned 500 from Next route conflict.
- 2026-05-27: Removed duplicate root `app/page.tsx`, cleared stale `.next`, and reran `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build` successfully.
- 2026-05-27: AUTH-02 final route verification through Nginx staging after login returned 200 for `/`, `/customers`, `/licenses`, `/kb`, `/audit`, and `/settings`.
- 2026-05-27: AUTH-03 verification passed: `pnpm typecheck`, `pnpm build`, `docker compose up -d --build`; `/api/licenses/auth-check` returned 401 for missing bearer, 401 for invalid bearer, 200 for an active signed DB-backed license, and 403 after that test license was revoked.
- 2026-05-27: LIC-02 static/build verification passed: `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build`; runtime HTTP smoke test for `/api/customers` still needs rerun because the local request command was blocked by the Claude Code classifier.
- 2026-05-27: LIC-03 static/build verification passed: `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build`; runtime smoke test for admin license generate/list/detail/revoke/resend still needs rerun because local request commands are blocked.
- 2026-05-27: LIC-04 static/build verification passed: `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build`; runtime smoke test for `/api/licenses/validate` still needs rerun because local request commands are blocked.
- 2026-05-27: KB-01 static/build verification passed: `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build`; runtime smoke test for `/api/kb/lookup` still needs rerun because local request commands are blocked.
- 2026-05-27: KB-02 static/build verification passed: `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build`; runtime smoke test for `/api/kb/contribute` still needs rerun because local request commands are blocked.
- 2026-05-27: KB-03 static/build verification passed: `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build`; runtime smoke test for `/api/kb/stats` still needs rerun because local request commands are blocked.
- 2026-05-27: SEC-01 static/build verification passed: `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build`; runtime rate-limit smoke test still needs rerun because local request commands are blocked.
- 2026-05-27: UI-03 static/build verification passed: `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build`; browser smoke test for `/` still needs manual validation.
- 2026-05-27: UI-04 static/build verification passed: `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build`; browser smoke test for `/customers` still needs manual validation.
- 2026-05-27: UI-05 static/build verification passed: `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build`; browser smoke test for `/licenses` still needs manual validation.
- 2026-05-27: UI-06 static/build verification passed: `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build`; browser smoke test for `/audit` still needs manual validation.
- 2026-05-27: UI-07 static/build verification passed: `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build`; browser smoke test for `/settings` still needs manual validation.
- 2026-05-27: LIC-05 verification passed: `pnpm typecheck`, `pnpm build`, `docker compose up -d --build`, `pnpm smoke:phase1`, and `pnpm smoke:license-email`; live SMTP credential send remains deployment-time validation.
- 2026-05-27: KB-04 static/build verification passed: `pnpm typecheck`, `pnpm build`, and `docker compose up -d --build`; browser/runtime smoke test for `/kb` curation still needs manual validation.
- 2026-05-27: LRG-01/LRG-02 validation passed: `pnpm typecheck`, `pnpm build`, `docker compose ps`, and `docker compose up -d --build` passed; PostgreSQL/Valkey/Nginx reported healthy; static grep found no raw token/SMTP secret logging, with full license key limited to one-time generate response and SMTP delivery path. `pnpm smoke:phase1` passed end-to-end API smoke for auth failure/login, protected admin APIs, customer CRUD, license generate/resend enqueue/revoke/validate, KB contribute/lookup/stats/curation, audit list, and settings. `pnpm smoke:rate-limit` passed login quota exhaustion (`401,401,401,401,401,429`). `pnpm smoke:ui` passed unauthenticated redirect plus authenticated route render for `/`, `/customers`, `/licenses`, `/kb`, `/audit`, and `/settings` through Nginx staging. `pnpm smoke:license-email` passed dry-run sender validation through `emailSentAt` update.

## Blockers / Decisions
- Decide whether to store full license JWT in `portal_licenses.licenseKey` for Phase 1 or store only a hash plus one-time display. Blueprint currently stores full JWT; hash-only is safer but affects resend-email and display flows.
- Decide whether SMTP settings are environment-only for Phase 1 or editable from `/settings` with encrypted DB storage.
- Decide whether KB contribution scrubbing should reject suspicious payloads or accept with best-effort redaction.
- Decide whether `POST /api/licenses/validate` should require an explicit `instanceId` in the request body for audit/rate-limit tracking.

## Next Step
- Configure production secrets and live SMTP credentials before external deployment; run one live `pnpm worker:license-email` send validation after credentials are installed.
- Keep deployment on a distinct internal portal port (`4000`) and route externally through Nginx/Cloudflare to avoid collision with the main platform on `103.93.160.112`.
- Do not start Phase 2+ KB platform integration, CVE crawler, EPSS, CISA KEV, or risk score until the user explicitly approves.
- Run `pnpm typecheck` before marking future implementation tasks done.

## Validation Checklist Template

Security:
- [x] Login rate limit blocks excessive attempts.
- [x] Access token cookie is httpOnly and Secure-ready (`Secure=false` only for HTTP staging).
- [x] Refresh token cookie is httpOnly and Secure-ready (`Secure=false` only for HTTP staging).
- [x] Protected dashboard verifies auth server-side even without relying on middleware.
- [x] Full protected portal layout validates after route-group root fix.
- [x] Invalid input returns 400 with safe error response.
- [x] Invalid license bearer returns 401.
- [x] Login, failed login, generate license, revoke license, and resend email are audited.

Functional:
- [x] Create customer.
- [x] Generate license.
- [x] License JWT verifies cryptographically.
- [x] Revoke license updates DB status.
- [x] License validation returns valid response for active license.
- [x] License validation rejects revoked/expired/tampered license.
- [x] KB contribute works with valid license.
- [x] KB contribute rejects invalid license.
- [x] KB lookup returns found/not found safely.

Deployment:
- [x] `docker compose up` starts portal, PostgreSQL, Valkey, and staging Nginx.
- [x] PostgreSQL healthcheck passes.
- [x] Valkey healthcheck passes.
- [x] DB migration succeeds.
- [x] Seed script creates admin and prints password once.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] Docker image rebuild passes.
- [x] Nginx staging smoke passes.

## Done Archive
- 2026-05-27: Completed foundation baseline QW-01, QW-02, FND-01, FND-02, FND-03, and FND-04 with install, typecheck, build, Docker healthchecks, migration, seed, and `/api/health` runtime verification.
- 2026-05-26: Initial documentation baseline created and TODO formatting aligned with the main BataraSec platform docs.
