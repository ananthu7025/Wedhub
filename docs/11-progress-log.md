# Progress Log

> Running record of what has actually shipped. Updated **after** each Arch Phase completes — not in advance. See [`00-index.md`](00-index.md) for the Arch Phase / Product Phase distinction and [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md) for the Definition of Done every phase below must satisfy before being marked complete.

**Convention:** when an Arch Phase finishes, (1) flip its row in the status table below from `⬜ Not Started` to `✅ Done` with the date, (2) fill in that phase's section further down with real endpoints/tables/diagram/summary — replacing the placeholder text, never leaving it half-filled, and (3) tick every task checkbox in the corresponding stage file (`03`–`09`) for that phase.

---

## Status Overview

| Arch Phase | Name | Stage | Status | Completed |
|---|---|---|---|---|
| 0 | Architecture & Repository Setup | [Stage 1](03-stage-foundation.md) | ✅ Done | 2026-09-02 |
| 1 | PostgreSQL & ORM Foundation | [Stage 1](03-stage-foundation.md) | ✅ Done | 2026-09-02 |
| 2 | Authentication & Authorization | [Stage 1](03-stage-foundation.md) | ✅ Done | 2026-09-02 |
| 3 | User Module | [Stage 1](03-stage-foundation.md) | ✅ Done | 2026-09-02 |
| 4 | Category & Location Catalog | [Stage 1](03-stage-foundation.md) | ⬜ Not Started | — |
| 5 | Vendor Module | [Stage 2](04-stage-marketplace-supply.md) | ⬜ Not Started | — |
| 6 | Media & Portfolio | [Stage 2](04-stage-marketplace-supply.md) | ⬜ Not Started | — |
| 7 | Search & Discovery | [Stage 3](05-stage-discovery-engagement.md) | ⬜ Not Started | — |
| 8 | Favorites, Shortlists & Comparison | [Stage 3](05-stage-discovery-engagement.md) | ⬜ Not Started | — |
| 9 | Enquiries & Leads | [Stage 4](06-stage-lead-engine.md) | ⬜ Not Started | — |
| 10 | Reviews & Trust | [Stage 3](05-stage-discovery-engagement.md) | ⬜ Not Started | — |
| 11 | Subscription & Billing Foundation | [Stage 5](07-stage-monetization.md) | ⬜ Not Started | — |
| 12 | Entitlement Enforcement | [Stage 5](07-stage-monetization.md) | ⬜ Not Started | — |
| 13 | Featured Listings & Promotions | [Stage 5](07-stage-monetization.md) | ⬜ Not Started | — |
| 14 | Notifications | [Stage 6](08-stage-telegram-and-admin.md) | ⬜ Not Started | — |
| 15 | Telegram Bot MVP | [Stage 6](08-stage-telegram-and-admin.md) | ⬜ Not Started | — |
| 16 | Admin Platform Backend | [Stage 6](08-stage-telegram-and-admin.md) | ⬜ Not Started | — |
| 17 | CMS & SEO Backend | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 18 | Analytics & Marketplace Metrics | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 19 | Security Hardening | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 20 | Testing | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 21 | Observability | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 22 | Docker & Deployment | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 23 | Backup & Disaster Recovery | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 24 | Performance Optimization | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 25 | Production Readiness Review | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |

**Overall: 4 / 26 Arch Phases complete.**

---

## How each phase entry is written (template — copy this block per phase when it ships)

```
## Arch Phase N — <Name>

**Status:** ✅ Done — <date>
**Stage:** <link to stage file>

### What this unlocks
<1-3 sentences: what a user/vendor/admin can now do that they couldn't before.>

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | /api/v1/... | ... | ... |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| ... | ... | ... |

### Flow

\`\`\`
Client → Controller → Service → Repository → DB
   |                     |
   |                     └─→ (side effects: queued jobs, external calls)
   └─→ Response
\`\`\`

### Notes
<Any deviation from the stage file's plan, decisions made, follow-ups created.>
```

---

## Phase Entries

## Arch Phase 0 — Architecture & Repository Setup

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 1 — Foundation](03-stage-foundation.md)

### What this unlocks

A running Express + TypeScript server with validated environment config, structured logging, a standard success/error API envelope, centralized error classes, and the full module folder scaffold. Nothing user-facing yet — this is the substrate every later phase builds directly on top of.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/health` | Liveness check | None |
| GET | `/api/v1` | API root / version info | None |

### Tables created

None — database work starts in Arch Phase 1.

### Flow

```
Client
  │
  ▼
