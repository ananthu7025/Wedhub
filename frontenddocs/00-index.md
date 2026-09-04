# WedHub Frontend Delivery Plan — Index

## Purpose

This `frontenddocs/` folder is a **planning and navigation layer**, structured identically to [`../docs/`](../docs/00-index.md) (the backend delivery plan), but for the frontend build-out.

Unlike the backend, no source spec pre-defines a granular frontend engineering phase breakdown — `wedhub_backend_architecture.md`'s 26 "Arch Phases" (§51) are backend-only. This folder therefore **originates** a "Frontend Arch Phase" breakdown, grounded in three real, existing artifacts rather than invented from scratch:

1. [`product.md`](../product.md) §64 — "Frontend: Next.js + TypeScript. Responsibilities: Public pages, SEO, User dashboard, Vendor dashboard, Admin UI if desired separately."
2. The **34-screen static UI mockup** already built and approved at [`../wedhub-frontend/`](../wedhub-frontend/index.html) — every Frontend Arch Phase below ships the real, working version of a specific subset of those mockup screens.
3. The **16 completed backend Arch Phases** (`../docs/11-progress-log.md`) — every frontend phase below consumes a specific, already-shipped set of backend API modules. No frontend phase should be scheduled ahead of the backend surface it depends on.

**If `product.md`, `wedhub_backend_architecture.md`, or the backend's actual shipped API surface change, this folder must be re-diffed against them** — same rule as `../docs/`.

## Relationship to the backend docs and mockup

```text
../product.md, ../wedhub_backend_architecture.md   → source specs (shared with backend)
../docs/                                            → backend delivery plan (already executed, 16/26 phases done)
../wedhub-frontend/                                 → approved static HTML/CSS mockup (34 screens, design system) — the visual contract this build implements
frontenddocs/                                       → THIS folder — frontend delivery plan (execution starts now)
../wedhub-frontend-app/                             → the real Next.js application (created in Frontend Arch Phase 0)
```

The mockup is not thrown away — it is the reference the real app is built against, screen for screen, the same way `product.md`/`wedhub_backend_architecture.md` were the reference for the backend. Copy structure and content intent from it; do not silently redesign screens while implementing them. If a screen needs to change from the mockup, note why in the relevant stage file's Open Questions, the same way backend deviations were logged.

## How to navigate

1. Read [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md) and [`02-mvp-cut-line.md`](02-mvp-cut-line.md) first — every stage file assumes you already know these.
2. Pick the stage file you're implementing (`03` through `07`).
3. Keep [`10-risks-and-open-questions.md`](10-risks-and-open-questions.md) open alongside it.
4. **After** finishing a Frontend Arch Phase, update [`11-progress-log.md`](11-progress-log.md): flip its status to done, fill in its routes/components/API-integration/flow-diagram entry, and tick its tasks in the stage file. Same convention as the backend's `../docs/11-progress-log.md`.

## Numbering convention — read this before anything else

To avoid colliding with the backend's existing "Arch Phase N" numbering (which readers of `../docs/` already know refers to the backend), every phase in this folder is always written **"Frontend Arch Phase N"**, numbered independently starting at 0. Never write a bare "Phase N" in this docs set — it's ambiguous between backend Arch Phase, Frontend Arch Phase, and product.md's Product Phase.

| Scheme | Source | Granularity | How to refer to it |
|---|---|---|---|
| **Product Phase** | `product.md` §70 | 9 coarse business phases | **"Product Phase N"** |
| **Arch Phase** (backend) | `wedhub_backend_architecture.md` §51 | 26 backend engineering phases | **"Arch Phase N"** |
| **Frontend Arch Phase** | originated in this folder | 12 frontend engineering phases | **"Frontend Arch Phase N"** |

## Frontend Arch Phase → Backend Arch Phase dependency map

| Frontend Arch Phase | Name | Depends on (backend Arch Phase) | Backend status |
|---|---|---|---|
| 0 | Project Setup & Design System | — | — |
| 1 | Auth Flows | 2 | ✅ Done |
| 2 | Public Discovery (Home, Search, Vendor Profile) | 4, 5, 6, 7 | ✅ Done |
| 3 | Shortlist, Compare & Enquiry | 8, 9 | ✅ Done |
| 4 | Couple Account (Enquiry Tracking, Reviews, Notifications, Profile) | 9, 10, 14 | ✅ Done |
| 5 | Vendor Onboarding & Profile Management | 5, 6 | ✅ Done |
| 6 | Vendor Leads & Reviews | 9, 10 | ✅ Done |
| 7 | Vendor Monetization (Subscription, Analytics) | 11, 12, 13 | ✅ Done |
| 8 | Admin Core (Dashboard, Vendors, Users) | 16 | ✅ Done |
| 9 | Admin Catalog & Moderation (Categories/Locations, Leads, Reviews) | 4, 9, 10, 16 | ✅ Done |
| 10 | Admin Monetization, Governance & Audit (Subscriptions, Roles, Audit Log, Settings) | 11, 12, 13, 16 | ✅ Done |
| 11 | Telegram Surfacing, SEO & Production Hardening | 15, 17 (backend) | ⬜ 15 done, 17 not started |

