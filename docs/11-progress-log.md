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
| 6 | Media & Portfolio | [Stage 2](04-stage-marketplace-supply.md) | ✅ Done | 2026-09-02 |
| 7 | Search & Discovery | [Stage 3](05-stage-discovery-engagement.md) | ✅ Done | 2026-09-02 |
| 8 | Favorites, Shortlists & Comparison | [Stage 3](05-stage-discovery-engagement.md) | ✅ Done | 2026-09-02 |
| 9 | Enquiries & Leads | [Stage 4](06-stage-lead-engine.md) | ✅ Done | 2026-09-02 |
| 10 | Reviews & Trust | [Stage 3](05-stage-discovery-engagement.md) | ✅ Done | 2026-09-02 |
| 11 | Subscription & Billing Foundation | [Stage 5](07-stage-monetization.md) | ✅ Done | 2026-09-02 |
| 12 | Entitlement Enforcement | [Stage 5](07-stage-monetization.md) | ✅ Done | 2026-09-02 |
| 13 | Featured Listings & Promotions | [Stage 5](07-stage-monetization.md) | ✅ Done | 2026-09-02 |
| 14 | Notifications | [Stage 6](08-stage-telegram-and-admin.md) | ✅ Done | 2026-09-02 |
| 15 | Telegram Bot MVP | [Stage 6](08-stage-telegram-and-admin.md) | ✅ Done | 2026-09-02 |
| 16 | Admin Platform Backend | [Stage 6](08-stage-telegram-and-admin.md) | ✅ Done | 2026-09-02 |
| 17 | CMS & SEO Backend | [Stage 7](09-stage-growth-and-scale.md) | ✅ Done | 2026-09-04 (static pages/FAQs descoped, see note below) |
| 18 | Analytics & Marketplace Metrics | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 19 | Security Hardening | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 20 | Testing | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 21 | Observability | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 22 | Docker & Deployment | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 23 | Backup & Disaster Recovery | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 24 | Performance Optimization | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 25 | Production Readiness Review | [Stage 7](09-stage-growth-and-scale.md) | ⬜ Not Started | — |
| 26 | ₹49 Instant Wedding Website Backend | [Stage 8](12-stage-wedding-website.md) | 🟡 In Progress | started 2026-09-03 |

**Overall: 18 / 26 original Arch Phases complete. Stage 1 (Foundation), Stage 2 (Marketplace Supply), Stage 3 (Discovery & Engagement), Stage 4 (Lead Engine), Stage 5 (Monetization), Stage 6 (Telegram & Admin), and now Stage 7's Arch Phase 17 (CMS & SEO Backend) are all fully done. Arch Phase 26 (Stage 8, ₹49 Instant Wedding Website) is a new, standalone Arch Phase outside the original 26 — the full web API surface (draft CRUD, templates, media upload, one-time preview, Razorpay order creation, webhook-driven publish, RSVP, admin visibility) shipped and was verified live end-to-end 2026-09-03; only the Telegram conversation-flow wiring remains (schema support exists, the actual bot flow does not yet).**

**Paused 2026-09-02, resumed 2026-09-04, by user decision:** the backend build-out deliberately paused before Arch Phase 17 to wire up the frontend against everything shipped so far (Arch Phases 0–16 cover the full couple/vendor-facing product surface — auth, vendors, media, search, shortlists, leads, reviews, subscriptions, entitlements, featured listings, notifications, Telegram, and admin). That frontend integration work happened (Frontend Arch Phases 1–10 all shipped and Playwright-verified — see `frontenddocs/11-progress-log.md`), and Arch Phase 17 (CMS & SEO Backend) resumed 2026-09-04. Its first slice is done: Real Wedding Stories and Gallery Inspiration, both resolved as curation layers over already-real vendor Album/Media data rather than independent CMS content (see `09-stage-growth-and-scale.md`'s Arch Phase 17 checklist for the exact resolution). Its second slice, done 2026-09-03: SEO page-generation infrastructure — templated (not hand-authored) Category/City/Category+City landing pages backed by real vendor counts, thin-page avoidance (`MIN_VENDORS_FOR_INDEXABLE_PAGE = 3`), admin override CRUD, sitemap/robots data, and the corresponding frontend routes/`generateMetadata`/admin UI — this also unblocks Frontend Arch Phase 11b, previously hard-blocked on this phase (see `frontenddocs/10-risks-and-open-questions.md` Open Question 1). Its third slice, done 2026-09-04: Popular Searches — a new standalone `PopularSearchCard` model (no existing real entity to curate over, unlike wedding stories/gallery above), editorial/admin-curated per explicit decision (not analytics-driven — Arch Phase 18 doesn't exist yet). Full admin CRUD (`/admin/popular-searches`) + public `GET /popular-searches/featured/homepage`, wired into the homepage replacing the hardcoded `POPULAR_SEARCH_CARDS` array; its image field follows the `Category.imageUrl` precedent (plain url, resolved through a new small `MediaType.POPULAR_SEARCH_IMAGE` admin upload pipeline — migration `20260904085052_add_popular_search_cards`) rather than a `Media`-relation, since there's no owning vendor. Ships with zero rows, verified live: `POST` → appears in the public featured list → `PATCH` → `DELETE` → list empty again, via `wedhub-backend/src/modules/popular-search-cards/`. Its fourth and last content-model slice, done 2026-09-04: Blog — same standalone-editorial shape as Popular Searches (new `BlogPost` model, `MediaType.BLOG_COVER_IMAGE` upload pipeline, migration `20260904090914_add_blog_post`), plus a Markdown `bodyMarkdown` column rendered via the new `react-markdown` dependency (v10.1.0). Public `GET /blog/featured/homepage` + `GET /blog` (paginated) + `GET /blog/:slug`; full admin CRUD at `/admin/blog`, with publishing being a plain `PATCH publishedAt` (no separate publish endpoint). Real `/blog` list page and `/blog/[slug]` detail page with `generateMetadata`/`notFound()`, homepage teaser now hides itself when empty, sitemap includes every published post. Verified live end-to-end the same draft→public-absent→publish→public-present→delete→public-absent round trip as Popular Searches — see this file's own Arch Phase 17 section further down for the full trace.

**Arch Phase 17 closed 2026-09-04, by explicit user decision:** static pages and FAQs remain genuinely unbuilt — a distinct requirement from Blog (dated/authored articles, not static About/Terms/Privacy pages or a Q&A structure) — but unlike every other item in this phase, nothing on the live site today renders a hardcoded static-page/FAQ array that closing the phase leaves behind as a known-fake element. Rather than continue gating phase completion on it, it's been descoped to a standalone backlog item (see `09-stage-growth-and-scale.md`'s Arch Phase 17 note) to pick up whenever prioritized, following the same model+module+admin-CRUD+public-page pattern established across this phase's other four content-model slices. Arch Phases 18–25 stay post-MVP except for the baseline security/testing carve-out already noted in `02-mvp-cut-line.md`.

### Addendum, 2026-09-02 — 3 small endpoints added during Frontend Arch Phase 4 integration (not a new Arch Phase)

While pausing on Arch Phase 17, Frontend Arch Phase 4 (Couple Account) research found 3 real gaps blocking the couple-facing enquiry tracker and review flow, none requiring a new Arch Phase — small, additive extensions to already-shipped modules:

- **`GET /enquiries/mine`** (`modules/enquiries/`) — couple-scoped enquiry list, paginated, joining each `Enquiry` to its fanned-out `Lead[]` (with `vendor` summary). `Enquiry.userId` was already populated for authenticated submitters (Arch Phase 9) and well-indexed; this was purely a missing read endpoint, no schema change.
- **`GET /reviews/mine`** (`modules/reviews/`) — couple-scoped "my reviews" list, paginated, with vendor summary + attached photos. No schema change.
- **Review photos** — new `review-media` module (parallel to `modules/media/`, not a retrofit of it — that module is deeply vendor-scoped via `getOwnedVendorOrThrow`/`entitlementService.canVendorUpload`/a required `Media.vendorId`, none of which fit a couple uploading a review photo). Schema change: `Media.vendorId` is now nullable, with new nullable `Media.userId`/`Media.reviewId` columns and a new `MediaType.REVIEW_PHOTO` value (migration `20260902151801_add_review_photos_media`). Reuses the existing R2 client and media-processing queue/worker unmodified (both are already generic, keyed only by `mediaId`). `POST /review-media/upload-requests` + `POST /review-media/:id/confirm` mirror the vendor media flow's shape; `POST /reviews` now accepts an optional `mediaIds[]` (max 6) to atomically attach already-uploaded, owned, unattached photos to the new review.

All three verified live end-to-end against the real dev DB/Redis/R2 (see `../frontenddocs/11-progress-log.md`'s Frontend Arch Phase 4 entry for the full verification trace) — a real enquiry → `GET /enquiries/mine` round-trip, a real review with a real R2-uploaded photo processed through the actual worker to `READY` with generated WebP variants, then approved and confirmed visible on the public `GET /vendors/:vendorId/reviews`. One unrelated pre-existing bug surfaced and fixed along the way: the notification-delivery BullMQ queue had ~87 stale jobs accumulated from earlier test-cleanup cycles, at least one referencing a since-deleted `Notification` row, which crashed the worker on startup (`P2025`) — cleared as dev-only queue state, not an application code bug.

`npx tsc --noEmit` and `npm run build` both pass cleanly. No test suite exists yet in this codebase (consistent with every prior phase).

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

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 2 — Marketplace Supply](04-stage-marketplace-supply.md) — **this phase completes Stage 2.**

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

- **The live R2 upload → confirm → process → READY flow is now verified end-to-end against a real Cloudflare R2 bucket** (`wedhub-dev`). Walked the full real flow: registered a fresh VENDOR account → created a vendor shell → `POST /media/upload-requests` for a PORTFOLIO image returned a genuine presigned R2 URL → uploaded a real 1600×1200 JPEG directly to that URL (200 from R2, Node never touched the bytes) → `POST /media/:id/confirm` HEAD-checked the object in R2 and enqueued the BullMQ job → the separate `npm run worker` process picked up the job within ~2s, downloaded the original, generated `medium.webp` and `thumbnail.webp` variants via sharp, and flipped status to `READY` with real extracted `width`/`height` (1600×1200). Fetched both generated variants directly from the public R2 URL (200, correct `image/webp` content-type) to confirm they exist in the bucket, not just referenced in the DB. Also verified `DELETE /media/:id` removes the objects from R2 for real — refetching the same public URL after deletion returned 404. Before this run, the missing-credentials path was already confirmed to fail with a clear `ExternalServiceError` rather than a cryptic one; both states are now covered.
- **A real ordering bug was caught and fixed during verification, not left in:** the first implementation created the `media` DB row *before* calling `getSignedUploadUrl()`. Since R2 isn't configured, that call throws — and the row it already created was left behind as a permanently-orphaned `PENDING` record with no way to ever get an upload URL (confirmed via direct DB query: the row existed after the 502 response). Fixed by requesting the signed URL first and only creating the DB row once that succeeds; re-verified the same failure no longer leaves an orphaned row.
- **Redis + BullMQ introduced for the first time**, pulled forward from Arch Phase 14 since this stage's own acceptance criteria ("never make a normal HTTP request wait for expensive media processing") genuinely needs a real queue now. `REDIS_URL` is now a **required** env var (Docker's Redis container has existed since Phase 0 but nothing connected to it until now). Verified `npm run worker` starts cleanly and connects to Redis without needing R2 at all (R2 is only touched when an actual job runs).
- **The worker is a separate process** (`npm run worker` → `src/worker.ts`), never imported into `server.ts` — a crash during image processing can't take down the API. Has its own `SIGTERM`/`SIGINT` shutdown handling, mirroring `server.ts`'s pattern.
- **`vendor_attribute_values`-style typed-column reasoning was NOT repeated here** — `media` stores object keys as plain strings, not a polymorphic value system, since object keys aren't a closed enum needing type-based branching the way category attributes are.
- **Album deletion un-albums its media rather than deleting it** — `album.repository.deleteAlbum()` runs `media.updateMany({ albumId: null })` and the album delete in one transaction. Verified live: deleting a test album succeeded without needing to handle orphaned media specially.
- **Routing precedence**: `/vendors/me/albums` and `/vendors/:slug/albums` are both mounted in `routes/index.ts` *before* `/vendors` itself, for the same reason `/vendors/claim` needed to be — otherwise `vendorRouter`'s public `GET /:slug` would greedily match `/vendors/me/albums` as if `"me"` were a slug. Verified live: `/vendors/me/albums` and `/vendors/me/detail` both resolved correctly with no collision.
- Verified end-to-end, including the real R2 round-trip: invalid MIME type rejected at the Zod layer; oversized file rejected with the exact configured limit in the message; mediaType/mimeType mismatch (e.g. VIDEO with an image MIME type) rejected; missing-credentials path fails with the object-storage-not-configured error without leaving an orphaned row; the real upload → confirm → background-process → READY flow against a live `wedhub-dev` R2 bucket (see the note above); real object deletion from R2 on `DELETE /media/:id`; full album CRUD (create, list, update visibility, delete); private albums correctly excluded from public listings; cross-vendor album access denied with a 404 (not leaking existence); admin moderation correctly gated to ADMIN role and 404s for nonexistent media. Confirmed full reproducibility: `docker compose down -v` → migrate (all 7 migrations, including the FK-adding migration on existing columns) → seed → health check, all on a completely fresh database. `npm run worker` confirmed to start cleanly and to process a real job end-to-end.

## Arch Phase 7 — Search & Discovery

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 3 — Discovery & Engagement](05-stage-discovery-engagement.md)

### What this unlocks

