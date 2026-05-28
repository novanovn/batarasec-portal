# BataraSec Portal — Project TODO
> Managed by: **Bisma** (PM Agent)
> Last updated: 2026-05-28 — PROD-01 s/d PROD-03 selesai; portal production live di https://portal.batarasec.com dengan TLS Cloudflare + HTTP/2; PROD-04 s/d PROD-06 in_progress
> Sorted by: estimated time (shortest first)

---

## Legend
- **Main task**: parent `##` group that owns the work item. Example: `Quick Wins < 1 jam`.
- **Subtask**: stable ID within the main task, formatted as `<GROUP>-<NN>`. Example: `FND-01`.
- **Priority**: P1 critical · P2 high · P3 nice-to-have
- **Status**: `backlog` · `in_progress` · `done`
- **Done Archive**: completed task details are moved to `## Done Archive` so active sections stay short.

---

## Quick Wins < 1 jam

### [UI] Change password di settings
- **Main task**: Quick Wins < 1 jam
- **Subtask**: QW-05
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-28 — `POST /api/settings/change-password` (Argon2id verify + hash, audit `admin_password_changed`). `/settings` diberi card + link ke change password page. `pnpm typecheck` + `pnpm build` PASS.
- **Priority**: P1
- **Est**: ~45 menit
- **Scope**: Tambah form change password di `/settings`: current password + new password + confirm. Argon2id verify + hash. Audit log `admin_password_changed`. Response tidak expose hash.
- **Done when**: Admin bisa ganti password dari UI; current password salah ditolak; audit log tercatat.

### [UI] Force change password on first login
- **Main task**: Quick Wins < 1 jam
- **Subtask**: QW-06
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-28 — Kolom `mustChangePassword boolean DEFAULT false` ditambah ke `portal_admins` (migration `0002_lumpy_tusk.sql`). Seed set `mustChangePassword: true`. `requireAdmin()` di server-auth cek flag dari DB dan redirect ke `/settings/change-password` sebelum akses portal. `allowMustChangePassword` opt-in untuk halaman change-password sendiri. Flag di-clear saat password berhasil diganti.
- **Priority**: P1
- **Est**: ~1 jam
- **Depends on**: QW-05
- **Scope**: Tambah flag `mustChangePassword` di schema `portal_admins`. Seed set `true`. Setelah login, kalau flag aktif redirect ke `/settings/change-password` sebelum bisa akses portal. Flag di-clear setelah password berhasil diganti.
- **Done when**: Admin dengan OTP seed diredirect ke change password page setelah login; setelah ganti password bisa akses portal normal.

### [UI] License detail page
- **Main task**: Quick Wins < 1 jam
- **Subtask**: QW-07
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-28 — Halaman `/licenses/[id]` dengan full key (textarea + copy), status badge, customer info, license metadata, revoke detail jika revoked, audit trail. Tombol revoke + resend dari halaman detail. Link "Detail" ditambah ke baris di licenses list. `pnpm typecheck` + `pnpm build` PASS.
- **Priority**: P2
- **Est**: ~1 jam
- **Depends on**: QW-06
- **Scope**: Halaman `/licenses/[id]`: full license key, status badge, customer info, `lastValidatedAt`, `lastInstanceId`, `emailSentAt`, expiry, revoke reason jika revoked, audit trail terkait license tersebut, tombol revoke + resend dari halaman detail.
- **Done when**: Admin bisa klik license dari list dan melihat full detail + history di halaman terpisah.

### [DEPLOY] Staging Nginx reverse proxy
- **Main task**: Quick Wins < 1 jam
- **Subtask**: QW-04
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-27 — added Dockerized Nginx staging proxy on host port `8080`, with portal app exposed only inside the Docker network on port `4000`.
- **Priority**: P1
- **Est**: ~45 menit
- **Scope**: Add staging Nginx reverse proxy, basic security headers, and perimeter rate limit zones before traffic reaches the portal app.
- **Done when**: `http://localhost:8080/api/health` returns OK through Nginx and `docker compose ps nginx` reports healthy.

### [DOCS] Keep portal docs aligned
- **Main task**: Quick Wins < 1 jam
- **Subtask**: QW-03
- **Owner**: Widura
- **Status**: done
- **Worked**: 2026-05-26 — created initial `CLAUDE.md`, `TODO.md`, `design.md`, and `WORKLOG.md` for the portal repo, then aligned TODO/worklog style with the main BataraSec platform docs.
- **Priority**: P2
- **Est**: ~45 menit
- **Scope**: Keep portal project docs in the same operational style as `BataraSec/TODO.md` and `WORKLOG.md`.
- **Done when**: Portal docs use consistent sections, task metadata, status values, and done archive conventions.

---

## Foundation

---

## Security & Auth


