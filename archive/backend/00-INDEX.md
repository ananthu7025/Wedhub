# WedHub Backend Delivery Plan — Index (Archived)

> **V1 BUILD PHASE — ARCHIVED 2026-09-05.** This folder (formerly `docs/` at the repo root) is historical record from the active v1 build period. The project has since moved into manual testing — for current status, open items, and how to resume, read `/PENDING-WORK.md` at the repo root first. New bugs found during manual testing are tracked in `/BugsItemsDoc/`, not here. Everything below is preserved as-written for reference; only this index file itself was rewritten during the 2026-09-05 reorganization (fixing stale/missing entries — the original `docs/00-index.md` was missing 4 real files and referenced one, `20-non-claude-commits-log.md`, that was never actually created despite two other files claiming it was).

## Purpose

This folder is a **planning and navigation layer** derived from two canonical specs at the repo root:

- [`product.md`](../../product.md) — product/business specification (74 sections)
- [`wedhub_backend_architecture.md`](../../wedhub_backend_architecture.md) — engineering blueprint (60 sections)

Those two files remain the source of truth. Nothing here overrides them. This folder turned them into an executable, stage-by-stage delivery plan — consolidated checklists, acceptance criteria, sequencing, and an explicit record of the places where the two source docs disagreed with each other.

## How to navigate

1. Read [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md) and [`02-mvp-cut-line.md`](02-mvp-cut-line.md) first — every stage file assumes you already know these.
2. Pick the stage file for the area you're reading about (`03` through `15`).
3. [`10-risks-and-open-questions.md`](10-risks-and-open-questions.md) has the canonical log of every cross-doc conflict or ambiguity found along the way.
4. [`11-progress-log.md`](11-progress-log.md) is the detailed, per-phase backing record — every stage file's checklist is a compressed pointer into this much longer narrative file. This is intentional (checklist vs. detail), not duplication.

## Two phase-numbering schemes — read this before anything else

The two source docs number "phases" independently, at different granularity. They are **never interchangeable**:

| Scheme | Source | Granularity | How to refer to it |
|---|---|---|---|
| **Product Phase** | `product.md` §70 | 9 coarse business phases (Foundation, Marketplace Supply, User Discovery, Lead Engine, Monetization, Telegram, Growth, Scale, Advanced) | Always write **"Product Phase N"** |
| **Arch Phase** | `wedhub_backend_architecture.md` §51 | 26 granular engineering phases (Phase 0–25), later extended to 30 by standalone feature specs (Wedding Website, Invoices, Portfolio, Vendor Store, Marketplace Payments) | Always write **"Arch Phase N"** |

### Arch Phase → Product Phase mapping

