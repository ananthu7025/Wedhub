# WedHub — À La Carte Vendor Features (Planning Draft)

**Document:** Planning Draft — not yet approved
**Date:** 2026-09-19
**Status:** Proposal for review, references product.md §26–28 and §53–54
**Revision:** Consolidated from 3 packages (FREE/PRO/PREMIUM) to 2
(FREE/PREMIUM) per 2026-09-19 decision — see §0.
**Author context:** Written after a subscription-entitlement audit found the current
plan model has real per-feature flags (`featured_eligibility`,
`promotional_placement`, `response_tools`, `priority_support`) but only two of
the eight declared entitlement keys are actually enforced in code
(`portfolio_limit`/`video_limit` and `analytics_level`). See "Relationship to
the existing plan model" below for what changes and what doesn't.

---

## 0. Package consolidation: FREE + PREMIUM only (PRO removed)

### 0a. Full-codebase feature audit (not just entitlement.constants.ts)

The previous revision of this document based the FREE/PREMIUM split only on
the 8 keys declared in `entitlement.constants.ts` and `product.md`. That
undercounts what a vendor can actually do — this codebase has substantial
vendor-facing functionality that predates or sits entirely outside the
entitlement system and was never wired into it. Walked every backend module
under `wedhub-backend/src/modules/` and every page under
`wedhub-frontend-app/app/(vendor)/vendor/` to build this table from what the
code does, not from what the docs say it should do:

| Capability | Backend module(s) | Gated by a plan today? | What it actually does |
|---|---|---|---|
| Vendor profile, categories, location listing | `vendors` | No | Baseline listing — every vendor gets this by definition of being on the marketplace. |
| Portfolio media (photos/videos) | `media`, `albums` | **Yes** — `portfolio_limit`/`video_limit` via `canVendorUpload` | The one cleanly-enforced resource cap in the whole system. |
| Packages & pricing | `packages` (frontend `PackagesManager`) | **No** | Vendors can create unlimited priced packages today regardless of tier. |
| Leads & enquiries | `leads`, `enquiries` | **No** (flag exists, `lead_access` is `true` on every seeded plan) | Full lead inbox, status pipeline, notes — same for every vendor. |
| Direct messaging (vendor ↔ couple chat) | `messaging` | No | Real-time-ish conversation thread, unlimited, no plan check anywhere in `messaging.service.ts`. |
| Analytics | `analytics`, `entitlements/vendor-analytics.service.ts` | **Yes** — the other cleanly-enforced gate | 30-day/basic vs 90-day+daily-breakdown/advanced. |
| Reviews | `reviews`, `review-media` | No | Unlimited, unrestricted for every vendor. |
| Vendor Store (branded mini-store, WhatsApp ordering) | `vendor-store` | **No** (gated by *category*, not plan — `checkVendorStoreEligibility` checks `Category.hasStoreEnabled`, unrelated to subscription tier) | A vendor in an eligible category gets a full storefront — products, orders, WhatsApp checkout — on FREE, for free. |
| Invoicing & billing (GST invoices, payment tracking) | `vendor-invoices`, `vendor-payments` | **No** | Full invoice creation/editing/PDF, payment recording — zero plan check. |
| Real Wedding Stories submission | `wedding-stories` (frontend `vendor/stories`) | No | Vendors can submit real client weddings for homepage/`/real-weddings` features, unrestricted. |
| Featured placement | `featured-listings` | **No enforcement bug** — `featured_eligibility` is seeded `false`/`true` per tier but `createFeaturedListing` never checks it; admin-only endpoint today anyway | Currently only reachable by an admin manually creating a row — no vendor self-service purchase path exists at all yet (this is exactly what §2–§6 of this plan proposes building). |
| Promotional placement | — | **No feature exists** | `promotional_placement` is a flag with zero consumer anywhere in the codebase. Nothing to gate. |
| Response tools | — | **No feature exists** | Confirmed again this pass — no canned-reply/quick-response module anywhere. |
| Priority support | — | **No feature exists** | No support/ticketing module exists in this codebase at all. |
| Vendor claim (invited vendor onboarding) | `vendor-claim` | No | Account setup, not a paid feature. |
| Studio dashboard/clients/projects | `studio-clients`, `studio-projects`, `studio-dashboard` (backend) + `vendor/studio/*` (frontend) | N/A | **Dead scaffolding** — empty directories on both backend and frontend. Not a shippable feature today, exclude from any plan entirely. |
| Comparison, matching | `comparison`, `matching` | N/A | Couple-facing, not vendor-facing — irrelevant to vendor plans. |