### [SEC] Endpoint rate limits
- **Main task**: Security & Auth
- **Subtask**: SEC-01
- **Owner**: Yudhistira
- **Status**: done
- **Priority**: P1
- **Est**: ~2 jam
- **Depends on**: FND-02, QW-01
- **Worked**: 2026-05-27 — added reusable Hono rate-limit middleware backed by Valkey, general `api/*` IP limit, per-license `/api/licenses/validate` hourly quota, and per-license KB lookup/contribution daily quotas; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, `pnpm smoke:phase1`, and `pnpm smoke:rate-limit` passed.
- **Scope**: Add rate limiting for login, license validation, KB lookup, KB contribution, and general API endpoints. Prefer Valkey-backed keys for per-license quotas.
- **Done when**: Login blocks on the 6th request in the configured window and license/KB endpoints enforce documented quotas.

---

## License Management

### [LICENSE] License JWT generator and validator
- **Main task**: License Management
- **Subtask**: LIC-01
- **Owner**: Yudhistira
- **Status**: done
- **Priority**: P1
- **Est**: ~2 jam
- **Depends on**: FND-03
- **Scope**: Add `lib/license.ts` with signed license JWT generation and verification using `LICENSE_SIGNING_SECRET`, tier/features/maxUsers/expiresAt claims, and safe key display helpers.
- **Worked**: 2026-05-27 — added signed license JWT generation/verification helpers in `lib/license.ts` and verified active/revoked bearer behavior through AUTH-03 staging checks, `pnpm smoke:phase1`, and `pnpm smoke:license-email`.
- **Done when**: Generated license keys verify cryptographically and fail when tampered.

### [LICENSE] Customer CRUD APIs
- **Main task**: License Management
- **Subtask**: LIC-02
- **Owner**: Yudhistira
- **Status**: done
- **Priority**: P1
- **Est**: ~3 jam
- **Depends on**: AUTH-01, FND-03
- **Worked**: 2026-05-27 — implemented Hono admin-authenticated list/search/pagination, create, detail with licenses, update, soft delete, Zod validation, and audit logs; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, and `pnpm smoke:phase1` passed.
- **Scope**: Implement customer list/search/pagination, create, detail with licenses, update, and soft delete with Zod validation and audit logs.
- **Done when**: Portal admin can manage customers via API and deleted customers are hidden by default without losing license history.

### [LICENSE] License management APIs
- **Main task**: License Management
- **Subtask**: LIC-03
- **Owner**: Yudhistira
- **Status**: done
- **Priority**: P1
- **Est**: ~4 jam
- **Depends on**: LIC-01, LIC-02
- **Worked**: 2026-05-27 — implemented admin list/filter, generate signed license, detail, revoke, resend-email enqueue, expiring-soon, masked key responses by default, and audit logs; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, and `pnpm smoke:phase1` passed.
- **Scope**: Implement list/filter, generate, revoke, resend email enqueue, and expiring-soon endpoints with audit logging.
- **Done when**: Admin can generate and revoke licenses; license rows store issued/expiry/revocation/email metadata.

### [LICENSE] License activation status tracking
- **Main task**: License Management
- **Subtask**: LIC-07
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-28 — Migration `0001_bouncy_amphibian.sql` (ALTER DEFAULT + backfill). Schema default `issued`. Middleware izinkan `issued`+`active`. Validate auto-upgrade + audit `license_activated`. Dashboard 5 cards (issued+active split). UI badge amber/hijau/merah. `pnpm typecheck` + `pnpm build` PASS.
- **Priority**: P1
- **Est**: ~2 jam
- **Depends on**: LIC-03, LIC-04
- **Scope**: Tambah status `issued` (default saat generate, belum pernah divalidasi platform) dan `active` (sudah divalidasi minimal sekali). Migration aman: license dengan `lastValidatedAt` existing di-set `active`, sisanya `issued`. Middleware izinkan `issued` + `active`, block `revoked`. Transisi `issued → active` otomatis saat `POST /api/licenses/validate` pertama berhasil + audit log `license_activated`. UI badge: kuning `Issued`, hijau `Active`, merah `Revoked`. Dashboard pisahkan count issued vs active. Response body `/api/licenses/validate` tidak berubah (platform tidak perlu tahu).
- **Done when**: `pnpm typecheck`, `pnpm build`, Docker rebuild, smoke test PASS. License baru berstatus `issued`; setelah pertama kali validate berubah ke `active`.

