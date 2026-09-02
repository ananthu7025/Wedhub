# Stage 3 — Vendor Experience (Frontend)

## Stage Goal

Build the full vendor-facing dashboard: profile/portfolio/package management, lead inbox, review responses, and subscription/monetization. This is the marketplace's supply side — product.md §3.2 ("Free supply first") makes vendor onboarding friction the single most consequential UX in the whole product.

## Included Frontend Arch Phases

- **Frontend Arch Phase 5** — Vendor Onboarding & Profile Management
- **Frontend Arch Phase 6** — Vendor Leads & Reviews
- **Frontend Arch Phase 7** — Vendor Monetization (Subscription, Analytics)

## Product Roadmap Cross-Reference

Maps to product.md §2.2 "Vendor goals" (all 13 points) and Product Phases 2 (Marketplace Supply), 4 (Lead Engine — vendor-facing half), 5 (Monetization).

## Backend Dependency

Arch Phases 5 (Vendor Module), 6 (Media & Portfolio), 9 (Enquiries & Leads), 10 (Reviews & Trust), 11 (Subscription & Billing Foundation), 12 (Entitlement Enforcement — minimal), 13 (Featured Listings — thin slice) — all ✅/⚠️ per `../docs/11-progress-log.md`. No hard backend blocker, but see [Open Question 6](10-risks-and-open-questions.md#6-vendor-facing-entitlement-ui-depends-on-backend-arch-phase-12s-minimal-scope-not-the-mockups-full-vision) before wiring entitlement-gated UI.

## Included Mockup Screens

`vendor/dashboard.html`, `vendor/profile-edit.html`, `vendor/portfolio.html`, `vendor/packages.html`, `vendor/leads.html`, `vendor/reviews.html`, `vendor/subscription.html`, `vendor/analytics.html`, `vendor/settings.html`

## Task Checklist

### Frontend Arch Phase 5 — Vendor Onboarding & Profile Management
- [ ] `(vendor)/dashboard` — port `vendor/dashboard.html`: metric cards (new leads, profile views, response rate, conversion rate — check which of these the backend actually computes before wiring all four), recent-leads table, profile-completeness checklist/progress bar (compute completeness from real profile-field presence, not a hardcoded percentage), plan upsell card
- [ ] `(vendor)/profile` — port `vendor/profile-edit.html`'s full field-group set (Identity, Classification, Location, Commercial, Trust, Contact, Operational, plus category-specific attributes rendered generically per category — same generic-rendering requirement as Stage 2's vendor profile page). Verification status/level rendered read-only (vendor cannot self-verify, per product.md §25)
- [ ] `(vendor)/portfolio` — port `vendor/portfolio.html`: media grid with reorder/delete/set-cover actions, upload dropzone wired to the real R2 upload flow (`wedhub-backend/src/modules/media/`), and a real uploading/processing state (the backend has an async media-processing queue per prior backend work — surface actual processing status, not a fake progress bar)
- [ ] `(vendor)/packages` — port `vendor/packages.html`: package list with edit/delete, add-package modal with repeatable inclusions list, wired to `wedhub-backend/src/modules/packages/` (or wherever packages actually live — confirm module name)
- [ ] Vendor self-registration route reuses Frontend Arch Phase 1's signup flow (Route A per product.md §5 "Vendor self-registration") — no separate registration screen needed here, just confirm the post-signup redirect lands on `(vendor)/profile` with a "complete your profile" nudge, matching the mockup's signup success screen CTA

### Frontend Arch Phase 6 — Vendor Leads & Reviews
- [ ] `(vendor)/leads` — port `vendor/leads.html`'s master-detail layout: filterable lead list (status pill-tabs matching the real Lead Lifecycle enum — `NEW, CONTACTED, RESPONDED, QUALIFIED, MEETING, QUOTED, WON, LOST, SPAM, CLOSED` per product.md §20, not an invented subset), detail panel with contact info, wedding date/budget/guest count, message, status-update control, notes, conversation thread, follow-up reminder
- [ ] Status transitions call the real lead status-update endpoint; only present the transitions the backend actually allows from a given state (check `wedhub-backend/src/modules/leads/` for allowed-transition logic rather than allowing every status from every status in the UI)
- [ ] `(vendor)/reviews` — port `vendor/reviews.html`: rating summary (reuse the same component built for the couple-facing vendor profile page in Stage 2 — this is the same data, do not rebuild it twice), review list, inline respond action wired to the real vendor-response endpoint
- [ ] Lead notification surfacing — check what Arch Phase 14 (Notifications) actually delivers to the frontend for "new lead"/"user replied" events (product.md §22) and reflect real unread counts on the dashboard/leads nav, not a static badge

