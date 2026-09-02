# Risks & Open Questions (Frontend)

> Canonical log of every frontend-specific ambiguity, and every place the approved mockup, `product.md`, or the actual shipped backend surface disagree. Mirrors the role of [`../docs/10-risks-and-open-questions.md`](../docs/10-risks-and-open-questions.md) for the backend. Stage files link back to the specific entry relevant to them — full analysis lives here, once.

**Convention:** append new entries here first, then cross-link from affected stage files. Never the reverse.

**Entry format:** Title / Source citations / Description / Impact / Recommendation / Status / Related stage file(s).

---

## 1. Frontend Arch Phase 11 partially blocked on backend Arch Phase 17

- **Citations:** `../docs/11-progress-log.md` ("Paused here, 2026-09-02" note — backend deliberately paused before Arch Phase 17 for frontend-integration signal), `00-index.md` (Frontend Arch Phase → Backend Arch Phase dependency map)
- **Description:** Frontend Arch Phase 11 bundles two independent halves: Telegram surfacing (trivial, backend Arch Phase 15 is done) and SEO page generation (category pages, city pages, structured data, sitemap — needs backend Arch Phase 17, CMS & SEO Backend, which has not started).
- **Impact:** If Frontend Arch Phase 11 is scheduled as a single unit, it will stall waiting on backend work outside this plan's control.
- **Recommendation:** Treat Frontend Arch Phase 11 as two independently schedulable sub-efforts in `07-stage-growth-and-hardening.md`: ship Telegram surfacing whenever Stage 5 is reached; hold SEO page work until backend Arch Phase 17 ships, and re-read that backend phase's actual API surface before starting (do not guess its shape now).
- **Status:** Open — blocked on backend, not a frontend decision to resolve alone.
- **Related stage files:** [07-stage-growth-and-hardening.md](07-stage-growth-and-hardening.md)

## 2. Admin Subscriptions screen has no backing list endpoint