### [LICENSE] Public license validation endpoint
- **Main task**: License Management
- **Subtask**: LIC-04
- **Owner**: Yudhistira
- **Status**: done
- **Priority**: P1
- **Est**: ~3 jam
- **Depends on**: AUTH-03, LIC-01
- **Worked**: 2026-05-27 — implemented `POST /api/licenses/validate` with license bearer auth, Zod payload validation, Valkey 1-hour cache, and `lastValidatedAt` / `lastInstanceId` updates; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, and `pnpm smoke:phase1` passed.
- **Scope**: Implement `POST /api/licenses/validate` for BataraSec platform instances, with bearer license auth, Valkey 1-hour cache, `lastValidatedAt`, and `lastInstanceId` update.
- **Done when**: Valid license returns `{ valid, tier, features, expiresAt, maxUsers }`; revoked/expired/invalid license returns a safe failure response.

### [LICENSE] License email queue
- **Main task**: License Management
- **Subtask**: LIC-05
- **Owner**: Yudhistira
- **Status**: done
- **Priority**: P2
- **Est**: ~3 jam
- **Depends on**: LIC-03, QW-01
- **Worked**: 2026-05-27 — added BullMQ-backed license email queue, Nodemailer SMTP sender, retry-safe worker script `pnpm worker:license-email`, license email template, `emailSentAt` update on successful send, and generate/resend enqueue integration; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, `pnpm smoke:phase1`, and `pnpm smoke:license-email` passed. Live SMTP credential send remains deployment-time validation.
- **Scope**: Add BullMQ queue, SMTP mailer, license email template, retry-safe worker, and email sent timestamp update.
- **Done when**: License generation and resend enqueue an email job; successful send updates `emailSentAt`; failures do not break license generation.

---

## Central Knowledge Base

### [KB] KB lookup API
- **Main task**: Central Knowledge Base
- **Subtask**: KB-01
- **Owner**: Yudhistira
- **Status**: done
- **Priority**: P1
- **Est**: ~2 jam
- **Depends on**: AUTH-03, FND-03
- **Worked**: 2026-05-27 — implemented `GET /api/kb/lookup?cveId=...` with license bearer auth, Zod CVE validation, Valkey 1-hour cache, and safe found/not-found DB response; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, and `pnpm smoke:phase1` passed.
- **Scope**: Implement `GET /api/kb/lookup?cveId=...` with license bearer auth, Zod query validation, Valkey cache, and DB lookup.
- **Done when**: A valid license can lookup a CVE and receive `{ found, entry? }`; invalid license gets 401.

### [KB] KB contribution API
- **Main task**: Central Knowledge Base
- **Subtask**: KB-02
- **Owner**: Yudhistira + Bima
- **Status**: done
- **Priority**: P1
- **Est**: ~4 jam
- **Depends on**: AUTH-03, FND-03
- **Worked**: 2026-05-27 — implemented `POST /api/kb/contribute` with license bearer auth, Zod validation, basic email/IP/URL redaction, analysis hash duplicate detection, contribution insert, KB entry insert/update counters, and lookup cache invalidation; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, and `pnpm smoke:phase1` passed.
- **Scope**: Implement `POST /api/kb/contribute` with license auth, Zod validation, data scrubbing, analysis hash duplicate detection, contribution insert, and KB entry upsert/update counters.
- **Done when**: Valid sanitized contributions are accepted once, duplicates are ignored safely, and customer/internal data is not stored.

### [KB] KB stats API
- **Main task**: Central Knowledge Base
- **Subtask**: KB-03
- **Owner**: Yudhistira
- **Status**: done
- **Priority**: P2
- **Est**: ~1 jam
- **Depends on**: KB-01
- **Worked**: 2026-05-27 — implemented `GET /api/kb/stats` with license bearer auth, total entry/contribution counts, severity distribution, recent entries, 15-minute Valkey cache, and stats cache invalidation on contribution; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, and `pnpm smoke:phase1` passed.
- **Scope**: Implement `GET /api/kb/stats` for licensed platform clients and admin dashboard use.
- **Done when**: Endpoint returns total entries, severity distribution, and recent entries.

### [KB] Manual KB curation UI/API
- **Main task**: Central Knowledge Base
- **Subtask**: KB-04
- **Owner**: Arjuna + Yudhistira
- **Status**: done
- **Priority**: P2
- **Est**: ~4 jam
- **Worked**: 2026-05-27 — added admin KB curation APIs for list/detail/update with search, severity, curated filters, cache invalidation, and audit logs; replaced `/kb` placeholder with search/filter list, entry editor, mitigation/package line editors, confidence/source/priority controls, and curated-by-team toggle; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, `pnpm smoke:phase1`, and `pnpm smoke:ui` passed.
- **Scope**: Add admin KB page and APIs to search by CVE, view entry detail, edit summary/impact/mitigation/confidence/source, and mark curated by team.
- **Done when**: Internal admins can manually curate KB entries and all changes are audited.

---

## Portal UI

