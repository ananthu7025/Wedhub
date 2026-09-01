# Stage 5 — Monetization

## Stage Goal

Enable vendors to pay for and receive differentiated value (Pro/Premium plans, entitlements, optional featured placement) — without ever making basic vendor existence pay-gated (product.md §3.3: "Paid value, not paid existence").

## Included Architecture Phases

- **Arch Phase 11** — Subscription & Billing Foundation
- **Arch Phase 12** — Entitlement Enforcement
- **Arch Phase 13** — Featured Listings & Promotions

## Product Roadmap Cross-Reference

Maps to **Product Phase 5 — Monetization** (product.md §70: subscription plans, payments, billing, featured listings, coupons).

## Included Product Concerns

- Subscription model: FREE (₹0), PRO (₹5,999/mo starting), PREMIUM (₹12,999/mo starting), full feature lists per tier — all prices/limits admin-configurable, **never hardcoded** — product.md §26.
- Subscription principles and status enum: `TRIALING/ACTIVE/PAST_DUE/PAUSED/CANCELLED/EXPIRED` — product.md §27.
- **All 8 subscription scenario walkthroughs (product.md §28)** — treat each as an acceptance-test narrative:
  - **A — Free vendor**: registers, admin approves, on FREE, visible, no payment required.
  - **B — Upgrade**: plan → billing period → coupon → payment intent → payment flow → webhook verified → `ACTIVE` → entitlements updated → invoice stored → vendor confirmed.
  - **C — Payment succeeds but browser closes**: webhook is the source of truth, not frontend callback; subscription still activates.
  - **D — Webhook arrives twice**: idempotency key detected, second event ignored safely, no duplicate subscription/invoice.
  - **E — Payment fails**: `PAST_DUE`, notification sent, grace period configurable, entitlements removed after grace period, vendor falls back to FREE (profile does not disappear).
  - **F — Vendor cancels**: configurable immediate vs. `cancel_at_period_end` (recommended default: true).
  - **G — Downgrade**: paid visibility/analytics restricted at period end; portfolio over the free limit is **never silently deleted** — mark excess media inactive/hidden, ask vendor to reduce, preserve for a retention period.
  - **H — Refund**: original payment stays immutable; refund is a separate record; entitlement behavior depends on refund policy.
- Billing model: payment provider abstraction (Razorpay first, Stripe-ready), entities (Payment, Subscription, Subscription Plan, Invoice, Transaction, Refund, Webhook Event, Coupon); webhooks must be signature-verified, idempotent, logged, replay-safe — product.md §29.
- Featured listings: admin-configurable category/city/placement/duration/vendor/dates/price; auto-activates/deactivates on schedule; must be clearly labeled as sponsored — product.md §30.
- Future pay-per-lead (product.md §31-32) is explicitly **out of scope** for this stage — see [`09-stage-growth-and-scale.md`](09-stage-growth-and-scale.md)'s forward-looking placeholder and [Risk 5](10-risks-and-open-questions.md#5-pay-per-lead-has-no-architecture-phase).
- Entitlements-over-plan-checks principle (Coding Rule 8, [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md)) — `can("featured_listing")`, `can("advanced_analytics")`, `limit("portfolio_items")`, never `if plan === "premium"`.
- Free plan strategy: free vendors must retain search presence, profile, basic enquiries, reviews, basic portfolio, basic analytics — "do not make free vendors useless" — product.md §54.
- Revenue-stream prioritization: do not activate every revenue stream at MVP; priority order is `Free supply → traffic → enquiries → paid visibility → subscriptions → lead monetization` — product.md §55.

## Task Checklist

### Arch Phase 11 — Subscription & Billing Foundation *(MVP)*
- [ ] Subscription plans, configurable pricing, billing intervals
- [ ] Vendor subscriptions, trial support
- [ ] Razorpay integration: checkout creation, payment verification, webhook verification + idempotency
- [ ] Payment records, invoice records
- [ ] Subscription state machine: cancellation, expiry, past-due handling

### Arch Phase 12 — Entitlement Enforcement *(MVP — minimal, per `02-mvp-cut-line.md`)*
- [ ] Portfolio limits, video limits (minimum viable gating for Pro/Premium value)
- [ ] Analytics access level gating
- [ ] `EntitlementService` — e.g. `canVendorUse(vendorId, FEATURED_LISTING)`, `canVendorAccess(vendorId, ADVANCED_ANALYTICS)`, `canVendorUpload(vendorId, MEDIA)`
- [ ] Upgrade flow, downgrade flow
- [ ] *(Deferred: lead-visibility rules, priority-exposure tooling, full promotional-eligibility UI — see MVP cut line)*

### Arch Phase 13 — Featured Listings & Promotions *(Thin slice only — see `02-mvp-cut-line.md` §3)*
- [ ] Featured listing data model (vendor, placement, city, category, dates, priority, status, payment link, created-by)
- [ ] Admin CRUD for featured listing records
- [ ] *(Deferred: automatic campaign activation/expiry scheduling, vendor self-purchase flow, homepage/search-result placement logic, impression/click tracking)*

## Acceptance Criteria

- Admin can change plan pricing without a deployment; payment status comes only from verified provider webhook events, never a frontend callback; duplicate webhooks never duplicate a subscription or invoice; subscription state remains consistent after retries.
- All 8 lettered scenarios (A–H above) pass as explicit test scenarios, especially: idempotent webhook replay, grace-period fallback to FREE, media never silently deleted on downgrade, refund creates a separate immutable record.

## Dependencies / Sequencing

Strict internal order Arch Phase 11 → 12 → 13 (architecture.md §52). Depends on Stage 1 (users/roles) and Stage 2 (vendors). Explicitly **does not block Stage 4 (Lead Engine)** — restating Stage 4's constraint here for symmetry: leads must work fully on FREE.

## Open Questions

This stage carries the most open risk-log entries — resolve via `02-mvp-cut-line.md` rather than re-litigating here:

- **Arch Phase 8/12 MVP gap** ([Risk 1](10-risks-and-open-questions.md#1-arch-phase-812-mvp-gap)) — resolution already applied above (minimal Phase 12 in MVP).
- **Entitlements required even if Featured Listings is thinned** ([Risk 4](10-risks-and-open-questions.md#4-entitlements-still-required-even-if-featured-listings-is-thinneddeferred)) — Phase 12's portfolio/analytics gating is required at MVP regardless of Phase 13's scope; do not use Phase 13's deferral as a reason to skip Phase 12.
- **Featured Listings MVP contradiction** ([Risk 4b](10-risks-and-open-questions.md#4b-featured-listings-mvp-contradiction)) — product.md calls it MVP, architecture.md defers it; thin-slice resolution applied above.
- Payment provider: confirmed Razorpay-first with a Stripe-ready abstraction (product.md §29, architecture.md §64) — both docs agree, no conflict, just confirming for the record.
