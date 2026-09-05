# WedHub Frontend Delivery Plan — Index (Archived)

> **V1 BUILD PHASE — ARCHIVED 2026-09-05.** This folder (formerly `frontenddocs/` at the repo root) is historical record from the active v1 build period. The project has since moved into manual testing — for current status, open items, and how to resume, read `/PENDING-WORK.md` at the repo root first. New bugs found during manual testing are tracked in `/BugsItemsDoc/`, not here. Everything below is preserved as-written for reference; only this index file itself was rewritten during the 2026-09-05 reorganization (the original was missing 3 real stages — vendor invoices, vendor portfolio, vendor store — from its stage list and build-order diagram, and had `10-risks-and-open-questions.md` positioned out of numeric order in its file list).

## Purpose

This folder is a **planning and navigation layer**, structured identically to [`../backend/`](../backend/00-INDEX.md) (the backend delivery plan), but for the frontend build-out.

No source spec pre-defined a granular frontend engineering phase breakdown — `wedhub_backend_architecture.md`'s 26 "Arch Phases" are backend-only. This folder therefore **originated** a "Frontend Arch Phase" breakdown, grounded in three real artifacts:

1. [`product.md`](../../product.md) §64 — "Frontend: Next.js + TypeScript. Responsibilities: Public pages, SEO, User dashboard, Vendor dashboard, Admin UI if desired separately."
2. The **34-screen static UI mockup** at [`../../wedhub-frontend/`](../../wedhub-frontend/index.html) — every Frontend Arch Phase ships the real, working version of a specific subset of those mockup screens.
3. The **backend Arch Phases** (`../backend/11-progress-log.md`) — every frontend phase consumes a specific, already-shipped set of backend API modules.

## Relationship to the backend docs and mockup

```text
../../product.md, ../../wedhub_backend_architecture.md   → source specs (shared with backend)
../backend/                                               → backend delivery plan
../../wedhub-frontend/                                    → approved static HTML/CSS mockup (34 screens, design system) — the visual contract this build implements
THIS folder                                               → frontend delivery plan
../../wedhub-frontend-app/                                → the real Next.js application (created in Frontend Arch Phase 0)
```

The mockup was not thrown away — it was the reference the real app was built against, screen for screen.

## How to navigate

1. Read [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md) and [`02-mvp-cut-line.md`](02-mvp-cut-line.md) first.
2. Pick the stage file for the area you're reading about (`03` through `14`).
3. [`10-risks-and-open-questions.md`](10-risks-and-open-questions.md) has the canonical log of frontend-specific ambiguities.
4. [`11-progress-log.md`](11-progress-log.md) is the detailed, per-phase backing record — same relationship to the stage files as the backend equivalent.

## Numbering convention

Every phase in this folder is always written **"Frontend Arch Phase N"**, numbered independently starting at 0 — never a bare "Phase N", which is ambiguous between backend Arch Phase, Frontend Arch Phase, and product.md's Product Phase.

| Scheme | Source | Granularity | How to refer to it |
|---|---|---|---|
| **Product Phase** | `product.md` §70 | 9 coarse business phases | **"Product Phase N"** |
| **Arch Phase** (backend) | `wedhub_backend_architecture.md` §51 + later standalone specs | 30 backend engineering phases | **"Arch Phase N"** |
| **Frontend Arch Phase** | originated in this folder | 15 frontend engineering phases (0–14) | **"Frontend Arch Phase N"** |

## Frontend Arch Phase → Backend Arch Phase dependency map

| Frontend Arch Phase | Name | Depends on (backend Arch Phase) | Status as of archive (2026-09-05) |
|---|---|---|---|
| 0 | Project Setup & Design System | — | ✅ Done |
| 1 | Auth Flows | 2 | ✅ Done |
| 2 | Public Discovery (Home, Search, Vendor Profile) | 4, 5, 6, 7 | ✅ Done |
| 3 | Shortlist, Compare & Enquiry | 8, 9 | ✅ Done |
| 4 | Couple Account (Enquiry Tracking, Reviews, Notifications, Profile) | 9, 10, 14 | ✅ Done |
| 5 | Vendor Onboarding & Profile Management | 5, 6 | ✅ Done |
| 6 | Vendor Leads & Reviews | 9, 10 | ✅ Done |
| 7 | Vendor Monetization (Subscription, Analytics) | 11, 12, 13 | ✅ Done |
| 8 | Admin Core (Dashboard, Vendors, Users) | 16 | ✅ Done |
| 9 | Admin Catalog & Moderation | 4, 9, 10, 16 | ✅ Done |
| 10 | Admin Monetization, Governance & Audit | 11, 12, 13, 16 | ✅ Done |
| 11a | Telegram Surfacing | 15 | ✅ Done |
| 11b | SEO (category/city/blog pages, sitemap, robots) | 17 | ✅ Done |
| 11c | Production Hardening (accessibility, Core Web Vitals, cross-browser) | — | ⬜ Not started |
| 12 | ₹49 Instant Wedding Website (frontend half) | 26 | ⬜ Not started — blocked on backend Arch Phase 26, itself stalled |
| 13 | Vendor GST Invoicing & Billing (frontend half) | 27 | ✅ Done |
| 14 | Standalone Vendor Portfolio (frontend half) | 28 | ✅ Done |
| *(no number — Stage in `12-stage-vendor-store.md`)* | Vendor Mini-Store (frontend half) | 29 | ✅ Done |