### [UI] Dark portal shell and sidebar
- **Main task**: Portal UI
- **Subtask**: UI-01
- **Owner**: Arjuna + Drupadi
- **Status**: done
- **Priority**: P1
- **Est**: ~2 jam
- **Depends on**: AUTH-02
- **Worked**: 2026-05-27 — added protected portal layout with BataraSec Portal branding, sidebar navigation, logout action, dark theme styling, and responsive shell; `pnpm smoke:ui` passed authenticated routes for all primary protected pages.
- **Scope**: Add portal layout with BataraSec Portal branding, sidebar navigation, topbar, dark theme tokens, and responsive shell.
- **Done when**: Authenticated admin sees dashboard shell with Dashboard, Customers, Licenses, Knowledge Base, Audit Log, and Settings navigation.

### [UI] Login page
- **Main task**: Portal UI
- **Subtask**: UI-02
- **Owner**: Arjuna
- **Status**: done
- **Priority**: P1
- **Est**: ~1.5 jam
- **Depends on**: AUTH-01
- **Worked**: 2026-05-27 — added `/login` UI wired to admin auth API with safe error copy and redirect after successful login; `pnpm smoke:ui` passed login plus protected route access through Nginx staging.
- **Scope**: Build `/login` form with server/API integration, validation errors, rate-limit feedback, loading state, and redirect after success.
- **Done when**: Admin can login through the UI and failed logins show safe error copy.

### [UI] Dashboard overview
- **Main task**: Portal UI
- **Subtask**: UI-03
- **Owner**: Arjuna + Yudhistira
- **Status**: done
- **Priority**: P2
- **Est**: ~3 jam
- **Depends on**: LIC-02, LIC-03, KB-03
- **Worked**: 2026-05-27 — replaced static dashboard copy with DB-backed metric cards for active customers, active licenses, 30-day expiring licenses, KB entries/contributions, operational focus cards, and recent audit activity; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, and `pnpm smoke:ui` passed.
- **Scope**: Add dashboard metric cards and recent activity: total customers, active licenses, expiring in 7/30 days, KB stats, recent audit logs.
- **Done when**: `/` gives operators a useful snapshot of customer/license/KB state.

### [UI] Customers pages
- **Main task**: Portal UI
- **Subtask**: UI-04
- **Owner**: Arjuna
- **Status**: done
- **Priority**: P1
- **Est**: ~4 jam
- **Depends on**: LIC-02
- **Worked**: 2026-05-27 — replaced placeholder `/customers` with customer list/search, create form, status toggle, and soft-delete actions wired to `/api/customers`; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, `pnpm smoke:phase1`, and `pnpm smoke:ui` passed.
- **Scope**: Build customer list/search/pagination, new customer form, customer detail, edit, soft delete, and license list on customer detail.
- **Done when**: Customer lifecycle is manageable from UI.

### [UI] Licenses pages
- **Main task**: Portal UI
- **Subtask**: UI-05
- **Owner**: Arjuna
- **Status**: done
- **Priority**: P1
- **Est**: ~4 jam
- **Depends on**: LIC-03
- **Worked**: 2026-05-27 — replaced placeholder `/licenses` with license list/filter, generate license form with one-time full key display, revoke action, and resend-email action wired to `/api/licenses`; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, `pnpm smoke:phase1`, and `pnpm smoke:ui` passed.
- **Scope**: Build license list with filters, license detail, generate license flow, revoke dialog, and resend email action.
- **Done when**: Operator can generate, inspect, revoke, and resend licenses from UI.

### [UI] Audit log page
- **Main task**: Portal UI
- **Subtask**: UI-06
- **Owner**: Arjuna + Yudhistira
- **Status**: done
- **Priority**: P2
- **Est**: ~2 jam
- **Depends on**: AUTH-01, LIC-02, LIC-03
- **Worked**: 2026-05-27 — added admin-only `GET /api/audit` with action/actor/target filters and pagination, then replaced `/audit` placeholder with audit table, filters, metadata display, and pagination; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, `pnpm smoke:phase1`, and `pnpm smoke:ui` passed.
- **Scope**: Add audit log endpoint and page with filters for action, actor, target, and date range.
- **Done when**: Sensitive admin actions are visible and searchable in `/audit`.

### [UI] Settings page
- **Main task**: Portal UI
- **Subtask**: UI-07
- **Owner**: Arjuna + Yudhistira
- **Status**: done
- **Priority**: P2
- **Est**: ~3 jam
- **Worked**: 2026-05-27 — added admin-only `/api/settings` and `/api/settings/smtp/test` readiness endpoints plus `/settings` UI for safe portal config, SMTP readiness, and secret configured/not-configured status without exposing secret values; `pnpm typecheck`, `pnpm build`, Docker staging rebuild, `pnpm smoke:phase1`, and `pnpm smoke:ui` passed.
- **Scope**: Add settings page for SMTP config and portal settings. Store sensitive settings encrypted with `SETTINGS_ENCRYPTION_KEY` if persisted in DB.
- **Done when**: Admin can test SMTP settings without exposing the SMTP password in API responses or logs.