- **Citations:** Admin mockup build note (inline in `../wedhub-frontend/admin/subscriptions.html`'s build history) — confirmed no `GET /admin/subscriptions` list endpoint exists in `wedhub-backend/src/modules/subscriptions/` (only refund/coupon POST endpoints were found)
- **Description:** The approved mockup shows an "Active Subscriptions" table (vendor, plan, status, next billing date, MRR contribution) as if it were live data. The backend module that would back this has no list/read endpoint for it today — only mutation endpoints (refunds, coupons) and the vendor's own subscription view exist.
- **Impact:** Frontend Arch Phase 10 cannot wire this table to real data as-is. Building it against invented mock data would violate the verification standard in `01-reference-cross-cutting.md`.
- **Recommendation:** Two options, to be decided at implementation time (do not decide now, before Stage 4 is reached): (a) request a small backend addition — a paginated admin subscription-list endpoint, which is a natural, in-character extension of the existing `subscriptions` module and Arch Phase 16's admin patterns; or (b) ship the screen with an explicit "not yet available" empty state and defer the live table to a follow-up. Whichever is chosen, document it honestly in that phase's `11-progress-log.md` entry — do not silently mock the table and call the phase done.
- **Status:** Open — needs a decision when Stage 4 (Frontend Arch Phase 10) is actually reached.
- **Related stage files:** [06-stage-admin-platform.md](06-stage-admin-platform.md)

## 3. Admin Leads screen has no reassignment endpoint

- **Citations:** Admin mockup build note (inline in `../wedhub-frontend/admin/leads.html`'s build history) — confirmed only a single status-patch endpoint exists in `wedhub-backend/src/modules/leads/`, no dedicated reassign-to-vendor endpoint
- **Description:** The approved mockup's admin leads table includes a "Reassign" row action. No backend endpoint performs vendor reassignment for a lead — admins can only view/filter and (via the generic status-patch endpoint) mark spam or change status.
- **Impact:** Same category of risk as Open Question 2 — a mockup affordance with no real backend behind it yet.
- **Recommendation:** Ship the view/filter/status-change UI (real, backed by the existing endpoint). Grey out or omit the "Reassign" action until/unless a backend endpoint is added — do not fake it with a client-side-only state change that reverts on reload.
- **Status:** Open — resolve when Stage 4 (Frontend Arch Phase 9) is reached.
- **Related stage files:** [06-stage-admin-platform.md](06-stage-admin-platform.md)

## 4. Session/auth strategy not yet chosen

- **Citations:** `../docs/01-reference-cross-cutting.md` ("Authentication & authorization baseline" — short-lived JWT access tokens, opaque rotating refresh tokens, reuse-detection), `01-reference-cross-cutting.md` (this folder — "API integration standard" defers the strategy choice to Frontend Arch Phase 1)
- **Description:** The backend issues a JWT access token + refresh token pair (Arch Phase 2). The frontend has two standard ways to hold these in a Next.js App Router app: httpOnly cookies set via a Next.js Route Handler (most secure, requires a thin server-side proxy for login/refresh), or client-held tokens in memory/localStorage with manual attachment to requests (simpler, weaker against XSS). Neither is decided yet.
- **Impact:** This choice affects `middleware.ts`'s auth-gating implementation, the shape of `lib/api/`, and how Server Components authenticate their own fetches — it should be decided once, early, not per-stage.
- **Recommendation:** Default recommendation: httpOnly cookies via Route Handlers, since this is a role-gated multi-app (couple/vendor/admin) product where XSS-resistant session storage matters more than client-side token flexibility.
- **Status:** ✅ Resolved (2026-09-02) — httpOnly cookies via Next.js Route Handlers. **Concrete mechanism, verified against the actual backend source** (`wedhub-backend/src/modules/auth/auth.controller.ts`): the backend already sets its own `refresh_token` httpOnly cookie (`sameSite: strict`, `path: /api/v1/auth`, 30-day TTL) and returns a short-lived (15 min) `accessToken` as a JSON field — it reads the refresh token **only** from that cookie, never from a request body. Because of `sameSite: strict`, this only works if all `/api/v1/auth/*` calls are proxied through the frontend's own origin rather than called directly from browser JS. Design: `app/api/auth/login`, `/refresh`, `/logout` Route Handlers make server-to-server calls to the backend, forward the backend's `Set-Cookie: refresh_token=...` response header straight through to the browser (so the browser ends up holding the backend's own refresh cookie, scoped to the frontend's origin), and separately set our own httpOnly `wedhub_session` cookie containing just the short-lived `accessToken` for `proxy.ts`/DAL to read on every request. `lib/api/client.ts` attaches `Authorization: Bearer <accessToken>` from that session cookie; when a call 401s, the DAL calls our `/api/auth/refresh` Route Handler (which forwards the browser's `refresh_token` cookie to the backend) and retries once.
- **Related stage files:** [03-stage-foundation.md](03-stage-foundation.md)

## 5. Styling approach not yet chosen (Tailwind vs. ported CSS variables)

- **Citations:** `01-reference-cross-cutting.md` (this folder — "Design system porting rule")
- **Description:** The approved mockup (`../wedhub-frontend/assets/css/`) uses hand-written CSS with custom properties (`tokens.css`) and utility-ish component classes (`base.css`) — no framework. The real Next.js app can either port these files near-verbatim as global CSS, or translate the same tokens into a Tailwind theme config for more ergonomic component authoring. Both preserve the exact visual contract; they differ in developer ergonomics only.
- **Impact:** Affects every component built from Frontend Arch Phase 0 onward — should be decided once, first, not revisited mid-build.
- **Recommendation:** Decide explicitly at the start of Frontend Arch Phase 0 (see `03-stage-foundation.md`) based on team preference — this doc does not prescribe one, since both are equally valid ways to honor the same design tokens.
- **Status:** ✅ Resolved (2026-09-02) — Tailwind CSS with a custom theme mapping `tokens.css`'s colors/fonts/spacing/radius/shadow scale 1:1. `components/ui/` primitives authored with Tailwind utility classes against that theme rather than hand-written CSS.
- **Related stage files:** [03-stage-foundation.md](03-stage-foundation.md)

## 6. Vendor-facing entitlement UI depends on backend Arch Phase 12's "minimal" scope, not the mockup's full vision

- **Citations:** `../docs/02-mvp-cut-line.md` (Arch Phase 12 "⚠️ Minimal — enough entitlement-check plumbing to gate portfolio limits, video limits, and analytics access"), `02-mvp-cut-line.md` (this folder)
- **Description:** The `vendor/portfolio.html`, `vendor/analytics.html`, and `vendor/subscription.html` mockups imply rich plan-based gating (e.g. upload limits changing by plan, locked analytics sections for Free-plan vendors). The actual backend Arch Phase 12 implementation is described as "minimal" — it's not yet confirmed exactly which limits it enforces versus which are mockup aspiration.
- **Impact:** Risk of building frontend gating UI for a limit the backend doesn't actually enforce yet (or the reverse — backend enforces something the mockup never depicted).
- **Recommendation:** Before wiring `vendor/portfolio.html` and `vendor/analytics.html` in Frontend Arch Phase 5/7, read `wedhub-backend/src/modules/entitlements/` directly to get the real, current list of enforced limits, and reconcile the UI to exactly that list — do not assume the mockup's implied gating is accurate.
- **Status:** Open — needs a source-code check at implementation time, not resolvable from docs alone.
- **Related stage files:** [05-stage-vendor-experience.md](05-stage-vendor-experience.md)

## 7. Vendor detail endpoint cannot resolve the vendor's logo/cover image

- **Citations:** `wedhub-backend/src/modules/vendors/vendor.repository.ts` (`VENDOR_FULL_INCLUDE` — includes `profile`, `categories`, `serviceAreas`, `services`, `packages`, `attributeValues`, `city`, but **not** `profile.logoMedia`/`profile.coverMedia`), `prisma/schema.prisma` (`VendorProfile.logoMediaId`/`coverMediaId` are bare uuids with no relation joined in the vendor-detail query), `wedhub-backend/src/modules/media/media.routes.ts` (every route requires `authenticateMiddleware` — no public "get media by id" endpoint exists at all)
- **Description:** `GET /api/v1/vendors/:slug` returns `profile.logoMediaId`/`coverMediaId` as opaque UUIDs with no accompanying object key or URL, and there is no public endpoint to resolve a media ID to a URL. This is a real, verified backend gap (confirmed via direct source read, not inferred), not a frontend oversight. By contrast, `GET /api/v1/search/vendors` **does** resolve a logo URL server-side (`logoUrl` field, pre-built via `getPublicUrl(objectKey)`) — the inconsistency is specific to the single-vendor detail endpoint.
- **Impact:** The vendor profile page (`couple/vendor-profile.html`'s cover/logo hero) cannot render the vendor's actual configured logo/cover image via the detail endpoint alone.
- **Recommendation:** `GET /api/v1/vendors/:slug/albums` (public, confirmed working) embeds full `Media` rows (`originalObjectKey`/`optimizedObjectKey`/`thumbnailObjectKey`, resolvable via the same `getPublicUrl(key) = ${R2_PUBLIC_BASE_URL}/${key}` join pattern used server-side) for each album's photos. Frontend Arch Phase 2's vendor-profile page falls back to the vendor's first public album's cover/first photo for hero imagery when `logoMediaId`/`coverMediaId` can't be resolved, rather than blocking on a backend fix. This is a pragmatic UI fallback, not a silent workaround — documented here and in that phase's progress-log entry. A proper fix (adding the `logoMedia`/`coverMedia` include to `VENDOR_FULL_INCLUDE`, or a public single-media-lookup endpoint) belongs to a future backend pass, not this frontend phase.
- **Status:** ✅ Fully resolved (2026-09-02, during Frontend Arch Phase 5) — `VENDOR_FULL_INCLUDE` now joins `profile.logoMedia`/`profile.coverMedia`, and `PUT /vendors/me/profile` now accepts `logoMediaId`/`coverMediaId` (validated server-side against the vendor's own READY media). A vendor can now genuinely set a logo/cover via the Frontend Arch Phase 5 portfolio manager, and `GET /vendors/:slug` can resolve it. The album-cover fallback built during Frontend Arch Phase 2 is left in place as-is (not revisited in this pass) — it's still the correct fallback for a vendor who hasn't set a logo/cover yet, and continues to work unchanged.
- **Related stage files:** [04-stage-couple-experience.md](04-stage-couple-experience.md), [05-stage-vendor-experience.md](05-stage-vendor-experience.md)

## 8. Search results carry no city/category name, rating, or review count

- **Citations:** `wedhub-backend/src/modules/search/search.service.ts` (`toPublicVendorSummary()` — returns only `id, businessName, slug, verificationLevel, shortDescription, startingPrice, currency, logoUrl`), `search.repository.ts` (raw SQL joins only `vendors`, `vendor_profiles`, and the logo `media` row — no `Category`, `Location`, or `Review` join at all)
- **Description:** Search result rows have no denormalized city/category display name, and no rating/review count, even though the vendor's `Vendor.averageRating`/`reviewCount` are real, already-computed fields (just not selected into the search projection).
- **Impact:** The search results list (`couple/search.html`) mockup shows rating and location text on every card — this cannot be rendered from `/search/vendors` alone.
- **Recommendation:** Since a search is normally scoped to a single `cityId`/`categoryId` filter the user already chose, the frontend can resolve that one city/category name client-side (one extra `GET /locations`/`GET /categories` call per search, not per result row) rather than needing it per-row. Rating/review count genuinely cannot be shown on search cards without either a backend change to the search projection or an extra per-row detail fetch (rejected as impractical for a paginated list — N+1 calls per page). Frontend Arch Phase 2's search page omits the star-rating and city-name-per-row from result cards, showing only what `/search/vendors` actually returns, rather than fabricating a rating or making N+1 calls. This is a scoped, deliberate simplification, not a bug.
- **Status:** ✅ Resolved via scope reduction (2026-09-02) — search cards render only backend-provided fields; the mockup's per-card rating/location display is not carried into the real implementation for search results (it remains correct and buildable on the vendor detail page itself, where `averageRating`/`reviewCount` ARE present).
- **Related stage files:** [04-stage-couple-experience.md](04-stage-couple-experience.md)

## 9. No star-rating distribution breakdown available anywhere in the backend

- **Citations:** `wedhub-backend/src/modules/reviews/review.repository.ts` (`recalculateVendorRating` only ever computes `_avg`/`_count` via `prisma.review.aggregate`, never a `groupBy` on `rating`)
- **Description:** The vendor profile mockup (`couple/vendor-profile.html`'s `.rating-bar-row` elements, one per star value 1–5) shows a distribution bar chart. No backend endpoint computes this, and computing it client-side would require fetching every review for a vendor (expensive, and paginated review lists don't guarantee completeness at reasonable page sizes).
- **Impact:** The rating-summary section's distribution bars cannot be built as designed.
- **Recommendation:** Render only the average rating (large number) and total review count on the vendor profile page — both are real, already on the vendor-detail response (`averageRating`, `reviewCount`) — and omit the per-star distribution bars entirely rather than fabricating them. Revisit if/when the backend adds a `groupBy` aggregate.
- **Status:** ✅ Resolved via scope reduction (2026-09-02) — distribution bars omitted from the real implementation.
- **Related stage files:** [04-stage-couple-experience.md](04-stage-couple-experience.md)

## 10. Featured-listings endpoint returns minimal vendor data, and categories have no icon field

- **Citations:** `wedhub-backend/src/modules/featured-listings/featured-listing.repository.ts` (`VENDOR_SUMMARY_INCLUDE` selects only `{id, businessName, slug}` on the joined vendor), `prisma/schema.prisma`'s `Category` model (no `iconUrl`/`imageObjectKey` field exists at all)
- **Description:** `GET /api/v1/featured-listings?placementType=HOMEPAGE` identifies which vendors are featured but not enough to render a card (no logo/price). Separately, the category browse strip on the home page mockup shows a photo per category — no such field exists on `Category`.
- **Impact:** Both the "Featured vendors" and "Browse by category" sections of the home page mockup need adaptation to what's actually queryable.
- **Recommendation:** For featured vendors: cross-reference each featured listing's `vendorId`/`slug` against `GET /search/vendors` (filtered or scanned) to get the logo/price — practical since the home page shows a small, fixed number of featured cards (not a paginated list), so a handful of extra lookups is reasonable, unlike the search-results N+1 problem in Open Question 8. For category icons: use a small static frontend-side image map keyed by category slug (matching the unsplash placeholder pattern already used in the approved mockup) rather than blocking on a backend schema change — this is presentation-only data with no business meaning, appropriate to keep frontend-side.
- **Status:** ✅ Resolved via the above approach (2026-09-02).
- **Related stage files:** [04-stage-couple-experience.md](04-stage-couple-experience.md)

## 11. No "list my enquiries" endpoint exists for the couple side

- **Citations:** `wedhub-backend/src/modules/enquiries/enquiry.routes.ts` — only `POST /single-vendor` and `POST /multi-vendor` are registered, both under `optionalAuthenticateMiddleware`. No `GET` route exists anywhere in the `enquiries` module. Confirmed by reading the entire module directory, not just the routes file.
- **Description:** `Enquiry` itself has no status field (by design — see the module's own schema comment) and no couple-scoped read endpoint. The only queryable read surface for what happens after an enquiry is submitted is `wedhub-backend/src/modules/leads/` (`GET /leads`), which is strictly **vendor**-scoped (`getOwnedVendorOrThrow(userId)` — resolves the caller's own vendor profile, not applicable to an END_USER with no vendor). A couple has no backend-exposed way to list the enquiries/leads they've sent.
- **Impact:** Frontend Arch Phase 4's planned `(couple)/enquiries` page (porting `couple/leads.html`'s status-tracker view) cannot be built against real data as currently scoped — there is nothing for it to call.
- **Recommendation:** Request a small, in-character backend addition — a couple-scoped `GET /enquiries/mine` that joins `Enquiry` + the caller's own `Lead` rows via `userId`, since `Enquiry.userId` is already captured at creation time for authenticated submitters.
- **Status:** ✅ Resolved 2026-09-02 — `GET /enquiries/mine` added (see `../docs/11-progress-log.md`'s 2026-09-02 addendum), joining each `Enquiry` to its fanned-out `Lead[]` with vendor summaries, paginated. Verified live end-to-end and wired into `(couple)/enquiries`.
- **Related stage files:** [04-stage-couple-experience.md](04-stage-couple-experience.md)

## 12. No notification ever tells a couple a vendor responded to their enquiry

- **Citations:** Exhaustive search of every `notificationService.notify(...)` call site in `wedhub-backend/src` (9 total, across `auth.service.ts`, `enquiry.service.ts`, `vendor-admin.service.ts`, `review.service.ts`, `webhook.service.ts`) — every single one targets either the registering user (`VERIFICATION`/`PASSWORD_RESET`) or `vendor.ownerUserId` (`NEW_LEAD`, `VENDOR_APPROVED`, `VENDOR_REJECTED`, `REVIEW_RECEIVED`, `SUBSCRIPTION_ACTIVATED`, `PAYMENT_FAILED`). None target an END_USER couple about vendor-side activity. `wedhub-backend/src/modules/leads/` (where `PATCH /leads/:id/status` lives — the only place a lead's status, including a vendor "responding," actually changes) has zero `notify()` calls at all.
- **Description:** The approved mockup (`couple/notifications.html`) shows "Frame & Co. Photography responded" and "Booking confirmed... marked as Won" as real notification examples. Neither has a backing event anywhere in the backend — a vendor can change a lead's status through every stage (CONTACTED → RESPONDED → ... → WON) and the couple who sent that enquiry is never notified, in-app or otherwise. `NotificationEventType` doesn't even have an enum value that would fit (`USER_REPLIED` and `NEW_MESSAGE` exist but are unused by any call site found).
- **Impact:** Frontend Arch Phase 4's notifications page is fully real and correctly built against `GET /notifications/me` — it is not broken. But a couple's actual, most-anticipated real-world event (a vendor replying to their enquiry) will never appear there today, no matter how long they wait. This is a product gap, not a frontend gap.
- **Recommendation:** Do not decide now; this is backend-scope work, out of place mid-Frontend-Arch-Phase-4 the way Open Question 11's endpoint addition wasn't (that was a small, mechanical read-endpoint; this is new lead-status-change notification logic touching `leads` module business logic). Revisit when backend work resumes (post Arch Phase 17) or if explicitly prioritized sooner: likely a `notify()` call added to `lead.service.ts`'s `updateStatus` (or wherever `PATCH /leads/:id/status` lands), targeting `enquiry.userId` when present, gated to meaningful transitions (e.g. into `CONTACTED`/`RESPONDED`/`WON`, not every micro-transition).
- **Status:** Open — not blocking, since the notifications page itself works correctly for whatever real events do exist; flagged so it isn't mistaken for a frontend bug later.
- **Related stage files:** [04-stage-couple-experience.md](04-stage-couple-experience.md)

## 13. Vendor dashboard metrics: mockup shows 3 numbers the backend never computes

- **Citations:** `wedhub-backend/src/modules/entitlements/vendor-analytics.service.ts` / `vendor-analytics.repository.ts` (`getVendorAnalytics(vendorId)`, the real function behind `GET /vendors/me/analytics`) — read in full during Frontend Arch Phase 5 research
- **Description:** `vendor/dashboard.html`'s mockup shows four metric cards: "New leads this week", "Profile views", "Response rate", and "Conversion rate", each with a week-over-week trend arrow. Only "Profile views" (real `AnalyticsEvent` count of `vendor_profile_viewed`) and a total lead count (real `Lead.count()` in a 30/90-day window, not scoped to "this week" and with no trend comparison) are backed by real computed data. "Response rate" (nothing anywhere touches vendor reply timing) and "Conversion rate" (no lead→booking funnel is computed by this service) have zero backing data anywhere in the backend — confirmed by reading every exported function in the analytics service/repository, not inferred from the endpoint's response shape alone.
- **Impact:** Frontend Arch Phase 5's dashboard cannot show all four mockup metric cards against real data. Showing them anyway (even as "0%" or "—") would misrepresent unmeasured metrics as measured-but-zero, which is worse than omitting them.
- **Recommendation:** Ship the dashboard with the 3 real numbers the backend actually computes (profile views, leads, approved reviews — all within the analytics service's real time window), correctly labeled with that window, and omit response rate/conversion rate entirely rather than fabricating them. Revisit only if a future backend phase adds real response-time tracking (would need to instrument `Lead.contactedAt`/`respondedAt`, both of which already exist as columns but aren't populated by any code path found) or a booking-conversion funnel.
- **Status:** ✅ Resolved via scope reduction (2026-09-02) — Frontend Arch Phase 5's dashboard shows only the 3 real metrics. Frontend Arch Phase 6 confirmed a related-but-separate endpoint, `GET /leads/analytics`, does compute a real `responseRate`/`conversionRate` — scoped to the leads module, not the dashboard — but it wasn't wired into any Phase 6 screen; noted here for a future phase that might want a leads-specific analytics card.
- **Related stage files:** [05-stage-vendor-experience.md](05-stage-vendor-experience.md)

## 14. Dev-only rate-limit overrides added for Playwright friction

- **Citations:** `wedhub-backend/src/common/middleware/rate-limit.middleware.ts`, `wedhub-backend/.env` (dev-only, not committed to a template/example file)
- **Description:** The backend's real, production-intended rate limiters (`loginRateLimiter` 10/15min, `registerRateLimiter` 20/hour, `enquiryRateLimiter` 10/15min, `reviewRateLimiter` 5/hour — all in-memory via `express-rate-limit`, documented since Frontend Arch Phase 1's spec header comments) repeatedly tripped during headed Playwright debugging and manual curl-based verification across multiple phases (Phase 1, Phase 5, and again during Phase 6's full-suite regression run, where the *registration* limiter tripped on a 31-test run even after the login limiter was raised — full specs run back-to-back register far more accounts per hour than any real user would). The previously "documented, not fixed" workaround was to wait out the window or restart the backend process to clear in-memory state — real friction that cost real time repeatedly.
- **Impact:** Without a fix, this recurs every time the full Playwright suite (or heavy manual curl verification) is run back-to-back, and gets worse as more phases (and more specs) are added.
- **Recommendation:** Made all four limiters' `max` values read from an optional env var (`LOGIN_RATE_LIMIT_MAX`, `REGISTER_RATE_LIMIT_MAX`, `ENQUIRY_RATE_LIMIT_MAX`, `REVIEW_RATE_LIMIT_MAX`), falling back to the original production constants when unset — so production behavior is provably unchanged (no env var set outside a developer's local `.env`), while local dev/CI can raise them freely. `windowMs` was deliberately left untouched (only `max` is overridable) since the window duration itself was never the problem.
- **Status:** ✅ Resolved (2026-09-02, during Frontend Arch Phase 6) — dev `.env` sets all four to 1000. Full Playwright suite (31 tests across Phases 1–6) passes cleanly with these overrides in place.
- **Related stage files:** [05-stage-vendor-experience.md](05-stage-vendor-experience.md), [03-stage-foundation.md](03-stage-foundation.md)