requestIdMiddleware  (assigns/propagates x-request-id)
  │
  ▼
pino-http            (structured request/response logging)
  │
  ▼
Route handler        (/health, /api/v1, or a mounted module router later)
  │
  ├─→ success ──────────────────────────► successResponse() ──► JSON { success:true, data, meta? }
  │
  └─→ throws AppError ──► errorMiddleware ──► errorResponse() ──► JSON { success:false, error }
                              │
                              └─→ unknown/non-AppError errors are logged and returned as 500
                                   with a generic message in production, real message in dev

unmatched route ──► notFoundMiddleware ──► 404 in the same standard error envelope
```

### Notes

- `docker` is not installed on the development machine used to build this phase — `docker-compose.yml` (Postgres 16 + Redis 7) is written and reviewed but **not yet run or verified**. Install Docker Desktop and run `docker compose up -d` before starting Arch Phase 1.
- `db:migrate` / `db:seed` / `db:reset` npm scripts exist but intentionally fail with a message (`"will be wired to Prisma in Arch Phase 1"`) rather than silently no-op — avoids the false impression that database tooling already works.
- Dev/start scripts use Node's native `--env-file=.env` flag, which requires **Node ≥ 20.6** (bumped from the initially planned ≥20.0 after discovering the flag's actual minimum version during verification).
- `tsconfig.json` uses `exactOptionalPropertyTypes: true` — stricter than a typical starter config, but caught two real type-shape issues during setup (an over-loose `details?` field, and a `meta` field typed too generically for `paginatedResponse`) before any real feature code was written on top of them.
- A known moderate/high/critical `npm audit` finding traces entirely to `esbuild`, a transitive dependency of `vitest`'s dev-only tooling (Vite dev server) — it does not affect the running Express application. Left unresolved for now since fixing it requires a breaking `vitest` v4 upgrade; revisit when Arch Phase 20 (Testing) is implemented.
- Git repository initialized at the `WedHub/` root (not just inside `wedhub-backend/`) so `docs/`, `product.md`, and the architecture doc are version-controlled alongside the backend code.

## Arch Phase 1 — PostgreSQL & ORM Foundation

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 1 — Foundation](03-stage-foundation.md)

### What this unlocks

PostgreSQL is now the live source of truth: Prisma schema, first migration, and a seed script are all applied against a real Postgres container. The app's `/health` endpoint reports actual database connectivity (not just process liveness), and a `PrismaClient` singleton is available for every module built from here on. Dynamic, DB-driven RBAC (`roles`/`permissions`/`role_permissions`) is seeded and ready for Arch Phase 2 (Auth) to consume — no API endpoints exist yet, this phase is schema + client + migration only.

### APIs completed

None — schema-only phase. `GET /health` (from Arch Phase 0) was extended to report `database: "connected" | "unreachable"` alongside process status.

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Core account record for every actor | `id`, `email` (unique), `phone` (unique, nullable), `password_hash`, `role` (enum: `END_USER`/`VENDOR`/`ADMIN`), `status` (enum), `deleted_at` (soft delete) |
| `user_profiles` | 1:1 profile data separate from auth-critical fields | `user_id` (pk/fk), `first_name`, `last_name`, `preferences` (JSONB) |
| `roles` | Dynamic, admin-manageable permission groups (distinct from the coarse `User.role` enum) | `id`, `name` (unique), `is_system` |
| `permissions` | Individual permission strings, e.g. `vendor:approve` | `id`, `resource`, `action` (unique together) |
| `role_permissions` | Many-to-many join | `role_id`, `permission_id` (composite pk) |
| `admin_users` | Marks a user as staff and assigns their dynamic role | `user_id` (pk/fk), `role_id` (fk) |
| `audit_logs` | Append-only record of admin mutations | `id`, `actor_id`, `action`, `entity_type`/`entity_id`, `before`/`after` (JSONB) |

Seed data: 14 system permissions and 3 system roles (`admin` → all 14; `end_user` and `vendor` → 5 scoped permissions each).

### Flow

```
prisma/schema.prisma
     │
     ▼
npx prisma migrate dev   ──►  applies SQL migration  ──►  Postgres (Docker, host port 5433)
     │
     ▼
