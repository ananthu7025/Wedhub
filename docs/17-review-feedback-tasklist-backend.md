# Backend Task List — `review-feedback.md` Audit Findings

> Source: [`19-review-feedback-source.md`](19-review-feedback-source.md), a 30-section codebase-improvement brief. Every claim in it was checked against the real code before being listed here — this file contains only CONFIRMED TRUE or PARTIALLY TRUE findings that are backend-owned. See [`16-vendor-store-plan-review.md`](16-vendor-store-plan-review.md) for this docs set's precedent on reviewing a spec against real code before acting on it. The frontend-owned half of the same audit is [`../frontenddocs/13-review-feedback-tasklist-frontend.md`](../frontenddocs/13-review-feedback-tasklist-frontend.md).

**Two of the review doc's central claims were checked and found FALSE — do not re-open these:**
- **Payment webhook idempotency** — already solid. `webhook.service.ts` verifies the Razorpay signature first, derives an idempotency key, and inserts into `webhook_events` under a unique constraint before processing; `handlePaymentCaptured` also has a defense-in-depth `status === "CAPTURED"` early-return.
- **CORS / Helmet / rate limiting** — already solid, shipped in Backend Arch Phase 19 Stage A (commit `dad158e`). `app.ts` has `helmet()` and `cors()` restricted to `[FRONTEND_URL, ADMIN_URL]`; rate limiters are wired into auth/search/review/enquiry/vendor-store/analytics routes.

No CRITICAL-severity findings exist anywhere in this audit.

---

## Task Checklist

### HIGH priority

- [x] **Vendor attribute update N+1** — `wedhub-backend/src/modules/vendors/vendor.service.ts`'s `setAttributeValues` loops per-attribute doing an individual SELECT (`findAttributeById`) then UPSERT (`upsertAttributeValue`). **Fixed (2026-09-05):** bulk-fetch via new `vendorRepository.findAttributesByIds`, validated in memory against a `Map`, then batch-written via new `vendorRepository.replaceAttributeValues` (delete-all-for-vendor + `createMany` in one `$transaction`, mirroring `replaceVendorCategories`). The now-dead per-entry `findAttributeById`/`upsertAttributeValue` repository methods were removed (zero other callers). Same validation errors/messages preserved; validation still runs fully before any write.
- [x] **Vendor profile save is non-transactional** — `vendor.service.ts`'s `upsertProfile` fans out into separate, non-transactional operations (city update, media-ownership checks, profile upsert, then a fully separate completeness recalculation), unlike sibling methods in the same file (`setCategories`/`submitForReview`) which already use `prisma.$transaction`. **Fixed (2026-09-05):** the city update + profile upsert are now one `prisma.$transaction` via new `vendorRepository.upsertProfileTx`; media-ownership checks stay as pre-transaction validation reads (must fail before any write, same as before). Completeness recalculation intentionally stays a separate post-transaction call — see the note below on why full elimination wasn't pursued for all 9 call sites.
- [ ] **Profile completeness recalculation refetches from scratch** — `recalculateCompleteness` does fetch→calculate→update as its own round trip, called from 9+ places in `vendor.service.ts` after nearly every vendor mutation, each re-fetching data the caller already has in hand. **Partially assessed (2026-09-05):** on inspection this is one extra indexed `findUnique`-by-primary-key per mutation, not a true N+1 — `calculateCompleteness` needs the vendor's full relation set (profile/categories/serviceAreas/services/packages/attributeValues) regardless of which single relation the caller just touched, so eliminating the refetch everywhere would require restructuring most call sites to assemble that full shape locally, a materially larger change than this item implies. Left as-is pending a decision on whether that larger restructure is worth it; not fixed this pass.
- [x] **Search blocks its response on 2 synchronous analytics writes** — the single clearest violation found in this whole audit. `search.service.ts`'s `logSearch` awaits `prisma.searchLog.create` then `logAnalyticsEvent(...)` (`search_performed`), both awaited sequentially, before `searchVendors` returns a response to the user. Directly contradicts this codebase's own stated principle (Coding Rule / Arch Phase 18 Stage A note) that analytics must never block a transactional/user-facing request. **Fixed (2026-09-05):** `searchVendors` now calls `void logSearch(...)` (fire-and-forget); `logSearch`'s two internal writes (both already self-error-swallowing) now run via `Promise.all` instead of sequential awaits.
- [x] **Search runs its count query sequentially, not in parallel** — `search.repository.ts` runs a ranked `$queryRaw` then a separate full `COUNT(*)` `$queryRaw` (same WHERE/joins) sequentially, doubling Postgres round-trip cost per search. Every other paginated endpoint already parallelizes fetch+count via `Promise.all`. **Fixed (2026-09-05):** both queries now run inside one `Promise.all`.
- [ ] **Public data can never be cached** — root cause is `wedhub-frontend-app/lib/api/client.ts`'s `apiFetch` calling `headers()` unconditionally on every call (including public, cacheable ones like categories/locations/featured-listings), which forces Next.js to treat the calling route as dynamic. This is a frontend file but the fix is really "give public-data reads a path that doesn't touch `headers()`" — coordinate with the frontend task list since splitting this fix cleanly may require a backend-side decision (e.g. whether `X-Forwarded-For` relay is even needed for `skipAuth: true` calls). Cross-referenced in [`../frontenddocs/13-review-feedback-tasklist-frontend.md`](../frontenddocs/13-review-feedback-tasklist-frontend.md).
- [ ] **Near-zero backend test coverage** — only `tests/unit/vendor-invoice.spec.ts` and `tests/unit/vendor-store.spec.ts` exist (both pure schema/math unit tests); `tests/integration/` and `tests/e2e/` are empty `.gitkeep` stubs. Zero coverage for auth, ownership, payments, or webhooks. Fix: add integration tests for auth/ownership/webhook-idempotency first (highest blast-radius domains), per review doc §18.