---

## Large - 3 to 8 jam

### [QA] Security validation checklist
- **Main task**: Large - 3 to 8 jam
- **Subtask**: LRG-01
- **Owner**: Karna + Yudhistira
- **Status**: done
- **Priority**: P1
- **Est**: ~3 jam
- **Worked**: 2026-05-27 — completed validation pass; `pnpm typecheck`, `pnpm build`, `docker compose ps`, and `docker compose up -d --build` passed. Static secret/log grep found no raw token/SMTP secret logging; full license key remains limited to one-time generate response and SMTP delivery path. `pnpm smoke:phase1` passed auth failure/login, protected admin API, license validation/revocation, KB, audit, and settings API smoke validation; `pnpm smoke:rate-limit` passed login quota exhaustion; `pnpm smoke:ui` passed protected route render through Nginx staging; `pnpm smoke:license-email` passed dry-run sender validation through `emailSentAt` update.
- **Scope**: Validate login rate limit, httpOnly cookies, token expiry/refresh, route-level auth checks, invalid input handling, license auth failures, and audit logging.
- **Done when**: Security checklist in `WORKLOG.md` is PASS with exact evidence.

### [QA] Functional portal smoke test
- **Main task**: Large - 3 to 8 jam
- **Subtask**: LRG-02
- **Owner**: Karna
- **Status**: done
- **Priority**: P1
- **Est**: ~2 jam
- **Worked**: 2026-05-27 — completed functional validation; static/build/container checks pass and staging stack reports PostgreSQL/Valkey/Nginx healthy. `pnpm smoke:phase1` passed end-to-end API smoke validation for customer/license/email enqueue/KB/audit/settings; `pnpm smoke:ui` passed authenticated route render for `/`, `/customers`, `/licenses`, `/kb`, `/audit`, and `/settings` through Nginx staging; `pnpm smoke:license-email` passed dry-run sender validation through `emailSentAt` update. Live SMTP credential send remains deployment-time validation.
- **Scope**: Validate customer create, license generate, email queue, revoke, license validate, KB contribute, KB lookup, and audit entries.
- **Done when**: End-to-end Phase 1 happy path works from UI/API.

### [QA] Deployment readiness
- **Main task**: Large - 3 to 8 jam
- **Subtask**: LRG-03
- **Owner**: Yudhistira
- **Status**: done
- **Priority**: P1
- **Est**: ~2 jam
- **Worked**: 2026-05-27 — final readiness validation passed: `pnpm typecheck`, `pnpm build`, Docker image rebuild, PostgreSQL/Valkey healthy startup, Nginx staging route smoke, Phase 1 API smoke, rate-limit smoke, UI route smoke, and license-email dry-run smoke. Docker compose keeps portal app exposed only inside the Docker network on port `4000`; Nginx publishes staging on `8080`. Live SMTP credential send remains deployment-time validation.
- **Scope**: Validate `docker compose up`, PostgreSQL health, Valkey health, migrations, seed, `pnpm typecheck`, and production env sanity.
- **Done when**: Portal is ready to deploy behind Nginx at `portal.batarasec.com` on port `4000`.

---

## Production Readiness & Platform Integration

### [PROD] Generate production secrets dan configure .env di VPS
- **Main task**: Production Readiness & Platform Integration
- **Subtask**: PROD-01
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-28 — `scripts/gen-secrets.sh` dijalankan di VPS, semua secrets di-generate via `openssl rand`, `/opt/batarasec-portal/.env` dibuat dengan `chmod 600`, COOKIE_SECURE=true, PORTAL_URL=https://portal.batarasec.com. `pnpm deploy:check` pass.
- **Priority**: P1
- **Est**: ~30 menit
- **Scope**: Generate semua production secrets (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, LICENSE_SIGNING_SECRET, SETTINGS_ENCRYPTION_KEY), set COOKIE_SECURE=true, PORTAL_URL=https://portal.batarasec.com, SMTP credentials, dan buat file `.env` di VPS `/opt/batarasec-portal/.env`.
- **Done when**: `pnpm deploy:check` pass di VPS dengan env production (bukan placeholder).