npx prisma generate      ──►  typed PrismaClient  ──►  src/config/database.ts (singleton)
                                                              │
                                                              ├─→ app.ts's /health handler
                                                              │     runs prisma.$queryRaw`SELECT 1`
                                                              │     → 200 {database:"connected"}
                                                              │     → 503 {database:"unreachable"} on failure
                                                              │
                                                              └─→ server.ts's shutdown handler
                                                                    calls disconnectDatabase() before exit

npm run db:seed  ──►  prisma/seed.ts  ──►  upserts permissions → roles → role_permissions
```

### Notes

- **Port conflict discovered and resolved:** this machine already runs a native Windows PostgreSQL service bound to port 5432, separate from Docker. The container's host port was remapped to **5433** in `docker-compose.yml` (and `DATABASE_URL`/`.env.example` updated to match) rather than touching the native service. If you set this up on a different machine, port 5432 may work fine — check for a conflict first (`netstat -ano | findstr 5432` on Windows) before assuming.
- **`prisma.config.ts` added** — Prisma's newer config-file approach replaces the deprecated `package.json#prisma.seed` field. It does not auto-load `.env` the way the old integration did, so it calls `process.loadEnvFile(".env")` explicitly. This raised the effective Node minimum from ≥20.6 (Phase 0) to **≥20.12** (`package.json` engines and the README updated accordingly).
- **RBAC design decision:** `roles`/`permissions`/`role_permissions` are modeled as dynamic, database-driven tables (not a hardcoded enum) specifically to satisfy product.md's admin-configurable staff-permission requirement (Operations Admin, Vendor Manager, Sales, Finance, Content Manager, Moderator, Support). Only generic bootstrap roles (`admin`, `end_user`, `vendor`) are seeded now; the specific named admin roles get seeded when Arch Phase 16 (Admin) actually implements permission management — seeding them speculatively now would be unused scaffolding.
- **Correction (2026-09-02, same day):** the project has only 3 primary actor roles — `END_USER`, `VENDOR`, `ADMIN` — no `SUPER_ADMIN`. The `User.role` enum, the seeded RBAC role (renamed `super_admin` → `admin`), and every reference across `docs/`, `product.md`, and the architecture doc were updated to drop it. A new migration (`remove_super_admin_role`) was applied to alter the enum and rename the seed row on the live database.
- **`avatar_media_id` and `city_id`** on `user_profiles` are plain nullable UUID columns with no foreign-key constraint yet, since the `media` and `locations` tables don't exist until Arch Phase 6 and Arch Phase 4 respectively. The FK constraints should be added in a follow-up migration once those tables land — noting this so it isn't forgotten.
- **A new `npm audit` finding** appeared after installing `prisma`: a high-severity `deepmerge-ts` stack-exhaustion advisory, reachable only through `@prisma/config`'s dev-time config merging (not the running app). `npm audit fix` did not resolve it without a Prisma major-version bump; left as-is for the same reason as the pre-existing `esbuild`/vitest finding — revisit at Arch Phase 19 (Security Hardening) rather than force an upgrade now.
- Verified full reproducibility: `docker compose down -v` (destroys the volume) → `docker compose up -d` → `prisma migrate dev` → `db:seed` produced an identical table/seed-data state to the first run.

## Arch Phase 2 — Authentication & Authorization

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 1 — Foundation](03-stage-foundation.md)

### What this unlocks

Real users can now register, log in with email or phone, and hold an authenticated session across requests. Every future module can gate an endpoint behind `authenticateMiddleware` (who is this?) and `authorize(...)` (are they allowed?) without reimplementing auth. Password reset and email verification exist end-to-end at the data/token level, with real email delivery stubbed as a logged link until Arch Phase 14 wires up the notification service.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Create an END_USER or VENDOR account | None |
| POST | `/api/v1/auth/login` | Email-or-phone + password → access token + refresh cookie | None |
| POST | `/api/v1/auth/logout` | Revoke current refresh token, clear cookie | Refresh cookie |
| POST | `/api/v1/auth/refresh` | Rotate refresh token, issue new access token | Refresh cookie |
| POST | `/api/v1/auth/verify-email` | Consume email verification token | None (token in body) |
| POST | `/api/v1/auth/forgot-password` | Issue password reset token (always 200, no user-enumeration) | None |
| POST | `/api/v1/auth/reset-password` | Consume reset token, set new password, revoke all sessions | None (token in body) |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `refresh_tokens` | Opaque refresh tokens, hashed at rest, with a rotation chain for theft detection | `id`, `user_id`, `token_hash` (unique), `expires_at`, `revoked_at`, `replaced_by_id` (self-fk) |
| `email_verification_tokens` | One-time tokens for email confirmation | `id`, `user_id`, `token_hash` (unique), `expires_at`, `used_at` |
| `password_reset_tokens` | One-time tokens for password resets | `id`, `user_id`, `token_hash` (unique), `expires_at`, `used_at` |