Every backend module Frontend Arch Phase 0–10 needs already exists and is live (Stage 1–6 backend, 16/26 Arch Phases). **Frontend Arch Phase 11 is the one exception** — its SEO half depends on backend Arch Phase 17 (CMS & SEO Backend), which per `../docs/11-progress-log.md` has not started yet (the backend build deliberately paused there for this exact reason: to get frontend-integration signal first). See [Open Question 1](10-risks-and-open-questions.md#1-frontend-arch-phase-11-partially-blocked-on-backend-arch-phase-17).

## Stage list

| Stage | File | Frontend Arch Phases | Maps to mockup screens |
|---|---|---|---|
| 1 — Foundation | [`03-stage-foundation.md`](03-stage-foundation.md) | 0, 1 | `auth/*` |
| 2 — Couple Experience | [`04-stage-couple-experience.md`](04-stage-couple-experience.md) | 2, 3, 4 | `couple/*` (9 screens) |
| 3 — Vendor Experience | [`05-stage-vendor-experience.md`](05-stage-vendor-experience.md) | 5, 6, 7 | `vendor/*` (9 screens) |
| 4 — Admin Platform | [`06-stage-admin-platform.md`](06-stage-admin-platform.md) | 8, 9, 10 | `admin/*` (13 screens) |
| 5 — Growth & Hardening | [`07-stage-growth-and-hardening.md`](07-stage-growth-and-hardening.md) | 11 | (new: SEO pages, Telegram deep links) |
| 6 — ₹49 Instant Wedding Website | [`08-stage-wedding-website.md`](08-stage-wedding-website.md) | 12 | *(none — no mockup exists for this feature)* |
| 7 — Vendor GST Invoicing & Billing | [`09-stage-vendor-invoices.md`](09-stage-vendor-invoices.md) | 13 | `vendor/invoices/*` (new vendor billing engine) |

## Full file list

| File | Purpose |
|---|---|
| `00-index.md` | This file — navigation, phase mapping, stage list |
| `01-reference-cross-cutting.md` | Frontend coding rules, DoD, API-integration/accessibility/performance standards that apply to every stage |
| `02-mvp-cut-line.md` | Which mockup screens/features are MVP vs. deferred, reconciled against `../docs/02-mvp-cut-line.md` |
| `03-stage-foundation.md` | Next.js project setup, design system port, auth flows |
| `04-stage-couple-experience.md` | Public discovery, search, vendor profile, shortlist/compare, enquiries, reviews, notifications |
| `05-stage-vendor-experience.md` | Vendor onboarding, profile/portfolio/package management, leads inbox, subscription, analytics |
| `06-stage-admin-platform.md` | Admin dashboard, vendor/user management, catalog, moderation, monetization ops, RBAC visibility, audit log |
| `07-stage-growth-and-hardening.md` | SEO pages (blocked on backend Arch Phase 17), Telegram surfacing, performance/accessibility hardening |
| `08-stage-wedding-website.md` | ₹49 Instant Wedding Website — new, standalone feature outside the original 12 Frontend Arch Phases (Frontend Arch Phase 12), blocked on backend Arch Phase 26 |
| `09-stage-vendor-invoices.md` | Vendor GST Invoicing & Billing — dashboard, live GST creator, A4 print, settings (Frontend Arch Phase 13) |
| `10-risks-and-open-questions.md` | Canonical log of frontend-specific ambiguities and cross-doc/cross-mockup conflicts |
| `11-progress-log.md` | What has actually shipped — status table + per-phase routes/components/flow, filled in as each Frontend Arch Phase completes |

## Recommended build order

```
Stage 1 (Foundation)
   ↓
Stage 2 (Couple Experience)   ─┐
Stage 3 (Vendor Experience)    ├─ can interleave once Stage 1 is done — no dependency between them
   ↓                           ┘
Stage 4 (Admin Platform)
   ↓
Stage 5 (Growth & Hardening)   — Frontend Arch Phase 11's SEO half waits on backend Arch Phase 17
```

Stage 2 and Stage 3 have no dependency on each other (different user roles, disjoint route groups, disjoint backend modules) and may be built in either order or interleaved. Stage 4 (Admin) is sequenced after both only because it's lower business priority, not because of a technical dependency — the admin backend (Arch Phase 16) has been live since before this plan started.

## Change control

Same discipline as `../docs/`: this folder is a snapshot derived from `product.md`, `wedhub_backend_architecture.md`, the actual shipped backend API surface, and the approved `../wedhub-frontend/` mockup. If any of those change, re-read the affected parts and update every stage file, the mapping table above, and `02-mvp-cut-line.md` / `10-risks-and-open-questions.md` accordingly.
