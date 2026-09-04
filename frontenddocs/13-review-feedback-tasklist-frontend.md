# Frontend Task List — `review-feedback.md` Audit Findings

> Source: `../review-feedback.md`, a 30-section codebase-improvement brief. Every claim in it was checked against the real code before being listed here — this file contains only CONFIRMED TRUE or PARTIALLY TRUE findings that are frontend-owned. See [`../docs/16-vendor-store-plan-review.md`](../docs/16-vendor-store-plan-review.md) for this docs set's precedent on reviewing a spec against real code before acting on it. The backend-owned half of the same audit is [`../docs/17-review-feedback-tasklist-backend.md`](../docs/17-review-feedback-tasklist-backend.md).

**One claim was checked and found FALSE — do not re-open this:**
- **Security headers** — already solid, shipped in Backend Arch Phase 19 Stage A (commit `dad158e`). `next.config.ts` has a real `headers()` function with X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, and a verified CSP.

**Two claims were checked and found moot (the described risk cannot occur under current product rules) — do not "fix" a non-problem:**
- **"200–500 photo wedding websites must stay usable"** — moot. Gallery photos are hard-capped at 30 server-side (`MAX_GALLERY_PHOTOS`, `wedding-website-media.schema.ts`). The gallery-variant-selection issue below is still real, just bounded in severity.
- **Frontend bundle performance (heavy chart/PDF/editor libraries)** — moot. No such libraries exist in `package.json` at all; PDF/print output uses native `window.print()` + `@media print` CSS, not a library. Nothing to dynamically import here.

No CRITICAL-severity findings exist anywhere in this audit.

---

## Task Checklist

### HIGH priority

- [ ] **No client-side image compression/resize before upload** — confirmed zero uses of `browser-image-compression`, canvas-resize, or any similar technique anywhere in the frontend. Every upload flow (vendor logo/cover/portfolio/gallery, wedding-website gallery/cover, admin media) sends the original, often 10–20MB phone photo straight to the presigned-URL flow. Fix: resize to a max ~2400–2560px dimension and compress (prefer WebP where supported) in the browser before requesting the presigned URL. Do not use this as a security boundary — backend validation must remain exactly as-is.
- [ ] **Unbounded upload concurrency** — `PortfolioManager.tsx`'s `handleFilesSelected` fires `void uploadOneFile(file)` per selected file with no batching/concurrency limiter; a large multi-select gallery upload saturates the browser's connection pool and the presigned-URL issuance endpoint simultaneously. Fix: batch to ~3–4 concurrent uploads via a simple queue. Apply the same fix to every other multi-file upload surface (wedding-website gallery, admin media, any generic uploader), not just the vendor portfolio manager.
- [ ] **No retry/remove affordance on a failed upload** — once an item's `progress` state becomes `"error"` in `PortfolioManager.tsx`, it renders only a static error message with no button; there is no retry or remove handler in the file at all (confirmed via grep — zero matches). One bad file currently has no graceful recovery path short of re-selecting it from scratch. Fix: add per-item "Retry" (re-invoke `uploadOneFile` for just that file) and "Remove" buttons in the error state. Apply to every multi-file upload surface.
- [ ] **Public data (categories/locations/featured-listings) is uncacheable** — root cause: `lib/api/client.ts`'s `apiFetch` calls `headers()` unconditionally on every invocation (used for an `X-Forwarded-For` relay), which per Next.js's dynamic-API rules forces every calling route out of static rendering — even calls made with `skipAuth: true` for genuinely public, slow-changing data. Fix: give public/cacheable reads (categories, locations, featured-listings, popular searches, featured vendors, wedding stories, homepage gallery, blog homepage content, SEO metadata) a fetch path that doesn't touch `headers()`, then layer `next: { revalidate: N }` (or Redis, only if justified by real volatility) on top. Coordinate with [`../docs/17-review-feedback-tasklist-backend.md`](../docs/17-review-feedback-tasklist-backend.md) — this is a frontend file but the fix may need a backend-side decision about whether the `X-Forwarded-For` relay is even needed for `skipAuth` calls.

### MEDIUM priority