`users` gained `failed_login_attempts` and `locked_until` columns for account lockout.

### Flow

```
Client
  │
  ▼
POST /auth/login  (rate-limited: 10/15min)
  │
  ▼
auth.controller → auth.service.login()
  │
  ├─ user locked? ──► AuthenticationError (locked message)
  ├─ wrong password? ──► increment failed_login_attempts
  │                       5th failure ──► set locked_until, return locked message
  └─ correct password ──► reset attempts, issue token pair
                              │
                              ├─→ JWT access token (15m, stateless, in response body)
                              └─→ opaque refresh token (30d, httpOnly+secure+sameSite=strict cookie)
                                   only its SHA-256 hash is stored in refresh_tokens

Later: POST /auth/refresh (cookie only)
  │
  ├─ token hash not found ──► AuthenticationError
  ├─ token already revoked ──► REUSE DETECTED
  │                             → revoke every refresh_token row for that user
  │                             → AuthenticationError ("all sessions revoked")
  ├─ token expired ──► AuthenticationError
  └─ valid ──► issue new pair, mark old row revoked_at + replaced_by_id (rotation)

Any protected route:
  Authorization: Bearer <access token>
       │
       ▼
  authenticateMiddleware (verifies JWT, attaches req.user)
       │
       ▼
  authorize(Role.X, Role.Y)  (checks req.user.role against allow-list)
       │
       ▼
  route handler
```

### Notes

- **New cross-cutting infrastructure this phase surfaced but wasn't explicitly scoped in the plan:** an `asyncHandler` wrapper (Express 4 doesn't auto-catch rejected promises from async route handlers — without it, errors thrown in `auth.service.ts` would become unhandled rejections instead of reaching `errorMiddleware`) and a generic `validateBody(schema)` Zod middleware (every module needs request validation per Coding Rule 4; this is now the one shared implementation, not reinvented per module). Both live in `common/`, not the auth module, since every future module needs them.
- **Refresh token reuse detection:** presenting an already-rotated (revoked) refresh token is treated as a signal of token theft — the entire session chain for that user is revoked, not just the presented token. Verified manually: rotating a token, then replaying the *old* cookie, correctly revoked both the old and the newly-issued token, forcing a fresh login.
- **Password reset revokes all sessions:** confirmed via direct DB query that all 5 refresh tokens issued during testing were marked revoked after a single `/reset-password` call — a password reset should not leave old sessions valid.
- **Logout and rotation share one `revoked_at` field**, so presenting a token after ordinary logout returns the same "already been used, all sessions revoked" message as genuine reuse-detection. This is a deliberate simplification (safe-by-default: over-revoking on any revoked-token presentation causes no harm since the user already intended to end that session) rather than a bug — flagging here so it isn't mistaken for one later.
- **Email verification / password reset "sending"** is a `logger.info` line containing the raw token, clearly marked with a `// TODO(Arch Phase 14)` comment — real delivery arrives with the notification service, not before.
- **Rate limiting is in-memory** (`express-rate-limit`'s default store), not Redis-backed — acceptable for a single-instance dev/MVP setup per architecture.md's "Redis optional pre-MVP," but will not share state across multiple API instances once the app scales horizontally. Revisit when Arch Phase 14 introduces Redis.
- Verified the full flow end-to-end manually: register → duplicate-email rejection (409) → login → 5-failed-attempts lockout → refresh rotation → reuse-detection chain revocation → logout → authenticate/authorize middleware (401 no token, 401 malformed, 403 wrong role, 200 correct role) → rate limiting (429 past threshold) → email verification (one-time use) → forgot-password (identical response for existing vs. non-existent email) → reset-password (old password stops working, all sessions revoked). Also confirmed full reproducibility via `docker compose down -v` → migrate → seed → register on a completely fresh database.

## Arch Phase 3 — User Module

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 1 — Foundation](03-stage-foundation.md)

### What this unlocks

