# WedHub — Dynamic Plans & Admin-Configurable Feature Registry (Implementation Plan)

**Document:** Implementation Plan — READY TO BUILD. Open questions resolved 2026-09-22:
(1) the 5 unenforced boolean features are dropped from the catalog for this pass — see §4a;
(2) `featured_eligibility` is wired into `FeaturedListing` creation in this same pass — see §5c;
(3) starting plan data stays the existing 5 seeded rows (names/prices are not the point of this
pass — the system's configurability is) — see §9.
**Date:** 2026-09-22
**Supersedes:** `PLAN-2026-09-19-free-premium-feature-gating.md` (its §2-§9 content is folded into
this plan's feature catalog and gating sections; its migration-safety pattern in §10 is reused
in §9 below). That doc assumed 3 fixed tiers — this one removes that assumption.
**Depends on:** none outstanding — this plan is self-contained, based on a full read of the
current schema, `entitlement.service.ts`, `plans`/`subscriptions` modules, and both admin/vendor
frontend subscription UIs (2026-09-22 audit).
**Production status:** `wedhub_prod` is live (see `server.md`) and auto-deploys via
`prisma migrate deploy` on push to `main`. Every schema change here must be additive/backward
compatible — see §9 before touching `SubscriptionPlan`/`Subscription`.

---

## 1. What changes, in one paragraph

Plans stop being "exactly one of FREE/PRO/PREMIUM × MONTHLY/YEARLY" (5 fixed seeded rows,
enforced by a DB unique constraint on `[tier, billingInterval]`) and become admin-created records
— any name, any price, any count, created/edited/retired freely from `/admin/subscriptions`. The
`PlanTier` enum is removed from `SubscriptionPlan` (kept only as a legacy/cosmetic field — see
§3). Exactly one plan at a time is flagged `isDefault: true` — this is the new "what does a
brand-new vendor get, and what does a lapsed vendor fall back to" mechanism, replacing today's
hardcoded `FREE_EFFECTIVE_PLAN` constant. The set of possible **features** (Portfolio Limit,
Video Limit, Advanced Analytics, Featured Eligibility, plus two new ones: Vendor Store Access and
Invoicing Access — six total) stays a fixed catalog defined in code — because every one of these
needs real enforcement code somewhere, and
an admin-invented feature key with no code behind it would silently do nothing (the "100% working"
requirement rules out a fully-freeform registry). The admin's job becomes: for each plan, toggle
each catalog feature on/off (or set its numeric value for limits), through a real form UI that
doesn't exist today — confirmed in the audit, `PlanFormModal.tsx` currently has zero
features/limits editing fields at all.

---

## 2. Current-state facts this plan is built on (confirmed 2026-09-22)

- `PlanTier` enum (`FREE|PRO|PREMIUM`) is defined once in `schema.prisma`, referenced as a real
  DB column type on `SubscriptionPlan.tier`, with `@@unique([tier, billingInterval])`.
- Only **one** migration created these tables (`20260902051444_add_subscriptions_and_billing`);
  nothing since has touched `tier`. Production is live; real `Subscription`/`Payment` rows likely
  exist there (row counts unconfirmed — see §9).
- The FREE fallback used throughout the app (`entitlement.service.ts`'s `FREE_EFFECTIVE_PLAN`,
  `FREE_PLAN_DEFAULT_LIMITS`, `FREE_PLAN_DEFAULT_FEATURES`) is a **hardcoded in-memory constant**,
  not a DB read of the seeded FREE plan row. This is why introducing `isDefault` requires a real
  code change, not just a data change.
- Two hardcoded tier-string branches exist outside `entitlement.service.ts`, violating the
  codebase's own "Coding Rule 8" (never raw `plan.tier === X` outside entitlement.service):
  `subscription.service.ts:57-58` (blocks paid checkout when `plan.tier === "FREE"`) and the
  entire downgrade-via-cancel design (`subscription.service.ts:148` comment).
- `plan.schema.ts`'s Zod validation already accepts `features`/`limits` as untyped
  `z.record(z.string(), z.unknown())` — no loosening needed there for a dynamic catalog.
- `canVendorUse()` (the generic boolean entitlement check) has **zero call sites** anywhere in the
  backend today. `lead_access`, `featured_eligibility`, `promotional_placement`, `response_tools`,
  `priority_support` are 100% unenforced — defined, seeded, shown on pricing cards, checked
  nowhere. Only `portfolio_limit`/`video_limit` (via `canVendorUpload`) and `analytics_level` (via
  `canVendorAccess`) are real today.
- Vendor Store and Invoicing modules have **zero** entitlement references — confirmed via
  repo-wide grep, not a single import of `entitlement.service` in either module.
- Vendor-facing plan UI (`SubscriptionBoard.tsx`) hardcodes a 3-column grid and a
  `plan.tier === "FREE"` special case for the downgrade button. Admin UI
  (`PlanFormModal.tsx`) hardcodes a 3-item tier `<select>` and has no way to edit features/limits.
- `FeaturedListing` (homepage/category/city/search placement) is a fully separate, admin-hand-managed
  model with **no relation to `SubscriptionPlan` at all** — not wired to entitlements today, and
  this plan does not wire it either (see §12 open question — out of scope unless you say otherwise).

---

## 3. Schema changes

### 3a. `SubscriptionPlan` — add `isDefault`, drop the tier-based unique constraint, keep `tier` as a soft label

```prisma
model SubscriptionPlan {
  id              String            @id @default(cuid())
  tier            PlanTier?         // kept ONLY as a legacy display hint (e.g. admin sort grouping,
                                     // "PREMIUM" badge styling) — no code branches on it after this
                                     // plan ships. Nullable so new plans don't need one. Not removed
                                     // outright because dropping the column is a separate, riskier
                                     // migration than nulling out its behavioral meaning — see §9.
  billingInterval BillingInterval
  name            String
  slug            String            @unique  // NEW — stable identifier for upserts/URLs, replaces
                                              // the tier+interval compound key seed.ts used for
                                              // upsert targeting (§9)
  price           Decimal           @db.Decimal(10, 2)
  currency        String            @default("INR")
  trialDays       Int               @default(0)
  isDefault       Boolean           @default(false)  // NEW — exactly one plan (system-wide, not
                                                       // per-interval) should carry this at any time
  isActive        Boolean           @default(true)
  sortOrder       Int               @default(0)  // NEW — admin-controlled display order, replaces
                                                   // "orderBy tier asc" (which was already a minor
                                                   // existing bug: alphabetically PREMIUM < PRO)
  features        Json              @default("{}")
  limits          Json              @default("{}")
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  subscriptions   Subscription[]
  pendingPayments Payment[]

  @@index([isActive, sortOrder])
  // @@unique([tier, billingInterval]) REMOVED — this is the core unlock. Multiple plans can now
  // share a billing interval (or even a former tier value) freely.
}
```

**Partial-unique index for `isDefault`** (Postgres, added via raw SQL in the migration since Prisma
doesn't support partial unique indexes declaratively pre-6.x client extensions):

```sql
CREATE UNIQUE INDEX subscription_plans_one_default_idx
  ON subscription_plans (is_default) WHERE is_default = true;
```

This makes "exactly one default plan" a DB-enforced invariant, not just an app-level convention —
any attempt to set a second plan's `isDefault: true` without first clearing the old one fails at
the DB, which is the correct backstop for something `getEffectivePlan()` depends on for every
vendor with no subscription row.

### 3b. `PlanTier` enum — no change to the enum itself, just becomes optional/cosmetic on the model (see 3a). Not dropped this pass (§9 explains why).

### 3c. No other model changes. `Subscription`, `Payment`, `Invoice`, `Refund`, `WebhookEvent`,
`Coupon` all reference `planId`/`subscriptionId` already — none of them touch `tier` directly
(confirmed in the audit), so they need zero changes.

---

## 4. Feature catalog (the fixed, code-defined registry)

`entitlement.constants.ts` becomes the single source of truth for "what features exist," each with
a **type** (`boolean` or `limit`) so the admin UI can render the right control automatically instead
of needing a hardcoded field per feature:

```ts
export type FeatureValueType = "boolean" | "limit";

export interface FeatureDefinition {
  key: EntitlementKey;
  label: string;           // admin-facing form label
  description: string;     // admin-facing help text, one line
  valueType: FeatureValueType;
  defaultValue: boolean | number;  // used for the default/fallback plan AND for merging
                                     // any plan whose features/limits JSON omits this key
}

export const FEATURE_CATALOG: FeatureDefinition[] = [
  { key: "portfolio_limit",       label: "Portfolio Images",     description: "Max active portfolio photos", valueType: "limit",   defaultValue: 10 },
  { key: "video_limit",           label: "Videos",               description: "Max active portfolio videos", valueType: "limit",   defaultValue: 1 },
  { key: "analytics_level",       label: "Advanced Analytics",   description: "90-day history + daily breakdown (vs. basic 30-day)", valueType: "boolean", defaultValue: false }, // see note below
  { key: "featured_eligibility",  label: "Featured Placement",   description: "Vendor can be assigned homepage/category/city/search featured slots by admin", valueType: "boolean", defaultValue: false },
  { key: "store_access",          label: "Vendor Store",         description: "Branded storefront with WhatsApp ordering", valueType: "boolean", defaultValue: false }, // NEW, from the superseded plan doc
  { key: "invoicing_access",      label: "Invoicing & Billing",  description: "GST invoices and payment tracking", valueType: "boolean", defaultValue: false },           // NEW
];
```

**`analytics_level` special case**: it's a string enum (`"basic"|"advanced"`) today, not a boolean —
keep it that way in `PlanFeatures`'s TS type (`AnalyticsLevel`), but represent it to the admin form
as a boolean toggle ("Advanced Analytics: on/off") since basic-vs-advanced is really a two-state
switch in practice. `readFeatures()` maps the toggle to `"advanced"`/`"basic"` under the hood — no
behavior change to `canVendorAccess`, just a friendlier admin control. Document this one exception
inline in the code so a future feature addition doesn't assume every `boolean`-rendered feature is
literally a TS `boolean`.

**Why not a fully dynamic admin-created catalog**: confirmed with the user — every feature in this
catalog must have real enforcement behind it (§5). An admin-typed feature key with no code path
checking it would look configured but do nothing, which fails the "100% working" bar this plan is
built to. Adding a 9th feature later means one code change to `FEATURE_CATALOG` plus its
enforcement call site(s) — not zero-code, but small and explicit.

**Dropped from the catalog, confirmed with the user (2026-09-22)**: `lead_access`, `response_tools`,
`priority_support`, `promotional_placement`. All four had zero enforcement code anywhere and no
existing feature for that code to hook into (e.g. no support-ticket system to prioritize, no
concept of a "response tool" defined anywhere in the codebase). Rather than ship admin toggles that
silently do nothing, they're removed from `FEATURE_CATALOG` and from `PlanFeatures`/
`EntitlementKey` entirely this pass. `lead_access` in particular: every plan (including the seeded
FREE row) has always had it `true` with zero gating, i.e. lead access has always just been a
standard part of being a vendor — removing the flag doesn't change behavior for anyone. Re-add any
of the four once its real feature is built and someone decides what it should actually restrict —
that's a future, separate pass, not blocked by anything here.

---

## 5. Enforcement — what gets a real gate

### 5a. Already real, unchanged
`canVendorUpload` (portfolio/video limits) and `canVendorAccess("analytics_level")` — no change to
their internals, only to how the plan's features/limits are resolved underneath them (§6).

### 5b. New: Vendor Store and Invoicing (from the superseded plan doc, carried forward verbatim —
this reasoning was already sound and doesn't change with dynamic plans)

Add `assertVendorFeatureAccess(vendorId, key, featureLabel)` to `entitlement.service.ts`, throwing
`AuthorizationError` (403), matching `canVendorUpload`'s throw-not-return convention:

```ts
export async function assertVendorFeatureAccess(
  vendorId: string,
  key: Extract<EntitlementKey, "store_access" | "invoicing_access">,
  featureLabel: string,
): Promise<void> {
  const allowed = await canVendorUse(vendorId, key);
  if (!allowed) {
    throw new AuthorizationError(`${featureLabel} is not included in your current plan. Upgrade to unlock it.`);
  }
}
```

**Vendor Store** — gate every `vendorStoreRouter`-reachable mutation (confirmed exhaustive list
from the audit): `updateStoreProfile`, `createStoreItem`, `updateStoreItem`, `deleteStoreItem`,
`updateOrderStatus`, `createOrderInvoice`, `onboardPaymentAccount`, `createKycLink`,
`syncPaymentAccount`, `refundOrder`. Reads (`getStoreProfile`, `listStoreItems`, `listStoreOrders`,
`getPaymentAccount`, `getPaymentSummary`) stay ungated. **Never** gate `publicStoreRouter`
(`getPublicStore`, `listPublicStoreItems`, `createPublicOrder`, `verifyStorePayment`) — a couple
ordering from a store must keep working even if the vendor's plan later lapses.

**Invoicing** — gate `createInvoice`, `updateInvoice`, `issueInvoice`, `duplicateInvoice`,
`recordPayment`, `upsertBillingProfile` (this is `updateBillingProfile` in the actual route table),
`getLeadPrefill` (feeds directly into invoice creation, no other purpose). Leave
`listInvoices`/`getInvoiceById`/`getMetrics`/`getBillingProfile`/`deleteInvoice`/`cancelInvoice`/
`deletePayment` ungated — a vendor whose plan lapses must still be able to view/cancel/delete an
invoice they already issued to a real client; only *creating new* value is gated. This mirrors
`sweepMediaToLimits`'s existing "hide, never delete" precedent.

### 5c. `featured_eligibility` — wired into `FeaturedListing` creation (confirmed in scope)

`FeaturedListing` (homepage/category/city/search placement) is entirely admin-created today —
confirmed via the audit: `createFeaturedListing(userId, ...)` in
`featured-listing.controller.ts:19-22` is called only from `featuredListingAdminRouter`
(`featured-listing.routes.ts:35-36`, ADMIN-only), there is no vendor self-serve purchase path at
all. This makes the gate simple and well-defined — no scheduling/self-purchase work needs to be
built, only a check at the one place an admin assigns a slot to a vendor:

```ts
// featured-listing.service.ts::createFeaturedListing, before the insert
await assertVendorFeatureAccess(vendorId, "featured_eligibility", "Featured Placement");
```

Same throw-403 helper as Vendor Store/Invoicing (§5b) — if an admin tries to create a
`FeaturedListing` for a vendor whose current plan doesn't include `featured_eligibility`, the
request fails with a clear error rather than silently succeeding. `updateFeaturedListing` and
`cancelFeaturedListing` are **not** gated — same "don't retroactively punish existing state"
principle as invoicing: if a vendor's plan changes after a listing is already scheduled/active, the
admin can still manage (edit dates, cancel) that existing listing; the gate only stops *creating a
new* listing for a currently-ineligible vendor. `listActiveFeaturedListings` (the public read used
by homepage/search) and `listFeaturedListingsAdmin` stay fully ungated — this is a creation-time
check only, matching every other gate in this plan.

---

## 6. `entitlement.service.ts` rewrite — the default-plan-aware core

```ts
// Replaces the hardcoded FREE_EFFECTIVE_PLAN constant. Reads the real DB row flagged isDefault,
// with FEATURE_CATALOG's defaultValue-per-key as the last-resort fallback if, somehow, no plan
// is currently flagged isDefault (should be unreachable given the partial unique index + seed,
// but getEffectivePlan must never throw for a vendor with no subscription — that's the one
// invariant every other module depends on).
async function getDefaultPlan(): Promise<SubscriptionPlan> {
  const plan = await planRepository.findDefaultPlan(); // WHERE isDefault = true, isActive = true
  if (plan) return plan;
  logger.error("No plan flagged isDefault — falling back to code defaults. This should never happen.");
  return SYNTHETIC_FALLBACK_PLAN; // limits/features built from FEATURE_CATALOG defaultValues
}

export async function getEffectivePlan(vendorId: string): Promise<EffectivePlan> {
  const subscription = await subscriptionRepository.findCurrentSubscription(vendorId);
  if (!subscription) {
    const defaultPlan = await getDefaultPlan();
    return { limits: readLimits(defaultPlan), features: readFeatures(defaultPlan), planId: defaultPlan.id, planName: defaultPlan.name };
  }
  // ...expiry logic unchanged in shape, but the expired-fallback branch now also calls
  // getDefaultPlan() instead of returning the FREE_EFFECTIVE_PLAN constant...
}
```

`readLimits`/`readFeatures` change from a hand-written field-by-field merge to a loop over
`FEATURE_CATALOG`, reading `plan.limits`/`plan.features` JSON by key with `defaultValue` fallback —
this is what makes adding a 9th catalog feature later require zero changes to these two functions.

**`EffectivePlan.tier` field removal**: the `"FREE"|"PRO"|"PREMIUM"` union is replaced with
`planId: string` and `planName: string` (for display). Every caller of `getEffectivePlan()` (via
`canVendorAccess`/`canVendorUse`/`canVendorUpload`) is unaffected since none of them read `.tier`
today (confirmed in audit) — this is a safe removal, not a breaking one internally. The two
external tier-string branches (§2) are rewritten in §7.

**`canVendorUse()`'s type signature** widens from the closed 5-key union to accept all boolean-typed
`EntitlementKey`s generically (derived from `FEATURE_CATALOG` at the type level via a mapped type),
so `store_access`/`invoicing_access` and any future boolean feature don't each need a manual type
signature edit.

---

## 7. Removing the two tier-string branches

- `subscription.service.ts:57-58`'s `if (plan.tier === "FREE") throw ...` becomes
  `if (plan.isDefault) throw new ValidationError("This plan is not available for paid checkout.")`
  — same behavior (block checkout on the free/default plan), now keyed on the real flag instead of
  a string that may not exist on admin-created plans.
- The "downgrade = cancel" design (§2) stays conceptually the same — cancelling still means
  "fall back to whatever plan is `isDefault`" — but `cancelSubscription`'s immediate-cancel media
  sweep changes from `sweepMediaToLimits(vendorId, FREE_PLAN_DEFAULT_LIMITS)` (a hardcoded
  constant) to `sweepMediaToLimits(vendorId, readLimits(await getDefaultPlan()))` (the real default
  plan's actual configured limits) — this is a correctness fix, not just a rename: today, if an
  admin ever edited the seeded FREE plan's `portfolio_limit` in the DB directly, the immediate-cancel
  sweep would silently ignore that edit and use the stale hardcoded `10` instead. After this change
  it can't drift.

---

## 8. Admin UI — `PlanFormModal.tsx` and `SubscriptionsBoard.tsx`

### 8a. `PlanFormModal.tsx` — full rebuild of the form body

- **Tier `<select>` removed.** Replace with: Plan name (text), Slug (text, auto-suggested from
  name, editable, used for the new `slug` unique field), Billing interval (`<select>` MONTHLY/YEARLY,
  still fixed — these are genuinely binary, not part of the "unlimited plans" ask), Price (₹), Trial
  days, Sort order (number, controls display position), **Default plan** (checkbox — "Use as the
  fallback plan for vendors with no active subscription"; if checked, the save confirms with the
  user that this will unset the previous default, since the UI should make the one-default
  invariant visible rather than surprising).
- **New: a Features section**, rendered by iterating `FEATURE_CATALOG` (fetched from a new
  `GET /admin/plans/feature-catalog` endpoint, or bundled statically if the frontend already shares
  types with the backend — confirm which pattern this repo uses for shared enums before choosing).
  Each catalog entry renders as: a boolean toggle for `valueType: "boolean"`, or a number input for
  `valueType: "limit"`. This is the concrete UI the audit found completely missing today.
- Tier/billingInterval/currency were previously locked after creation (`updatePlanSchema` omits
  them) — billingInterval stays locked after creation (changing a plan's billing cadence
  post-creation is a genuinely different plan), but since `tier` is being removed as a hard field,
  that specific lock goes away naturally.

### 8b. `SubscriptionsBoard.tsx` — Plans tab

- Card badge changes from `{plan.tier} · {plan.billingInterval}` to `{plan.name} · {plan.billingInterval}`,
  with a small "Default" pill shown when `plan.isDefault`.
- Card body's feature summary changes from the two hardcoded `portfolio_limit`/`video_limit` lines
  to a loop over `FEATURE_CATALOG`, showing each enabled feature as a short badge/chip — scales
  automatically to however many plans/features exist without per-feature UI code.
- List ordering changes from `orderBy tier asc` to `orderBy sortOrder asc, price asc`.

### 8c. Backend support for 8a/8b

- `plan.schema.ts`: `tier` becomes optional (kept only for the legacy display field, see §3a);
  add `slug` (required, slug-format validated), `isDefault` (optional boolean), `sortOrder`
  (optional number). `features`/`limits` stay untyped records — no change needed there.
- `plan.service.ts::createPlan`/`updatePlan`: remove the `findPlan(tier, billingInterval)` dup-check
  entirely (no more uniqueness rule to enforce beyond the DB's own `slug` unique constraint, which
  Postgres already enforces — a `ConflictError` still needs to catch that unique-violation and
  return a clean 409 rather than a raw DB error). Add: when `isDefault: true` is being set, wrap in
  a transaction that first clears `isDefault` on whatever plan currently holds it, then sets it on
  the target — the partial unique index (§3a) is the backstop, but the app should do this cleanly
  rather than relying on the DB to reject a naive two-plans-default attempt.
- `plan.repository.ts`: replace `findPlan(tier, billingInterval)` with `findDefaultPlan()`
  (`WHERE isDefault = true AND isActive = true`) and `findBySlug(slug)`; `orderBy` changes to
  `[{ sortOrder: "asc" }, { price: "asc" }]` in both list functions.

---

## 9. Migration safety (production is live — read this before writing the Prisma migration)

**Pre-flight, before writing any migration SQL:**
```ts
const planCount = await prisma.subscriptionPlan.count();
const subCount = await prisma.subscription.count();
const paymentCount = await prisma.payment.count({ where: { purpose: "SUBSCRIPTION" } });
```
Run this read-only query against production (or have it run by whoever has prod DB access) before
this plan's migration ships. This plan is written assuming the answer is "yes, real rows exist"
(the seeded 5 plans plus however many real vendor subscriptions have been purchased since
`server.md`'s production went live) — the migration below is designed to be safe either way, but
confirm rather than assume.

**Migration steps, in order, each independently safe:**

1. Add `slug` as **nullable** first, backfill existing 5 rows with slugs derived from their
   existing `name` (`"Free"→"free"`, `"Pro"→"pro"`, `"Pro (Yearly)"→"pro-yearly"`, etc. — a
   one-off data migration script, not a schema default), **then** alter to `NOT NULL UNIQUE` in a
   follow-up migration once backfilled. Never add a `NOT NULL UNIQUE` column in the same migration
   that needs to populate it for existing rows — that ordering fails on any non-empty table.
2. Add `isDefault` as `Boolean @default(false)`, `sortOrder` as `Int @default(0)` — both safe as
   single-step additive changes.
3. **Data step**: set `isDefault = true` on the existing seeded FREE/MONTHLY row specifically
   (`WHERE tier = 'FREE' AND billing_interval = 'MONTHLY'`) — this is the one-time bridge from the
   old implicit-FREE convention to the new explicit flag, run once, by name/tier lookup since this
   is the last migration allowed to reference `tier` meaningfully.
4. Add the partial unique index (`CREATE UNIQUE INDEX ... WHERE is_default = true`) — safe now
   that step 3 guarantees exactly one row qualifies.
5. Drop `@@unique([tier, billingInterval])` and make `tier` nullable (`PlanTier?`) — this is the
   step that actually removes the "3 fixed tiers" constraint. Safe because nothing in step 1-4
   depended on that constraint still existing, and no other table has a foreign key into it.
6. Update `seed.ts`'s upsert key from `{tier_billingInterval}` to `{slug}` (§3a already added
   `slug` as unique) — **do this in the same PR as the code changes**, not the schema migration,
   since seed.ts is application code, not a migration file.

**Do not** drop the `PlanTier` enum type itself or the `tier` column in this pass — nullable-and-
unused is safe and reversible; a full column/enum drop is a separate, lower-priority cleanup once
this has run in production for a while with no issues (own follow-up item, not blocking this plan).

**Existing Subscription/Payment rows need zero migration** — they reference `planId`, never `tier`
directly (confirmed in audit), so nothing about a vendor's current active subscription changes
during this migration.

---

## 10. Frontend vendor UI (`SubscriptionBoard.tsx`) — from 3-card-grid to N-card-grid

- Grid: `grid-cols-3` → a responsive `grid-cols-[repeat(auto-fit,minmax(260px,1fr))]` (or the
  project's existing responsive-grid utility if one exists — check `Tailwind` config/other card
  grids in the codebase for the established pattern before inventing a new one).
- `currentTier`/`plan.tier === currentTier` → `currentPlanId`/`plan.id === subscription?.planId`
  (a strictly simpler, more correct check — works regardless of how many plans exist or whether
  two plans ever shared a tier).
- The FREE-special-case downgrade branch (`plan.tier === "FREE"` → cancel instead of upgrade)
  becomes `plan.isDefault === true` → cancel instead of upgrade. Same UX (clicking the default
  plan's card triggers "downgrade via cancel"), now correct for any admin-chosen default plan, not
  just one named "FREE".
- `data-testid="plan-card-${plan.tier}"` → `data-testid="plan-card-${plan.id}"` (update the
  matching E2E test, `e2e/phase-10-admin-monetization-governance.spec.ts:71`, which currently
  hardcodes `.selectOption("FREE")` against the tier dropdown being removed in §8a — this test
  needs a rewrite, not just a selector tweak, since the field it drives no longer exists).
- Feature bullet list: currently a hardcoded sequence of `<li>`s per known key — change to a loop
  over `FEATURE_CATALOG` filtered to features the plan has enabled, so a newly admin-enabled
  feature on a plan shows up without a frontend code change.
- **YEARLY plans**: still out of scope for this pass per the existing code comment (a
  billing-interval toggle is a reasonable follow-up) — not part of "make plans dynamic," a
  separate, smaller UI task. Flagging so it's a conscious deferral, not a miss.

---

## 11. Build order

1. **Schema migration (§9)**, run and verified against a copy of real data shape first (or at
   minimum against local dev seeded with the current 5 plans) — no behavior change yet.
2. **`entitlement.constants.ts`**: add `FEATURE_CATALOG`, `store_access`/`invoicing_access` keys,
   `FeatureDefinition` type. No behavior change yet — this is data, not logic.
3. **`entitlement.service.ts` rewrite** (§6): `getDefaultPlan()`, catalog-driven `readLimits`/
   `readFeatures`, `EffectivePlan.tier` → `planId`/`planName`, widen `canVendorUse`'s type,
   add `assertVendorFeatureAccess`. Verify `canVendorUpload`/`canVendorAccess` still behave
   identically for the 5 existing seeded plans (regression, not new behavior).
4. **Fix the two tier-string call sites** (§7) in `subscription.service.ts`.
5. **`plan.schema.ts`/`plan.service.ts`/`plan.repository.ts`** changes (§8c) — remove
   tier-uniqueness rule, add slug/isDefault/sortOrder handling, default-plan-swap transaction.
6. **Gate Vendor Store + Invoicing + Featured Placement** (§5b, §5c) — exact call sites already
   enumerated.
7. **Admin UI** (§8a, §8b) — PlanFormModal rebuild with the Features section, SubscriptionsBoard
   card display update.
8. **Vendor UI** (§10) — SubscriptionBoard grid/plan-id-check/feature-list changes, UpgradePrompt
   component for the 403 pages (`/vendor/store`, `/vendor/invoices`) per the superseded plan's
   §7a-7c, which still applies unchanged.
9. **`GET /vendors/me/effective-plan`** endpoint (from the superseded plan's §7b, still needed) —
   returns `{ planId, planName, features }`, backing both the page-level upgrade-prompt gate and
   collapsing the frontend's duplicated FREE-default-merge logic (audit §7 finding).
10. **seed.ts** update (§9 step 6) — slug-based upsert, explicit `store_access`/`invoicing_access`/
    `featured_eligibility` per seeded plan.
11. Full verification pass — §12.

---

## 12. Verification checklist

- [ ] `npx tsc --noEmit` clean on both `wedhub-backend/` and `wedhub-frontend-app/`.
- [ ] Existing backend unit tests (`vendor-store.spec.ts`, `vendor-invoice.spec.ts`,
      `vendor-payments.spec.ts`) still pass — these predate gating and must not break for
      already-covered flows.
  - [ ] `subscription.service.ts` still blocks paid checkout against the default plan (rewritten
      check from §7).
- [ ] A vendor with zero Subscription rows gets the real default plan's limits/features (not a
      hardcoded constant) — verified by temporarily changing the default plan's `portfolio_limit`
      in the DB and confirming a no-subscription vendor's upload limit reflects it live.
- [ ] Exactly one plan can be `isDefault` at a time — attempt to set a second one via the admin API
      directly (bypassing the UI) and confirm the partial unique index rejects it.
- [ ] Admin can create a 6th, 7th, ... plan with an arbitrary name/price/feature combination via
      `PlanFormModal.tsx`, and it appears correctly on the vendor `/vendor/subscription` page.
- [ ] Admin can toggle `store_access`/`invoicing_access`/`featured_eligibility` per plan and a
      vendor's `GET /vendors/me/effective-plan` reflects it within one request.
- [ ] Default-plan vendor calling `POST /api/v1/vendor-store/me` and `POST /api/v1/vendor-invoices`
      gets a 403; a vendor on a plan with those features enabled succeeds.
- [ ] Admin attempting to create a `FeaturedListing` for a vendor whose plan lacks
      `featured_eligibility` gets a clear error; succeeds for a vendor whose plan includes it.
      Editing/cancelling an already-existing `FeaturedListing` still works regardless of the
      vendor's current plan.
- [ ] Public storefront routes (`GET /stores/:slug`, `POST /stores/:slug/orders`) succeed
      regardless of the vendor's plan.
- [ ] A vendor with an existing invoice, after their subscription lapses to the default plan, can
      still view/cancel that invoice but not create a new one.
- [ ] Cancelling a subscription immediately sweeps media to the *current* default plan's actual
      configured limits (not a stale hardcoded number) — verified by editing the default plan's
      `portfolio_limit` before testing cancellation.
- [ ] `e2e/phase-10-admin-monetization-governance.spec.ts` updated and passing against the new
      admin form (no more tier `<select>`).
- [ ] Migration applied cleanly against a non-empty local DB seeded with the current 5 plans
      (simulating production's real data) — confirms §9's step ordering is actually safe, not just
      theoretically safe.