Real vendor discovery: keyword search, category/city/service-area/price/verified/category-attribute filtering, five sort modes, and pagination, all behind a dedicated `search` module kept separate from the `vendors` CRUD module per product.md §10's "search logic must be abstracted from the controller" requirement. A vendor-ranking service implements product.md §11's `organic relevance + quality + business visibility` formula. Every search is logged for analytics.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/v1/search/vendors` | Keyword/filter/sort/paginate approved vendors | none (optional — attributes the search to a logged-in user when a valid token is present) |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `search_logs` | Search analytics — one row per query | `user_id` (nullable), `keyword`, `category_id`, `city_id`, `filters` (JSONB), `sort`, `result_count` |

No new vendor-facing tables — this phase reads existing `vendors`/`vendor_profiles`/`vendor_categories`/`vendor_service_areas`/`vendor_attribute_values`/`media` tables. It adds the `pg_trgm` Postgres extension and several indexes (GIN trigram on `vendors.business_name` and `vendor_profiles.short_description`/`description`, GIN on `vendor_profiles.tags`, a composite `vendors(status, city_id)`, and a plain index on `vendor_profiles.starting_price`) via hand-authored migration SQL — the same pattern as Arch Phase 5's manually-added partial unique index, since `CREATE EXTENSION` and non-Prisma-native GIN operator classes aren't expressible through the schema DSL without opting into Prisma's `postgresqlExtensions` preview feature, which this project hasn't done.

### Flow

```
GET /search/vendors?keyword=...&categoryId=...&sort=recommended&page=1
     │
     ▼
optionalAuthenticateMiddleware  (attaches req.user only if a valid token is present — never blocks)
     │
     ▼
validateQuery(searchVendorsQuerySchema)   (Zod; attr[<uuid>]=<value> parsed via Express's
     │                                      default "extended" qs parser into req.query.attr)
     ▼
search.service.searchVendors()
     │
     ├─► search.repository.searchVendors()
     │       │  raw parameterized SQL (Prisma.sql — never string-concatenated):
     │       │  status='APPROVED' AND deleted_at IS NULL, plus any of:
     │       │  category/city/service-area EXISTS-joins, price range,
     │       │  verified (verificationLevel != UNVERIFIED), keyword via
     │       │  pg_trgm `%` similarity across business name/description,
     │       │  and per-attribute EXISTS-joins against vendor_attribute_values
     │       │  — each attribute value's numeric/boolean cast is only
     │       │  attempted when the filter value actually parses as that type
     │       │  (a real bug: casting an arbitrary string straight to
     │       │  ::numeric/::boolean inside an unconditional OR errored out
     │       │  on any non-numeric value like "Candid" — fixed by testing
     │       │  the value's shape before adding that branch)
     │       ▼
     │   ordered per `sort` (relevance/recommended by similarity+completeness,
     │   price_low/high by starting_price, newest by created_at)
     │
     ├─► vendor-ranking.service.rankVendors()   (only for sort=recommended;
     │       re-scores the already-fetched page in-application — organic
     │       relevance + quality [completeness+verification] + business
     │       visibility [0 today, no featured/subscription signal exists
     │       until Arch Phase 13] — never re-queries the database)
     │
     └─► search_logs row written (best-effort; a logging failure never
             fails the search response)
     ▼
paginatedResponse({ id, businessName, slug, verificationLevel,
  shortDescription, startingPrice, currency, logoUrl }, meta)
```

### Notes

- **Built as its own `search` module, not an upgrade of Arch Phase 5's thin `GET /vendors` stub** — confirmed with the user before implementation. Matches architecture.md's module list (`search` is its own named module) and product.md §10's explicit requirement that search logic be abstracted behind a swappable module, not entangled with vendor CRUD. The old `GET /vendors?categoryId&cityId` stub from Arch Phase 5 is untouched.
- **Real bug caught and fixed during verification, not left in:** the attribute-filter SQL originally tried `vav.value_number = ${value}::numeric OR vav.value_boolean = ${value}::boolean` unconditionally inside one OR chain. Postgres evaluates every branch of an OR regardless of which one is meant to match, so filtering `photography_style=Candid` (a SELECT/text attribute) crashed with `invalid input syntax for type numeric: "Candid"`. Fixed by testing the filter value's shape (`/^-?\d+(\.\d+)?$/` for numeric, exact `"true"`/`"false"` for boolean) before adding that branch to the query at all. Verified live: text (SELECT), boolean, and numeric attribute filters all now return correct results with no cast errors.
- **A second real bug caught in the same pass:** the initial `ORDER BY` clauses for price/newest/relevance sorting referenced the inner query's `v.`/`vp.`-prefixed table columns (e.g. `v.profile_completeness`), but they're applied to an outer wrapper query over a `ranked` subquery that only exposes the projected camelCase aliases — this failed with `missing FROM-clause entry for table "v"` the moment any request hit the endpoint. Fixed by rewriting every sort clause to reference the subquery's own output aliases (`"profileCompleteness"`, `"startingPrice"`, `"createdAt"`) instead.
- **Raw SQL was necessary, not a shortcut** — Prisma's query builder cannot express `pg_trgm`'s `similarity()`/`%` operator as an orderable, filterable expression, nor a dynamic number of attribute-filter EXISTS-joins built from arbitrary user-supplied query keys. Every value (keyword, UUIDs, attribute filter values) is passed through `Prisma.sql`'s tagged-template parameterization — confirmed no string concatenation of user input into SQL text anywhere in `search.repository.ts`.
- **Vendor-ranking formula (product.md §11) is deliberately partial**, same precedent as Arch Phase 5's `profileCompleteness`: review rating/quality needs Arch Phase 10, response rate/time/lead-conversion needs Arch Phase 9, and subscription/featured visibility needs Arch Phase 13 — none of that data exists yet, so those terms are weighted zero in `vendor-ranking.service.ts` rather than faked with a placeholder value. `rating` and `availability` are likewise deferred as search *filters* for the same reason. Documented explicitly so this isn't mistaken for an oversight later.
- **`optionalAuthenticateMiddleware` is new shared infrastructure** (`common/middleware/authenticate.middleware.ts`) — the first route needing "attach `req.user` if a valid token happens to be present, but never require or error on one." Search needed this to attribute a query to a logged-in user in `search_logs` without gating a public endpoint behind auth. Verified live: a request with no token, a request with a valid token, and a request with a garbage/malformed token all return 200 — only the valid-token case populates `search_logs.user_id`.
- **Search analytics logging is best-effort** — wrapped in try/catch so a `search_logs` insert failure (e.g. a transient DB blip) can never turn a working search into a 500. Verified the happy path writes a row with the correct `resultCount`, `sort`, and filter snapshot (as JSONB) for keyword, category, city, price-range, verified, and attribute-filter queries alike.
- Verified end-to-end against real seeded data (not just unit-level checks): keyword search correctly matched "Sunset Frames Photography" for the query "photography" via trigram similarity while excluding an unrelated venue; category and city filters each correctly scoped to one of two seeded vendors; price-range filtering correctly included/excluded by `startingPrice`; `verified=true` correctly excluded an `UNVERIFIED` vendor; all four sort modes (`price_low`, `price_high`, `recommended`, default `relevance`) produced correctly-ordered results; pagination (`page`/`limit`) produced correct `meta.total`/`totalPages` and non-overlapping pages; SELECT/BOOLEAN/NUMBER category-attribute filters all matched correctly post-fix; a `DRAFT`-status vendor never appeared in any search path (keyword or category filter) confirming the `status='APPROVED'` guard holds; invalid query params (bad UUID, invalid sort enum) correctly 400 via Zod; the search-specific rate limiter (60/min) correctly 429s past its threshold. Confirmed via `EXPLAIN` that the new `vendors_business_name_trgm_idx` GIN index is a real, plan-eligible access path for the `%` operator (the planner prefers a cheaper status-based bitmap scan at the current tiny table size, which is correct, expected behavior, not a sign the index is unused). Confirmed full reproducibility: `docker compose down -v` → migrate (all 8 migrations, including the `pg_trgm`-extension-and-indexes migration) → seed → health check → `npm run worker` start, all on a completely fresh database. All test vendors/users/search-log rows created during verification were deleted afterward.

## Arch Phase 8 — Favorites, Shortlists & Comparison

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 3 — Discovery & Engagement](05-stage-discovery-engagement.md)

### What this unlocks

Users can save vendors (favorites), organize saves into multiple named collections (shortlists), compare vendors head-to-head within the same category using the category's own comparison-flagged attributes, and generate a share link for a shortlist (foundation only — no public share-view page yet). All favorite/shortlist/compare actions are now logged to a lightweight analytics event table.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/v1/shortlists` | List own shortlists with items (auto-creates the default Favorites shortlist if missing) | access token |
| POST | `/api/v1/shortlists` | Create a named shortlist | access token |
| PATCH | `/api/v1/shortlists/:id` | Rename a shortlist (blocked for the default) | access token, owned |
| DELETE | `/api/v1/shortlists/:id` | Delete a shortlist (blocked for the default) | access token, owned |
| POST | `/api/v1/shortlists/:id/items` | Add a vendor to a shortlist | access token, owned |
| DELETE | `/api/v1/shortlists/:id/items/:vendorId` | Remove a vendor from a shortlist | access token, owned |
| POST | `/api/v1/shortlists/favorites/items` | One-click add to the default Favorites shortlist | access token |
| DELETE | `/api/v1/shortlists/favorites/items/:vendorId` | One-click remove from Favorites | access token |
| POST | `/api/v1/shortlists/:id/share` | Enable sharing, (re)issue a share token | access token, owned |
| DELETE | `/api/v1/shortlists/:id/share` | Disable sharing, revoke the share token | access token, owned |
| GET | `/api/v1/comparison/vendors?vendorIds=a,b,c` | Category-aware side-by-side vendor comparison | none (optional — attributes the view to a logged-in user) |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `shortlists` | Favorites and named collections, unified into one model | `user_id`, `name`, `is_default`, `share_token` (unique, nullable), `share_enabled` |
| `shortlist_items` | Vendor membership in a shortlist | `(shortlist_id, vendor_id)` composite pk — DB-level duplicate prevention |
| `analytics_events` | Minimal generic event log for favorite/shortlist/compare actions | `user_id` (nullable), `event_type`, `vendor_id` (nullable), `metadata` (JSONB) |

### Flow

```
GET /shortlists
     │
     ▼
authenticateMiddleware
     │
     ▼
shortlist.controller.listShortlists()
     │
     ├─► shortlist.service.getOrCreateDefaultShortlist(userId)
     │       │  lazy creation on first use, not at registration — same
     │       │  opportunistic pattern as Arch Phase 5's
     │       │  advanceIfEmailNowVerified, avoiding a cross-module call
     │       │  from auth.service into shortlists
     │       ▼
     │   findDefaultShortlist() → exists? return it : createDefaultShortlist()
     │
     └─► shortlist.repository.listUserShortlists()  (ordered: default first,
             then by creation date; each shortlist's items include a vendor
             summary — businessName/slug/verificationLevel/price)

POST /shortlists/:id/items                    GET /comparison/vendors?vendorIds=a,b
     │                                              │
     ▼                                              ▼
getOwnedShortlistOrThrow(userId, id)          optionalAuthenticateMiddleware (never blocks)
     │  404 if missing or not owned                 │
     ▼                                              ▼
assertVendorIsPublic(vendorId)                comparison.service.compareVendors()
     │  404 if not APPROVED (no existence leak)     │
     ▼                                              ├─ fetch vendors WHERE status='APPROVED'
findItem() → exists? 409 Conflict                    │    AND id IN (...)
     │  : else                                       ├─ vendors.length !== requested.length?
     ▼                                              │    → 404 (a draft/missing vendor was requested)
shortlistRepository.addItem()  (upsert on the        ├─ collect each vendor's PRIMARY category
  composite pk — a genuine duplicate is caught       │    → more than one distinct category? → 400
  at the service layer before ever reaching the      │       ("must share the same primary category")
  DB, giving a clean 409 instead of a raw             ▼
  constraint-violation error)                   findComparableAttributes(categoryId)
     │                                              │  CategoryAttribute WHERE isComparable=true
     ▼                                              ▼
logAnalyticsEvent("shortlist_item_added")     shape response: category + attribute defs +
  (best-effort, never blocks the response)      per-vendor {baseline fields, attributeValues}
                                                     │
                                                     ▼
                                               logAnalyticsEvent("vendor_comparison_viewed")
```

### Notes

- **Favorites-vs-shortlists unified into one model, not two** — product.md §15 describes them as the same mechanism (named collections a vendor can belong to multiple of); architecture.md's task list names them separately. Resolved by confirming with the user: one `Shortlist`/`ShortlistItem` model, where every user gets exactly one auto-created, non-renamable, non-deletable `isDefault` "Favorites" shortlist, plus any number of additional named shortlists. `POST/DELETE /shortlists/favorites/items` convenience endpoints resolve to the default shortlist automatically so the frontend never needs its ID. Verified live: renaming and deleting the default shortlist both correctly return 400 with a clear message; the one-click favorite endpoints work without the caller ever knowing the default shortlist's ID.
- **Comparison built as its own `comparison` module**, not folded into `shortlists` — comparing is a stateless read over arbitrary vendor IDs (not necessarily from a saved shortlist), mirroring Arch Phase 7's precedent of giving search its own module rather than overloading an adjacent one.
- **"Category-aware" comparison is enforced, not just implied** — product.md §16 requires comparison to "use category-defined comparison attributes," which only makes sense when every vendor being compared shares the same primary category (comparing a photographer's "Photography Style" against a venue's non-existent value would be meaningless). `comparison.service.ts` collects every requested vendor's primary category and rejects with a 400 the moment more than one distinct category is present. Verified live: comparing two photographers succeeded with real attribute values (`photography_style: "Candid"`, `number_of_photographers: 2`); comparing a photographer against a venue correctly rejected with "All vendors being compared must share the same primary category."
- **A draft/non-public vendor in a comparison request is rejected, not silently dropped** — `compareVendors()` checks `vendors.length !== vendorIds.length` after fetching only `APPROVED` vendors, so requesting a mix of one real and one DRAFT vendor ID returns a 404 for the whole request rather than a shorter, silently-partial result. Verified live.
- **"Share shortlist foundation" shipped as token generation/revocation only** — product.md §15 explicitly frames sharing as a "future capability," so `POST/DELETE /shortlists/:id/share` only issue/revoke an opaque `shareToken` (`generateOpaqueToken()`, stored in plaintext rather than hashed like auth tokens, since it functions as a bearer capability link a future public endpoint will look up directly, not a login credential). No public share-view endpoint exists yet to resolve a token into a read-only page — same thin-slice reasoning as Arch Phase 13's featured-listings foundation in the MVP cut line. Verified live: enabling sharing issues a token; disabling clears it.
- **Real gap caught during this phase's own verification, not left in:** the task list's "Analytics events" item was initially going to be marked done by pointing at Arch Phase 7's unrelated `search_logs` table — a dishonest shortcut, since no logging existed yet for favorite/shortlist/compare actions. Confirmed with the user before proceeding, then added a genuinely new (if deliberately minimal) `analytics_events` table and a `logAnalyticsEvent()` helper (`common/utils/analytics.util.ts`), reusing Arch Phase 7's exact best-effort pattern (wrapped in try/catch, never fails the caller's real response). Logs `shortlist_item_added`, `shortlist_item_removed`, and `vendor_comparison_viewed`. A full analytics pipeline (aggregation, dashboards, funnels) is explicitly left to Arch Phase 18 — this is intentionally just an event log, not analytics infrastructure. Verified live: all three event types recorded with correct `userId` attribution and metadata (e.g. `{ vendorIds, categoryId }` for a comparison view).
- **A real, more serious bug was caught and fixed *before* any of the above shipped:** the initial migration for this phase's `Shortlist`/`ShortlistItem` tables was auto-generated by `prisma migrate dev`, which — because Arch Phase 7's `pg_trgm` GIN indexes existed only as untracked raw SQL, invisible to `schema.prisma` — included six auto-generated `DROP INDEX` statements that silently deleted every one of Arch Phase 7's real search indexes the moment the migration applied. Caught immediately by re-querying `pg_indexes` after applying and finding them gone, before any commit. Fixed at the root, not just patched over: enabled Prisma's `postgresqlExtensions` preview feature, declared `pg_trgm` in the `datasource` block, and re-expressed all six indexes as native `@@index(... type: Gin)` declarations directly in `schema.prisma` (Vendor.businessName trigram, VendorProfile.shortDescription/description trigram, VendorProfile.tags GIN, plus the two plain indexes) — so they are now first-class tracked schema state that `migrate dev`'s drift detection can never again mistake for orphaned state to delete. This required hand-editing the already-applied Arch Phase 8 migration file (to remove the bad drops) and a full `prisma migrate reset` to reconcile the changed checksum — done only after explicit user confirmation, and only after confirming the dev database held zero real rows at the time. Re-verified post-reset: `prisma migrate status` reports "Database schema is up to date!" with no drift, and a subsequent real migration (`add_analytics_events`) applied cleanly with no further index drops — only an incidental, harmless Prisma-driven index rename.
- Verified end-to-end against real seeded data: default Favorites shortlist auto-creates on first list/use; named shortlist creation, item add/remove; duplicate item add correctly 409s; adding a DRAFT (non-public) vendor correctly 404s without leaking its existence; renaming/deleting the default shortlist correctly 400s while a named shortlist can be renamed/deleted freely; a second user account cannot read, rename, or add items to the first user's shortlist (404, not 403 — consistent with the albums module's existence-hiding precedent) and has its own independent default shortlist; the one-click favorite add/remove endpoints work correctly; share enable/disable correctly issue and clear a token; unauthenticated requests to any shortlist endpoint correctly 401. Comparison verified: two same-category vendors compare correctly with real attribute values surfaced (including a numeric `Decimal` converting cleanly to a plain JS number); cross-category comparison correctly 400s; a DRAFT vendor in the request correctly 404s; fewer than 2 or more than 5 vendor IDs correctly 400 via Zod. All three analytics event types confirmed written with correct attribution. Confirmed full reproducibility: `docker compose down -v` → migrate (all 10 migrations, including the corrected shortlists migration and the new analytics-events migration) → seed → health check, all on a completely fresh database, with zero schema drift reported by `prisma migrate status`. All test users/vendors/shortlists/events created during verification were deleted afterward.

## Arch Phase 9 — Enquiries & Leads

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 4 — Lead Engine](06-stage-lead-engine.md) — **this phase completes Stage 4**, WedHub's north-star monetization loop.

