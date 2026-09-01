# Progress Log

> Running record of what has actually shipped. Updated **after** each Arch Phase completes — not in advance. See [`00-index.md`](00-index.md) for the Arch Phase / Product Phase distinction and [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md) for the Definition of Done every phase below must satisfy before being marked complete.

**Convention:** when an Arch Phase finishes, (1) flip its row in the status table below from `⬜ Not Started` to `✅ Done` with the date, (2) fill in that phase's section further down with real endpoints/tables/diagram/summary — replacing the placeholder text, never leaving it half-filled, and (3) tick every task checkbox in the corresponding stage file (`03`–`09`) for that phase.

---

## Status Overview

| Arch Phase | Name | Stage | Status | Completed |
|---|---|---|---|---|
| 0 | Architecture & Repository Setup | [Stage 1](03-stage-foundation.md) | ✅ Done | 2026-09-02 |
| 1 | PostgreSQL & ORM Foundation | [Stage 1](03-stage-foundation.md) | ⬜ Not Started | — |
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

**Overall: 1 / 26 Arch Phases complete.**

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