**The real finding:** portfolio/video limits and analytics depth are the
*only* two things actually differentiated by plan anywhere in this codebase
today. Packages, leads, messaging, the entire vendor store, and the entire
invoicing system are full-featured and free for every vendor regardless of
tier — not because FREE is unusually generous by design, but because those
modules were built without ever being wired into the entitlement system.
That's a genuine product decision waiting to be made (see §0b), not
something the previous draft accounted for.

### 0b. What this means for a 2-package split

### Recommended split

The classification below is a real recommendation, not a menu — reasoned
from one principle: **features that get a vendor discovered and get them
leads stay free, because more active listings is what makes the marketplace
worth using at all. Features that only matter after a lead already exists —
monetizing it, running back-office work around it, or consuming platform
resources with no revenue-sharing mechanism of its own — are reasonable to
put behind PREMIUM.** Two supporting facts from the code decided the
borderline cases:

- The Vendor Store has **no commission/platform-fee mechanism** anywhere in
  `vendor-store.service.ts` or `admin-store-payments` — the platform earns
  nothing from store sales today. That makes subscription revenue the only
  way this feature pays for itself, which is a real argument for gating it.
- Invoicing's `leadId` field is optional (`vendor-invoice.schema.ts`) — it
  works as a standalone billing tool, not something wired into the
  lead-conversion funnel itself. Gating it doesn't block discovery or lead
  flow at all, only a downstream business-admin convenience.

### FREE (₹0/month) — get listed, get found, get leads

| Feature | Entitlement key | Value |
|---|---|---|
| Vendor profile, portfolio, categories, location listing | — (not entitlement-gated) | baseline marketplace presence — this is the supply the whole marketplace depends on, must stay free |
| Portfolio images | `portfolio_limit` | 10 (current seeded default) |
| Videos | `video_limit` | 1 (current seeded default) |
| Packages & pricing | — (not entitlement-gated) | unlimited — a vendor needs to show pricing to get enquiries at all; gating this would suppress the exact activity FREE exists to encourage |
| Enquiries & leads | `lead_access` | full access — gating this would defeat the point of a lead-gen marketplace for its largest tier |
| Direct messaging with couples | — (not entitlement-gated) | unlimited — this is how a lead actually becomes a booking; gating it would tax the platform's core value loop, not a premium extra |
| Reviews | — | unchanged — reviews build trust for every vendor, gating them would hurt the marketplace's credibility, not just one vendor |
| Real Wedding Stories submission | — (not entitlement-gated) | unrestricted — this is marketing content that benefits the whole platform (homepage/`/real-weddings`), not just the submitting vendor |
| Basic analytics | `analytics_level: "basic"` | 30-day window, no daily breakdown — enforced today in `vendor-analytics.service.ts` |
| Basic notifications | — | unchanged |

### PREMIUM (single paid tier — price to be set)