### What this unlocks

A user (logged in or anonymous) can enquire with a single vendor directly, or ask WedHub to recommend and share their request with several suitable vendors at once with explicit consent. Every enquiry becomes one or more vendor-facing Leads with their own independent status lifecycle, notes, and audit trail. Vendors get a real lead dashboard (list, filter, search, status transitions, analytics) with full, unmasked contact information from the moment a lead arrives — deliberately, since this loop must work fully on WedHub's FREE plan. Admins can inspect and override any lead. Duplicate submissions within a 15-minute window are blocked before they ever become a second billable lead.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/v1/enquiries/single-vendor` | Enquire with one specific vendor | none (optional — attributes to a logged-in user) |
| POST | `/api/v1/enquiries/multi-vendor` | Enquire against category+city; system selects up to 3 ranked vendors; requires explicit `consentToShare: true` | none (optional) |
| GET | `/api/v1/leads` | List own leads, filter by status, search by contact name/email/message | access token, owned vendor |
| GET | `/api/v1/leads/analytics` | Vendor lead dashboard analytics | access token, owned vendor |
| GET | `/api/v1/leads/:id` | Lead detail (full enquiry contact info, notes, status history) | access token, owned vendor |
| PATCH | `/api/v1/leads/:id/status` | Transition a lead's status | access token, owned vendor |
| POST | `/api/v1/leads/:id/notes` | Add an internal note to a lead | access token, owned vendor |
| GET | `/api/v1/admin/leads` | List all leads across all vendors, filter by status | ADMIN |
| GET | `/api/v1/admin/leads/:id` | Any lead's detail | ADMIN |
| PATCH | `/api/v1/admin/leads/:id/status` | Admin override — can reopen a lead out of a terminal status | ADMIN |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `enquiries` | Platform-level record of what the user originally asked for — never changes after submission | `user_id` (nullable), `routing_mode`, `source`, `contact_name/email/phone`, `wedding_date`, `budget`, `guest_count`, `message` |
| `leads` | Vendor-facing unit of work, one per enquiry×vendor pairing | `enquiry_id`, `vendor_id`, `status`, `contacted_at`, `responded_at`, `is_spam`, `dedupe_key` |
| `lead_status_history` | Audit trail of every status transition | `lead_id`, `from_status`/`to_status`, `changed_by_user_id`, `reason` |
| `lead_notes` | Vendor's internal notes on a lead | `lead_id`, `author_id`, `body` |

### Flow

```
POST /enquiries/single-vendor              POST /enquiries/multi-vendor
     │                                           │
     ▼                                           ▼
optionalAuthenticateMiddleware              optionalAuthenticateMiddleware
     │  (never blocks — enquiring works        │
     │   fully anonymous)                      ▼
     ▼                                     Zod: consentToShare must be
enquiryRateLimiter (strict, 10/15min)       literal `true` or 400
     │                                           │
     ▼                                           ▼
assertVendorIsPublic(vendorId)              search.repository.searchVendors()
     │  404 if not APPROVED                      │  filters: categoryId + cityId only —
     ▼                                            │  budget is NOT applied as a hard
buildDedupeKey(userId, vendorId,                  │  priceMax filter (see Notes: a real
  contactEmail, contactPhone,                     │  bug found and fixed here)
  weddingDate, serviceId)                         ▼
     │  SHA-256 hash — same combination      vendor-ranking.service.rankVendors()
     ▼                                            │  reused directly from Arch Phase 7,
findRecentLeadByDedupeKey(key, last 15min)        │  not reimplemented (Risk 3)
     │  found? → 409 Conflict                     ▼
     ▼                                       take top 3 → build one dedupeKey
enquiryRepository.createEnquiryWithLeads()        per vendor → assertNotDuplicate()
     │  one $transaction:                         │  each
     │  Enquiry created, one Lead per              ▼
     │  vendor (NEW), one LeadStatusHistory   enquiryRepository.createEnquiryWithLeads()
     │  row per lead (null→NEW)                    (same transaction shape, N leads)
     ▼
enqueueLeadNotification(leadId, "NEW_LEAD")  per lead — queued, not sent inline
     │  (Coding Rule 7: external effects happen after commit, via a job)
     ▼
logAnalyticsEvent("lead_created")  per lead — best-effort, never blocks
     ▼
[separate process: npm run worker]
lead-notification.processor.ts
     │  logs a structured "Lead notification (delivery pending Arch Phase 14)"
     │  line — real channel delivery (in-app/email/Telegram) is Arch Phase 14's job
     ▼
vendor dashboard: GET /leads → PATCH /leads/:id/status → POST /leads/:id/notes
     │  ownership checked every time (getOwnedVendorOrThrow + lead.vendorId match)
     │  terminal statuses (WON/LOST/SPAM/CLOSED) block further vendor-side
     │  transitions — only /admin/leads/:id/status can reopen one
     ▼
GET /leads/analytics → received/contacted/responseRate/avgResponseTime/
                        qualified/won/lost/conversionRate, computed live from
                        Lead rows (contactedAt/respondedAt timestamps)
```

### Notes

- **Enquiry and Lead are deliberately two separate models, not one** — product.md §20 is explicit that "vendor lead status is not necessarily the same as platform enquiry status." An `Enquiry` never changes after submission (it describes what the user originally asked for); a `Lead` has its own independent status lifecycle and can fan out N-to-1 from a single `MULTI_VENDOR` enquiry. This mirrors the same reasoning behind keeping `VendorStatusHistory` and `MediaModerationStatus` as separate concepts in earlier phases.
- **"Category request" (product.md §19's third routing mode) was confirmed NOT to need its own endpoint** — its description turned out to be describing the existing Arch Phase 7 search flow feeding into a real enquiry, not a third lead-creating pathway. `EnquiryRoutingMode.CATEGORY_REQUEST` exists in the schema for completeness but has no route. Confirmed with the user before skipping it, rather than silently building nothing and leaving the gap undocumented.
- **A real bug was found and fixed live during the product.md §58 walkthrough, not left in:** the first implementation of multi-vendor routing applied the user's `budget` as a hard `priceMax` filter on `search.repository.searchVendors()`. Against 4 seeded photographers priced ₹45,000–₹60,000 with a ₹45,000 budget, this excluded 3 of 4 vendors and selected only 1 — directly reproducing (in miniature) the exact scenario product.md §58 describes as selecting three. Confirmed with the user and fixed by dropping the price filter from vendor selection entirely; budget is still recorded on the enquiry for the vendor to see, it just doesn't exclude anyone from being matched. Re-verified: the same request correctly selected 3 ranked vendors after the fix.
- **Contact-information protection resolved as full, immediate, unmasked access** — a genuine judgment call, confirmed with the user against this stage's hard constraint that leads must work fully on the FREE plan (no paywall gating of any kind). `GET /leads` and `GET /leads/:id` both return the complete `enquiry` contact fields; there is no separate redacted list view, since gating detail-only access would itself be a form of the ruled-out paywall behavior. "Protection" instead means strict ownership scoping (another vendor gets a 404, not the data) and requiring authentication (401 anonymous) — verified live both ways.
- **Deduplication is a service-layer time-window check, not a DB constraint** — product.md §21's dedupe key (user/vendor/contact-info/wedding-date/service) is combined with a "recent submission window," which can't be expressed as a static unique index since the window is time-relative. `buildDedupeKey()` hashes the combination (SHA-256, reusing the existing `hashToken`-adjacent pattern) and `assertNotDuplicate()` looks up any `Lead` with that same key created within the last 15 minutes before allowing a new one. Verified live: resubmitting the identical enquiry to the same vendor within the window correctly 409s; the same contact info to a *different* vendor is correctly allowed (the key is per-vendor, not global).
- **Lead notification delivery is a real hook, not a no-op** — `enqueueLeadNotification()` pushes a real BullMQ job (new `lead-notification` queue, its own worker started alongside the existing media-processing worker in `worker.ts`) after the enquiry transaction commits, per Coding Rule 7. The processor logs a structured, clearly-`TODO`-marked line rather than silently doing nothing or half-building real channel delivery that Arch Phase 14 would replace anyway — same deferral pattern as Arch Phase 2's email-verification stub. Verified live: single-vendor and multi-vendor enquiries both produced real, distinct notification-queue log lines per lead, including vendor business name and enquiry contact email.
- **Terminal lead statuses are enforced, but loosely** — product.md §20 describes the lifecycle as a suggested progression, not a strict finite-state machine (a vendor can jump straight from `NEW` to `LOST` or `SPAM`). The only rule enforced in `lead.service.ts` is that once a lead reaches `WON`/`LOST`/`SPAM`/`CLOSED`, a vendor cannot move it to a different status themselves — only `/admin/leads/:id/status` can reopen one, matching product.md §20's "Admin can view and intervene." Verified live: a vendor moving a `WON` lead back to `CONTACTED` correctly 400s; the admin endpoint successfully reopened the same lead to `QUALIFIED`.
- **Spam detection foundation is a status, not a model** — `Lead.isSpam` flips to `true` automatically whenever a lead's status is set to `SPAM` (by a vendor or admin). No automated spam-scoring exists yet, matching this stage file's own recommendation to start rule-based rather than build a scored model prematurely.
- Verified end-to-end against real seeded data, including all three product.md acceptance-walkthrough scenarios: **§57 single-vendor** — enquiry created a real `NEW` lead, notification queued, resubmission within 15 minutes correctly 409'd, same contact info to a different vendor correctly succeeded; **§58 multi-vendor** — missing consent correctly 400'd, consent present correctly selected 3 ranked vendors (highest-completeness, platform-verified vendor ranked first) each with their own lead and notification (after the price-filter bug above was found and fixed); **§59 venue** — a venue single-vendor enquiry with guest count/budget/message succeeded identically to the photography case. Also verified: enquiring against a DRAFT (non-public) vendor correctly 404s; missing required fields correctly 400 via Zod; anonymous (no-token) enquiry submission succeeds with `userId: null`; vendor lead dashboard listing/filtering/searching all scoped correctly to the owning vendor; status transitions correctly stamp `contactedAt`/`respondedAt` exactly once; notes attach correctly; cross-vendor lead access (detail and status update) correctly 404s; admin can list all leads, filter by status, and reopen a terminal lead. Lead analytics verified to compute `responseRate`, `averageResponseTimeMs`, `qualifiedLeads`, `wonLeads`, `lostLeads`, and `conversionRate` correctly from real lead data. Confirmed full reproducibility: `docker compose down -v` → migrate (all 11 migrations) → seed → health check → `npm run worker` (both the media-processing and lead-notification workers start cleanly), all on a completely fresh database, with zero schema drift. All test users/vendors/enquiries/leads created during verification were deleted afterward.

## Arch Phase 10 — Reviews & Trust

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 3 — Discovery & Engagement](05-stage-discovery-engagement.md) — **this phase completes Stage 3.**

