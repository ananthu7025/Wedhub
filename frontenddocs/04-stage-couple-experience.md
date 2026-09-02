# Stage 2 — Couple Experience (Frontend)

## Stage Goal

Build the full couple-facing surface: public discovery (home, search, vendor profile) through to the authenticated couple app (shortlist, compare, enquiries, reviews, notifications, profile). This is the highest-traffic, most SEO-relevant part of the product per product.md §3.5/§3.6 — most screens here are public or semi-public, not gated.

## Included Frontend Arch Phases

- **Frontend Arch Phase 2** — Public Discovery (Home, Search, Vendor Profile)
- **Frontend Arch Phase 3** — Shortlist, Compare & Enquiry
- **Frontend Arch Phase 4** — Couple Account (Enquiry Tracking, Reviews, Notifications, Profile)

## Product Roadmap Cross-Reference

Maps to product.md §2.1 "End-user goals" (all 13 points) and Product Phases 2 (Marketplace Supply — consumed, not produced, here), 3 (User Discovery), 4 (Lead Engine — the couple-facing half).

## Backend Dependency

Arch Phases 4 (Category/Location Catalog), 5 (Vendor Module), 6 (Media & Portfolio), 7 (Search & Discovery), 8 (Favorites/Shortlists/Comparison), 9 (Enquiries & Leads), 10 (Reviews & Trust), 14 (Notifications) — all ✅ Done per `../docs/11-progress-log.md`. No backend blocker for this entire stage.

## Included Mockup Screens

`couple/home.html`, `couple/search.html`, `couple/vendor-profile.html`, `couple/shortlist.html`, `couple/compare.html`, `couple/leads.html`, `couple/review-write.html`, `couple/notifications.html`, `couple/profile.html`

## Task Checklist

### Frontend Arch Phase 2 — Public Discovery ✅ Done — 2026-09-02
- [x] `(public)/` home route — port `couple/home.html`: hero search bar, category browse strip, featured vendors grid, Telegram promo banner. Category list is real (`GET /categories`); featured vendors come from `GET /featured-listings?placementType=HOMEPAGE` cross-referenced against `GET /search/vendors` for renderable card data (see Open Question 10 — the featured-listings endpoint alone only returns `{id, businessName, slug}` per vendor)
- [x] `(public)/search` — port `couple/search.html`: filter sidebar (category, city, budget range, verified-only), search bar, sort dropdown, result grid, pagination. Wired to `GET /search/vendors` with the exact query shape from `search.schema.ts` (`keyword, categoryId, cityId, priceMin, priceMax, verified, sort, page, limit`) — confirmed via direct source read, not assumed. Category-specific attribute filters (`attr[<uuid>]=value`) are supported by `lib/api/catalog.ts`'s `searchVendors()` but not yet surfaced as sidebar UI controls in this phase — see Notes
- [x] `(public)/vendors/[slug]` — port `couple/vendor-profile.html`: hero image (via album-cover fallback, see Open Question 7), identity, about, category-specific attributes, portfolio grid, packages, reviews (average + count, no distribution bars — see Open Question 9), sticky enquiry CTA (links to login — enquiry submission itself is Frontend Arch Phase 3 scope). Wired to `GET /vendors/:slug` + `GET /vendors/:slug/albums` + `GET /vendors/:vendorId/reviews`
- [x] Category-specific attribute rendering is fully generic (`components/shared/VendorAttributes.tsx`) — switches on `attribute.dataType` (`TEXT/SELECT/NUMBER/BOOLEAN/MULTI_SELECT`), not hardcoded to Photography's field set. Verified live against a real vendor with one attribute value of every data type (see Playwright verification below)
- [x] SEO metadata basics per page (`generateMetadata` on the vendor detail page using `profile.seoTitle`/`seoDescription` when set, falling back to business name/short description; static `metadata` export on home/search)
- [x] Loading/empty/error states: search's zero-result empty state, vendor `not-found.tsx` for an unknown slug (real Next.js `notFound()` triggered on a genuine backend 404, not simulated), reviews section's "No reviews yet" state — all verified against real triggering conditions, not assumed correct

### Deferred within Frontend Arch Phase 2 (explicitly, not silently)
- Category-specific attribute **filter controls** in the search sidebar (the API supports them via `attr[uuid]=value`, but no UI renders them yet — the sidebar only has category/city/price/verified). Left for a follow-up pass since it needs its own small design (dynamic form per selected category) rather than being squeezed into this phase's scope.
- Search result cards do not show rating or city name per card (see Open Question 8 — not retrievable from `/search/vendors` without N+1 calls).
- Rating distribution bars on the vendor profile page (see Open Question 9 — no backend aggregate exists).