| Feature | Entitlement key | Value | Reasoning |
|---|---|---|---|
| Everything in the lead-generation loop above | — | unchanged — PREMIUM never removes discovery/lead capability, only adds on top | keeps the funnel intact for every vendor regardless of tier |
| Portfolio images | `portfolio_limit` | 500 (current PREMIUM default) | resource cap, existing gate |
| Videos | `video_limit` | 50 (current PREMIUM default) | resource cap, existing gate |
| Advanced analytics | `analytics_level: "advanced"` | 90-day window + daily breakdown chart | existing gate, was PRO-only, folds up into PREMIUM |
| Featured placement | `featured_eligibility` | homepage / category / city / search placement | existing flag, needs the `createFeaturedListing` check + self-service checkout built (§7, §9 step 1) to actually mean something |
| **Vendor Store** (branded storefront + WhatsApp ordering) | *new — needs `canVendorUse` call site added* | full store, gated by category eligibility AND plan | recommended new gate — no commission mechanism exists, so subscription is its only monetization path |
| **Invoicing & billing** (GST invoices, payment tracking) | *new — needs `canVendorUse` call site added* | full invoicing suite | recommended new gate — post-conversion business tool, doesn't affect discovery or lead flow when gated |

This makes PREMIUM's value proposition concrete: **higher content limits,
deeper analytics, genuine featured-placement eligibility, a monetizable
storefront, and a real billing/invoicing back office** — a materially
thicker offer than Option A's "just bigger numbers and a longer chart,"
without touching anything in the lead-generation funnel that makes FREE
vendors want to stay on the marketplace at all.

**This does take the Vendor Store and invoicing away from FREE vendors
currently using them** (confirmed both are fully working and unrestricted
today) — that's a real, visible downgrade for whoever's already using them,
not a hypothetical. Confirmed **zero** `VendorStore` and **zero**
`VendorInvoice` rows in the local dev database as of this writing — same
caveat as the PRO-subscriber check: staging/production wasn't checked and
should be before this ships. If either count is non-zero there, this needs
a grandfather plan (keep existing users on what they have, gate only for new
signups going forward) rather than an overnight cutoff.

Net effect: a vendor who previously would have picked PRO for "better
analytics and response tools without paying for featured placement" no
longer has that middle option — they either stay FREE or go to the one paid
tier that now includes everything. This is a real pricing/positioning
decision, not just a schema simplification, so it's worth being explicit
about who it affects: today's PRO subscribers (if any exist) would need to
either upgrade to PREMIUM pricing or be grandfathered — see the migration
note at the end of this section.

### What to actually charge for PREMIUM

The old PRO price was ₹5,999/month and old PREMIUM was ₹12,999/month. With
PRO's features folded in, PREMIUM absorbing all of it at the old PREMIUM
price is the simplest option, but you may want to reconsider the number now
that one tier has to justify both audiences (vendors who only wanted better
analytics, and vendors who wanted full promotional placement). That's a
pricing call for you to make, not something to infer from the code — flagged
as an open question in §10.

### Migration note (only matters if PRO has real subscribers today)

Check `Subscription` rows where `plan.tier = 'PRO'` before removing the tier.
If any exist:
- Either grandfather them at their current PRO price with PREMIUM's full
  feature set until they naturally renew/cancel, or