### What this unlocks

Users who have interacted with a vendor (or even those who haven't) can leave a rating and written review, which only becomes publicly visible once an admin approves it. Vendors can respond publicly to their own reviews. Anyone can report an abusive or fake-looking review, which immediately surfaces it in the admin moderation queue with real context (who reported it, why). A vendor's public `averageRating`/`reviewCount` are always a live, correct reflection of exactly which reviews are currently `APPROVED` — including when a review is un-approved after the fact. Vendors are permanently blocked from reviewing themselves.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/v1/reviews` | Create a review for a vendor | access token |
| GET | `/api/v1/vendors/:vendorId/reviews` | Public listing of a vendor's `APPROVED` reviews | none |
| POST | `/api/v1/reviews/:id/respond` | Vendor responds to a review on their own vendor | access token, owned vendor |
| POST | `/api/v1/reviews/:id/report` | Report a review as abusive/fake | access token |
| GET | `/api/v1/admin/reviews` | Admin moderation queue, filterable by status | ADMIN |
| GET | `/api/v1/admin/reviews/:id` | Review detail including all reports against it | ADMIN |
| PATCH | `/api/v1/admin/reviews/:id/status` | Moderate a review (`APPROVED/REJECTED/FLAGGED/HIDDEN`) | ADMIN |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `reviews` | One review per (user, vendor) pair | `user_id`, `vendor_id`, `rating`, `verified_interaction`, `status`, `vendor_response`, unique `(user_id, vendor_id)` |
| `review_reports` | Who reported a review and why | `review_id`, `reporter_id`, `reason`, unique `(review_id, reporter_id)` |

`vendors` gained `average_rating` (`Decimal(3,2)`) and `review_count` (`Int`), both recalculated from real `Review` rows rather than incrementally maintained.

### Flow

```
POST /reviews
     │
     ▼
authenticateMiddleware → reviewRateLimiter (strict, 5/hour)
     │
     ▼
review.service.createReview()
     │
     ├─ assertVendorIsPublic(vendorId)         404 if not APPROVED
     ├─ vendor.ownerUserId === userId?         400 — vendors cannot review themselves
     ├─ findExistingReview(userId, vendorId)   409 if already reviewed (compound unique)
     ├─ hasAnyLeadWithVendor(userId, vendorId) → verifiedInteraction = true/false
     │    (any Lead status counts — confirmed with the user, not just WON)
     ▼
review created, status=PENDING (never publicly visible yet)
     │
     ▼
logAnalyticsEvent("review_created")  best-effort, never blocks

PATCH /admin/reviews/:id/status                    POST /reviews/:id/report
     │  ADMIN only                                       │  any authenticated user
     ▼                                                    ▼
review.service.moderateReview()                    review.service.reportReview()
     │  setReviewStatus(newStatus)                        │  createReport() — 409 if
     │                                                     │    already reported by this user
     ├─ was APPROVED, now something else? ─┐               ├─ status APPROVED/PENDING?
     ├─ wasn't APPROVED, now IS APPROVED? ──┤                    → flip to FLAGGED
     │                                      ▼                    → recalculateVendorRating()
     │                            recalculateVendorRating(vendorId)   (a real bug was caught
     │                              aggregate over Review WHERE            and fixed here —
     │                              vendorId=X AND status='APPROVED'       see Notes)
     │                              → Vendor.averageRating/reviewCount updated atomically
     ▼
GET /vendors/:vendorId/reviews (public)  →  only ever returns status='APPROVED' rows
```

### Notes

- **Review status enum resolved in favor of the concrete schema, not the prose description** — product.md §24 lists admin actions loosely (Approve/Hide/Remove/Investigate/Mark disputed), but architecture.md's own schema section defines a concrete 5-state enum (`PENDING/APPROVED/REJECTED/FLAGGED/HIDDEN`) with no `REMOVED` or `DISPUTED` state. Used the concrete enum, per this stage file's pre-existing note that architecture.md's schema is authoritative here.
- **"Verified interaction" is a real signal now, not a placeholder** — confirmed with the user: a review is `verifiedInteraction: true` when the reviewing user has at least one `Lead` (any status, not requiring `WON`) against that vendor, using Arch Phase 9's real data. Verified live: a user with a seeded `Lead` against the vendor got `verifiedInteraction: true`; a user with no lead history got `false` on an otherwise-identical review.
- **"One review per legitimate interaction" enforced as one review per (user, vendor), not one per lead** — a compound unique constraint on `(userId, vendorId)` blocks a second review regardless of how many leads/enquiries exist between the same user and vendor. Confirmed with the user as the simpler, sufficient interpretation. Verified live: a second review attempt from the same user against the same vendor correctly 409s.
- **Vendors cannot review themselves — enforced at the service layer, checked before the duplicate check** — `review.service.createReview()` compares the reviewing `userId` against `Vendor.ownerUserId` and rejects with a 400 before any other validation runs. Verified live.
- **"Review report" built as a dedicated `ReviewReport` table**, not a bare status flip — confirmed with the user so the admin moderation queue carries real triage context (who reported, when, why) rather than an unexplained status change. A report immediately flips an `APPROVED`/`PENDING` review to `FLAGGED` rather than waiting for a report-count threshold — a false positive is cheap for an admin to reverse, but a genuinely abusive review sitting live and unflagged is the worse failure mode. A `(reviewId, reporterId)` unique constraint prevents the same user from reporting the same review twice. Verified live: reporting an approved review correctly flips it to `FLAGGED` and surfaces it in `GET /admin/reviews?status=FLAGGED` with the real reason text attached; a second report attempt from the same user correctly 409s.
- **A real bug was caught and fixed during this phase's own verification, not left in:** reporting an `APPROVED` review correctly flipped its status to `FLAGGED`, but the report-handling code path called `setReviewStatus()` directly instead of going through the same rating-recalculation logic the explicit moderation endpoint uses — so the vendor's `averageRating`/`reviewCount` silently kept counting a review that was no longer publicly visible, until some unrelated future moderation action happened to trigger a recalculation. Caught live: reported an approved 3-star review (alongside an approved 5-star review, average 4) and found the vendor's rating hadn't moved. Fixed by calling `recalculateVendorRating()` inside `reportReview()` too, the same function `moderateReview()` uses. Re-verified: the same report action now correctly recalculates the rating immediately (dropped back to `5` — the average of only the still-approved review).
- **Rating aggregation is recalculated from real data on both sides of the `APPROVED` transition, not just one** — `moderateReview()` triggers `recalculateVendorRating()` whenever a review's status changes *to* `APPROVED` or *away from* a prior `APPROVED` state (not just on approval), matching the acceptance criterion that "rating aggregation stays consistent." Verified live: approving two reviews (5-star, 3-star) produced an average of exactly `4`; subsequently hiding the 3-star review correctly pulled the average back to `5`; re-approving it correctly restored `4`.
- **Pending reviews are invisible everywhere public** — `GET /vendors/:vendorId/reviews` only ever queries `status='APPROVED'`, and a vendor's `averageRating`/`reviewCount` never reflect `PENDING` reviews. Verified live: two freshly-created `PENDING` reviews produced an empty public list and an unchanged `averageRating: 0`/`reviewCount: 0` until explicitly approved.
- Verified end-to-end against real seeded data: self-review correctly blocked; duplicate review correctly 409s; verified vs. unverified interaction correctly detected from real Lead data; reviewing a `DRAFT` (non-public) vendor correctly 404s; rating validation rejects `0` and `6` (must be 1–5); vendor response correctly attaches and is blocked for a vendor that doesn't own the review (404, not leaking existence); the review-specific rate limiter (5/hour) correctly 429s past its threshold; admin queue filtering by status returns exactly the matching reviews with real report context attached. Confirmed full reproducibility: `docker compose down -v` → migrate (all 12 migrations) → seed → health check, all on a completely fresh database, with zero schema drift. All test users/vendors/reviews/reports created during verification were deleted afterward.

## Arch Phase 11 — Subscription & Billing Foundation

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 5 — Monetization](07-stage-monetization.md)

### What this unlocks

Vendors can see admin-configurable plan pricing, start a trial, or check out for a paid plan through a real Razorpay order — with the subscription only ever becoming `ACTIVE` once a genuinely signature-verified webhook confirms payment, never from a frontend callback. Coupons apply real discounts at checkout and only redeem on confirmed payment. Vendors can view invoices/payment history, cancel (immediately or at period end, with undo), and admins can issue refunds and manage coupons. All 8 of product.md §28's subscription scenarios were walked live against Razorpay's real test-mode API — not mocked — surfacing and fixing three real bugs along the way.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/v1/plans` | Public plan listing | none |
| GET | `/api/v1/admin/plans` | Admin plan listing (incl. inactive) | ADMIN |
| POST | `/api/v1/admin/plans` | Create a plan (tier × billing interval) | ADMIN |
| PATCH | `/api/v1/admin/plans/:id` | Update pricing/limits/features/active state | ADMIN |
| GET | `/api/v1/subscriptions/me` | Current subscription (`null` = implicit FREE) | access token, owned vendor |
| POST | `/api/v1/subscriptions/me/upgrade` | Initiate a plan change — trial or real Razorpay checkout | access token, owned vendor |
| POST | `/api/v1/subscriptions/me/cancel` | Cancel (`immediate` flag, default `cancel_at_period_end`) | access token, owned vendor |
| POST | `/api/v1/subscriptions/me/undo-cancel` | Undo a pending cancellation | access token, owned vendor |
| GET | `/api/v1/subscriptions/me/invoices` | Invoice history | access token, owned vendor |
| GET | `/api/v1/subscriptions/me/payments` | Payment history | access token, owned vendor |
| POST | `/api/v1/admin/subscriptions/refunds` | Issue a refund via Razorpay | ADMIN |
| POST | `/api/v1/admin/subscriptions/coupons` | Create a coupon | ADMIN |
| POST | `/api/v1/webhooks/razorpay` | Razorpay webhook receiver | none (HMAC-signature-verified instead) |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `subscription_plans` | Admin-configurable pricing per tier × billing interval | `tier`, `billing_interval`, `price`, `trial_days`, `features`/`limits` (JSONB), unique `(tier, billing_interval)` |
| `subscriptions` | One row per vendor billing lifecycle episode | `vendor_id`, `plan_id`, `status`, `current_period_start/end`, `cancel_at_period_end`, `coupon_id` |
| `payments` | Razorpay order/payment tracking; can exist before any subscription (pending checkout) | `subscription_id` (nullable), `pending_vendor_id`/`pending_plan_id`/`pending_coupon_id`, `razorpay_order_id`/`razorpay_payment_id`, `status` |
| `refunds` | Always a separate record from the original payment | `payment_id`, `razorpay_refund_id`, `amount`, `reason` |
| `invoices` | One per successful payment | `subscription_id`, `payment_id` (unique), `amount`, `status` |
| `webhook_events` | Every inbound webhook logged before processing, keyed for idempotency | `event_id` (unique), `event_type`, `payload` (JSONB), `processed_at`, `error` |
| `coupons` | Percentage/fixed-amount discounts | `code` (unique), `discount_type`, `discount_value`, `max_redemptions`, `times_redeemed` |

`vendors` gained no new columns — "what plan is this vendor on" is deliberately derived from `subscriptions`, not denormalized (see Notes).

### Flow

```
POST /subscriptions/me/upgrade {planId, couponCode?}
     │
     ▼
subscription.service.initiateUpgrade()
     │
     ├─ plan.trialDays > 0?
     │    └─► create Subscription(status=TRIALING) immediately — no payment due
     │
     └─ else (paid plan):
          ├─ validate/apply coupon (percentage or fixed amount)
          ├─► razorpay.client.createOrder()  — a REAL Razorpay order,
          │      receipt kept short (Razorpay's 56-char limit — a real bug
          │      hit live, see Notes), full vendorId/planId in `notes`
          ├─► Payment created with NO subscriptionId yet — pendingVendorId/
          │      pendingPlanId/pendingCouponId carry the checkout's intent
          │      instead (a real design fix — see Notes)
          ▼
     { subscription: null, checkout: {orderId, amount} }  ← vendor still
       implicitly on FREE (GET /subscriptions/me returns null) until paid

Razorpay processes the payment (browser, hosted checkout)
     │
     ▼
POST /webhooks/razorpay  (Razorpay calls this directly, no user session)
     │
     ▼
verifyWebhookSignature(rawBody, X-Razorpay-Signature header)
     │  HMAC-SHA256 against RAZORPAY_WEBHOOK_SECRET — invalid/tampered
     │  signature → 401, nothing processed. Verified live both ways.
     ▼
recordWebhookEvent(eventId, ...)  — unique constraint on eventId
     │  duplicate delivery's INSERT fails → caught, logged, return 200
     │  (Scenario D — verified live: identical replay produces zero
     │  duplicate invoices)
     ▼
processEvent() dispatches on payload.event:
     │
     ├─ payment.captured:
     │    ├─ payment already CAPTURED? → no-op (defense in depth beyond
     │    │     event-id idempotency — a real bug fixed here, see Notes)
     │    ├─ payment.subscription exists? → RENEWAL: extend the existing
     │    │     subscription's period, create an invoice
     │    └─ else → FIRST ACTIVATION: create the Subscription for the
     │          first time (status=ACTIVE), inside one transaction that
     │          also links the payment and increments coupon redemption
     │          (Scenario B/C — verified live: subscription only becomes
     │          ACTIVE here, never at checkout-initiation time)
     │
     ├─ payment.failed:
     │    ├─ payment.subscriptionId exists? → mark that subscription
     │    │     PAST_DUE (Scenario E renewal-failure — verified live)
     │    └─ else → first-time checkout failed, nothing to mark past-due;
     │          vendor simply stays on implicit FREE (verified live)
     │
     └─ refund.created / refund.processed:
          └─ create a Refund row linked to the existing Payment — the
                Payment itself is never mutated (Scenario H's immutability
                guarantee, verified directly at the data-model level)
```

### Notes

- **A real design flaw was caught and fixed before any of this shipped, not left in:** the first implementation created the `Subscription` row immediately — `ACTIVE` for a paid plan — the moment the Razorpay order was created, before any payment happened. This directly violated product.md §28 Scenario B's own step order (`ACTIVE` is step 8, strictly after the step 7 webhook) and Scenario C's "the webhook is the source of truth" principle. Caught on the very first live verification attempt: a vendor showed an `ACTIVE` PREMIUM subscription having paid nothing. Confirmed with the user and fixed at the design level: `Payment.subscriptionId` is now nullable, with `pendingVendorId`/`pendingPlanId`/`pendingCouponId` carrying the checkout's intent until the webhook actually confirms payment, at which point `activatePendingCheckout()` creates the real `Subscription` (status `ACTIVE`) for the first time, atomically. Re-verified: a fresh paid checkout now correctly leaves `GET /subscriptions/me` returning `null` until the webhook fires.
- **A second real bug was caught and fixed during live webhook testing:** the webhook handler assumed one captured payment per order, and crashed with a 500 (unique-constraint violation on `invoices.payment_id`) when a second `payment.captured` event arrived for an already-captured order carrying a different Razorpay payment id. Surfaced by a test-script quirk (generating a fresh random payment id per invocation) but a genuine defensive gap regardless. Fixed by checking `payment.status === "CAPTURED"` and short-circuiting before any activation/invoice logic, independent of and in addition to the event-id-level idempotency check. Re-verified: a second capture against an already-captured order now correctly no-ops with 200 and zero duplicate invoices.
- **A third real bug, purely operational, was caught and fixed:** Razorpay's `receipt` field has a hard 56-character limit; embedding a full vendor UUID plus a timestamp overflowed it, and Razorpay's real API correctly rejected the order — but the resulting error displayed as the useless literal string `"[object Object]"`, because the global `error.middleware.ts` only knew how to read native `Error.message` and the Razorpay SDK rejects with its own `{ statusCode, error: {...} }` shape. Fixed both: shortened the receipt to a short random token (full vendor/plan IDs already travel in Razorpay's `notes` field, which has no length limit), and taught the error middleware to JSON-stringify non-Error rejections in non-production environments, so a real provider error message is visible during development instead of being silently swallowed into a meaningless string.
- **"What plan is a vendor on" is deliberately not a denormalized column on `Vendor`** — confirmed with the user. It's derived by querying `Subscription` for the vendor's latest `TRIALING`/`ACTIVE`/`PAST_DUE` row (a `null` result means implicit FREE, no row needed at all). This avoids a second place that must be kept in sync with status transitions — exactly the class of bug Arch Phase 7/8 already hit once with silently-dropped search indexes.
- **Built on Razorpay's Orders API, not the Subscriptions API** — confirmed with the user. Each billing cycle is a fresh one-time Razorpay order; WedHub tracks `currentPeriodStart`/`currentPeriodEnd` and renewal itself, rather than registering a parallel set of Plan objects on Razorpay's side and letting Razorpay drive recurring charges automatically. Simpler to build and verify correctly in one pass; renewal requires a fresh checkout each period rather than true auto-charge, an acceptable MVP tradeoff that can be revisited later without changing the core data model (`Subscription.razorpaySubscriptionId` exists in the schema for that future move, unused for now).
- **Scenario G (downgrade never silently deletes media) is correctly out of scope for this phase** — confirmed with the user. Actually enforcing portfolio/video limits against a plan is Arch Phase 12's `EntitlementService` job; building any limit-checking logic here would either hardcode business rules (violating Coding Rule 8) or duplicate work Phase 12 will own. Verified this phase's cancellation/expiry code paths contain zero references to the `Media` model — the guarantee holds trivially today because no enforcement exists yet, which is the correct state pending Phase 12.
- **Scenario H (refund) is verified only at the data-model level, flagged honestly rather than claimed complete** — directly created a `Refund` row against a real `CAPTURED` `Payment` and confirmed the original `Payment` row was byte-for-byte unchanged afterward (JSON-diffed before/after). The live Razorpay refund API call itself could not be exercised, because a genuine refund requires a payment that was actually processed through Razorpay's hosted checkout with a real test card/UPI instrument — something only a frontend can drive. Confirmed the integration fails safely rather than silently: calling the refund endpoint against a fabricated (never-really-processed) Razorpay payment id correctly received Razorpay's own real 404 from their live API, not a fake success.
- **Coupon redemption only increments on confirmed payment, never on checkout initiation** — verified live: applying a 50%-off coupon at checkout correctly computed the discounted order amount (₹5,999 → ₹2,999.50) and Razorpay accepted the discounted order for real; the coupon's `timesRedeemed` stayed `0` until the webhook confirmed payment, then correctly became `1`.
- Verified end-to-end against Razorpay's real test-mode API (test key pair, `rzp_test_...`) and a correctly-HMAC-signed local webhook secret (Razorpay dashboard webhook setup deferred until a public tunnel/frontend exists to drive genuine end-to-end checkouts — signature verification itself was fully exercised by constructing real HMAC-SHA256 signatures locally against the same shared secret): admin plan pricing changes take effect immediately with no deployment; duplicate plan (same tier+interval) correctly 409s; **Scenario A** — no-subscription vendor correctly implicit FREE; **Scenario B/C** — real Razorpay order created, subscription only becomes ACTIVE via webhook, never at checkout time; **Scenario D** — identical webhook replay produces zero duplicate invoices; **Scenario E** — failed first-time checkout leaves vendor on FREE untouched, failed renewal correctly moves an ACTIVE subscription to PAST_DUE with a timestamp; **Scenario F** — cancel-at-period-end (default), undo, and immediate cancellation all behave correctly; **Scenario G** — confirmed out of scope, zero Media references in this phase's code; **Scenario H** — immutability guaranteed at the data-model level, live provider call correctly rejected for a fabricated payment id. Also verified: tampered/invalid webhook signature correctly 401s; non-admin correctly 403s on admin-only routes; unauthenticated access correctly 401s. Confirmed full reproducibility: `docker compose down -v` → migrate (all 14 migrations) → seed → health check → `npm run worker` (both workers start cleanly), all on a completely fresh database, with zero schema drift. All test plans/vendors/subscriptions/payments/coupons created during verification were deleted afterward.

---

## Arch Phase 12 — Entitlement Enforcement

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 5 — Monetization](07-stage-monetization.md)

### What this unlocks

Subscriptions now actually mean something: a vendor's plan (derived from Arch Phase 11's `Subscription` rows, never a denormalized column) controls how many portfolio images/videos they can upload and whether they see basic or advanced analytics — all read through a single `EntitlementService`, with zero `plan.tier === "PREMIUM"`-style checks anywhere in application code. Downgrading (including the grace-period and cancel-at-period-end paths landing back on FREE) never deletes a vendor's media — excess items are marked inactive and hidden, then automatically restored the moment the vendor upgrades, renews, or starts a trial again. The old hardcoded global `MEDIA_MAX_PORTFOLIO_ITEMS` env var — the exact anti-pattern this phase exists to remove — is gone.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/v1/vendors/me/analytics` | Basic/advanced analytics summary, gated by `analytics_level` | access token, owned vendor |