- [ ] **Homepage's featured-vendor-card fetch is an avoidable sequential 2-hop** — `app/(public)/page.tsx`'s `getFeaturedVendorCards()` awaits `listFeaturedListings` first, then fans out `searchVendors` per listing (the fan-out itself is `Promise.all`'d, but only starts after the first call resolves) — a real sequential dependency in an otherwise well-parallelized page, caused by `featured-listings` only returning `{id, businessName, slug}` and needing a search-based workaround to get full card data. Fix: have the featured-listings endpoint/repository join and return full card data directly, removing the second hop. (This is really a backend repository change with a frontend simplification following it — coordinate with the backend task list.)
- [ ] **Homepage has no Suspense/streaming boundaries** — all ~7 homepage fetches sit in one top-level `Promise.all`; nothing is wrapped in `<Suspense>`. Below-the-fold, non-critical sections (wedding stories, blog, gallery inspiration) currently block the entire page's initial HTML even though they're not above-the-fold content. Fix: wrap non-critical sections in `<Suspense>` with server-streamed fallbacks so critical content isn't gated on the slowest of the 7 parallel fetches.
- [ ] **Wedding-website gallery grid over-fetches image size** — `WeddingWebsiteRenderer.tsx`'s gallery mapping prefers `optimizedObjectKey` (medium/800px) over `thumbnailObjectKey` (300px) for `aspect-square` grid cells that only need ~300px — roughly 5x the necessary bytes per photo. Bounded in severity by the 30-photo cap (see "moot" note above), but still a real, fixable inefficiency. Fix: use `thumbnailObjectKey` for grid cells; reserve `optimizedObjectKey` for a full-screen/detail view once one exists (see next item).
- [ ] **No lightbox/full-screen gallery view exists for wedding websites** — clicking a gallery photo in `WeddingWebsiteRenderer.tsx` currently does nothing (no modal, no expanded state, no click handler). The review doc's concern about "large variant vs. grid variant" selection is moot until this is built, since there's no full-screen consumer yet. Not a regression — a genuinely unbuilt feature. If/when built, wire it to the `large`/`optimizedObjectKey` variant, not the grid's thumbnail (see the backend task list's "orphaned large variant" item — building a lightbox may be the actual justification for persisting that variant instead of discarding it).
- [ ] **Frontend error handling collapses all failure modes into one shape** — `lib/api/client.ts`'s `apiFetch` throws a single `ApiRequestError` class for every HTTP failure; a raw network failure (`fetch` throwing `TypeError`) is never caught/wrapped and propagates as an unrelated exception type. No call site can currently distinguish network vs. validation vs. auth vs. server errors without manually inspecting `.status`/`.code` each time. Fix: introduce distinct error classes (or a discriminated union) for network/validation/auth/server, and centrally catch/wrap raw `fetch` rejections into the network category inside `apiFetch` itself.

### NICE-TO-HAVE

- [ ] **Large Client Components** — `InvoiceEditor.tsx` (1079 lines), `InvoiceDetailView.tsx` (924), `WeddingWebsiteWizard.tsx` (772), `InvoicesBoard.tsx` (569), `ProfileEditor.tsx` (541), `DashboardInteractiveSections.tsx` (489) — all marked `"use client"`. Real maintainability concern, not a performance or correctness bug. Note: `DashboardInteractiveSections.tsx` was found to be pure presentational (props-in, no fetches of its own) — its size is a UI-organization issue, not a data-fetching one, so splitting it is lower-value than the others. When picked up, refactor incrementally into `feature/{components,hooks,actions,schemas,utils,types}/page.tsx` per review doc §2 — do not attempt a full rewrite of any of these in one pass.
- [ ] **Homepage confirmed NOT part of the "oversized Client Component" problem** — `app/(public)/page.tsx` (499 lines) has no `"use client"` directive; it's already a Server Component. No action needed here — listed only so this isn't mistakenly re-investigated later.

---

## Explicitly out of scope / needs infrastructure this environment doesn't have

- **Real bundle-size profiling** (e.g. `next build --profile` bundle analysis under realistic production traffic) wasn't run as part of this audit — the "moot" verdict above is based on `package.json` dependency inspection, not a build-output size report. If a future pass wants real bundle numbers, run the analyzer rather than re-guessing from `package.json`.
- **Production error-log sampling** for the `apiFetch`/error-class gap — the fix's value is clear from code inspection alone; a production sample wasn't needed to confirm this one.

## Implementation order (adjusted from the review doc's own §30 phase structure)

The review doc's own "Phase 1: critical security" phase is **dropped** — independently confirmed already solid. Suggested frontend order:

1. Image/media upload performance (compression, concurrency limiting, retry/remove) — the most user-visible fix, touches every upload surface but each surface's fix is small and mechanical once the shared pattern exists
2. Public-data caching fix, coordinated with the backend task list's cross-referenced item
3. Homepage: featured-vendor-card sequential-fetch fix (coordinate with backend) + Suspense boundaries for non-critical sections
4. Wedding-website gallery variant selection (thumbnail vs. medium) — small, independent, no dependency on the lightbox item
5. Typed error classes in `apiFetch`
6. Large Client Component refactors — lowest urgency, pick off one at a time opportunistically, never as a big-bang rewrite