### [PROD] Deploy portal ke VPS production (docker compose up)
- **Main task**: Production Readiness & Platform Integration
- **Subtask**: PROD-02
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-28 — repo di-pull ke VPS, Dockerfile difix (runner stage sekarang copy db/scripts/lib/hono/drizzle.config.ts/tsconfig.json), `docker compose up -d --build` berhasil, `pnpm db:migrate` applied successfully, `pnpm seed` created admin `novan.hariman@batarasec.com` (one-time password disimpan di credential.md), MinIO container up dan healthy. docker-compose.yml diupdate: portal expose `127.0.0.1:4000`, minio expose `127.0.0.1:9000/9001`.
- **Priority**: P1
- **Est**: ~1 jam
- **Depends on**: PROD-01
- **Scope**: Clone repo ke VPS, copy `.env`, jalankan `docker compose up -d`, run `pnpm db:migrate` dan `pnpm seed` di container, verify `GET /api/health` returns OK via Docker network.
- **Done when**: Portal berjalan di VPS port 4000, PostgreSQL + Valkey healthy, health endpoint OK.

### [PROD] Setup Nginx production di VPS untuk portal.batarasec.com
- **Main task**: Production Readiness & Platform Integration
- **Subtask**: PROD-03
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-28 — Nginx 1.24 diinstall di VPS host, Cloudflare Origin Certificate (valid s/d 2041) dipasang di `/etc/ssl/portal/`, `production.conf` diinstall (fix: `listen 443 ssl http2` untuk nginx 1.24 compatibility, upstream diubah dari Docker service names ke `127.0.0.1`), `nginx -t` pass, `https://portal.batarasec.com/api/health` returns HTTP/2 200 dengan HSTS + semua security headers.
- **Priority**: P1
- **Est**: ~1 jam
- **Depends on**: PROD-02
- **Scope**: Install dan configure Nginx di VPS host sebagai reverse proxy ke port 4000, setup TLS (certbot/Cloudflare origin cert), expose port 443. Portal app port 4000 tetap hanya di Docker network internal.
- **Done when**: `https://portal.batarasec.com/api/health` returns OK dengan TLS valid.

### [PROD] Live SMTP send validation di production
- **Main task**: Production Readiness & Platform Integration
- **Subtask**: PROD-04
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-28 — SMTP credentials (Hostinger) dikonfigurasi di VPS `.env`. Worker container `batarasec-portal-worker` ditambahkan ke `docker-compose.yml` (`restart: unless-stopped`, `command: pnpm worker:license-email`). License email berhasil dikirim ke `novanovn@gmail.com`. Tested beberapa sender: `noreply@batarasec.com` awalnya gagal (kemungkinan transient Hostinger delay), `novan.hariman@batarasec.com` dan `license@batarasec.com` keduanya berhasil masuk inbox. Setelah retest, `noreply@batarasec.com` pun masuk — kemungkinan masalah awal hanya timing/transient. `SMTP_FROM` production saat ini: `BataraSec <license@batarasec.com>`.
- **Priority**: P1
- **Est**: ~30 menit
- **Depends on**: PROD-02
- **Scope**: Jalankan `pnpm worker:license-email` di VPS dengan SMTP credential production. Generate 1 test license ke email internal dan konfirmasi email diterima + `emailSentAt` terupdate di DB.
- **Done when**: License email diterima di inbox dengan license key; `emailSentAt` populated di DB.

### [PROD] Generate customer + license untuk realtime validation test dari platform
- **Main task**: Production Readiness & Platform Integration
- **Subtask**: PROD-05
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-28 — Login ke `https://portal.batarasec.com/login`, buat customer dan generate license production. License key (`PORTAL_LICENSE_KEY`) tersimpan untuk dikonfigurasi di platform BataraSec.
- **Priority**: P1
- **Est**: ~30 menit
- **Depends on**: PROD-02
- **Scope**: Buat 1 customer dan 1 license di portal production. Simpan license key untuk dikonfigurasi di platform BataraSec sebagai `PORTAL_LICENSE_KEY`.
- **Done when**: License key tersedia, bisa langsung dipakai platform untuk `POST /api/licenses/validate` ke `https://portal.batarasec.com`.

### [PROD] Realtime license validation smoke test dari platform ke portal prod
- **Main task**: Production Readiness & Platform Integration
- **Subtask**: PROD-06
- **Owner**: Yudhistira + Karna
- **Status**: done
- **Worked**: 2026-05-28 — `PORTAL_KB_URL=https://portal.batarasec.com` dan `PORTAL_LICENSE_KEY` dikonfigurasi di platform env. Realtime license validation dan KB lookup smoke test dari platform ke portal production berhasil.
- **Priority**: P1
- **Est**: ~1 jam
- **Depends on**: PROD-03, PROD-05
- **Scope**: Set `PORTAL_KB_URL=https://portal.batarasec.com` dan `PORTAL_LICENSE_KEY=<key>` di platform env. Trigger `GET /api/kb/lookup` dari platform ke portal production. Verify respons valid, no timeout, audit log tercatat di portal.
- **Done when**: Platform berhasil call portal KB lookup via HTTPS dengan license bearer auth; response `{ found, entry }` diterima dalam < 3 detik; audit log ada di portal.