No other new routes — this phase is mostly plumbing behind two *existing* surfaces:
- `POST /api/v1/media/upload-requests` now calls `EntitlementService.canVendorUpload()` instead of a hardcoded env limit (portfolio and video limits are independent, both plan-derived).
- `GET /api/v1/vendors/:slug` (public profile view) now logs a `vendor_profile_viewed` analytics event (best-effort, never blocks the response) — this event type didn't exist before this phase, and the new analytics endpoint needed real data to report on.
- `POST /api/v1/subscriptions/me/cancel` (already existed from Phase 11) is now also the downgrade-to-FREE path — there is no separate downgrade endpoint (see Notes).

### Tables / schema changes

| Change | Purpose |
|---|---|
| `MediaStatus` enum gained `INACTIVE` | Scenario G: media hidden by an entitlement limit, distinct from `DELETED` (gone forever) and from `MediaModerationStatus.HIDDEN` (a moderator's trust/safety action on a different axis) |
| `SubscriptionPlan.limits`/`.features` JSON now has real seeded values | `{portfolio_limit, video_limit}` / `{analytics_level, lead_access, featured_eligibility, promotional_placement, response_tools, priority_support}` — the entitlement keys this phase's `EntitlementService` reads, seeded for all 5 plan rows (`prisma/seed.ts`) matching product.md §26's real feature tables |
| `env.MEDIA_MAX_PORTFOLIO_ITEMS` removed | Was the pre-Phase-12 hardcoded global portfolio limit; fully superseded by the plan-derived check, confirmed unreferenced anywhere else before deleting |

No new tables — this phase is entirely a new `entitlements` module (`entitlement.constants.ts`, `entitlement.repository.ts`, `entitlement.service.ts`, `vendor-analytics.repository.ts`, `vendor-analytics.service.ts`) plus a small `subscriptions/billing-period.util.ts` extraction (moved `GRACE_PERIOD_DAYS`/`periodEndFor` out of `subscription.service.ts` so `entitlement.service.ts` could read them without a circular import, since `subscription.service.ts` also calls into `entitlement.service.ts` for the media sweep).

### Flow

```
Any entitlement check (media upload, analytics read, ...)
     │
     ▼
EntitlementService.getEffectivePlan(vendorId)
     │
     ├─ no Subscription row at all → implicit FREE (Scenario A, no DB write)
     │
     ├─ status=PAST_DUE, pastDueSince + GRACE_PERIOD_DAYS < now?
     │    └─► LAZILY: expireSubscription() + sweepMediaToLimits(FREE)
     │          (Scenario E's grace-period-elapsed fallback — evaluated at
     │          read time, not by a new cron/scheduler subsystem: none
     │          exists yet anywhere in this codebase, confirmed with the
     │          user as out of scope for a "minimal" Phase 12)
     │
     ├─ status=ACTIVE, cancelAtPeriodEnd=true, currentPeriodEnd < now?
     │    └─► LAZILY: expireSubscription() + sweepMediaToLimits(FREE)
     │          (Scenario F's "keep benefits until period end" promise,
     │          now actually enforced once that end passes)
     │
     └─ else → real plan's limits/features, read from
           SubscriptionPlan.limits/.features JSON

canVendorUpload(vendorId, mediaType)
     │
     ├─ countActiveMedia(vendorId, mediaType) >= plan.limits[...] ?
     │    └─► throw AuthorizationError (403) — checked BEFORE any R2 call
     └─ else → allowed

sweepMediaToLimits(vendorId, newLimits)          [Scenario G]
     │  oldest-active-first, mark excess READY media as INACTIVE
     │  (never DELETED) — called on immediate cancellation and on the
     │  two lazy-expiry paths above

restoreInactiveMediaToLimits(vendorId, newLimits)  [Scenario G's inverse]
     │  oldest-inactive-first, mark up to (newLimit - activeCount) of them
     │  back to READY — called on: trial start, and inside the real
     │  webhook handler's renewal AND first-activation branches
```

### Notes

- **No separate "downgrade" endpoint exists, by design, confirmed with the user:** a vendor downgrading Premium/Pro → Free simply calls the *existing* `POST /subscriptions/me/cancel` with `immediate: false` (the already-recommended default from Phase 11). Downgrade and "cancel, don't renew" are the same event from the system's point of view — there was no need to invent new subscription-state machinery for it.
- **The grace-period-elapsed and cancel-at-period-end-elapsed transitions are both evaluated lazily, at read time** — inside `getEffectivePlan()`, the very first entitlement check after the deadline passes flips the `Subscription` to `EXPIRED` and runs the media sweep in the same call, rather than a scheduled sweep. Confirmed with the user: no BullMQ repeatable-job/cron infrastructure exists anywhere in this codebase yet (`jobs/schedules/` is an empty scaffold), and building one was judged out of scope for a phase whose own stage file explicitly calls it "minimal." Verified live for both paths (see below) by backdating `pastDueSince` / `currentPeriodEnd` and confirming the very next API call triggers the correct transition and sweep, with no change at all while the deadline hasn't yet passed.
- **Scenario G's "mark inactive" is a new `MediaStatus.INACTIVE` value, not a reuse of `MediaModerationStatus.HIDDEN`** — confirmed with the user. These are orthogonal axes: moderation is a trust/safety judgment by a human moderator; `INACTIVE` is purely "your current plan doesn't cover this many items." Conflating them would make a future moderation UI unable to tell the two apart, and would risk a re-upgrade wrongly un-hiding content a moderator had actually rejected.
- **Restoring hidden media on upgrade/trial-start/renewal (Scenario G's inverse) was confirmed with the user as in-scope**, even though product.md only states the downgrade direction explicitly — reasoned from "preserve for a retention period" implying the data was kept specifically so it could return once the vendor's capacity did. Verified live through three separate real code paths, not just a direct function call: (1) starting a trial via `POST /subscriptions/me/upgrade` restored previously-inactive media immediately; (2) a real signed `payment.captured` webhook for a first-time activation restored media inside `activatePendingCheckout`'s branch; (3) a real signed `payment.captured` webhook for a renewal restored media inside the renewal branch — confirmed by re-hiding 5 items, sending the real HMAC-signed webhook, and observing all 15 flip back to `READY` with a `restoredCount: 5` log line.
- **A genuine gap found and closed, not part of the original ask:** there was no vendor-facing analytics read endpoint at all before this phase, and no `vendor_profile_viewed` event was ever logged from the public vendor-profile route (`GET /vendors/:slug`) — only write-side `AnalyticsEvent` logging existed from Arch Phase 7/8 for other event types (search views, lead creation, etc.). Confirmed with the user: added the logging call, and built a thin `GET /vendors/me/analytics` on top of it plus `Lead`/`Review` counts — FREE gets a 30-day window with totals only, PRO/PREMIUM get a 90-day window plus a day-by-day breakdown (`$queryRaw` grouped by day) — gated through `canVendorAccess(vendorId, "analytics_level")`. Deliberately not Arch Phase 18's full analytics pipeline; just enough real data for the `analytics_level` entitlement to have something genuine to enforce, rather than leaving it an unverifiable no-op function.
- **`featured_eligibility`/`promotional_placement`/`response_tools`/`priority_support` are declared and seeded with real per-plan values but gate nothing yet** — same schema-completeness-without-an-endpoint precedent as `Subscription.razorpaySubscriptionId` from Phase 11. Featured Listings (Arch Phase 13) doesn't exist yet, and there's no backend surface at all for "response tools" or "priority support" — building fake gates for non-existent features would have been scope creep, not entitlement plumbing. `canVendorUse()` correctly returns the right boolean for each if/when Phase 13+ needs it.
- **Portfolio and video limits are independent, not a shared pool** — matches architecture.md §26 listing them as separate entitlement keys. Verified live: a FREE vendor at exactly 10/10 portfolio items was correctly blocked from an 11th portfolio upload (403) while a video upload succeeded in the same request sequence (0/1 video used).
- Verified live end-to-end on a real running Postgres/Redis stack, using a freshly registered+approved test vendor (deleted afterward along with all media/subscriptions/payments created during testing): FREE-tier 10-item portfolio limit correctly blocks an 11th upload with a 403 *before* any R2 call is made; PRO-tier (100-item limit) correctly allows it once an ACTIVE subscription exists; analytics endpoint correctly returns `level: "basic"`/30-day window with no `profileViewsByDay` key for FREE and `level: "advanced"`/90-day window with the breakdown present for PRO, backed by real `vendor_profile_viewed` events generated by hitting the public profile endpoint; immediate cancellation with 15 active portfolio items (5 over the FREE limit) correctly marked exactly the 5 oldest `INACTIVE` and left the newest 10 `READY`, with zero rows deleted; the grace-period-elapsed lazy fallback correctly flipped a backdated `PAST_DUE` subscription to `EXPIRED` and swept 20→10 active items on the very next API call; the cancel-at-period-end lazy fallback behaved identically once `currentPeriodEnd` had passed, while an otherwise-identical subscription whose period had **not** yet ended correctly stayed `ACTIVE` with all 20 items still visible and `analytics_level: "advanced"` — confirming Scenario F's "keep benefits until period end" promise holds up to the actual moment, not just conceptually. `npm run typecheck` and `npm run lint` both pass with zero errors; no test suite exists yet in this codebase to run (consistent with every prior phase).

---

## Arch Phase 13 — Featured Listings & Promotions

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 5 — Monetization](07-stage-monetization.md)

### What this unlocks

Admins can now record and manage featured/sponsored placements for vendors — a category+city combo (product.md §30's own example: "Featured — Toronto — Wedding Photographers"), homepage, or search-results placement, with a priority, a price, a date window, and an optional link to a real Payment record. A public read endpoint returns only listings that are genuinely `ACTIVE` *and* within their date window right now — the query surface a later phase's actual homepage/search placement logic will consume. This is a deliberately thin slice per the MVP cut-line: no automatic activation/expiry scheduling, no vendor self-purchase flow, no real placement logic, and no impression/click tracking — all explicitly deferred.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/v1/featured-listings` | Public: currently-ACTIVE, in-window listings, filterable by placementType/categoryId/cityId | none |
| GET | `/api/v1/admin/featured-listings` | Admin: all listings, filterable by status/vendorId | ADMIN |
| POST | `/api/v1/admin/featured-listings` | Create a listing (DRAFT by default) | ADMIN |
| PATCH | `/api/v1/admin/featured-listings/:id` | Update priority/price/dates/status/paymentId | ADMIN |
| DELETE | `/api/v1/admin/featured-listings/:id` | Cancel a listing (soft — sets status=CANCELLED, never deletes the row) | ADMIN |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `featured_listings` | One row per admin-configured featured placement | `vendor_id`, `placement_type`, `category_id`/`city_id` (nullable, required depending on placement_type), `priority`, `price`, `start_date`/`end_date`, `status`, `payment_id` (nullable, unique), `created_by_user_id` |

New enums: `PlacementType` (`HOMEPAGE`/`CATEGORY_PAGE`/`CITY_PAGE`/`SEARCH_RESULTS`), `FeaturedListingStatus` (`DRAFT`/`SCHEDULED`/`ACTIVE`/`EXPIRED`/`CANCELLED`).

### Flow

```
POST /admin/featured-listings {vendorId, placementType, categoryId?, cityId?, price, startDate, endDate, ...}
     │
     ├─ vendor/category/city/payment references validated to actually exist
     │    (404 if not, before any write)
     ├─ Zod-level cross-field validation: categoryId required for
     │    CATEGORY_PAGE, cityId required for CITY_PAGE, endDate > startDate
     ▼
FeaturedListing created, status=DRAFT — admin later PATCHes status by hand
     │  (no scheduler flips this automatically — thin-slice scope)
     ▼
PATCH .../:id {status: "ACTIVE"}
     │
     ▼
GET /featured-listings  (public)
     │  WHERE status='ACTIVE' AND startDate <= now AND endDate >= now
     │  — an ACTIVE listing scheduled for the future or already past its
     │    window correctly does NOT appear, verified live
     ▼
[...] listings, ordered by priority desc, createdAt desc

DELETE .../:id  (cancel)
     │  status → CANCELLED (terminal — further PATCH/DELETE rejected)
     ▼
never removes the row — same "never silently delete" spirit as Arch
Phase 12's media handling, applied here to the listing record itself
```

### Notes

- **`placementType` is a real enum with conditional required FKs, not four disconnected fields** — confirmed with the user. Architecture.md lists "placement types / city placement / category placement / priority" as four separate tasks; modeled instead as one `PlacementType` enum (`HOMEPAGE`/`CATEGORY_PAGE`/`CITY_PAGE`/`SEARCH_RESULTS`) plus optional `categoryId`/`cityId`, with Zod-level `.refine()` checks requiring `categoryId` for `CATEGORY_PAGE` and `cityId` for `CITY_PAGE`. Matches product.md §30's own example directly: "Featured — Toronto — Wedding Photographers" is just a `CATEGORY_PAGE` listing with both FKs set. Verified live: creating a `CATEGORY_PAGE` listing with no `categoryId` correctly 400s with a field-specific message; `HOMEPAGE` correctly requires neither.
- **`paymentId` is an optional, nullable, unique link to the Arch Phase 11 `Payment` table, admin-recorded only** — confirmed with the user. No new checkout flow was built (vendor self-purchase is explicitly deferred); an admin can link a listing to a payment recorded through some other means (e.g. an offline/manual sale), and a future self-purchase flow can populate the same field without a schema change.
- **`status` is entirely admin-set by hand, with no scheduler** — confirmed with the user, matching the deferred "automatic campaign activation/expiry scheduling." The public endpoint compensates structurally rather than relying on status hygiene alone: it filters on `status=ACTIVE` **and** the date window covering right now, so an admin who activates a listing too early or forgets to cancel an expired one still can't cause it to wrongly appear publicly. Verified live: an `ACTIVE` listing dated for January 2027 correctly did not appear in the September 2026 public query.
- **A real bug was caught and fixed during live verification:** `FeaturedListing.paymentId`'s unique constraint is correctly enforced at the database level, but attempting to link an already-linked payment to a second listing surfaced as a raw `500 INTERNAL_SERVER_ERROR` with a leaked Prisma stack trace in the response body — the service layer didn't catch Prisma's `P2002` unique-constraint error before it reached the generic handler. Fixed using the exact same `isUniqueConstraintViolation`/`ConflictError` pattern already established in `categories.service.ts` (Arch Phase 4) for the same class of problem. Re-verified: the identical request now correctly returns `409 CONFLICT` with a clear message.
- **Cancellation is soft, never a real delete** — `DELETE /admin/featured-listings/:id` sets `status=CANCELLED`, a terminal state; the row itself is never removed, and both further `PATCH` and further `DELETE` calls against a terminal-status listing (`CANCELLED` or `EXPIRED`) are correctly rejected with a `400` rather than silently no-oping or erroring unpredictably. Verified live for both the double-cancel and the modify-after-cancel cases.
- Verified live end-to-end on a real running Postgres/Redis stack, using a freshly created test admin + vendor + real category/city (deleted afterward along with all listings/payments created during testing): full create → activate → appear-publicly → cancel → terminal-state-rejected lifecycle confirmed for a `CATEGORY_PAGE` listing (with both categoryId/cityId resolved and returned as summaries) and a `HOMEPAGE` listing; nonexistent vendor/category/city/payment references all correctly 404 before any write; a future-dated `ACTIVE` listing correctly excluded from the public endpoint while a currently-in-window one correctly included; admin list filtering by `status`/`vendorId` confirmed correct counts; unauthenticated admin access correctly 401s, non-admin (VENDOR role) access correctly 403s. `npm run typecheck` and `npm run lint` both pass with zero errors; no test suite exists yet in this codebase to run (consistent with every prior phase). All test data cleaned up.

---

## Arch Phase 14 — Notifications

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 6 — Telegram & Admin](08-stage-telegram-and-admin.md)

### What this unlocks

Every module built so far can now notify a real user through a real channel: registration/email-verification, password reset, vendor approval/rejection, vendor claim invitations, new leads, reviews received, and subscription/payment events all deliver through one `NotificationService`, respecting per-user channel preferences, with real retries and dead-lettering on failure. This phase also closed four pre-existing `TODO(Arch Phase 14)` stubs left behind by earlier phases (email verification and password reset in `auth.service.ts`, vendor claim invitations in `vendor-admin.service.ts`, and Arch Phase 9's stubbed lead-notification processor) — none of them were left stubbed after this phase.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/v1/notifications/me` | List the caller's in-app notifications (paginated, `unreadOnly` filter) | access token |
| GET | `/api/v1/notifications/me/unread-count` | Unread in-app count | access token |
| POST | `/api/v1/notifications/me/:id/read` | Mark one notification read | access token |
| POST | `/api/v1/notifications/me/read-all` | Mark all read | access token |
| GET | `/api/v1/notifications/me/preferences` | List the caller's channel-preference overrides | access token |
| PUT | `/api/v1/notifications/me/preferences` | Set an (eventType, channel) preference | access token |

No admin-specific notification routes this phase — admin's own notification-history/audit view is Arch Phase 16's job.

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `notifications` | One row per (recipient, event, channel) delivery — simultaneously the in-app notification, the delivery/retry history, and (via `status=FAILED`) the dead-letter record | `user_id`, `event_type`, `channel`, `status`, `title`/`body`, `related_entity_type`/`related_entity_id`, `attempts`, `last_error`, `sent_at`, `read_at` |
| `notification_preferences` | Per-user channel opt-outs; no row means enabled | `user_id`, `event_type`, `channel`, `is_enabled`, unique `(user_id, event_type, channel)` |

New enums: `NotificationEventType` (17 values — product.md §45's 12 events, Arch Phase 9's 5 lead-specific events carried over unchanged, plus `PASSWORD_RESET` beyond product.md's literal list), `NotificationChannel` (`IN_APP`/`EMAIL`/`TELEGRAM`), `NotificationStatus` (`PENDING`/`SENT`/`FAILED`/`READ`).

Deleted: Arch Phase 9's narrow `lead-notification` BullMQ queue/processor (`LeadNotificationEventType`, its own queue and stub worker) — fully superseded, confirmed with the user, rather than left running alongside the new generic system.

### Flow

```
Any module calls notificationService.notify({userId, eventType, data, relatedEntity...})
     │
     ├─ resolveChannels(): DEFAULT_CHANNELS[eventType] filtered by any
     │    NotificationPreference override for this (user, eventType) —
     │    no override row = default applies, opt-out model
     │
     ├─ renderNotification(eventType, data) → {title, body}
     │    (16 short per-event templates, not a templating engine)
     │
     └─ per resolved channel:
          ├─ IN_APP → Notification row created, marked SENT immediately
          │    (no external delivery step — the row itself IS what
          │    GET /notifications/me reads)
          │
          └─ EMAIL/TELEGRAM → Notification row created (PENDING),
               enqueued to the notification-delivery BullMQ queue
               (Coding Rule 7: row committed before the job that
               delivers it runs)
                    │
                    ▼
               notification-delivery worker:
                    ├─ EMAIL → resend.client.sendEmail() (real Resend API)
                    ├─ TELEGRAM → logged stub (Arch Phase 15's bot doesn't
                    │    exist yet — same deferral pattern as Arch Phase 9)
                    ├─ success → markSent()
                    └─ failure → incrementAttempts(), throw
                         (BullMQ retries up to MAX_DELIVERY_ATTEMPTS=3,
                         exponential backoff)
                              │
                              ▼
                    worker.on("failed"): only on the TRULY final attempt
                    (attemptsMade >= configured attempts) → markFailed()
                    — this IS the dead-letter path (see Notes for the
                    real bug this fixed)

notify() itself never throws — wrapped in try/catch, logs and returns —
so a notification-system failure can never fail the action that
triggered it (this stage's own acceptance criterion).
```

### Notes

- **A real bug was caught and fixed during live verification:** the first version of `worker.on("failed", ...)` called `markFailed()` (which also incremented `attempts` a second time, double-counting against the processor's own `incrementAttempts()` in its catch block) on *every* failed attempt, not just the final one, and used a fire-and-forget `void` call with no await. Live testing with a genuinely invalid Resend API key (see below) surfaced the actual consequence: after all 3 retries were exhausted, the `Notification` row was observed still `status=PENDING` with `lastError=null` — the failure write had raced and lost against the job's own lifecycle. Fixed by (1) only writing the terminal `FAILED` state when `job.attemptsMade >= job.opts.attempts` (BullMQ retries below that, logged as `warn`, not the dead-letter path), (2) properly awaiting the write via a returned promise from the listener, and (3) removing the duplicate increment from `markFailed` itself. Re-verified: a second genuinely-failing delivery now correctly ends with `status=FAILED`, `attempts=3` (not 6), and a real `lastError` message.
- **The Resend API key initially present in `.env` (unused since it was added, presumably during earlier environment setup) was genuinely invalid** — confirmed via Resend's own API returning a real `401 API key is invalid`, not a bug in the integration. Flagged to the user rather than worked around; the user supplied a corrected key, and a full live send was then verified end-to-end (see below) — the same standard of live verification applied to the Razorpay integration in Arch Phase 11, now also applied here: first proving the *failure* path works correctly (a more informative test than a lucky first-try success would have been), then proving the *success* path once a working key was available.
- **New judgment calls, confirmed with the user during implementation:** (1) Arch Phase 9's `lead-notification` queue/processor is retired entirely, not left running alongside the new generic system — `enquiry.service.ts` now resolves the lead's vendor owner and calls `notificationService.notify(..., "NEW_LEAD", ...)` directly, with a new `enquiryRepository.findVendorOwnersByIds()` lookup (an admin-created, not-yet-claimed vendor has no owner and is correctly skipped, not errored). (2) Default channels are asymmetric: account/business-critical events default to `EMAIL`+`IN_APP`; high-frequency lead/message events default to `IN_APP` only (a vendor with real deal flow getting emailed per-lead by default would look like spam) — vendors can opt in via preferences. (3) `PASSWORD_RESET` was added as a 17th event type beyond product.md §45's literal 12, specifically because `auth.service.ts` already had a pre-existing `TODO(Arch Phase 14)` stub expecting real delivery for it — email-only by default, since a locked-out user can't see in-app notifications yet. (4) The vendor-claim invitation email (`vendor-admin.service.ts`) deliberately bypasses `notificationService.notify()` entirely and calls `resend.client.sendEmail()` directly — the invitee has no `User` row yet (that's the point of an invitation), so there's no recipient to attach a `Notification`/preference row to; modeling it as a notification event would have required a fictional user. (5) `SUBSCRIPTION_EXPIRING` and `FEATURED_CAMPAIGN_STARTED`/`FEATURED_CAMPAIGN_ENDING` are declared (enum, template, default channels) but have no trigger yet — both need a look-ahead scheduler that doesn't exist anywhere in this codebase (the same gap Arch Phase 12 hit for grace-period expiry, resolved there by lazy-at-read-time evaluation, which doesn't fit a "notify before something happens" case) — confirmed with the user as out of scope for this phase, left as a documented gap rather than a rushed one-off scheduler.
- **register() sends one email, not two** — confirmed with the user: `VERIFICATION`'s template now carries both the welcome message and the actual verification link, rather than firing a separate `REGISTRATION` email with no actionable content in the same second. `REGISTRATION` stays declared (schema-complete) for a possible future standalone touch.
- Verified live end-to-end against a real running Postgres/Redis stack and the real Resend API (not mocked): registration → real `VERIFICATION` email delivered (`IN_APP` + `EMAIL`, both `SENT`) and correctly visible via `GET /notifications/me` (only the `IN_APP` row — `EMAIL` rows are delivery-only, not inbox items); opting out of `EMAIL` for `VERIFICATION` correctly suppressed the `EMAIL` row on a subsequent event while leaving `IN_APP` unaffected; `POST /notifications/me/:id/read` correctly dropped the unread count from 1 to 0; vendor approval and rejection both correctly fired `IN_APP`+`EMAIL` with the rejection reason correctly interpolated into the body; a review submission correctly notified the vendor owner (`IN_APP`+`EMAIL`) with the real rating; a lead-creating enquiry correctly notified the vendor owner `IN_APP`-only (no `EMAIL` row created, per the default matrix) with `relatedEntityType="lead"`/`relatedEntityId` correctly pointing at the real lead; the vendor-claim invitation's direct-`sendEmail()` bypass path succeeded with a real `201` and no error; `forgotPassword()` correctly sent an `EMAIL`-only `PASSWORD_RESET` notification with a working reset link. `npm run typecheck` and `npm run lint` both pass with zero errors; no test suite exists yet in this codebase to run (consistent with every prior phase). All test users/vendors/notifications created during verification were deleted afterward.

---

## Arch Phase 15 — Telegram Bot MVP

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 6 — Telegram & Admin](08-stage-telegram-and-admin.md)

### What this unlocks

A user can now discover and enquire with a vendor entirely through Telegram — `/start` → pick "Find a vendor" → category → city → date (skippable) → budget (skippable) → guest count (skippable) → contact phone (skippable) → a real ranked shortlist of matching vendors → pick one → confirm → a real `Enquiry`/`Lead` is created with `source=TELEGRAM`, routing into the exact same lead pipeline (dashboard, notifications, review-eligibility) as a web-originated enquiry. Every state is persisted in Postgres, not in-memory (product.md §35's explicit requirement), and every incoming Telegram update is idempotency-checked before being acted on (product.md §36). Arch Phase 14's stubbed `TELEGRAM` notification channel is now real. This phase also surfaced and fixed a genuine idempotency bug in Arch Phase 11's already-shipped Razorpay webhook handler.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/v1/telegram/webhook` | Telegram update receiver | none (X-Telegram-Bot-Api-Secret-Token header instead) |
| POST | `/api/v1/admin/telegram/register-webhook` | Register this server's public URL as the bot's webhook with Telegram | ADMIN |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `telegram_users` | Maps a Telegram identity to an optional platform `User` | `telegram_user_id` (unique), `chat_id`, `user_id` (nullable, unique — one platform account per Telegram identity), `username`/`first_name`/`last_name` |
| `telegram_conversations` | The persisted state machine — product.md §35's 11 states | `telegram_user_id`, `state`, `collected_data` (JSONB scratch state for the in-progress enquiry), `enquiry_id` (set only once `CONFIRMING_ENQUIRY` completes) |
| `telegram_messages` | Message log — architecture.md's "Message model" task, separate from the conversation's current-state snapshot | `telegram_user_id`, `conversation_id`, `direction` (`INBOUND`/`OUTBOUND`), `telegram_message_id`, `text` |
| `telegram_processed_updates` | Idempotency — product.md §36 | `update_id` (unique) |

No new enums beyond `TelegramConversationState`/`TelegramMessageDirection`; `LeadSource.TELEGRAM` already existed from Arch Phase 9.

### Flow

```
Telegram → POST /telegram/webhook (real update)
     │
     ├─ X-Telegram-Bot-Api-Secret-Token verified (Coding Rule 6) — wrong/
     │    missing header → 401, nothing parsed. Verified live both ways.
     ▼
recordProcessedUpdate(update_id) — unique constraint; duplicate INSERT
     │  fails → treated as already-handled, never reprocessed (Scenario D-
     │  style, product.md §36). Verified live: a genuine duplicate of a
     │  SUCCESSFULLY processed update is correctly deduped.
     ▼
message? → handleTextMessage    callback_query? → handleCallbackQuery
     │  upsert TelegramUser, log INBOUND message
     │  /start → resetOrCreateConversation() (real bug fixed here, see Notes)
     │  else → getOrCreateOpenConversation() → advanceConversation()
     ▼
advanceConversation() — one function per TelegramConversationState:
   START → SELECTING_CATEGORY → SELECTING_LOCATION → COLLECTING_DATE
   → COLLECTING_BUDGET → COLLECTING_GUEST_COUNT → COLLECTING_CONTACT
   → MATCHING_VENDORS (searchRepository.searchVendors + rankVendors —
       Arch Phase 7's real ranking service, not reimplemented)
   → SELECTING_VENDOR → CONFIRMING_ENQUIRY
       → confirm:yes → enquiryService.createSingleVendorEnquiry(
           source: "TELEGRAM", contactEmail: synthesized placeholder)
       → COMPLETED, conversation.enquiryId set
     ▼
sendAndLog() — telegramProvider.sendMessage() (real Telegram API call)
     │  success → OUTBOUND message logged
     │  failure → deleteProcessedUpdate(update_id) — real bug fixed here,
     │    see Notes — then re-throw, Telegram retries, retry is now
     │    correctly reprocessed rather than silently dropped
```

### Notes

- **`node-telegram-bot-api`'s `latest` npm tag is a ground-up rewrite, incompatible with the widely-used `@types` package** — confirmed with the user: pinned to `^1.2.0` (the classic `class TelegramBot` line's last release), matching `@types/node-telegram-bot-api` and the vast majority of existing Telegram bot documentation/prior art, rather than adopting the new 2.x middleware API for a first integration.
- **A real bug was caught and fixed during live testing:** `/start` always called `createConversation()` unconditionally, so calling `/start` twice (or once after `getOrCreateOpenConversation` had already created a row for an unrelated message) left two orphaned `TelegramConversation` rows both stuck at `START` for the same user, with no way to tell which was "current." Fixed with `resetOrCreateConversation()` — reuses and resets any existing open conversation instead of always inserting a new row. Re-verified: repeated `/start` calls now correctly leave exactly one conversation row.
- **A second, more significant real bug was caught and fixed during live idempotency testing, and the same bug was then found and fixed in Arch Phase 11's already-shipped Razorpay webhook handler while checking for it:** the idempotency row was written *before* processing completed. When a live outbound send genuinely failed (verified against Telegram's real API with a synthetic test chat — a real `400 chat not found`), the resulting 500 response meant a real Telegram/Razorpay retry would arrive with the identical `update_id`/`event_id` — and that retry was then wrongly deduped as "already handled" by the row the failed first attempt had already inserted, silently losing a message/event that was never actually delivered. This is the exact inverse failure mode from what product.md §36/Scenario D exist to prevent. Fixed two different ways to fit each table's real shape: Telegram's `telegram_processed_updates` row is deleted before re-throwing on a processing failure (it's pure idempotency bookkeeping, nothing worth keeping on failure); Razorpay's `webhook_events` row is kept — it's an audit log with `payload`/`error`/`processedAt` fields specifically for tracing failures, deleting it would destroy that history — instead, a duplicate-insert failure now looks up the existing row and only treats it as a true duplicate if `processedAt` is actually set, reprocessing it otherwise. Both fixes verified live in both directions: a genuinely-failed delivery's retry now correctly reprocesses (still 500s, not silently 200s); a genuine duplicate of a successfully-processed event still correctly deduped.
- **Vendor matching reuses Arch Phase 7's ranking service directly** — confirmed with the user (Risk 3): `promptVendorMatches()` calls the exact same `searchRepository.searchVendors()` + `rankVendors()` functions `enquiry.service.ts`'s multi-vendor web flow already uses, not a separate Telegram-specific matching implementation.
- **`createSingleVendorEnquiry()` gained optional `source`/`categoryId`/`cityId` parameters rather than a duplicate function** — product.md §34's journey (search → shortlist → user picks ONE vendor → confirm) is structurally the single-vendor shape, not the multi-vendor auto-select-three shape. The web caller's behavior is unchanged (`source` defaults to `"WEB"` when omitted).
- **A synthesized placeholder email for Telegram-sourced contacts, confirmed with the user:** `Enquiry.contactEmail` is required and non-nullable; a Telegram user has no email on file and product.md's journey never asks for one. Rather than making the column nullable (touching 4+ already-shipped modules that assume it exists), Telegram enquiries get `telegram_<telegramUserId>@wedhub.telegram` — the real contact channel for that lead is the collected phone number or Telegram itself, and every downstream consumer already treats `contactEmail` as an opaque string.
- **Live bot verification is partial, flagged honestly:** the real bot token (`@VendorMatefinderBot`, confirmed live via Telegram's own `getMe`) is configured, and every outbound send in this phase's code genuinely round-trips to Telegram's real API — verified by its real, live rejection of synthetic test chat IDs (`400 chat not found`, `400 query is too old`). Receiving real webhook deliveries requires a public HTTPS tunnel; this machine's managed endpoint security (Sophos + an enforced AppLocker policy, confirmed via Windows CodeIntegrity/AppLocker event logs) blocked the ngrok binary needed for that, and — per the user's explicit instruction — no attempt was made to work around or modify that endpoint security configuration. Instead, the full conversation state machine (all 11 states, skip logic, invalid-budget/date reprompting, real Enquiry/Lead creation with correct `source`/data mapping) was verified by calling the exact same conversation-engine functions the webhook handler calls, directly and in sequence, against the real database.
- Also verified live: webhook secret-token verification correctly 401s on a wrong or missing header, before any parsing; the admin register-webhook endpoint correctly 401s unauthenticated and 403s a non-admin, and its one real live call against a fabricated domain genuinely attempted DNS resolution via Telegram's own API before failing (proving the call is real, not stubbed); `npm run typecheck` and `npm run lint` both pass with zero errors; no test suite exists yet in this codebase to run (consistent with every prior phase). All test users/vendors/Telegram identities/conversations created during verification were deleted afterward.

---

## Arch Phase 16 — Admin Platform Backend

**Status:** ✅ Done — 2026-09-02
**Stage:** [Stage 6 — Telegram & Admin](08-stage-telegram-and-admin.md)

### What this unlocks

This phase started with an audit of all 15 prior phases against architecture.md's 17-task list and product.md §39's dashboard inventory — and found most of the admin surface already shipped incrementally: vendors (approve/reject/suspend/invite, Arch Phase 5/8), media (Arch Phase 6), leads (Arch Phase 9), reviews + moderation (Arch Phase 10, including reported-reviews — see Notes), plans/subscriptions/refunds/coupons (Arch Phase 11), categories/locations (Arch Phase 4), featured listings (Arch Phase 13). The real remaining gaps — zero admin visibility into users, no dashboard metrics, audit log rows written since Arch Phase 5 but never read back, and unused Role/Permission tables — are what this phase actually builds. A real password-hash leak was caught and fixed during live verification.

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/v1/admin/dashboard` | Platform metrics: users, vendors, leads, enquiries, revenue, MRR, conversion rate | ADMIN |
| GET | `/api/v1/admin/users` | List users, filterable by status/role | ADMIN |
| GET | `/api/v1/admin/users/:id` | User detail (incl. linked vendor, login/lockout state) | ADMIN |
| POST | `/api/v1/admin/users/:id/suspend` | Suspend a user, with a required reason | ADMIN |
| POST | `/api/v1/admin/users/:id/restore` | Restore a suspended user to ACTIVE | ADMIN |
| GET | `/api/v1/admin/audit-logs` | Read the audit trail, filterable by entityType/entityId/actorId | ADMIN |
| GET | `/api/v1/admin/roles` | List roles with their permissions (read-only) | ADMIN |
| GET | `/api/v1/admin/permissions` | List all permissions (read-only) | ADMIN |
| GET | `/api/v1/admin/admin-users` | List which users hold which admin role (read-only) | ADMIN |

No new tables — this phase is entirely new read/write surface over existing models (`User`, `AuditLog`, `Role`, `Permission`, `RolePermission`, `AdminUser`, all present since Arch Phase 2/3).

### Flow

```
GET /admin/dashboard
     │
     ├─ totalUsers, newRegistrations(30d)     — User.count()
     ├─ totalVendors, activeVendors            — Vendor.count() / count(status=APPROVED)
     ├─ paidVendors                            — distinct vendorId with an ACTIVE/TRIALING Subscription
     ├─ totalLeads, totalEnquiries              — Lead.count() / Enquiry.count()
     ├─ conversionRate                          — leads WON / total leads (see Notes — no
     │                                             formula defined in either source doc)
     ├─ revenue.total / .thisMonth              — sum(Invoice.amount) where status=PAID
     └─ mrr                                     — sum of every ACTIVE subscription's plan
                                                    price, YEARLY normalized ÷12 (TRIALING
                                                    excluded — no revenue collected yet)

POST /admin/users/:id/suspend {reason}
     │
     ├─ user already SUSPENDED? → 409
     └─► transaction: User.status=SUSPENDED + AuditLog row
           (actorId, action, entityType="user", before/after status, reason)
     ▼
GET /admin/audit-logs?entityType=user&entityId=...
     → the row from above, plus every vendor-status-transition AuditLog
       row already being written since Arch Phase 5 — now finally readable
```

### Notes

- **A real security bug was caught and fixed during live verification:** `admin-users.service.ts`'s suspend/restore transition called `prisma.user.update()` with no `select` clause — Prisma returns every column by default, so the bcrypt `passwordHash` was leaking directly into the API response body. Caught by actually reading the live response rather than assuming the endpoint was safe. Prompted an audit of every other `prisma.user.*` call site in the codebase for the same pattern (`auth.repository.ts`, `users.repository.ts`, `vendor-claim.service.ts`, `vendor.service.ts`) — all confirmed safe already, either via an explicit `select`, a discarded return value, or (in `GET /users/me`'s case) the controller manually re-picking safe fields before `res.json` even though the service layer underneath fetches the full row. Fixed the one broken call site with an explicit `select`. Re-verified live: the same suspend call no longer includes `passwordHash`.
- **A real architectural gap was found and deliberately left unresolved, confirmed with the user:** `Role`/`Permission`/`RolePermission`/`AdminUser` have existed since Arch Phase 2/3, seeded with one "admin" role holding every permission — but no code anywhere across all 15 prior phases actually reads them for an authorization decision; every `authorize(Role.ADMIN)` call gates on the coarse `User.role` enum instead. Building CRUD to *edit* these tables would have produced endpoints that look functional but have zero real effect on access control. Shipped read-only visibility instead (`GET /admin/roles`, `/permissions`, `/admin-users`) and deliberately did not wire `authorize()` to consult them — that's a real breaking change to every admin route's authorization model across every prior phase, and deserves its own deliberate design rather than a rushed side effect of this phase's admin-CRUD sweep.
- **The "reported reviews" gap identified during initial scoping turned out to already be closed** — `review.service.ts`'s `reportReview()` (Arch Phase 10) already auto-transitions a review to `FLAGGED` on its first report, and the admin review endpoints already `include: { reports: true }`. `GET /admin/reviews?status=FLAGGED` already is the reported-reviews view; no new endpoint was built here, corrected after an initial pass wrongly assumed it was missing.
- **product.md §39's "Conversion" has no defined formula in either source doc** — confirmed with the user: defined as `leads WON / total leads` (reusing product.md §23's own "Conversion outcome" language and the real `LeadStatus.WON` value from Arch Phase 9), not enquiry→lead conversion (rejected on reflection — an Enquiry always produces ≥1 Lead by construction, so that ratio isn't a meaningful signal) or free→paid vendor conversion (a different metric entirely, not what was built).
- **product.md §39's "Users: Reported" has no backing data source** — `ReviewReport` ties a reporter to a *review*, not to a user; there is no generic "this user was reported" record in the schema. Omitted from the user-list filters rather than faked via inference.
- **CMS, Analytics, feature flags, and system settings are correctly out of scope** — CMS is explicitly Stage 7/Arch Phase 17's job (Stage 6's own doc says so directly); Analytics is Arch Phase 18; feature flags/system settings have no product.md scenario or later-stage dependency requiring them yet, so building speculative CRUD for them was avoided.
- Verified live end-to-end on a real running Postgres/Redis stack: dashboard MRR calculation matched the exact expected sum for a real monthly + real yearly active subscription (5999 + 129990/12 = 16831.5); conversion rate and revenue totals matched exactly for real WON/NEW leads and a real PAID invoice; user suspend correctly 409s on a double-suspend and correctly transitions back via restore; the audit-log endpoint correctly surfaced both suspend and restore actions with accurate before/after state and correctly filtered by `entityType`/`actorId`; roles/permissions/admin-users endpoints correctly returned the real seeded data; all four new route groups correctly 401 unauthenticated and 403 a non-admin (END_USER role). `npm run typecheck` and `npm run lint` both pass with zero errors; no test suite exists yet in this codebase to run (consistent with every prior phase). All test users/vendors/subscriptions/leads/invoices/audit logs created during verification were deleted afterward.

**This completes Stage 6 (Telegram & Admin) — Arch Phases 14–16 all done.**

## Arch Phase 17 — CMS & SEO Backend

**Status:** ✅ Done — started 2026-09-04 (paused after Arch Phase 16 on 2026-09-02, resumed 2026-09-04 per user decision — see the paragraph above the Phase Entries template for the full pause/resume rationale), closed 2026-09-04 with static pages/FAQs explicitly descoped (see below)
**Stage:** [Stage 7 — Growth & Scale](09-stage-growth-and-scale.md)

### What this unlocks

The public homepage's remaining hardcoded content arrays are now real, admin-curated data, and the site has real, indexable SEO surface area. In order, this phase's slices: (1) Real Wedding Stories and Gallery Inspiration — both curation layers over already-real vendor `Album`/`Media`, not new CMS content; (2) SEO page-generation infrastructure — templated (not hand-authored) Category/City/Category+City landing pages, thin-page avoidance, admin overrides, sitemap/robots; (3) Popular Searches — a genuinely new, standalone, admin-authored content model with its own image pipeline; (4) Blog — the last content-model item, same standalone shape as Popular Searches plus a Markdown body. **Static pages and FAQs remain unbuilt**, but were explicitly descoped from this phase by user decision on 2026-09-04 rather than continuing to block its closure — unlike every other item above, no hardcoded static-page/FAQ array exists on the live site today for this gap to leave behind as a known-fake element. Tracked as a standalone backlog item for whenever prioritized (see `09-stage-growth-and-scale.md`'s Arch Phase 17 note for the suggested shape: `StaticPage`/`Faq` model + admin CRUD + public route, following this phase's now-established pattern).

### APIs completed

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/v1/wedding-stories/featured/homepage` | Featured real wedding stories over real vendor albums | None |
| POST/PATCH/DELETE | `/api/v1/admin/wedding-stories(/:id)` | Admin CRUD over `WeddingStory` | ADMIN |
| GET | `/api/v1/gallery/featured/homepage` | Featured real vendor portfolio media | None |
| POST/PATCH/DELETE | `/api/v1/admin/featured-media(/:id)` | Admin CRUD over `FeaturedMedia` | ADMIN |
| GET | `/api/v1/admin/albums` | Cross-vendor real public album listing (curation support) | ADMIN |
| GET | `/api/v1/admin/media/approved` | Cross-vendor real approved media listing (curation support) | ADMIN |
| POST | `/api/v1/admin/media-uploads/vendor-upload-requests(+/:id/confirm)` | Admin-on-behalf-of-vendor cold-start photo upload | ADMIN |
| POST/PATCH | `/api/v1/admin/albums(/:id)` | Admin create/update an album on a vendor's behalf | ADMIN |
| GET | `/api/v1/seo/page?categoryId=&cityId=` | Computed SEO metadata for a Category/City/Category+City page | None |
| GET | `/api/v1/seo/combinations` | Every indexable combination (sitemap source) | None |
| POST/PATCH/DELETE | `/api/v1/admin/seo-overrides(/:id)` | Admin override of one combination's computed SEO fields | ADMIN |
| GET | `/api/v1/popular-searches/featured/homepage` | Featured Popular Search cards | None |
| POST/PATCH/DELETE | `/api/v1/admin/popular-searches(/:id)` | Admin CRUD over `PopularSearchCard` | ADMIN |
| POST | `/api/v1/admin/media-uploads/popular-search-image-upload-requests(+/:id/confirm)` | `POPULAR_SEARCH_IMAGE` upload pipeline | ADMIN |
| GET | `/api/v1/blog/featured/homepage` | Top 6 featured+published blog posts | None |
| GET | `/api/v1/blog` | Published posts, paginated, most-recent-first | None |
| GET | `/api/v1/blog/:slug` | One published post (404s for draft/nonexistent) | None |
| GET/POST/PATCH/DELETE | `/api/v1/admin/blog(/:id)` | Admin CRUD over `BlogPost`, incl. drafts; publish = PATCH `publishedAt` | ADMIN |
| POST | `/api/v1/admin/media-uploads/blog-cover-image-upload-requests(+/:id/confirm)` | `BLOG_COVER_IMAGE` upload pipeline | ADMIN |

### Tables created

| Table | Purpose | Key columns |
|---|---|---|
| `wedding_stories` | Narrative fields over a real, public `Album` | `id`, `album_id` (fk), `couple_name`, `location`, `tag`, `snippet`, `is_featured`, `sort_order` |
| `featured_media` | Admin curation of a real, approved `Media` row | `id`, `media_id` (unique fk), `title_override`, `sort_order` |
| `seo_overrides` | Admin override of one computed Category/City/Category+City page's SEO fields | `id`, `page_type` (enum), `category_id`, `location_id`, `title`, `description`, `og_image_url`, `no_index`, unique on `(page_type, category_id, location_id)` |
| `popular_search_cards` | Standalone editorial homepage cards, no real backing entity | `id`, `title`, `location_blurb`, `price_label`, `image_url`, `search_query`, `is_featured`, `sort_order` |
| `blog_posts` | Standalone editorial articles, Markdown body | `id`, `title`, `slug` (unique), `category`, `cover_image_url`, `excerpt`, `body_markdown`, `read_time_minutes`, `published_at` (nullable — null=draft), `is_featured`, `sort_order`, `seo_title`, `seo_description` |

`MediaType` enum gained three additive values across this phase: `CATEGORY_IMAGE` (2026-09-03, technically Arch Phase 4 but same shape precedent), `POPULAR_SEARCH_IMAGE` and `BLOG_COVER_IMAGE` (both 2026-09-04) — each kept separate rather than reused, so admin-media's per-mediaType confirm checks stay unambiguous about which curated content owns a given upload.

### Flow

```
Admin authors a blog post (the final slice, same shape as Popular Searches):
POST /admin/blog {title, category, excerpt, bodyMarkdown, readTimeMinutes, ...}
     │
     ├─ slug omitted? ──► slugify(title) + generateUniqueSlug() (shared common/utils/slug.util.ts)
     ▼
BlogPost row created, publishedAt: null (draft) — invisible to every public endpoint
     │
     ▼
PATCH /admin/blog/:id {publishedAt: <now>}    ── publishing IS this, no separate endpoint
     │
     ▼
GET /blog/featured/homepage, /blog, /blog/:slug now all include it (if isFeatured for the first)
     │
     ▼
DELETE /admin/blog/:id ──► gone from all three again
```

### Notes

- **Real Wedding Stories / Gallery Inspiration turned out not to need independent content models at all** — both resolved as curation layers over already-real vendor `Album`/`Media` data. A cold-start gap surfaced during this work (a fresh platform with few vendors has nothing to curate) and was fixed with admin-on-behalf-of-vendor upload/album endpoints, still tied to a real vendor, never fabricated.
- **Popular Searches and Blog are the two genuinely standalone, fully admin-authored content models this phase produced** — neither has a preexisting real entity to curate over, so both are new tables with their own image-upload pipeline (`POPULAR_SEARCH_IMAGE`, `BLOG_COVER_IMAGE`), following the `Category.imageUrl` precedent (plain nullable url, no `Media` relation, since there's no owning vendor).
- **Blog's body content is Markdown, stored as plain text, rendered via `react-markdown`** (new frontend dependency, v10.1.0) — no rich-text editor, no HTML sanitization pipeline; deliberately as simple as the rest of this phase's models rather than introducing a new authoring subsystem.
- **Publishing has no dedicated endpoint anywhere in this phase's models** — `isFeatured` and `publishedAt` are both plain `PATCH`-set fields, matching the rest of the codebase's preference for generic update endpoints over bespoke action endpoints where a single field flip suffices.
- **Static pages and FAQs are the one item of this phase's original scope that remains genuinely unbuilt** — not folded into the Blog model (a static page/FAQ has no title/category/read-time/publish-date shape and wasn't asked for as part of Blog), so this phase's status stays **In Progress**, not Done, until they ship.
- Blog verified live end-to-end against the real dev DB: unauthenticated `GET /admin/blog` → 401; admin `POST /admin/blog` (draft, `publishedAt: null`) → absent from `GET /blog`, `GET /blog/featured/homepage`, and 404 on `GET /blog/:slug`; `PATCH /admin/blog/:id {publishedAt}` (publish) → now present in all three; `DELETE /admin/blog/:id` → gone from all three again. `npx tsc --noEmit` clean in both `wedhub-backend/` and `wedhub-frontend-app/`; `next build` (Turbopack) compiles cleanly with the new `/blog` and `/blog/[slug]` routes. Migration `20260904090914_add_blog_post` applied cleanly against the real dev DB. Ships with zero rows — all test data created during verification was deleted afterward, including the dedicated bootstrap admin test account used to mint a JWT (a preexisting `admin@wedhub.dev` account from earlier phases was left untouched rather than reused, to avoid disturbing shared dev state).
