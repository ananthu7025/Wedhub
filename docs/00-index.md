# WedHub Delivery Plan — Index

## Purpose

This `docs/` folder is a **planning and navigation layer** derived from two canonical specs at the repo root:

- [`product.md`](../product.md) — product/business specification (74 sections)
- [`wedhub_backend_architecture.md`](../wedhub_backend_architecture.md) — engineering blueprint (60 sectiaons)

Those two files remain the source of truth. Nothing here overrides them. `docs/` exists to turn them into an executable, stage-by-stage delivery plan — consolidated checklists, acceptance criteria, sequencing, and an explicit record of the places where the two source docs disagree with each other.

**If `product.md` or `wedhub_backend_architecture.md` are ever revised, this folder must be re-diffed against them.** Treat `docs/` as derived, not authoritative.

## How to navigate

1. Read [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md) and [`02-mvp-cut-line.md`](02-mvp-cut-line.md) first — every stage file assumes you already know these.
2. Pick the stage file you're implementing (`03` through `09`).
3. Keep [`10-risks-and-open-questions.md`](10-risks-and-open-questions.md) open alongside it — each stage file links to the specific entries relevant to it, rather than restating them.
4. **After** finishing an Arch Phase, update [`11-progress-log.md`](11-progress-log.md): flip its status to done, fill in its APIs/tables/flow-diagram entry, and tick its tasks in the stage file.

## Two phase-numbering schemes — read this before anything else

The two source docs number "phases" independently, at different granularity. They are **never interchangeable**:

| Scheme | Source | Granularity | How to refer to it |
|---|---|---|---|
| **Product Phase** | `product.md` §70 | 9 coarse business phases (Foundation, Marketplace Supply, User Discovery, Lead Engine, Monetization, Telegram, Growth, Scale, Advanced) | Always write **"Product Phase N"** |
| **Arch Phase** | `wedhub_backend_architecture.md` §51 | 26 granular engineering phases (Phase 0–25) | Always write **"Arch Phase N"** |

Never write a bare "Phase 5" anywhere in this docs set — it's ambiguous. The stage files below (03–09) are organized around **Arch Phases**, since that's the actual engineering build sequence. Each stage file cross-references back to the relevant Product Phase(s) so business stakeholders can orient themselves.

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
| *(none yet)* | 9 — Advanced | WhatsApp, AI assistant, booking, pay-per-lead — captured in product.md, not yet backed by any Arch Phase. See [Risk: pay-per-lead coverage gap](10-risks-and-open-questions.md#5-pay-per-lead-has-no-architecture-phase) |

## Stage list

| Stage | File | Arch Phases | Product Phase | MVP status |
|---|---|---|---|---|
| 1 — Foundation | [`03-stage-foundation.md`](03-stage-foundation.md) | 0, 1, 2, 3, 4 | 1 | Fully MVP |
| 2 — Marketplace Supply | [`04-stage-marketplace-supply.md`](04-stage-marketplace-supply.md) | 5, 6 | 2 | Fully MVP |
| 3 — Discovery & Engagement | [`05-stage-discovery-engagement.md`](05-stage-discovery-engagement.md) | 7, 8, 10 | 3 | MVP (Arch Phase 8 pending decision — see MVP cut line) |
| 4 — Lead Engine | [`06-stage-lead-engine.md`](06-stage-lead-engine.md) | 9 | 4 | Fully MVP |
| 5 — Monetization | [`07-stage-monetization.md`](07-stage-monetization.md) | 11, 12, 13 | 5 | 11 MVP; 12 pending decision; 13 thin-slice only |
| 6 — Telegram & Admin | [`08-stage-telegram-and-admin.md`](08-stage-telegram-and-admin.md) | 14, 15, 16 | 6 (+ cross-cutting) | Fully MVP |
| 7 — Growth & Scale | [`09-stage-growth-and-scale.md`](09-stage-growth-and-scale.md) | 17–25 | 7, 8 (+ 9 placeholder) | Mostly post-MVP (17 partially MVP via SEO) |
| 8 — ₹49 Instant Wedding Website | [`12-stage-wedding-website.md`](12-stage-wedding-website.md) | 26 | *(none — new, standalone)* | Post-MVP, parallel scope — not sourced from `product.md`/`wedhub_backend_architecture.md`, see the stage file's own "Origin and Numbering" section |

## Full file list

| File | Purpose |
|---|---|
| `00-index.md` | This file — navigation, phase mapping, stage list, build order |
| `01-reference-cross-cutting.md` | Coding rules, DoD, API/security/DB standards that apply to every stage — referenced, never duplicated |
| `02-mvp-cut-line.md` | Reconciles the two source docs' conflicting MVP scope statements into one authoritative list |
| `03-stage-foundation.md` | Repo, database, auth, users, category/location catalog |
| `04-stage-marketplace-supply.md` | Vendor profiles, media/portfolio |
| `05-stage-discovery-engagement.md` | Search, favorites/shortlists/comparison, reviews |
| `06-stage-lead-engine.md` | Enquiries & leads — the core monetization loop |
| `07-stage-monetization.md` | Subscriptions, entitlements, featured listings |
| `08-stage-telegram-and-admin.md` | Notifications, Telegram bot MVP, admin platform |
| `09-stage-growth-and-scale.md` | SEO/CMS, analytics, security/testing/deploy/perf hardening |
| `10-risks-and-open-questions.md` | Canonical log of every cross-doc conflict or ambiguity found |
| `11-progress-log.md` | What has actually shipped — status table + per-phase APIs/tables/flow diagram, filled in as each Arch Phase completes |
| `12-stage-wedding-website.md` | ₹49 Instant Wedding Website — new, standalone monetized feature outside the original 26 Arch Phases (Arch Phase 26) |

## Recommended build order

Stage-level sequencing follows architecture.md §52's dependency chain:

```
Stage 1 (Foundation)
   ↓
Stage 2 (Marketplace Supply)
   ↓
Stage 3 (Discovery & Engagement)
   ↓
Stage 4 (Lead Engine)
   ↓
Stage 5 (Monetization)          — internally strict: Arch 11 → 12 → 13
   ↓
Stage 6 (Telegram & Admin)      — internally strict: Arch 14 → 15 → 16
   ↓
Stage 7 (Growth & Scale)        — internally strict: Arch 17 → 18 → … → 25
```

No stage should begin before the prior stage's acceptance criteria are met — each stage file states its specific dependencies explicitly.

## Change control

`docs/` is a snapshot derived from `product.md` and `wedhub_backend_architecture.md` as they exist today. If either source spec changes, re-read the affected sections and update every stage file, the mapping table above, and `02-mvp-cut-line.md` / `10-risks-and-open-questions.md` accordingly. Do not let this folder silently drift from the source of truth.