### [DOCS] Endpoint contract license validation + KB untuk platform integrators
- **Main task**: Production Readiness & Platform Integration
- **Subtask**: PROD-07
- **Owner**: Widura
- **Status**: done
- **Worked**: 2026-05-28 — design.md Section 13 (Platform Integration Contract: license validate, KB lookup/contribute/stats, error envelope, platform env vars) dan Section 14 (VPS deployment checklist, env table, staging vs prod diff, smoke test commands) selesai ditambahkan. Istilah batarasec-hub vs batarasec-portal diklarifikasi di Section 13.1.
- **Priority**: P2
- **Est**: ~1 jam
- **Scope**: Tambahkan section `## Platform Integration Contract` di `design.md` yang mendokumentasikan endpoint contract lengkap: license validate, KB lookup, KB contribute, KB stats — request/response shape, auth header, error codes, rate limits, timeout expectation, dan istilah `batarasec-hub` sebagai nama konsep lama yang kini diimplementasikan sebagai `batarasec-portal`.
- **Done when**: Platform developer bisa configure integrasi tanpa perlu membaca source code portal.

---

## Epic > 8 jam (multi-session)

### [PHASE2] BataraSec platform KB local cache integration
- **Main task**: Epic > 8 jam (multi-session)
- **Subtask**: EPIC-01
- **Owner**: Yudhistira + Arjuna
- **Status**: backlog
- **Priority**: P2
- **Est**: ~8 jam
- **Scope**: Main BataraSec platform caches central KB responses locally and uses portal lookup as optional upstream.
- **Done when**: Platform can use portal KB without blocking normal self-hosted operation.

### [PHASE3] Platform-to-portal central KB contribution integration
- **Main task**: Epic > 8 jam (multi-session)
- **Subtask**: EPIC-02
- **Owner**: Yudhistira + Bima
- **Status**: backlog
- **Priority**: P2
- **Est**: ~8 jam
- **Scope**: Main platform contributes sanitized AI analysis to portal central KB when customer opts in.
- **Done when**: Opt-in platform instances submit sanitized contributions and portal accepts/deduplicates them.

### [PHASE4] Portal CVE crawler worker
- **Main task**: Epic > 8 jam (multi-session)
- **Subtask**: EPIC-03
- **Owner**: Yudhistira + Bima
- **Status**: backlog
- **Priority**: P2
- **Est**: ~1 minggu
- **Scope**: Portal worker crawls CVE sources and seeds/updates KB entries.
- **Done when**: KB can be populated by crawler without manual curation or customer contributions.

### [PHASE5] Risk score with EPSS + CISA KEV
- **Main task**: Epic > 8 jam (multi-session)
- **Subtask**: EPIC-04
- **Owner**: Sadewa + Yudhistira + Bima
- **Status**: backlog
- **Priority**: P2
- **Est**: ~1 minggu
- **Scope**: Add EPSS/CISA KEV enrichment and calculated risk score.
- **Done when**: KB entries can expose risk score inputs and a computed priority score.

---

## Done Archive
> Completed task details are archived here to keep active backlog sections short.

### [AUTH] License bearer auth middleware
- **Main task**: Security & Auth
- **Subtask**: AUTH-03
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-27 — added signed license JWT helpers, Hono license bearer middleware, and `/api/licenses/auth-check` validation endpoint; verified missing/invalid bearer returns 401, valid active license returns 200, and revoked license returns 403 through Nginx staging.
- **Priority**: P1
- **Est**: ~2 jam
- **Depends on**: FND-03
- **Scope**: Implement middleware/helper that verifies `Authorization: Bearer <licenseKey>`, JWT signature, database status, expiry, customer status, and returns license context for KB/license APIs.
- **Done when**: `pnpm typecheck`, `pnpm build`, `docker compose up -d --build`, and bearer checks for missing/invalid/valid/revoked licenses pass through Nginx staging.

### [AUTH] Protected portal layout and route-level auth helpers
- **Main task**: Security & Auth
- **Subtask**: AUTH-02
- **Owner**: Arjuna + Yudhistira
- **Status**: done
- **Worked**: 2026-05-27 — added `requireAdmin()`, protected route group layout, sidebar navigation, placeholder protected pages (`/customers`, `/licenses`, `/kb`, `/audit`, `/settings`), kept middleware as UX-only redirect, cleared stale `.next`, rebuilt staging, and verified all protected routes through Nginx after login.
- **Priority**: P1
- **Est**: ~2 jam
- **Depends on**: AUTH-01
- **Scope**: Add auth helpers in `lib/auth.ts`, protected portal layout, login redirect middleware for UX only, and explicit server-side auth checks in protected server components/actions.
- **Done when**: `pnpm typecheck`, `pnpm build`, `docker compose up -d --build`, and authenticated checks for `/`, `/customers`, `/licenses`, `/kb`, `/audit`, `/settings` all pass through Nginx staging.

