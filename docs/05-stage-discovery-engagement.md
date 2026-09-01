# Stage 3 — Discovery & Engagement

## Stage Goal

Let users find, evaluate, save, and trust vendors before they submit an enquiry.

## Included Architecture Phases

- **Arch Phase 7** — Search & Discovery
- **Arch Phase 8** — Favorites, Shortlists & Comparison
- **Arch Phase 10** — Reviews & Trust

## Product Roadmap Cross-Reference

Maps to **Product Phase 3 — User Discovery** (product.md §70: search, filters, vendor pages, favorites, shortlists, reviews, SEO). Note: product.md bundles SEO into this same phase, but architecture.md places the CMS/SEO *backend* in Arch Phase 17 — that ships in [Stage 7](09-stage-growth-and-scale.md), not here. The discovery *UX* ships in this stage; SEO *page data* ships later.

## Included Product Concerns

- Search & filtering: keyword, category, subcategory, location, service area, price, budget, rating, availability, services, features, verified status; sort by relevance/rating/popularity/distance/newest/recommended — product.md §10.
- Search engine abstraction requirement: PostgreSQL now (full-text search, `pg_trgm`), pluggable to OpenSearch/Elasticsearch/Typesense/Algolia later without rewriting controllers — product.md §10, architecture.md §17.
- Vendor ranking: relevance + category/location match + profile completeness + review quality/rating + response rate/time + lead conversion + availability + engagement + verification + subscription/featured status. Subscription is a controlled signal, not the sole mechanism — product.md §11, architecture.md §18.
- Favorites & shortlists: named collections, a vendor can belong to multiple, private by default, future share-link capability — product.md §15.
- Category-aware vendor comparison engine (e.g. photographer: price/rating/reviews/experience/styles/deliverables/hours/location; venue: price/capacity/rooms/parking/indoor-outdoor/catering/location) — product.md §16.
- Reviews: fields (rating, written review, photos eventually, date, service, verified-interaction status), vendor can respond, admin moderation states (`PENDING/APPROVED/REJECTED/HIDDEN/REMOVED` conceptually — see architecture.md §23 for the implemented state set `PENDING/APPROVED/REJECTED/FLAGGED/HIDDEN`), anti-abuse rules including **vendors cannot review themselves** — product.md §24.

## Task Checklist

### Arch Phase 7 — Search & Discovery ✅ Done — 2026-09-02
- [x] Vendor keyword search; category/subcategory/city/service-area/price/verified/attribute filters (rating filter deferred — no review data until Arch Phase 10)
- [x] Pagination, sorting, search relevance
- [x] Search indexes, PostgreSQL full-text search, `pg_trgm`
- [x] Vendor ranking service, featured-listing integration (stub until Stage 5 exists), search analytics

See [`11-progress-log.md`](11-progress-log.md#arch-phase-7--search--discovery) for the full write-up.

### Arch Phase 8 — Favorites, Shortlists & Comparison
- [ ] Favorites; shortlists; shortlist items; rename shortlist; remove item
- [ ] Compare vendors; share-shortlist foundation; analytics events

### Arch Phase 10 — Reviews & Trust
- [ ] Review creation, validation, moderation
- [ ] Rating aggregation, review count, verified-interaction flag
- [ ] Vendor response, review report, review abuse controls, admin review queue

## Acceptance Criteria

- Search works at realistic catalog size; queries are indexed; search response time is monitored; search logic is abstracted from the controller (swap-ready for a dedicated engine later). — **Met for Arch Phase 7**: keyword/category/city/service-area/price/verified/attribute filters, relevance/price/newest/recommended sorting, and pagination all live behind a dedicated `search` module (`GET /api/v1/search/vendors`), separate from the `vendors` CRUD module. `pg_trgm` GIN indexes back keyword matching; verified live via `EXPLAIN` that the planner can select them as a valid access path.
- User can save vendors; user can create multiple shortlists; duplicate shortlist items are prevented; private shortlist access is enforced. — **Pending Arch Phase 8.**
- Vendors cannot create fake reviews of themselves through vendor-owned accounts; review moderation works; rating aggregation stays consistent. — **Pending Arch Phase 10.**

## Dependencies / Sequencing

Depends on Stage 2 (vendors and media must exist to search, display, and review). Internally, architecture.md §52 orders Arch Phase 7 → 8 → 10, though **8 and 10 have no hard dependency on each other** and can be built in parallel if useful — this is a sequencing optimization opportunity, distinct from the documented order.

## Open Questions

- **Reviews phase-alignment mismatch** ([Risk 2](10-risks-and-open-questions.md#2-reviews-phase-alignment-mismatch)) — product.md groups reviews with discovery at the same coarse level; architecture.md sequences them after search/favorites within this stage. Confirm this lag is acceptable (it converges within the same stage regardless, per the MVP cut line) before scheduling.
- **Arch Phase 8 MVP inclusion** — this phase was absent from architecture.md §53's explicit MVP list. Resolved in [`02-mvp-cut-line.md`](02-mvp-cut-line.md) to be included at MVP — build it as scoped above, not as a stretch/optional item.
- **New judgment calls resolved during Arch Phase 7** (not pre-existing risks, decided during implementation): (1) Search was built as its own `search` module with its own `GET /search/vendors` endpoint rather than upgrading Arch Phase 5's thin `GET /vendors` stub in place — confirmed with the user, matching architecture.md's module list (`search` as its own module) and product.md §10's explicit "search logic must be abstracted" requirement. The old `GET /vendors` stub is left as-is. (2) The vendor-ranking formula (product.md §11's `organic relevance + quality + business visibility`) is deliberately partial: review rating/quality (Arch Phase 10), response rate/time/lead conversion (Arch Phase 9), and subscription/featured status (Arch Phase 13) don't exist yet, so those terms are weighted zero rather than faked — mirrors Arch Phase 5's precedent of a partial `profileCompleteness` formula pending later phases' data. (3) The `rating` and `availability` filters from product.md §10 are deferred to Arch Phase 10/9 respectively for the same reason — no underlying data exists yet to filter on.
