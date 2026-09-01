# Progress Log

> Running record of what has actually shipped. Updated **after** each Arch Phase completes — not in advance. See [`00-index.md`](00-index.md) for the Arch Phase / Product Phase distinction and [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md) for the Definition of Done every phase below must satisfy before being marked complete.

**Convention:** when an Arch Phase finishes, (1) flip its row in the status table below from `⬜ Not Started` to `✅ Done` with the date, (2) fill in that phase's section further down with real endpoints/tables/diagram/summary — replacing the placeholder text, never leaving it half-filled, and (3) tick every task checkbox in the corresponding stage file (`03`–`09`) for that phase.

---

## Status Overview

| Arch Phase | Name | Stage | Status | Completed |
|---|---|---|---|---|
| 0 | Architecture & Repository Setup | [Stage 1](03-stage-foundation.md) | ✅ Done | 2026-09-02 |
| 1 | PostgreSQL & ORM Foundation | [Stage 1](03-stage-foundation.md) | ✅ Done | 2026-09-02 |
| 2 | Authentication & Authorization | [Stage 1](03-stage-foundation.md) | ⬜ Not Started | — |
| 3 | User Module | [Stage 1](03-stage-foundation.md) | ⬜ Not Started | — |
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

**Overall: 2 / 26 Arch Phases complete.**

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
