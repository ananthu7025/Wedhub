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

### Frontend Arch Phase 2 — Public Discovery
- [ ] `(public)/` home route — port `couple/home.html`: hero search bar, category browse strip, featured vendors grid, Telegram promo banner. Featured vendors and category list are real backend data (`GET /categories`, whatever powers "featured" — check `wedhub-backend/src/modules/featured-listings/` and `search`)
- [ ] `(public)/search` — port `couple/search.html`: filter sidebar (category, location, budget range, category-specific attributes, verified/rating filters), search bar, sort dropdown, result list, pagination. Wire to `GET /search` (check `wedhub-backend/src/modules/search/search.schema.ts` for the real query param shape before assuming the mockup's filter set maps 1:1)
- [ ] `(public)/vendors/[slug]` — port `couple/vendor-profile.html`: cover/logo, identity, about, category-specific attributes, portfolio grid, packages, reviews with rating summary, sticky enquiry CTA card. Wire to `GET /vendors/:slug` (or however the real route is shaped — check `wedhub-backend/src/modules/vendors/vendors.routes.ts`)
- [ ] Category-specific attribute rendering must be generic, not hardcoded to Photographer fields the way the mockup's single worked example is — check how `wedhub-backend/src/modules/categories/` models category attributes (structured relational vs. JSONB per `../docs/01-reference-cross-cutting.md`) and render whatever attributes come back for the vendor's actual category
- [ ] SEO metadata basics per page (`generateMetadata` — title, description) even though full structured-data SEO is Frontend Arch Phase 11
- [ ] Loading/empty/error states for search with zero results, a vendor slug that doesn't exist (404), and network failure

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

- A logged-out visitor can browse home, search, and any vendor profile page with real backend data, no login required.
- A logged-out visitor attempting to shortlist or enquire is redirected to login/signup, then lands back in a sensible place after authenticating.
- A logged-in couple can shortlist vendors, compare a selection, submit an enquiry, see it appear in their enquiry tracker, get notified when a vendor responds (per whatever notification channel Arch Phase 14 actually delivers to the frontend — likely in-app/email, confirm), and write a review after a qualifying interaction.
- Every list/detail page has real loading, empty, and error states — verified by actually triggering them (empty search results, a vendor with zero portfolio images, a network failure), not assumed.

## Dependencies / Sequencing

Requires Stage 1 (Foundation) complete. Frontend Arch Phase 2 → 3 → 4 is the natural dependency order (you need a vendor profile page before an enquiry modal on it makes sense; you need shortlist before compare). No dependency on Stage 3 (Vendor Experience) or Stage 4 (Admin Platform) — this stage can proceed independently once Stage 1 is done.

## Open Questions

- [Open Question 6](10-risks-and-open-questions.md#6-vendor-facing-entitlement-ui-depends-on-backend-arch-phase-12s-minimal-scope-not-the-mockups-full-vision) is Stage 3's concern, not this stage's — no open questions specific to Stage 2 beyond the general ones already tracked in Stage 1.
