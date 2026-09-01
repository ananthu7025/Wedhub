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
| 4 | Category & Location Catalog | [Stage 1](03-stage-foundation.md) | ✅ Done | 2026-09-02 |
| 5 | Vendor Module | [Stage 2](04-stage-marketplace-supply.md) | ✅ Done | 2026-09-02 |
| 6 | Media & Portfolio | [Stage 2](04-stage-marketplace-supply.md) | ⚠️ Code done, R2 unverified | 2026-09-02 |
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

**Overall: 7 / 26 Arch Phases complete (Phase 6's R2 upload flow pending real credentials). Stage 1 (Foundation) and Stage 2 (Marketplace Supply) are code-complete.**

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

## Arch Phase 4 — Category & Location Catalog

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 1 — Foundation](03-stage-foundation.md) — **this phase completes Stage 1.**

### What this unlocks

The dynamic, admin-managed taxonomy the whole marketplace is organized around: 20 wedding-service categories (with subcategory support via self-referencing `parentId`), a structured attribute-definition system per category (not just a JSONB blob — genuinely queryable, ready for Arch Phase 7's search filters and the comparison engine referenced in product.md §16), and a Country → State → City → Area location hierarchy seeded with India-first data. Arch Phase 5 (Vendors) can now assign a vendor to a real category and city instead of a placeholder.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/v1/categories` | List active categories with their attributes | None |
| GET | `/api/v1/categories/:slug` | Get one category + attributes + subcategories | None |
| POST | `/api/v1/categories` | Create a category or subcategory | ADMIN |
| PATCH | `/api/v1/categories/:id` | Update name/description/sortOrder/isActive | ADMIN |
| POST | `/api/v1/categories/:id/attributes` | Define a new attribute on a category | ADMIN |
| PATCH | `/api/v1/categories/:id/attributes/:attributeId` | Update an attribute definition | ADMIN |
| DELETE | `/api/v1/categories/:id/attributes/:attributeId` | Remove an attribute definition | ADMIN |
| GET | `/api/v1/locations` | List locations, filtered by `?type=` / `?parentId=` | None |
| POST | `/api/v1/locations` | Create a location node (hierarchy-checked) | ADMIN |
| PATCH | `/api/v1/locations/:id` | Update a location node | ADMIN |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `categories` | Self-referencing category/subcategory tree | `id`, `name`, `slug` (unique), `parent_id` (self-fk), `sort_order`, `is_active` |
| `category_attributes` | Admin-defined attribute *schema* per category (not vendor-filled values — those arrive in Arch Phase 5) | `id`, `category_id`, `key`, `label`, `data_type` (enum), `options` (JSONB, SELECT/MULTI_SELECT only), `is_filterable`, `is_comparable` |
| `locations` | Self-referencing Country/State/City/Area hierarchy in one polymorphic table | `id`, `type` (enum), `name`, `slug`, `parent_id` (self-fk) |

Seeded: 20 categories (product.md §13's full list), attribute definitions for Photography (5), Venues (6), and Makeup Artists (4) from product.md §7, plus India → 5 states → 6 metro cities (Mumbai, Delhi, Bengaluru, Chennai, Hyderabad, Pune).

### Flow

```
GET /categories (public)
     │
     ▼
categories.repository.findActiveCategories()
     │  (include: attributes, ordered by sortOrder)
     ▼
returns categories the public site/app can render with real filter/comparison metadata

POST /categories/:id/attributes (ADMIN only)
     │
     ▼
authenticateMiddleware → authorize(Role.ADMIN)
     │
     ▼
createAttributeSchema.superRefine()
     │  SELECT/MULTI_SELECT → options required
     │  BOOLEAN/NUMBER/TEXT → options must be absent
     ▼
categories.service.createAttribute() → unique-constraint-violation caught
     │  and translated to ConflictError (not a raw Postgres error)
     ▼
category_attributes row created

POST /locations (ADMIN only)
     │
     ▼
locations.service.createLocation()
     │  looks up LOCATION_HIERARCHY[type] → expected parent type
     │  COUNTRY expects no parent; STATE expects COUNTRY; CITY expects STATE; AREA expects CITY
     │  mismatch → ValidationError naming the actual vs. expected parent type
     ▼
locations row created with a slug unique per (parentId, slug) — not globally unique,
so "Delhi" the city and a hypothetical "Delhi" area under a different city could coexist
```

### Notes

- **Two doc inconsistencies found and resolved, not silently:** (1) architecture.md's admin task list says "neighborhoods" for the finest location tier, product.md's hierarchy definition says "Area" — standardized on `Area`/`AREA` since it's the actual schema-defining term. (2) architecture.md's only location example is Toronto/Canada; product.md states an explicit India-first launch strategy (Razorpay, ₹ pricing elsewhere in the same doc) — seeded India + metro cities instead, since the Toronto example was illustrating the *service-area concept*, not committing to a launch market.
- **Design choice, not oversight:** `locations` is one polymorphic self-referencing table (type + parentId distinguish tiers) rather than four separate `countries`/`states`/`cities`/`areas` tables. Simpler to seed and query generically, at the cost of the database itself not enforcing "a CITY's parent must be a STATE" — that invariant lives in `locations.service.ts` instead, and was verified working (a CITY under a COUNTRY, and a COUNTRY with a parent, both correctly rejected with a 400 naming the mismatch).
- **`category_attributes` is a schema-definition table, not vendor data.** It defines *what* attributes a category has (e.g. Photography has a "Photography Style" attribute with three SELECT options) — it does not store any particular vendor's answer to that attribute. Vendor-supplied attribute *values* arrive with the vendor model in Arch Phase 5. Worth being explicit about this since the table name alone doesn't make the distinction obvious.
- **`omitUndefined`/`DefinedFields<T>` helper extracted to `common/utils/object.util.ts`** — first written ad hoc in the Arch Phase 3 users module, now a shared utility since categories and locations needed the identical pattern for `exactOptionalPropertyTypes`-safe partial updates. Also added `validateQuery` alongside the existing `validateBody` in `common/middleware/validate.middleware.ts`, since this is the first module needing query-string validation (`?type=`, `?parentId=`) — both will very likely be needed by every future list/search endpoint.
- **A Prisma-specific gotcha hit during seeding:** `prisma.location.upsert()` with a compound-unique `where` clause (`{ parentId_slug: { parentId: null, slug: ... } }`) rejects a literal `null` for the key field, even though the underlying Postgres unique index handles `NULL` correctly. Only affects the one parent-less row (India, the country); worked around with `findFirst` + conditional `create` instead of `upsert` for that single case — states and cities always have a real parent, so their `upsert` calls are unaffected.
- **Found and safely handled a second stray credential file** in the repo working directory (`rzp-key (1).csv`, a Razorpay test-mode key/secret pair) — same pattern as the earlier `server.md` SSH-credential file from Arch Phase 0. Neither was created by this session; both are left on disk (may be intentional local files for later Razorpay integration work in Arch Phase 11) but added to `.gitignore` so they can't be accidentally committed.
- Verified end-to-end: public category/location reads work unauthenticated; category and location writes correctly return 401 (no token) / 403 (wrong role) / 201 (ADMIN); SELECT-without-options and BOOLEAN-with-options both rejected with clear validation messages; deactivating a category removes it from the public list; location hierarchy invariants enforced in both directions. Confirmed full reproducibility and seed idempotency: `docker compose down -v` → migrate (all 5 migrations) → seed → re-seed (identical row counts, no duplicates) → health check, all on a completely fresh database.

## Arch Phase 5 — Vendor Module

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 2 — Marketplace Supply](04-stage-marketplace-supply.md)

### What this unlocks

Vendors can now exist, own a rich profile, and go through a real approval workflow — the first phase with genuine end-to-end marketplace content. Both onboarding routes from product.md §5 are live: self-registration (a VENDOR user builds a profile through DRAFT and submits it) and admin-created shells with an invitation/claim flow for businesses onboarded by WedHub staff. This is also the first phase to give `authorize(Role.ADMIN)` a real, non-test consumer, and the first to model a genuine cross-doc-conflict resolution end-to-end (the verification-level enum, [Risk 6](10-risks-and-open-questions.md#6-verification-level-enum-mismatch), now resolved).

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/v1/vendors` | Create own vendor shell (Route A) | VENDOR |
| GET | `/api/v1/vendors/me/detail` | Fetch own vendor (full detail) | owned |
| PATCH | `/api/v1/vendors/me/detail` | Update business name (slug frozen post-DRAFT) | owned |
| PUT | `/api/v1/vendors/me/profile` | Upsert rich profile fields | owned |
| PUT | `/api/v1/vendors/me/categories` | Set primary + subcategories | owned |
| PUT | `/api/v1/vendors/me/service-areas` | Set service-area locations | owned |
| PUT | `/api/v1/vendors/me/attributes` | Set category-attribute values (typed per dataType) | owned |
| POST/DELETE | `/api/v1/vendors/me/services(/:serviceId)` | Attach/detach catalog services | owned |
| POST/PATCH/DELETE | `/api/v1/vendors/me/packages(/:packageId)` | Manage packages | owned |
| POST | `/api/v1/vendors/me/submit` | Submit for review | owned |
| GET | `/api/v1/vendors` | Public listing (thin stub — real search is Arch Phase 7) | none |
| GET | `/api/v1/vendors/:slug` | Public profile (APPROVED only) | none |
| GET | `/api/v1/vendors/claim/:token` | Resolve an invitation | none |
| POST | `/api/v1/vendors/claim/register` | Claim by registering a new account | none |
| POST | `/api/v1/vendors/claim/link` | Claim by linking an existing logged-in account | access token |
| GET/POST | `/api/v1/admin/vendors` | Admin list/create (Route B) | ADMIN |
| GET/PATCH | `/api/v1/admin/vendors/:id` | Admin detail/direct edit | ADMIN |
| POST | `/api/v1/admin/vendors/:id/invitations` | Generate a claim invitation | ADMIN |
| POST | `/api/v1/admin/vendors/:id/verify` | Set verification level | ADMIN |
| POST | `/api/v1/admin/vendors/:id/{approve,reject,suspend,restore,deactivate}` | Status transitions | ADMIN |
| GET | `/api/v1/admin/vendors/:id/status-history` | Full audit trail | ADMIN |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `vendors` | Identity/status/ownership — small, hot, frequently joined | `id`, `owner_user_id` (unique, nullable until claimed), `business_name`, `slug` (unique), `status`, `creation_source`, `verification_level`, `profile_completeness` |
| `vendor_profiles` | Rich content, 1:1 via shared PK — mirrors `User`/`UserProfile` | `vendor_id` (pk), pricing/contact/SEO/operational fields, `social_links`/`business_hours` (JSONB) |
| `vendor_categories` | Primary + subcategory assignments | `(vendor_id, category_id)` pk, `is_primary` — **partial unique index** `WHERE is_primary` enforces at most one primary per vendor at the DB level |
| `vendor_service_areas` | Additional locations served, distinct from `vendors.city_id` | `(vendor_id, location_id)` pk |
| `vendor_attribute_values` | A vendor's values for their category's defined attributes | `(vendor_id, attribute_id)` pk, typed nullable columns: `value_text`/`value_number`/`value_boolean`/`value_options` |
| `services` | Admin-curated catalog per category (not free text) | `category_id` fk, `name`, `slug` (unique per category) |
| `vendor_services` | Vendor-to-service attachment | `(vendor_id, service_id)` pk, optional `note` |
| `packages` | Vendor-owned bespoke packages | `vendor_id` fk, `name`, `price`, `inclusions` (String[]) |
| `vendor_invitations` | Route B claim mechanism — exact mirror of `email_verification_tokens` | `token_hash` (unique), `invited_by_admin_id`, `claimed_by_user_id`, `expires_at`, `used_at` |
| `vendor_status_history` | Vendor-facing status audit trail (product.md §41's "approval history must be stored") | `from_status`/`to_status` (nullable `from_status` for the initial DRAFT event), `reason`, `changed_by_user_id` |

### Flow

```
Route A (self-registration)
  VENDOR user
    │
    ▼
  POST /vendors  ──►  vendor.service.createVendorForOwner()
    │                    unique-slug generation + VendorStatusHistory(null→DRAFT)
    ▼
  PUT .../profile, .../categories, .../service-areas, .../attributes,
  POST .../services, .../packages
    │  each mutation ──► recalculateCompleteness(vendorId)
    │                       fetches vendor + relations ──► calculateCompleteness()
    │                       weighted checklist ──► stores Vendor.profileCompleteness
    ▼
  POST /vendors/me/submit
    │
    ├─ missingRequiredForSubmission non-empty? ──► ValidationError, listing what's missing
    │
    └─ owner.emailVerifiedAt set?
         ├─ yes ──► status = PENDING_APPROVAL
         └─ no  ──► status = PENDING_VERIFICATION
                       (self-heals to PENDING_APPROVAL on next GET /vendors/me/detail
                        once the owner verifies — vendor.service.advanceIfEmailNowVerified,
                        no direct call from auth.service into the vendor module)
    ▼
  ADMIN: POST /admin/vendors/:id/approve  ──►  status = APPROVED, approvedAt set
    │       (writes VendorStatusHistory + AuditLog together, one transaction)
    ▼
  GET /vendors/:slug  (public, unauthenticated)  ──►  visible now

Route B (admin-created)
  ADMIN: POST /admin/vendors  ──►  Vendor{ownerUserId: null, creationSource: ADMIN_CREATED}
    ▼
  POST /admin/vendors/:id/invitations  ──►  VendorInvitation{tokenHash, expiresAt}
    │                                          (logged, stubbed — no email yet)
    ▼
  Public: GET /vendors/claim/:token  ──►  {businessName} (confirm before claiming)
    ▼
  POST /vendors/claim/register  OR  POST /vendors/claim/link
    │        (new account)               (existing VENDOR-role, authenticated)
    ▼
  completeClaim(): Vendor.ownerUserId set, invitation.usedAt set,
                   VendorStatusHistory(null→DRAFT, "invitation claimed")
    ▼
  converges into Route A's mutation surface (PUT .../profile, etc.)
```

### Notes

- **Verification-level enum mismatch ([Risk 6](10-risks-and-open-questions.md#6-verification-level-enum-mismatch)) is now resolved** — used product.md §25's 4 levels. `VerificationLevel` is deliberately decoupled from the `DRAFT→APPROVED` status machine: it's an independent, admin-awarded trust badge (`POST /admin/vendors/:id/verify`) that can change at any vendor status, not a gate the vendor must pass through to get approved. This was a genuine judgment call (both docs used "example"/"possible" framing, not a settled schema) — confirmed with the user before implementation, not silently decided.
- **The partial unique index for "at most one primary category per vendor" was manually added to the generated migration SQL** — Prisma's schema DSL cannot express a partial unique index (`CREATE UNIQUE INDEX ... WHERE is_primary`) directly. Used `prisma migrate dev --create-only`, hand-edited `migration.sql`, then applied. **Verified directly via SQL**: inserting a second `is_primary=true` row for the same vendor correctly raises a unique-constraint violation. This is a DB-level backstop against a race condition, not just service-layer trust.
- **Changing an APPROVED vendor's primary category re-triggers `PENDING_APPROVAL`** (subcategory-only changes do not) — confirmed with the user as the safer default, preventing a vendor from inheriting approved status in an unreviewed category. Verified live: switching Photography→Videography on an approved test vendor flipped it back to `PENDING_APPROVAL` and removed it from public search until re-approved.
- **A real cross-module design question surfaced and was resolved without coupling `auth` to `vendors`:** a vendor that submits before its owner verifies their email needs to eventually reach `PENDING_APPROVAL`, but `auth.service.verifyEmail()` has no reason to know vendors exist (wrong direction of dependency for a modular monolith). Resolved by having `vendor.service.advanceIfEmailNowVerified()` run opportunistically on every `GET /vendors/me/detail` — the transition happens on the vendor's next read after verifying, with zero cross-module calls. Verified: manually setting `email_verified_at`, then re-fetching `/vendors/me/detail`, correctly flipped `PENDING_VERIFICATION → PENDING_APPROVAL`.
- **Reused rather than duplicated:** exported `issueTokenPair` from `auth.service.ts` and `setRefreshCookie` from `auth.controller.ts` so `vendor-claim`'s register-and-claim flow immediately authenticates the new owner (same JWT + refresh-cookie issuance as normal login), instead of re-implementing token issuance a second time.
- **`vendor_attribute_values` uses typed nullable columns** (`value_text`/`value_number`/`value_boolean`/`value_options`) rather than one JSONB `value` column, since `CategoryAttribute.dataType` is a closed enum the platform must branch on. The service layer looks up the attribute's `dataType` first and writes only the matching column, nulling the rest — verified live: a SELECT attribute wrote to `value_text` only, a BOOLEAN to `value_boolean` only, a NUMBER to `value_number` only, with the others correctly `null`/`[]`. Also verified the validation rejects an invalid SELECT option and a type-mismatched value (a string where a number was expected) with clear error messages.
- **Profile completeness is intentionally a partial formula** — media/portfolio fields (logo, cover, portfolio count) don't exist as real data until Arch Phase 6, so they carry no weight yet. This will need a formula revision and a one-time recalculation pass across existing vendors once Phase 6 ships — flagged as expected follow-up work, not a defect. Verified live: the test vendor's score moved from 0 → 50 → 65 → 70 as fields were filled in, confirming the weighted-checklist mechanism itself works correctly.
- **Slug is frozen once a vendor leaves `DRAFT`** — `PATCH /vendors/me/detail`'s `businessName` update never touches the slug (unlike the categories/locations modules, where the slug *is* derived from the name on create). A slug change post-DRAFT would need to be an explicit admin-only field edit via `PATCH /admin/vendors/:id`, not an automatic side effect — this avoids silently breaking a publicly-indexed vendor's inbound links/SEO equity.
- Verified end-to-end: full Route A walkthrough (shell → profile → category → attributes → service → package → city → submit → email-verify → auto-advance → admin-approve → public visibility); full Route B walkthrough (admin shell → invitation → public resolve → claim-by-register → immediate authenticated access, confirmed via a fresh `/vendors/me/detail` call); cross-vendor isolation (a second vendor's `PATCH` never touched the first vendor's data); invitation one-time-use (a reused token correctly rejected). `onDelete: Restrict` on `vendor_invitations.invited_by_admin_id` correctly blocked deleting a test admin who had issued an invitation — a genuine safety feature encountered during test cleanup, not a bug. Confirmed full reproducibility: `docker compose down -v` → migrate (all 6 migrations, partial index included) → seed (categories, services, locations) → health check, all on a completely fresh database.

## Arch Phase 6 — Media & Portfolio

**Status:** ⚠️ Code done, live R2 flow unverified — 2026-09-02
**Stage:** [Stage 2 — Marketplace Supply](04-stage-marketplace-supply.md) — **this phase completes Stage 2 (code-complete; see caveat below).**

### What this unlocks

Real object storage for vendor media: logos, cover images, portfolio photos, and video. The placeholder `avatarMediaId`/`logoMediaId`/`coverMediaId` UUID columns from Arch Phases 3 and 5 gain real foreign keys now that `media` exists. Introduces Redis + BullMQ into the app for the first time (pulled forward from Arch Phase 14), and the first background worker process, separate from the API server.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/v1/media/upload-requests` | Request a signed R2 upload URL, creates a PENDING media row | owned vendor |
| POST | `/api/v1/media/:id/confirm` | Confirm upload, enqueue background processing | owned vendor |
| GET | `/api/v1/media/me` | List own vendor's media | owned vendor |
| PATCH | `/api/v1/media/:id` | Update altText, sortOrder, albumId | owned vendor |
| DELETE | `/api/v1/media/:id` | Delete from R2, mark row DELETED | owned vendor |
| GET | `/api/v1/admin/media/:id` | Admin detail view | ADMIN |
| POST | `/api/v1/admin/media/:id/moderate` | Set moderationStatus | ADMIN |
| POST/GET | `/api/v1/vendors/me/albums` | Create/list own albums | owned vendor |
| PATCH/DELETE | `/api/v1/vendors/me/albums/:id` | Update/delete an album (media un-albums, doesn't delete) | owned vendor |
| GET | `/api/v1/vendors/:slug/albums` | Public album listing (PUBLIC visibility only, APPROVED vendor only) | none |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `media` | Generic media record, scoped to vendor ownership | `vendor_id`, `album_id` (nullable), `media_type`, `original/optimized/thumbnail_object_key`, `status`, `moderation_status`, `checksum` |
| `albums` | Organizational layer over media | `vendor_id`, `name`, `cover_media_id`, `visibility` (PUBLIC/PRIVATE) |

`user_profiles.avatar_media_id`, `vendor_profiles.logo_media_id`, `vendor_profiles.cover_media_id` all gained real FK constraints to `media.id` (`onDelete: SetNull`) in this same migration.

### Flow

```
POST /media/upload-requests
     │
     ▼
media.service.createUploadRequest()
     │  validate MIME type matches mediaType, file size within
     │  MEDIA_MAX_IMAGE_SIZE_MB/MEDIA_MAX_VIDEO_SIZE_MB, portfolio
     │  count within MEDIA_MAX_PORTFOLIO_ITEMS
     │
     ├─► r2.client.getSignedUploadUrl()   (requested BEFORE the DB row —
     │        │                            see Notes: ordering bug fixed)
     │        ▼
     │   throws ExternalServiceError if R2_* env vars aren't set
     │
     ▼ (only on success)
media row created, status=PENDING
     │
     ▼
Browser uploads directly to R2 using the signed URL (Node never touches the bytes)
     │
     ▼
POST /media/:id/confirm
     │  HEAD-checks the object actually exists in R2
     ▼
status=PROCESSING, enqueueMediaProcessing(mediaId) → BullMQ queue "media-processing"
     │
     ▼
[separate process: npm run worker]
media-processing.processor.ts
     │  downloads original from R2, sharp: resize to large/medium/thumbnail,
     │  re-encode as WebP, re-upload each variant
     ▼
status=READY, optimizedObjectKey/thumbnailObjectKey/width/height set
     (status=FAILED + error logged on any failure — never silently swallowed)
```

### Notes

- **This phase has a real, explicitly-flagged gap: the live R2 upload → confirm → process → READY flow has not been verified end-to-end**, because no real Cloudflare R2 bucket credentials exist yet. `R2_*` env vars are optional at the schema-validation layer (so the app boots and everything else is testable) but required at the point of actual use — `r2.client.ts`'s `getClient()` throws a clear `ExternalServiceError` ("Object storage is not configured...") the moment a signed URL is actually requested, rather than failing silently or with a cryptic AWS SDK error. Verified this exact failure mode live: a well-formed upload-request correctly 502s with that message. **Next step for a real verification pass: create a Cloudflare R2 bucket, add its credentials to `.env`, run `npm run worker` alongside `npm run dev`, and walk the full flow.**
- **A real ordering bug was caught and fixed during verification, not left in:** the first implementation created the `media` DB row *before* calling `getSignedUploadUrl()`. Since R2 isn't configured, that call throws — and the row it already created was left behind as a permanently-orphaned `PENDING` record with no way to ever get an upload URL (confirmed via direct DB query: the row existed after the 502 response). Fixed by requesting the signed URL first and only creating the DB row once that succeeds; re-verified the same failure no longer leaves an orphaned row.
- **Redis + BullMQ introduced for the first time**, pulled forward from Arch Phase 14 since this stage's own acceptance criteria ("never make a normal HTTP request wait for expensive media processing") genuinely needs a real queue now. `REDIS_URL` is now a **required** env var (Docker's Redis container has existed since Phase 0 but nothing connected to it until now). Verified `npm run worker` starts cleanly and connects to Redis without needing R2 at all (R2 is only touched when an actual job runs).
- **The worker is a separate process** (`npm run worker` → `src/worker.ts`), never imported into `server.ts` — a crash during image processing can't take down the API. Has its own `SIGTERM`/`SIGINT` shutdown handling, mirroring `server.ts`'s pattern.
- **`vendor_attribute_values`-style typed-column reasoning was NOT repeated here** — `media` stores object keys as plain strings, not a polymorphic value system, since object keys aren't a closed enum needing type-based branching the way category attributes are.
- **Album deletion un-albums its media rather than deleting it** — `album.repository.deleteAlbum()` runs `media.updateMany({ albumId: null })` and the album delete in one transaction. Verified live: deleting a test album succeeded without needing to handle orphaned media specially.
- **Routing precedence**: `/vendors/me/albums` and `/vendors/:slug/albums` are both mounted in `routes/index.ts` *before* `/vendors` itself, for the same reason `/vendors/claim` needed to be — otherwise `vendorRouter`'s public `GET /:slug` would greedily match `/vendors/me/albums` as if `"me"` were a slug. Verified live: `/vendors/me/albums` and `/vendors/me/detail` both resolved correctly with no collision.
- Verified end-to-end (everything not requiring a real R2 round-trip): invalid MIME type rejected at the Zod layer; oversized file rejected with the exact configured limit in the message; mediaType/mimeType mismatch (e.g. VIDEO with an image MIME type) rejected; a well-formed request correctly fails with the object-storage-not-configured error (and, post-fix, without leaving an orphaned row); full album CRUD (create, list, update visibility, delete); private albums correctly excluded from public listings; cross-vendor album access denied with a 404 (not leaking existence); admin moderation correctly gated to ADMIN role and 404s for nonexistent media. Confirmed full reproducibility: `docker compose down -v` → migrate (all 7 migrations, including the FK-adding migration on existing columns) → seed → health check, all on a completely fresh database. `npm run worker` confirmed to start cleanly.