### [AUTH] Admin login, refresh, and logout
- **Main task**: Security & Auth
- **Subtask**: AUTH-01
- **Owner**: Yudhistira + Arjuna
- **Status**: done
- **Worked**: 2026-05-27 — added `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, Argon2id verify, JWT access/refresh cookies, Valkey session/token revocation, login rate limit, audit logs, `/login` UI, logout button, and server-side dashboard auth check.
- **Priority**: P1
- **Est**: ~4 jam
- **Depends on**: FND-03, FND-04
- **Scope**: Implement admin authentication baseline and login flow.
- **Done when**: Admin can login/logout through Nginx staging, refresh works, logout invalidates the token/session, failed login is audited, and 6th login attempt in the window returns 429.

### [FOUNDATION] Docker Compose for PostgreSQL and Valkey
- **Main task**: Quick Wins < 1 jam
- **Subtask**: QW-01
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-27 — added `docker-compose.yml` with PostgreSQL 16 and Valkey 8 on non-conflicting host ports `5433` and `6380`, persistent volumes, and healthchecks.
- **Priority**: P1
- **Est**: ~45 menit
- **Scope**: Add Docker Compose foundation for PostgreSQL and Valkey.
- **Done when**: `docker compose up -d postgres valkey` starts both services and `docker compose ps` reports both containers healthy.

### [FOUNDATION] Environment template
- **Main task**: Quick Wins < 1 jam
- **Subtask**: QW-02
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-27 — added `.env.example` with database, Valkey, JWT, license signing, portal URL, SMTP, and encryption settings.
- **Priority**: P1
- **Est**: ~30 menit
- **Scope**: Add environment template for local and deployment configuration.
- **Done when**: A new operator can copy `.env.example` to `.env` and see which secrets must be generated.

### [FOUNDATION] Initialize Next.js 15 + TypeScript strict project
- **Main task**: Foundation
- **Subtask**: FND-01
- **Owner**: Arjuna + Yudhistira
- **Status**: done
- **Worked**: 2026-05-27 — initialized pnpm project with Next.js 15, React 19, strict TypeScript, Tailwind baseline, dark theme tokens, and app shell.
- **Priority**: P1
- **Est**: ~1 jam
- **Scope**: Initialize Next.js 15 App Router foundation and project scripts.
- **Done when**: `pnpm install`, `pnpm typecheck`, `pnpm build`, and local app startup pass.

### [FOUNDATION] Add Hono API runtime under `/api`
- **Main task**: Foundation
- **Subtask**: FND-02
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-27 — added Hono route mounting through `app/api/[[...route]]/route.ts`, request IDs, secure headers, shared API response helpers, and `/api/health`.
- **Priority**: P1
- **Est**: ~2 jam
- **Scope**: Add Hono app entry and health route under Next.js `/api`.
- **Done when**: `GET /api/health` returns `{ success: true, data: { status: "ok", service: "batarasec-portal" } }`.

### [FOUNDATION] Drizzle schema and migration setup
- **Main task**: Foundation
- **Subtask**: FND-03
- **Owner**: Sadewa + Yudhistira
- **Status**: done
- **Worked**: 2026-05-27 — added Drizzle config, DB client, Phase 1 schema, generated initial SQL migration, and applied it to local PostgreSQL.
- **Priority**: P1
- **Est**: ~2 jam
- **Scope**: Add Drizzle config, DB client, migrations, and initial Phase 1 tables.
- **Done when**: `pnpm db:generate`, `pnpm db:migrate`, and `pnpm typecheck` pass.

### [FOUNDATION] Seed first portal admin
- **Main task**: Foundation
- **Subtask**: FND-04
- **Owner**: Yudhistira
- **Status**: done
- **Worked**: 2026-05-27 — added `scripts/seed.ts` to create `novan.hariman@batarasec.com` with an Argon2id one-time password and verified rerun does not overwrite it.
- **Priority**: P1
- **Est**: ~1 jam
- **Scope**: Add idempotent first-admin seed script.
- **Done when**: `pnpm seed` creates exactly one admin if absent and reports no password change on rerun.

### [DOCS] Initial portal planning documents
- **Main task**: Quick Wins < 1 jam
- **Subtask**: QW-03
- **Owner**: Widura
- **Status**: done
- **Worked**: 2026-05-26 — created and aligned `CLAUDE.md`, `TODO.md`, `design.md`, and `WORKLOG.md` for BataraSec Portal.
- **Priority**: P2
- **Est**: ~45 menit
- **Scope**: Establish project instructions, technical design, backlog, and worklog before implementation.
- **Done when**: Repo has docs matching the operational style of the main BataraSec platform docs.