### MEDIUM priority

- [ ] **`vendor.service.ts` bypasses its own repository** — three separate `prisma.$transaction` blocks hit `prisma.vendor`, `prisma.vendorStatusHistory`, `prisma.auditLog`, and ad-hoc `prisma.user.findUnique` directly, despite `vendor.repository.ts` existing with `updateVendor`/`recordStatusChange`. This is the one real layering violation found in a ~10-module sample (8 of 10 sampled modules correctly never call `prisma.*` from their service). Fix: route these writes through the repository.
- [ ] **`search.service.ts` bypasses its repository for `SearchLog`** — calls `prisma.searchLog.create` directly because no repository method exists for it. Fix: add a `createSearchLog` method to `search.repository.ts`.
- [ ] **Duplicated pagination skip/take math** — reimplemented inline in at least 5 places (`vendor.repository.ts`, `lead.repository.ts` x2, `review.repository.ts` x3). Fix: extract a shared `toPageParams(page, limit)` helper.
- [ ] **Possibly-missing indexes on search-filtered columns** — `Vendor.verificationLevel` (filtered, no index) and `Vendor.createdAt` (used by `newest` sort, no index); `VendorAttributeValue`'s typed value columns (filtered by an `EXISTS` OR-branch, no index). The existing `@@index([status, cityId])` composite already narrows most queries first, so these may be moot in practice — **do not add speculatively**; only add if a real seeded-dataset benchmark (10k–500k vendors, none exists in this dev environment today) confirms they matter. Tracked here as a "verify before building" item, not a "build now" item.
- [ ] **Orphaned "large" media variant** — `media-processing.processor.ts` generates and uploads all 3 variants (`large`/`medium`/`thumbnail`) to R2, but only `medium`→`optimizedObjectKey` and `thumbnail`→`thumbnailObjectKey` are persisted on the `Media` row. The `large` variant's key is computed and discarded — pure wasted storage with zero reachability today. Fix: either persist a `largeObjectKey` field (small migration) and wire a consumer to it, or stop generating the variant if genuinely unused. Coordinate with the frontend task list's wedding-website gallery/lightbox items before deciding.
- [ ] **No observability/latency instrumentation** — no p95/p99, query-duration, queue-latency, or image-processing-duration tracking anywhere in the backend (grepped for prom-client/opentelemetry/sentry/datadog/duration/latency — no real hits). Fix (minimal, not a full APM rollout): wrap Prisma with a query-duration log via `$extends`, log elapsed ms in the media processor.
- [ ] **No explicit BullMQ worker concurrency setting** — neither the media-processing nor notification-delivery `Worker` constructor sets `concurrency` (defaults to 1, which is safe but not a deliberate, tuned choice). Fix: set `concurrency: 2-3` on the media worker once instance memory headroom is confirmed; leave the notification worker as-is (I/O bound, low risk either way).

### NICE-TO-HAVE

- (None backend-specific beyond the above — the remaining nice-to-have items from the full audit, e.g. large Client Components and bundle-size concerns, are frontend-owned; see the frontend task list.)

---

## Explicitly out of scope / needs infrastructure this environment doesn't have

- **Real `EXPLAIN ANALYZE` query-plan verification at scale** — no seeded 10k–500k-vendor dataset exists in this dev environment. The search query-shape review above is evidence-based on structure (trigram + `EXISTS` subqueries, no N+1 found), not benchmark-confirmed. Per review doc §7's own instruction, do not introduce a dedicated search engine (Elasticsearch/OpenSearch/etc.) without this evidence.
- **Production error-log sampling** — the dev/prod branching in `error.middleware.ts` was confirmed correct by code review (never leaks stack traces/SQL errors when `isProduction`), but wasn't observed under real production load.
- **Full 41-module repository-layering sweep** — only ~10 of ~41 backend modules were sampled for the "services bypass repository" check. The two violations found (`vendors`, `search`) may not be the only ones; a full sweep was out of scope for this audit pass.

## Implementation order (adjusted from the review doc's own §30 phase structure)

The review doc's own "Phase 1: critical security" and "Phase 3: payment reliability" phases are **dropped** — both were independently confirmed already solid. Suggested backend order:

1. Attribute N+1, profile-save transaction, completeness recalculation (all in `vendor.service.ts` — same file, do together)
2. Search's blocking analytics writes + sequential count query (same file, `search.service.ts`/`search.repository.ts` — do together)
3. `vendor.service.ts`/`search.service.ts` repository-layering cleanup (natural follow-on to #1/#2 since you're already in these files)
4. Public-data caching coordination with frontend (see cross-reference above)
5. Backend test coverage expansion (auth/ownership/webhooks first)
6. Medium-priority cleanup (pagination helper, observability, BullMQ concurrency) — lowest urgency, pick up opportunistically