- Migrate them to PREMIUM pricing with advance notice (standard SaaS
  practice — don't silently reprice an active subscription).

If none exist yet (likely, given this is still early — confirmed **zero**
PRO subscriptions of any status in the local dev database as of this
writing; staging/production wasn't checked and should be before removing the
tier), simply stop seeding PRO plan rows and mark any existing ones
`isActive: false` rather than deleting them (preserves
`Subscription.planId`'s foreign key integrity for historical/audit records).

### Schema impact

`PlanTier` enum (`prisma/schema.prisma`) goes from `FREE | PRO | PREMIUM` to
`FREE | PREMIUM`. Confirmed low-blast-radius: every backend/frontend
reference to `"PRO"` found in a grep goes through the generic `PlanTier`
type or admin plan-management UI (dropdown options, form validation) — there
is no hardcoded business-logic branch on the string `"PRO"` anywhere in the
codebase today (Coding Rule 8 — no raw tier checks — is already being
followed). Removing the enum value means:
- `wedhub-backend/prisma/schema.prisma`: drop `PRO` from `PlanTier`, migrate.
- `wedhub-backend/prisma/seed.ts`: remove the two PRO `SUBSCRIPTION_PLANS`
  entries (monthly + yearly).
- `wedhub-frontend-app/app/(admin)/admin/subscriptions/PlanFormModal.tsx`:
  remove "PRO" from the tier dropdown.
- `wedhub-frontend-app/lib/api/admin.types.ts` and
  `wedhub-frontend-app/lib/api/subscriptions.types.ts`: narrow the
  `PlanTier`-equivalent union type.

---

## 1. Goal

Today a vendor buys the one whole package (FREE or PREMIUM, per §0) to get
any of that package's features. This plan adds a second purchase path: a
vendor can instead buy **one specific feature** on its own — e.g. just
"Featured Placement" for a month, without upgrading to PREMIUM — while the
PREMIUM package remains the cheaper way to get multiple features together.

This is additive. Nothing about how FREE/PREMIUM already work needs to
change for this to ship; à la carte is a second, independent way to unlock the
same entitlement flags the package system already reads.

---

## 2. What counts as "a feature" here

Only features that are genuinely standalone and time-boxed are candidates —
not anything that's really a resource limit tied to how much content a vendor
has stored.

### Good à la carte candidates (event-like, one purchase = one outcome)

| Feature | Entitlement key it maps to | Why it works standalone |
|---|---|---|
| Featured Placement (homepage / category / city / search) | `featured_eligibility` | Already modeled as its own row (`FeaturedListing`) with its own `startDate`/`endDate`/`price` — closest thing to an existing precedent for this whole plan. Needs two things built first: the missing `canVendorUse` check in `createFeaturedListing` (§7) and a vendor-facing self-service checkout (today it's admin-only). |

### Poor à la carte candidates (do NOT sell these individually)

| Feature | Why it's a bad standalone SKU |
|---|---|
| Portfolio / video limit increase | This is a resource cap, not an event. Selling "10 more portfolio slots forever" needs its own top-up/expiry model (does it ever expire? stack with plan changes? survive a downgrade?) — real complexity for something PREMIUM already solves by raising the whole limit. Recommend leaving this PREMIUM-only unless there's clear demand. |
| Advanced Analytics (`analytics_level`) | Genuinely useless without also having Lead Access and enough traffic to analyze — selling it alone to a FREE vendor gives them a dashboard with nothing meaningful to show. Bundle-only. |
| Promotional Placement | Confirmed in §0a's full-codebase audit: `promotional_placement` has zero consumer anywhere in the code — no campaign/promo-slot feature exists at all, unlike Featured Placement which at least has a real `FeaturedListing` model behind it. There is nothing to sell. |
| Response Tools | No such feature exists in the codebase yet (confirmed again in §0a) — nothing to sell until it's built. Exclude from v1 of this plan entirely. |
| Priority Support | No support/ticketing system exists in this codebase at all (confirmed in §0a). Selling this today would charge for something with zero observable effect. |

**Recommendation:** ship à la carte for **Featured Placement only** in v1 —
it's the one candidate with a real model already behind it. Everything else
in this section needs its underlying feature built before it's honest to
sell it as an add-on, à la carte or otherwise.

---

## 3. Two ways to buy, one entitlement model underneath

A vendor's *effective* access to a feature becomes:

```
has_feature(vendorId, featureKey) =
    plan_grants(vendorId, featureKey)          // via active Subscription → SubscriptionPlan.features
    OR active_addon_grants(vendorId, featureKey)  // via one or more active VendorFeatureAddon rows
```

This must be evaluated in exactly one place —
`entitlement.service.ts`'s existing `getEffectivePlan()` — never re-derived at
each call site. That's already the project's stated rule (Coding Rule 8:
never a raw tier/plan check outside the entitlement service) and it applies
identically to add-ons.

### Packages (FREE / PREMIUM per §0, monthly or yearly)

- Two tiers after consolidation: FREE and PREMIUM.
- One active `Subscription` per vendor (current schema: `Subscription.planId`
  is a single foreign key — this stays true).
- Cheaper per-feature than buying the same features individually — the
  packaging *is* the discount. No new schema needed here.

### À la carte (new)

- A vendor with **any** plan (including FREE) can buy one feature for a fixed
  duration (e.g. 7/30/90 days).
- Multiple add-ons can be active at once, and they stack with whatever the
  vendor's plan already grants (buying an add-on for something your plan
  already includes should be blocked at checkout — see §6 edge cases).
- Each add-on purchase is its own payment, its own row, its own expiry —
  independent of the vendor's subscription billing cycle.

---

## 4. Data model changes

Two new tables, following the exact patterns `Subscription`/`SubscriptionPlan`
and `FeaturedListing`/`Payment` already use in `wedhub-backend/prisma/schema.prisma`.

### 4a. `FeatureAddonSku` (admin-managed catalog, mirrors `SubscriptionPlan`)

```prisma
model FeatureAddonSku {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key           String   @unique // matches an EntitlementKey, e.g. "featured_eligibility"
  name          String   // "Featured Placement — 30 Days"
  description   String?
  price         Decimal  @db.Decimal(10, 2)
  currency      String   @default("INR")
  durationDays  Int      @map("duration_days")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  purchases VendorFeatureAddon[]

  @@map("feature_addon_skus")
}
```

Admin-configurable price/duration per SKU, same principle product.md §26
already states for plans ("All prices and feature limits must be
admin-configurable. Never hardcode plan prices.") — that rule extends here
unchanged.

### 4b. `VendorFeatureAddon` (a vendor's purchased, time-boxed grant)

```prisma
model VendorFeatureAddon {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  vendorId     String    @map("vendor_id") @db.Uuid
  skuId        String    @map("sku_id") @db.Uuid
  status       AddonStatus @default(PENDING)
  startDate    DateTime? @map("start_date") // set once payment is captured
  endDate      DateTime? @map("end_date")   // startDate + sku.durationDays, computed at activation
  paymentId    String?   @unique @map("payment_id") @db.Uuid
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  vendor  Vendor          @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  sku     FeatureAddonSku @relation(fields: [skuId], references: [id], onDelete: Restrict)
  payment Payment?        @relation(fields: [paymentId], references: [id], onDelete: SetNull)

  @@index([vendorId, status])
  @@index([status, endDate])
  @@map("vendor_feature_addons")
}

enum AddonStatus {
  PENDING   // payment order created, not yet captured
  ACTIVE    // captured, within startDate..endDate
  EXPIRED   // endDate has passed
  CANCELLED // admin/vendor cancelled before expiry (rare — see §6)
}
```

### 4c. `PaymentPurpose` gets a new value

```prisma
enum PaymentPurpose {
  SUBSCRIPTION
  WEDDING_WEBSITE
  FEATURE_ADDON   // new
}
```

`Payment.pendingVendorId`/`pendingPlanId` already exist for the
subscription-checkout pending-payment pattern (see schema comment: "a Payment
can exist BEFORE any Subscription does"). The add-on flow needs the same
shape — a `pendingSkuId` column (or a generic `pendingFeatureAddonSkuId`) so
the Razorpay order can be created before the `VendorFeatureAddon` row exists,
exactly mirroring how subscription checkout already works.

---

## 5. Entitlement resolution changes

`entitlement.service.ts`'s `getEffectivePlan()` today returns one
`{ limits, features, tier }` derived purely from the vendor's `Subscription`.
It needs to become the union of plan-granted features and add-on-granted
features:

```ts
// Conceptual — not final code
export async function getEffectivePlan(vendorId: string): Promise<EffectivePlan> {
  const planPart = /* existing logic, unchanged */;
  const activeAddons = await entitlementRepository.listActiveAddons(vendorId); // status=ACTIVE, endDate > now
  const addonFeatureKeys = new Set(activeAddons.map(a => a.sku.key));

  return {
    ...planPart,
    features: {
      ...planPart.features,
      featured_eligibility: planPart.features.featured_eligibility || addonFeatureKeys.has("featured_eligibility"),
      promotional_placement: planPart.features.promotional_placement || addonFeatureKeys.has("promotional_placement"),
      // etc — OR, never AND: an add-on only ever adds capability, never removes it
    },
  };
}
```

`canVendorUse()` and `canVendorAccess()` — the two functions every real call
site already goes through — need **no signature change**. Every existing and
future call site (including the one real gap the audit found:
`featured-listing.service.ts`'s `createFeaturedListing` never calling
`canVendorUse`) automatically benefits from add-ons once this lands, with
zero changes at the call site itself. This is the main architectural payoff
of doing it this way instead of a parallel "check add-ons too" helper that
every caller would have to remember to also call.

A lazy-expiry sweep (mirroring the existing `getEffectivePlan`'s
grace-period/cancel-at-period-end handling) should flip `ACTIVE` add-ons past
their `endDate` to `EXPIRED` the same way — read-time lazy expiry, no new
cron/scheduler needed, consistent with how the codebase already avoids
scheduled jobs for this class of problem (confirmed existing pattern, not a
new one).

---

## 6. Purchase flow & edge cases

### Flow (mirrors the existing subscription checkout, not a new payment system)

1. Vendor picks a `FeatureAddonSku` from `GET /feature-addons` (public catalog,
   same shape as `GET /plans`).
2. `POST /vendor/feature-addons/checkout` creates a Razorpay order + a
   `Payment` row (`purpose: FEATURE_ADDON`, `pendingVendorId`,
   `pendingFeatureAddonSkuId`) — same pending-payment pattern subscription
   checkout already uses.
3. Razorpay webhook `payment.captured` creates the real
   `VendorFeatureAddon` row (`status: ACTIVE`, `startDate: now`,
   `endDate: now + sku.durationDays`), backfills `Payment.vendorFeatureAddonId`
   — mirrors exactly how the subscription webhook backfills `subscriptionId`.
4. Existing webhook idempotency handling (already required for subscription
   payments — Razorpay can retry webhook delivery) applies unchanged.

### Edge cases to resolve before building

- **Buying an add-on for a feature your plan already includes.** Block at
  checkout (`POST /vendor/feature-addons/checkout` should 409 if
  `getEffectivePlan(vendorId).features[sku.key]` is already `true` via the
  plan) — otherwise a PREMIUM vendor could pay twice for something free to
  them already.
- **Buying the same add-on twice while one is still active.** Either block
  (simplest) or extend the existing grant's `endDate` by `durationDays`
  (better UX, more logic). Recommend block-and-suggest-renew-near-expiry for
  v1; stacking/extension is a v2 nicety.
- **Vendor downgrades or cancels their subscription while an add-on is
  active.** Add-ons are independent of subscription status by design — an
  active `VendorFeatureAddon` keeps granting its feature even if the vendor
  falls back to FREE. This needs to be an explicit, stated decision (not an
  accident of the OR-based resolution above), since product.md §28 Scenario E
  ("after grace period, paid entitlements are removed") currently only talks
  about plan-based entitlements — confirm this add-on carve-out is the
  intended behavior before building.
- **Refunds.** product.md §"Subscription entitlement behavior depends on
  refund policy" already flags this as unresolved for subscriptions; it needs
  the same answer for add-ons (does a refunded add-on immediately revoke the
  feature, or run out its paid window?) before checkout ships.
- **Admin manually granting an add-on** (comp, goodwill, sales deal) —
  mirror how `FeaturedListing` today is admin-created with no payment
  required (`paymentId` is nullable) — `VendorFeatureAddon.paymentId` should
  stay nullable for the same reason.

---

## 7. What must exist before this can ship at all

- **`RESPONSE_TOOLS` has no feature behind it yet** (confirmed in the audit —
  zero call sites, no canned-reply/quick-response module in the codebase).
  Do not sell it à la carte or in a package until the actual feature exists.
- **`PRIORITY_SUPPORT` has no support/ticketing system to attach to** (same
  audit finding). Selling it today would mean charging for something with no
  observable effect. Build the minimal support surface first, or exclude this
  SKU from v1.
- **`featured-listing.service.ts`'s `createFeaturedListing` doesn't check
  `featured_eligibility` at all today** — this is worth fixing as part of
  this work regardless of add-ons, since right now an admin could feature a
  FREE-tier vendor with nothing in the code even logging that as unusual.
  Fixing it is also what makes the add-on version of Featured Placement
  actually mean something end-to-end.

---

## 8. Relationship to the existing plan model (product.md §26–28, consolidated per §0)

Nothing here replaces or restructures FREE/PREMIUM further than §0 already
does. The PREMIUM package remains the primary, cheaper path — pricing should
always make "upgrade to PREMIUM" beat "buy 3 add-ons separately" for any
vendor who'd actually use 3+ features, or the package model loses its reason
to exist. Suggested guardrail: total à la carte price for all of PREMIUM's
features should sit noticeably above PREMIUM's own price (e.g. 1.4–1.6×), so
bundling is visibly the deal.

---

## 9. Suggested build order

0. If §0's recommended split is confirmed: add two new entitlement keys
   (`STORE_ACCESS`, `INVOICING_ACCESS`) to `entitlement.constants.ts`, wire
   them into the seeded FREE (`false`)/PREMIUM (`true`) plan features, and
   add a `canVendorUse` check at the top of `vendor-store.service.ts`'s
   `getVendorStoreProfile`/store-creation path and
   `vendor-invoice.service.ts`'s invoice-creation path — same pattern
   `media.service.ts` already uses for `canVendorUpload`. Do this before
   anything below; it's the actual answer to "what's free vs. premium" and
   doesn't depend on the à la carte system at all.
1. Fix the existing `featured_eligibility` gap in `createFeaturedListing`
   (small, valuable on its own, and proves the entitlement-check pattern
   works before add-ons depend on it).
2. Schema: `FeatureAddonSku`, `VendorFeatureAddon`, `PaymentPurpose.FEATURE_ADDON`.
3. `entitlement.service.ts`: extend `getEffectivePlan()` to OR in active
   add-ons — no other call site changes needed, per §5.
4. Admin CRUD for `FeatureAddonSku` (mirrors existing `/admin/plans`).
5. Vendor-facing catalog + checkout + Razorpay webhook (mirrors existing
   subscription checkout end-to-end).
6. Ship with exactly one SKU: Featured Placement. Leave Promotional
   Placement, Response Tools, and Priority Support out entirely until their
   underlying features exist (§7) — none of the three have anything to sell
   today.

---

## Open questions for you to decide before this gets built

0. **Biggest one, from §0b:** confirm or override the recommended split —
   Vendor Store and invoicing move behind PREMIUM (new `canVendorUse` gates,
   real revenue justification since neither earns the platform anything on
   its own today), everything in the discovery/lead/messaging funnel stays
   free on every tier. If you'd rather ship the zero-engineering-work
   version instead (FREE/PREMIUM differ only in limits + analytics depth,
   nothing newly gated), say so and I'll revert §0's tables to that.
1. Given §0a's audit, Featured Placement is the only à la carte candidate
   with anything real behind it — confirm that's the only v1 SKU, since
   Promotional Placement/Response Tools/Priority Support have no feature to
   sell at all today.
2. Do add-ons survive a subscription downgrade/cancellation, as proposed in
   §6, or should they be revoked too?
3. Refund policy for a part-used add-on window?
4. Should buying an add-on for a feature the vendor's plan already grants be
   blocked (recommended) or silently allowed as a no-op?
5. What should PREMIUM actually cost, now that (per the §0 recommendation)
   it includes higher limits, deeper analytics, featured placement, the
   Vendor Store, and invoicing? Keep the old PREMIUM price (₹12,999/month)
   or reprice given the added value?
6. Does PRO have any real subscribers today, and does any vendor already
   have an active store or invoices? Confirmed zero of all three in local
   dev — staging/production needs the same check before this ships, per
   §0's migration notes.