### Frontend Arch Phase 3 — Shortlist, Compare & Enquiry
- [ ] Enquiry modal (used from vendor profile) — port the modal in `couple/vendor-profile.html`: wedding date, budget, guest count, message, contact number. Submits to the real enquiry-creation endpoint (`wedhub-backend/src/modules/enquiries/`) — this is an authenticated action, so unauthenticated users get redirected to login first (preserve their in-progress enquiry intent across that redirect if reasonably simple; if not trivial, just require login before opening the modal at all — decide pragmatically, don't over-engineer)
- [ ] Shortlist/heart toggle — the heart icon button pattern used throughout `couple/home.html`, `couple/search.html`, `couple/vendor-profile.html` — wire to real add/remove shortlist endpoints (`wedhub-backend/src/modules/shortlists/`), optimistic UI update reconciled against the real response
- [ ] `(couple)/shortlist` — port `couple/shortlist.html`: category filter, multi-select checkboxes, "Compare selected" action, per-card enquire/view actions
- [ ] `(couple)/compare` — port `couple/compare.html`: side-by-side comparison table driven by whichever vendor IDs were selected, with category-specific comparison fields (product.md §7 mentions "category-specific comparison fields" as admin-configurable — check whether the backend actually exposes this or whether the mockup's comparison rows are frontend-only convenience groupings)
- [ ] Both shortlist and compare are authenticated-only routes, gated per Frontend Arch Phase 1's middleware

### Frontend Arch Phase 4 — Couple Account
- [ ] `(couple)/enquiries` (leads tracker from the couple's side) — port `couple/leads.html`: status pill-tabs, per-enquiry status-track visualization (Sent → Viewed → Responded → Closed), matching whatever the backend's actual enquiry/lead status model exposes to the couple (note: product.md §20 states "Vendor lead status is not necessarily the same as platform enquiry status" — confirm which status the couple-facing view should actually track before wiring, check `wedhub-backend/src/modules/enquiries/` vs. `leads/`)
- [ ] `(couple)/reviews/write/[enquiryId]` or similar — port `couple/review-write.html`: star rating picker, service selector, review text, optional photo upload. Only reachable for enquiries the backend confirms are eligible for review (verified interaction — product.md §24 "verified interaction status", "one review per legitimate interaction")
- [ ] `(couple)/notifications` — port `couple/notifications.html`: unread/read notification list, mark-all-read action. Wire to `wedhub-backend/src/modules/notifications/`
- [ ] `(couple)/profile` — port `couple/profile.html`: wedding details form, account details form, notification preference toggles, logout, account deletion. Wire each save action to the real user-update endpoints (`wedhub-backend/src/modules/users/`)
- [ ] Bottom nav bar (mobile) and top nav bar (desktop) shared shell component used across all `(couple)` routes, matching the mockup's `.bottom-nav-bar`/`.topbar` pattern — build once as a layout, not per-page

See [`11-progress-log.md`](11-progress-log.md#frontend-arch-phase-2--public-discovery) for the full write-up once complete.

## Acceptance Criteria

- A logged-out visitor can browse home, search, and any vendor profile page with real backend data, no login required. **✅ Frontend Arch Phase 2, verified 2026-09-02** — built a complete real vendor end-to-end through the actual backend flow (register as VENDOR → build profile/category/attributes/service/package → submit → verify email → auto-advance to PENDING_APPROVAL → admin-approve), including a real image uploaded through the actual R2 presigned-upload flow and approved through real moderation. All three pages verified against this real data via headed Playwright (`e2e/phase-02-discovery.spec.ts`, 7/7 passing) — not mock data, not assumed correct.
- A logged-out visitor attempting to shortlist or enquire is redirected to login/signup, then lands back in a sensible place after authenticating. *(Frontend Arch Phase 3 — the enquiry CTA link exists and points at `/login?next=...` per Phase 2's scope, but shortlist/enquiry submission themselves are Phase 3 work, not yet built.)*
- A logged-in couple can shortlist vendors, compare a selection, submit an enquiry, see it appear in their enquiry tracker, get notified when a vendor responds (per whatever notification channel Arch Phase 14 actually delivers to the frontend — likely in-app/email, confirm), and write a review after a qualifying interaction. *(Frontend Arch Phase 3/4 — not yet built.)*
- Every list/detail page has real loading, empty, and error states — verified by actually triggering them (empty search results, a vendor with zero portfolio images, a network failure), not assumed. **✅ Frontend Arch Phase 2, verified 2026-09-02** — search's empty state triggered with a real nonsense keyword; vendor 404 triggered with a real nonexistent slug (hits the actual backend 404, not simulated); the vendor's album started genuinely empty (`media: []`) before the test upload, exercising the real empty-portfolio code path before it had real data to fall back on.

## Dependencies / Sequencing

Requires Stage 1 (Foundation) complete. Frontend Arch Phase 2 → 3 → 4 is the natural dependency order (you need a vendor profile page before an enquiry modal on it makes sense; you need shortlist before compare). No dependency on Stage 3 (Vendor Experience) or Stage 4 (Admin Platform) — this stage can proceed independently once Stage 1 is done.

## Open Questions

- [Open Question 6](10-risks-and-open-questions.md#6-vendor-facing-entitlement-ui-depends-on-backend-arch-phase-12s-minimal-scope-not-the-mockups-full-vision) is Stage 3's concern, not this stage's.
- [Open Question 7](10-risks-and-open-questions.md#7-vendor-detail-endpoint-cannot-resolve-the-vendors-logocover-image) — vendor logo/cover unresolvable; worked around via album-cover fallback. Resolved for this phase.
- [Open Question 8](10-risks-and-open-questions.md#8-search-results-carry-no-citycategory-name-rating-or-review-count) — search cards show only backend-provided fields. Resolved via scope reduction.
- [Open Question 9](10-risks-and-open-questions.md#9-no-star-rating-distribution-breakdown-available-anywhere-in-the-backend) — rating distribution bars omitted. Resolved via scope reduction.
- [Open Question 10](10-risks-and-open-questions.md#10-featured-listings-endpoint-returns-minimal-vendor-data-and-categories-have-no-icon-field) — featured vendors cross-referenced against search; category icons are a static frontend map. Resolved.