| Arch Phase(s) | Product Phase | Notes |
|---|---|---|
| 0, 1 | 1 — Foundation | Repo + database substrate |
| 2, 3, 4 | 1 — Foundation | Auth/users/catalog are still "foundation" from a product view |
| 5, 6 | 2 — Marketplace Supply | Vendor profile + media |
| 7, 8 | 3 — User Discovery | Search + favorites/shortlists/comparison |
| 9 | 4 — Lead Engine | Enquiries & leads |
| 10 | 3 — User Discovery | Product.md groups reviews with discovery, not a separate trust phase — see [Risk: reviews phase-alignment](10-risks-and-open-questions.md#2-reviews-phase-alignment-mismatch) |
| 11, 12, 13 | 5 — Monetization | Subscriptions, entitlements, featured listings |
| 14 | 4 — Lead Engine | Notifications are grouped with leads in product.md but also reused by Phases 5/6 |
| 15 | 6 — Telegram | |
| 16 | 1/2 (foundation) | Admin is cross-cutting — its full breadth only completes once every later stage exists |
| 17 | 7 — Growth | SEO/CMS |
| 18 | 7 — Growth | Analytics |
| 19–25 | 8 — Scale | Product.md's "Scale" phase is infra-only in description; Arch 19–25 is broader (also testing, security, DR, final review) |
| 26–30 | *(standalone)* | Wedding Website, Invoices, Portfolio, Vendor Store, Marketplace Payments — later standalone feature specs, not from the original 9 Product Phases |

## Stage list

| Stage | File | Arch Phase(s) | Product Phase | MVP status |
|---|---|---|---|---|
| 1 — Foundation | [`03-stage-foundation.md`](03-stage-foundation.md) | 0, 1, 2, 3, 4 | 1 | Fully MVP — ✅ Done 2026-09-02 |
| 2 — Marketplace Supply | [`04-stage-marketplace-supply.md`](04-stage-marketplace-supply.md) | 5, 6 | 2 | Fully MVP — ✅ Done 2026-09-02 |
| 3 — Discovery & Engagement | [`05-stage-discovery-engagement.md`](05-stage-discovery-engagement.md) | 7, 8, 10 | 3 | Fully MVP — ✅ Done 2026-09-02 |
| 4 — Lead Engine | [`06-stage-lead-engine.md`](06-stage-lead-engine.md) | 9 | 4 | Fully MVP — ✅ Done 2026-09-02 |
| 5 — Monetization | [`07-stage-monetization.md`](07-stage-monetization.md) | 11, 12, 13 | 5 | ✅ Done 2026-09-02 (12 minimal, 13 thin-slice by design) |
| 6 — Telegram & Admin | [`08-stage-telegram-and-admin.md`](08-stage-telegram-and-admin.md) | 14, 15, 16 | 6 (+ cross-cutting) | Fully MVP — ✅ Done 2026-09-02 |
| 7 — Growth & Scale | [`09-stage-growth-and-scale.md`](09-stage-growth-and-scale.md) | 17–25 | 7, 8 (+ 9 placeholder) | 17 ✅ Done, 18 ✅ Done, 19 🟡 Stage A only, 20–25 ⬜ Not Started |
| 8 — ₹49 Instant Wedding Website | [`12-stage-wedding-website.md`](12-stage-wedding-website.md) | 26 | *(none — standalone)* | ✅ Done 2026-09-03 per its own checklist |
| 9 — Vendor GST Invoicing & Billing | [`13-stage-vendor-invoices.md`](13-stage-vendor-invoices.md) | 27 | 5 — Monetization / Operations | ✅ Done 2026-09-04 |
| 10 — Standalone Vendor Portfolio | [`14-stage-vendor-portfolio.md`](14-stage-vendor-portfolio.md) | 28 | 2 — Marketplace Supply | ✅ Done 2026-09-04 |
| 11 — Vendor Mini-Store | [`15-stage-vendor-store.md`](15-stage-vendor-store.md) | 29 | 2 / 5 — Commerce | ✅ Done 2026-09-04 (includes merged-in plan review, §5 of that file) |
| 12 — Review-Feedback Audit | [`16-review-feedback-tasklist-backend.md`](16-review-feedback-tasklist-backend.md) | *(cross-cutting)* | *(none)* | Closed out 2026-09-05 — all HIGH/MEDIUM items fixed except the explicitly-deferred index-benchmark item |
| 13 — Vendor Marketplace Payments | [`17-vendor-store-payment-architecture-plan.md`](17-vendor-store-payment-architecture-plan.md) | 30 | 5 — Monetization / Marketplace | ✅ Done 2026-09-05 |

## Full file list

| File | Purpose |
|---|---|
| `00-INDEX.md` | This file — navigation, phase mapping, stage list |
| `01-reference-cross-cutting.md` | Coding rules, DoD, API/security/DB standards that applied to every stage |
| `02-mvp-cut-line.md` | Reconciles the two source docs' conflicting MVP scope statements into one authoritative list |
| `03-stage-foundation.md` | Repo, database, auth, users, category/location catalog |
| `04-stage-marketplace-supply.md` | Vendor profiles, media/portfolio |
| `05-stage-discovery-engagement.md` | Search, favorites/shortlists/comparison, reviews |
| `06-stage-lead-engine.md` | Enquiries & leads — the core monetization loop |
| `07-stage-monetization.md` | Subscriptions, entitlements, featured listings |
| `08-stage-telegram-and-admin.md` | Notifications, Telegram bot MVP, admin platform |
| `09-stage-growth-and-scale.md` | SEO/CMS, analytics, security/testing/deploy/perf hardening |
| `10-risks-and-open-questions.md` | Canonical log of every cross-doc conflict or ambiguity found |
| `11-progress-log.md` | What actually shipped — detailed per-phase write-up (endpoints/tables/bugs found/verification), the backing record for every stage file above |
| `12-stage-wedding-website.md` | ₹49 Instant Wedding Website — standalone monetized feature outside the original 26 Arch Phases (Arch Phase 26) |
| `13-stage-vendor-invoices.md` | Vendor GST Invoicing & Billing Engine (Arch Phase 27) |
| `14-stage-vendor-portfolio.md` | Standalone Vendor Digital Portfolio & WhatsApp Connect (Arch Phase 28) |
| `15-stage-vendor-store.md` | Category-Gated Vendor Mini-Store & Direct Commerce Engine (Arch Phase 29) — **includes its own plan-review history in §5**, merged in from the former standalone `16-vendor-store-plan-review.md` during the 2026-09-05 reorg |
| `16-review-feedback-tasklist-backend.md` | Backend task list from a full codebase audit of `19-review-feedback-source.md` — confirmed-true findings only (attribute N+1, non-transactional profile save, search blocking on analytics writes, uncacheable public data, repository layering, pagination duplication, orphaned media variant, observability, BullMQ concurrency), split from the frontend half at `../frontend/13-review-feedback-tasklist-frontend.md`. **Closed out** — all items fixed except test coverage (see `/PENDING-WORK.md`) and the explicitly-deferred index-benchmark item. |
| `17-vendor-store-payment-architecture-plan.md` | Vendor Marketplace Payment Architecture & Razorpay Route (Arch Phase 30), including its appended Implementation Log |
| `18-session-handoff-2026-09-05.md` | Historical session-handoff narrative — what shipped, what an unsupervised agent did while usage limits were hit, and a later follow-up. Read `/PENDING-WORK.md` instead for anything current; this file's internal paths refer to the pre-reorg `docs/`/`frontenddocs/` layout, left as originally written. |
| `19-review-feedback-source.md` | Source brief: the original 30-section codebase-improvement task document, audited claim-by-claim into `16-review-feedback-tasklist-backend.md`/`../frontend/13-review-feedback-tasklist-frontend.md`. |
| `20-legacy-bugs-log.md` | Verified bug list from an earlier (2026-09-03/04) audit pass, now also absorbing the original raw gap-analysis it was checked against (condensed into its §3, for provenance). All 6 tracked tasks were fixed. Was orphaned from the original index — now properly listed. |

## Change control

This folder is a snapshot of the v1 build phase, frozen 2026-09-05. It will not be updated further as part of active development — see `/PENDING-WORK.md` at the repo root for what's current.