An authenticated user can now read and edit their own profile, optionally record wedding details for future personalization/matching, deactivate their own account, and permanently anonymize it. This is the first module to actually sit behind Arch Phase 2's `authenticateMiddleware`, and the first real (if implicit) exercise of ownership scoping — every route operates on `req.user.id`, never an arbitrary path parameter.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/v1/users/me` | Fetch own account + profile + wedding profile | Access token |
| PATCH | `/api/v1/users/me` | Partially update own profile (name, avatarUrl, bio, preferences) | Access token |
| PUT | `/api/v1/users/me/wedding-profile` | Create or partially update own wedding profile | Access token |
| DELETE | `/api/v1/users/me/wedding-profile` | Remove own wedding profile | Access token |
| POST | `/api/v1/users/me/deactivate` | Self-service deactivation (`status → DEACTIVATED`) | Access token |
| DELETE | `/api/v1/users/me` | Anonymize account (not a hard delete) | Access token |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `wedding_profiles` | Optional 1:1 wedding details per user, for future personalization/vendor matching | `id`, `user_id` (unique fk), `wedding_date`, `guest_count`, `estimated_budget`, `wedding_style`, `partner_name`, `notes` |

`user_profiles` gained `avatar_url` (plain string, separate from the `avatar_media_id` UUID column reserved for Arch Phase 6's real media FK).

### Flow

```
Authenticated request (Authorization: Bearer <token>)
     │
     ▼
authenticateMiddleware  (from Arch Phase 2 — verifies JWT, attaches req.user)
     │
     ▼
users.routes → users.controller → requireUserId(req)  (reads req.user.id only)
     │
     ▼
users.service → users.repository (Prisma)
     │
     ├─ GET /me            → findUserWithProfile (include profile + weddingProfile)
     ├─ PATCH /me          → upsertProfile (omitUndefined strips absent fields before hitting Prisma)
     ├─ PUT .../wedding-profile → upsertWeddingProfile (same omitUndefined pattern)
     ├─ DELETE .../wedding-profile → deleteWeddingProfile
     ├─ POST .../deactivate → setUserStatus(DEACTIVATED)
     └─ DELETE /me          → anonymizeUser (single $transaction:
                                 scramble email/phone, unusable password hash,
                                 set deletedAt + status=DEACTIVATED,
                                 null all profile PII, delete wedding profile,
                                 revoke every still-active refresh token)
```

### Notes

- **Real gap found and fixed during this phase's verification:** `auth.service.login()` (Arch Phase 2) never checked `user.status` — a deactivated or suspended account could still log in and receive valid tokens. Fixed by checking status *after* password verification (so a wrong password never leaks whether an account is deactivated to someone who doesn't have the password) and *before* issuing tokens. Verified: deactivating a test user, then attempting login with correct credentials, now correctly returns 401 "This account has been deactivated." This fix lives in `auth.service.ts`, not this module, since it's Arch Phase 2's responsibility — Phase 3 only surfaced the gap by being the first thing to actually set `DEACTIVATED`.
- **`omitUndefined` helper** (`users.repository.ts`) strips keys whose value is `undefined` before building Prisma `create`/`update` payloads, with a type (`DefinedFields<T>`) that correctly tells the compiler the remaining keys are genuinely present — needed because `exactOptionalPropertyTypes` treats "key present with value `undefined`" as a distinct, disallowed state from "key absent," and Prisma's generated input types don't accept explicit `undefined` for absent optional fields. This pattern will likely recur in every future module doing partial updates; worth reusing rather than reinventing.
- **Anonymization keeps the `users` row** rather than hard-deleting it — per the soft-delete convention and architecture.md §47 ("do not automatically physically delete important business records"). Verified via direct DB query: email scrambled to `deleted-<uuid>@wedhub.invalid`, phone cleared, password hash replaced with an unusable random value, `deleted_at` set, all profile PII nulled, wedding profile removed, and all refresh tokens revoked — then confirmed login with the original email fails (no account resolves to it anymore).
- **Self-deactivation vs. anonymization are deliberately separate, distinct actions** — deactivation is reversible (nothing in this phase re-activates it yet; that's an admin/future concern), anonymization is one-way. Kept as two endpoints so "I want a break" and "delete my data" aren't conflated.
- Verified end-to-end: `GET /me` before/after `PATCH /me` (full and partial updates — confirmed partial updates leave untouched fields intact), wedding profile create/partial-update/delete, deactivation blocking login, and full anonymization blocking login with the original credentials. Also confirmed full reproducibility via `docker compose down -v` → migrate (all 4 migrations in sequence) → seed → health check on a completely fresh database.