## Stage list

| Stage | File | Frontend Arch Phase(s) | Maps to mockup screens |
|---|---|---|---|
| 1 — Foundation | [`03-stage-foundation.md`](03-stage-foundation.md) | 0, 1 | `auth/*` |
| 2 — Couple Experience | [`04-stage-couple-experience.md`](04-stage-couple-experience.md) | 2, 3, 4 | `couple/*` (9 screens) |
| 3 — Vendor Experience | [`05-stage-vendor-experience.md`](05-stage-vendor-experience.md) | 5, 6, 7 | `vendor/*` (9 screens) |
| 4 — Admin Platform | [`06-stage-admin-platform.md`](06-stage-admin-platform.md) | 8, 9, 10 | `admin/*` (13 screens) |
| 5 — Growth & Hardening | [`07-stage-growth-and-hardening.md`](07-stage-growth-and-hardening.md) | 11a, 11b, 11c | (new: SEO pages, Telegram deep links) — 11c not started |
| 6 — ₹49 Instant Wedding Website | [`08-stage-wedding-website.md`](08-stage-wedding-website.md) | 12 | *(none — no mockup exists for this feature)* — not started, blocked on backend |
| 7 — Vendor GST Invoicing & Billing | [`09-stage-vendor-invoices.md`](09-stage-vendor-invoices.md) | 13 | `vendor/invoices/*` |
| 8 — Standalone Vendor Portfolio | [`14-stage-vendor-portfolio.md`](14-stage-vendor-portfolio.md) | 14 | `/portfolio/[slug]` (new, no mockup) |
| *(unnumbered, see file)* — Vendor Mini-Store | [`12-stage-vendor-store.md`](12-stage-vendor-store.md) | *(matches backend Arch Phase 29)* | admin store management, public storefront (new, no mockup) |

## Full file list

| File | Purpose |
|---|---|
| `00-index.md` | This file — navigation, phase mapping, stage list |
| `01-reference-cross-cutting.md` | Frontend coding rules, DoD, API-integration/accessibility/performance standards |
| `02-mvp-cut-line.md` | Which mockup screens/features are MVP vs. deferred, reconciled against `../backend/02-mvp-cut-line.md` |
| `03-stage-foundation.md` | Next.js project setup, design system port, auth flows |
| `04-stage-couple-experience.md` | Public discovery, search, vendor profile, shortlist/compare, enquiries, reviews, notifications |
| `05-stage-vendor-experience.md` | Vendor onboarding, profile/portfolio/package management, leads inbox, subscription, analytics |
| `06-stage-admin-platform.md` | Admin dashboard, vendor/user management, catalog, moderation, monetization ops, RBAC visibility, audit log |
| `07-stage-growth-and-hardening.md` | SEO pages, Telegram surfacing, performance/accessibility hardening (11c still not started) |
| `08-stage-wedding-website.md` | ₹49 Instant Wedding Website frontend half (Frontend Arch Phase 12) — not started, blocked on backend Arch Phase 26 |
| `09-stage-vendor-invoices.md` | Vendor GST Invoicing & Billing — dashboard, GST creator, A4 print, settings (Frontend Arch Phase 13) |
| `10-risks-and-open-questions.md` | Canonical log of frontend-specific ambiguities and cross-doc/cross-mockup conflicts (22 entries) |
| `11-progress-log.md` | What actually shipped — detailed per-phase routes/components/flow write-up, the backing record for every stage file above |
| `12-stage-vendor-store.md` | Vendor Mini-Store frontend half — admin category toggle, vendor store management, public storefront (matches backend Arch Phase 29) |
| `13-review-feedback-tasklist-frontend.md` | Frontend task list from a full codebase audit of `../backend/19-review-feedback-source.md` — confirmed-true findings only (image compression, upload concurrency/retry, uncacheable public data, homepage sequential fetch/Suspense, gallery thumbnail sizing, error classes), split from the backend half at `../backend/16-review-feedback-tasklist-backend.md`. **Closed out** — all HIGH/MEDIUM items fixed except the lightbox feature (genuinely new, deferred) and large-Client-Component refactors (NICE-TO-HAVE, lowest priority). |
| `14-stage-vendor-portfolio.md` | Standalone Vendor-First Digital Portfolio & 1-Click WhatsApp Share — `/portfolio/[slug]`, gallery/packages/about/reviews tabs, dashboard share tool (Frontend Arch Phase 14) |

## Change control

This folder is a snapshot of the v1 build phase, frozen 2026-09-05. It will not be updated further as part of active development — see `/PENDING-WORK.md` at the repo root for what's current.