### Frontend Arch Phase 7 — Vendor Monetization
- [ ] `(vendor)/subscription` — port `vendor/subscription.html`: three plan cards rendered from real `GET /plans` data (never hardcode FREE/PRO/PREMIUM prices client-side, per Coding Rule 8), current-plan highlighting, upgrade/downgrade actions wired to the real Razorpay checkout flow (`wedhub-backend/src/modules/subscriptions/` + `payments`/`razorpay` integration — confirm the actual checkout handoff shape, likely a client-side Razorpay Checkout.js invocation using an order ID the backend returns), invoice/payment history table from real data
- [ ] Handle the real subscription status set (`TRIALING, ACTIVE, PAST_DUE, PAUSED, CANCELLED, EXPIRED` per product.md §27) with correct badge styling for each, not just the mockup's single "ACTIVE" example
- [ ] `(vendor)/analytics` — port `vendor/analytics.html`: wire each metric card to a real backend value; for any metric the mockup shows that the backend doesn't compute (check `wedhub-backend/src/modules/` for an analytics/vendor-stats source), either omit it or mark it clearly as unavailable rather than fabricating a number — resolve per [Open Question 6](10-risks-and-open-questions.md#6-vendor-facing-entitlement-ui-depends-on-backend-arch-phase-12s-minimal-scope-not-the-mockups-full-vision)
- [ ] `(vendor)/settings` — port `vendor/settings.html`: business account info, notification preference toggles, team members list (read/display only unless the backend actually supports team-member CRUD — check before building add/remove actions), danger zone (deactivate listing)
- [ ] Entitlement-gated UI (portfolio upload limits, analytics section locks for lower plans) reflects exactly what backend Arch Phase 12's minimal entitlement checks actually enforce — read `wedhub-backend/src/modules/entitlements/` directly before building any gate, per [Open Question 6](10-risks-and-open-questions.md#6-vendor-facing-entitlement-ui-depends-on-backend-arch-phase-12s-minimal-scope-not-the-mockups-full-vision)

See [`11-progress-log.md`](11-progress-log.md#frontend-arch-phase-5--vendor-onboarding--profile-management) for the full write-up once complete.

## Acceptance Criteria

- A newly-registered vendor lands on a profile-completion flow, can fill in every field group, upload real portfolio media, and define at least one package, all persisted via real backend calls.
- A vendor sees real leads arrive (test by creating an enquiry from the couple app in Stage 2 against the same vendor) and can change lead status, with the change reflected on reload (not just optimistic client state).
- A vendor can view and respond to a real review.
- A vendor can view real plan options, initiate a real Razorpay upgrade flow against a test/sandbox key, and see their subscription status update after a successful payment (or a realistic failure path if using test failure cards).
- No plan price, feature limit, or subscription status is hardcoded anywhere in vendor-app code — verified by grep, not just by memory.

## Dependencies / Sequencing

Requires Stage 1 (Foundation) complete. Frontend Arch Phase 5 → 6 → 7 is the natural dependency order (a vendor needs a profile before leads make sense; leads before "did this convert" analytics make sense). No dependency on Stage 2 (Couple Experience) — the two stages can be built in either order or interleaved, per `00-index.md`'s recommended build order. Stage 3 does, however, benefit from Stage 2 existing for end-to-end manual testing (an enquiry needs to originate from somewhere) — sequence pragmatically if both are being worked by the same person, but there is no hard technical dependency either direction.

## Open Questions

- [Open Question 6](10-risks-and-open-questions.md#6-vendor-facing-entitlement-ui-depends-on-backend-arch-phase-12s-minimal-scope-not-the-mockups-full-vision) — entitlement UI must match backend Arch Phase 12's actual (minimal) enforcement, not the mockup's full aspirational gating. Resolve by reading source before building Frontend Arch Phase 5/7's gated UI.
