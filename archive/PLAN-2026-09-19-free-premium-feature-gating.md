# WedHub — FREE vs PREMIUM Feature Gating (Implementation Plan)

**Document:** Implementation Plan — ready to build once §1's split is confirmed
**Date:** 2026-09-19
**Depends on:** `PLAN-2026-09-19-a-la-carte-vendor-features.md` §0 (the audit
that found only 2 of 8 entitlement keys are enforced anywhere, and that the
Vendor Store and invoicing are fully working with zero plan check today)
**Scope:** Exactly what needs to change — backend gates, frontend UX, admin
tooling, data migration, and verification — to make the FREE/PREMIUM split
real instead of aspirational. No à la carte / add-on purchasing in this
document; that's the separate plan above.

---

## 1. The split this plan enforces

| Feature | FREE | PREMIUM |
|---|---|---|
| Vendor profile, categories & location listing | ✅ | ✅ |
| Portfolio images | Up to 10 | Up to 500 |
| Videos | Up to 1 | Up to 50 |
| Packages & pricing | ✅ Unlimited | ✅ Unlimited |
| Enquiries & leads | ✅ Full access | ✅ Full access |
| Direct messaging with couples | ✅ Unlimited | ✅ Unlimited |
| Reviews | ✅ | ✅ |
| Real Wedding Stories submission | ✅ | ✅ |
| Notifications | Basic | Basic |
| Analytics | Basic — 30-day history | Advanced — 90-day history + daily breakdown |
| Featured placement (homepage / category / city / search) | ❌ | ✅ |
| Vendor Store (branded storefront + WhatsApp ordering) | ❌ | ✅ |
| Invoicing & billing (GST invoices, payment tracking) | ❌ | ✅ |

Three rows are already enforced correctly (Portfolio, Videos, Analytics —
via `entitlement.service.ts`, confirmed working). Featured placement has a
flag but no check. Vendor Store and Invoicing have no flag and no check at
all. This plan builds all three of the missing pieces.

---

## 2. New entitlement keys

`wedhub-backend/src/modules/entitlements/entitlement.constants.ts` needs two
new keys, following the exact shape the existing six already use:

```ts
export const Entitlement = {
  PORTFOLIO_LIMIT: "portfolio_limit",
  VIDEO_LIMIT: "video_limit",
  LEAD_ACCESS: "lead_access",
  ANALYTICS_LEVEL: "analytics_level",
  FEATURED_ELIGIBILITY: "featured_eligibility",
  PROMOTIONAL_PLACEMENT: "promotional_placement",
  RESPONSE_TOOLS: "response_tools",
  PRIORITY_SUPPORT: "priority_support",
  STORE_ACCESS: "store_access",        // new
  INVOICING_ACCESS: "invoicing_access", // new
} as const;
```

`PlanFeatures` interface gets two new boolean fields:

```ts
export interface PlanFeatures {
  analytics_level: AnalyticsLevel;
  lead_access: boolean;
  featured_eligibility: boolean;
  promotional_placement: boolean;
  response_tools: boolean;
  priority_support: boolean;
  store_access: boolean;      // new
  invoicing_access: boolean;  // new
}
```

`FREE_PLAN_DEFAULT_FEATURES` gets both set to `false` (this is the fallback
used when a vendor has no `Subscription` row at all — the common case for a
brand-new FREE vendor per `entitlement.service.ts`'s own comment on
Scenario A, so the default must be correct on day one, not just the seeded
plan row).

`entitlement.service.ts`'s `readFeatures()` needs the same two lines every
other feature already has:

```ts
store_access: raw?.store_access ?? FREE_PLAN_DEFAULT_FEATURES.store_access,
invoicing_access: raw?.invoicing_access ?? FREE_PLAN_DEFAULT_FEATURES.invoicing_access,
```

`canVendorUse()`'s type signature is a closed union today — it only accepts
the five keys that predate this plan:

```ts
export async function canVendorUse(
  vendorId: string,
  key: Extract<EntitlementKey, "featured_eligibility" | "promotional_placement" | "response_tools" | "priority_support" | "lead_access">,
): Promise<boolean> { ... }
```

Add `"store_access" | "invoicing_access"` to that union. No other change to
the function body — it already reads `plan.features[key]` generically.

---

## 3. A new throwing helper, matching the existing `canVendorUpload` pattern

`canVendorUse()` returns a `boolean`. That's fine for a UI that wants to
conditionally render something, but every real call site in this codebase
that blocks an action outright uses the throw-a-403 pattern instead
(`canVendorUpload` in `media.service.ts`). Store and invoicing access should
follow the same convention — a vendor without access gets a clear 403, not a
silently-empty response the frontend has to interpret.

Add one new function to `entitlement.service.ts`, next to `canVendorUpload`:

```ts
// Same throw-not-return-boolean convention as canVendorUpload — every real
// call site is "the vendor is trying to do this right now," not a
// conditional-render check, so a thrown 403 matches the rest of the
// codebase's guard-clause style and can't be silently ignored.
export async function assertVendorFeatureAccess(
  vendorId: string,
  key: Extract<EntitlementKey, "store_access" | "invoicing_access">,
  featureLabel: string,
): Promise<void> {
  const allowed = await canVendorUse(vendorId, key);
  if (!allowed) {
    throw new AuthorizationError(
      `${featureLabel} is a PREMIUM feature. Upgrade your plan to unlock it.`,
    );
  }
}
```

`featureLabel` is passed by the caller ("Vendor Store", "Invoicing") so the
403 message is specific without duplicating string literals per call site.

---

## 4. Where to actually call it — Vendor Store

`wedhub-backend/src/modules/vendor-store/vendor-store.routes.ts` mounts two
distinct routers:

- `vendorStoreRouter` — everything under `/api/v1/vendor-store/me/*`, all
  authenticated-vendor-only. **This is what gets gated.**
- `publicStoreRouter` — everything under `/api/v1/stores/*`
  (`getPublicStore`, `listPublicStoreItems`, `createPublicOrder`,
  `verifyStorePayment`). **Never gate this.** A couple browsing or ordering
  from a store a vendor already published must keep working even if that
  vendor's subscription later lapses — gating the storefront itself would
  break live orders and refunds for something the couple already paid for.

Call `assertVendorFeatureAccess` at the top of every `vendor-store.service.ts`
function reachable only via `vendorStoreRouter`:

- `getVendorStoreProfile`
- `updateVendorStoreProfile`
- `listVendorStoreItems`
- `createStoreItem`
- `updateStoreItem`
- `deleteStoreItem`
- `listVendorStoreOrders`
- `updateStoreOrderStatus`
- `createOrderInvoice`

Do **not** gate `getPublicStoreBySlug`, `listPublicStoreItems`,
`createPublicStoreOrder` — these back `publicStoreRouter` and must stay open
regardless of the vendor's plan, per the reasoning above.

The payment-account/settlement endpoints in the same routes file
(`vendor-payment.controller.ts`'s `getPaymentAccount`,
`onboardPaymentAccount`, `createKycLink`, `syncPaymentAccount`,
`getPaymentSummary`, `refundOrder`) are also `vendorStoreRouter`-mounted and
functionally part of "having a store" — gate these too, in
`vendor-payment.service.ts`, same helper, same label ("Vendor Store").

**Edge case — a vendor with an already-connected payment account who
downgrades.** Their Razorpay Route sub-account and KYC status live outside
this app's database and don't need to be torn down — gating just stops them
from managing/using it through WedHub's UI while downgraded. If they
upgrade again later, `syncPaymentAccount` should still work to pull that
external state back in. No destructive action needed on downgrade.

---

## 5. Where to actually call it — Invoicing

`vendor-invoice.service.ts` has no public/couple-facing functions at all —
every exported function is reachable only by the invoice's owning vendor.
But not every function should be gated the same way:

**Gate outright (creating new value):**
- `createInvoice`
- `updateInvoice`
- `issueInvoice`
- `duplicateInvoice`
- `recordPayment`
- `upsertBillingProfile` (GST details, business info used on the invoice PDF)

**Do NOT gate (reading what already exists):**
- `listInvoices`
- `getInvoiceById`
- `getMetrics`
- `getBillingProfile`
- `deleteInvoice` / `cancelInvoice` / `deletePayment`

The read/delete exclusion is deliberate, not an oversight: if a vendor
downgrades from PREMIUM to FREE, their existing invoices don't disappear —
blocking them from even *viewing* or *cancelling* an invoice they already
issued to a real client would be a genuinely harmful UX (a client asking
"where's my invoice PDF" and the vendor being unable to open it because
their subscription lapsed). Gating only the creation of new
invoices/payments/updates is the same asymmetry `entitlement.service.ts`
already applies to portfolio media on a plan downgrade — see
`sweepMediaToLimits`'s own comment: "Scenario G: never delete... marks
items INACTIVE (hidden, not gone)." Existing invoice data follows the same
never-destroy principle; it's just creation that's gated, not access.

`getLeadPrefill` (pre-fills an invoice draft from an existing Lead) sits
upstream of `createInvoice` — gate it too, since its only purpose is
starting a new invoice.

---

## 6. Downgrade/expiry behavior — what happens to an active store or invoice flow mid-use

`entitlement.service.ts`'s `getEffectivePlan()` already lazily expires a
subscription past its grace period or cancel-at-period-end date (Scenarios E
and F), flipping the vendor back to FREE_EFFECTIVE_PLAN on the next read —
no cron job, no scheduler, evaluated live on each check. `store_access` and
`invoicing_access` fall back to `false` automatically the moment that
happens, with zero new code needed for the downgrade mechanism itself — the
gates added in §4/§5 just start returning `false` the next time they're
checked.

What is new: unlike `sweepMediaToLimits` (which actively hides excess
portfolio media on downgrade), **nothing needs to be swept for Store or
Invoicing** — there's no "limit" to enforce retroactively, only a yes/no
"can you create more." A downgraded vendor's existing store listing stays
live for couples (per §4's public-router carve-out), and their existing
invoices stay visible (per §5's read/delete carve-out). This is simpler than
the media case, not an oversight.

---

## 7. Frontend changes

### 7a. Handle the 403 gracefully, not as a generic error toast

Every vendor-store and invoice mutation call in
`wedhub-frontend-app/lib/api/vendor-store.ts` and
`wedhub-frontend-app/lib/api/vendor-invoices.ts` already goes through the
shared `ApiResponse`/`formatApiError` pattern. No plumbing change needed
there — `AuthorizationError`'s `code: "AUTHORIZATION_ERROR"` already comes
through in `error.code`. What's new is a specific check at the UI layer
instead of the generic toast:

```ts
if (!result.success && result.error?.code === "AUTHORIZATION_ERROR") {
  // show an "Upgrade to PREMIUM" prompt/modal instead of formatApiError's generic toast
}
```

Apply this in:
- `app/(vendor)/vendor/store/StoreProfileForm.tsx` (store creation/update)
- `app/(vendor)/vendor/store/items/StoreItemModal.tsx` (item create/update)
- `app/(vendor)/vendor/invoices/InvoiceEditor.tsx` (invoice create/update)
- `app/(vendor)/vendor/invoices/new/page.tsx` (new-invoice entry point)

### 7b. Don't wait for a 403 — tell the vendor upfront

A FREE vendor navigating to `/vendor/store` or `/vendor/invoices` today gets
a fully-functional page, fills out a form, and only then discovers (via the
403 from §7a) that they can't actually save it. That's a bad experience —
show the gate before they invest effort.

`requireVendorOwnership()` (used at the top of every vendor page, e.g.
`app/(vendor)/vendor/store/page.tsx`, `app/(vendor)/vendor/invoices/page.tsx`)
already fetches the vendor record server-side. The vendor's effective plan
needs to be available at the same point — add a
`getMyEffectivePlan()` read-only endpoint
(`GET /api/v1/vendors/me/effective-plan`, backed by
`entitlementService.getEffectivePlan(vendorId)`, returning just
`{ tier, features }` — never expose `limits` internals the frontend doesn't
need) and check it in both page components:

```tsx
const plan = await getMyEffectivePlan();
if (!plan.features.store_access) {
  return <UpgradePrompt feature="Vendor Store" activeHref="/vendor/store" />;
}
```

`UpgradePrompt` is a new, small shared component
(`components/shared/UpgradePrompt.tsx`) — same visual shell as
`VendorShell` (so the nav stays visible and the vendor isn't stranded), with
a headline, a one-line explanation, and a button to `/vendor/subscription`.
Reuse this same component for both Store and Invoicing rather than writing
two bespoke empty-states.

### 7c. Vendor dashboard nav

`components/shared/VendorShell.tsx` renders a static nav today (confirmed:
no conditional-visibility logic exists anywhere in it). Two options, pick
one:

- **Show the nav item always, gate on click** (simpler, and matches §7b's
  "explain before they invest effort" page-level gate) — a FREE vendor sees
  "Vendor Store" in the sidebar, clicks it, immediately sees the upgrade
  prompt instead of a broken form. Recommended: less nav-state complexity,
  and a visible-but-locked feature is a more effective upsell than a hidden
  one.
- **Hide the nav item entirely for FREE vendors** — requires `VendorShell`
  to accept and branch on the effective plan, adding real complexity to a
  component that's currently static markup for a marginal UX gain.

**Recommendation: show-always, gate-on-click** (§7b already covers this;
no `VendorShell` changes needed).

### 7d. Subscription/pricing page copy

`app/(vendor)/vendor/subscription/SubscriptionBoard.tsx` already renders
`plan.features.featured_eligibility`/`promotional_placement`/etc. as a
bulleted "what's included" list (confirmed in the earlier audit). Add
`store_access`/`invoicing_access` to that same list once the admin plan
data includes them (§8) — no new component, just two more conditional
`<li>` lines following the existing four.

---

## 8. Admin tooling

`app/(admin)/admin/subscriptions/PlanFormModal.tsx` is where an admin edits
a `SubscriptionPlan`'s `features` JSON today. It needs two new toggles
(`Store Access`, `Invoicing Access`) alongside the existing four feature
checkboxes — same form pattern, same `PlanFeatures`-shaped payload sent to
`PATCH /admin/plans/:id`.

`wedhub-backend/src/modules/plans/plan.schema.ts`'s Zod schema for plan
features needs the two new optional booleans added to whatever shape it
currently validates `features` against, so an admin save doesn't get
silently stripped or rejected.

---

## 9. Seed data

`wedhub-backend/prisma/seed.ts`'s `SUBSCRIPTION_PLANS` array — every
existing plan's `features` object gets the two new keys added explicitly
(don't rely on the `FREE_PLAN_DEFAULT_FEATURES` fallback for seeded rows;
be explicit, matching how every other feature is already spelled out per
plan):

```ts
{
  tier: "FREE",
  // ...
  features: {
    analytics_level: "basic",
    lead_access: true,
    featured_eligibility: false,
    promotional_placement: false,
    response_tools: false,
    priority_support: false,
    store_access: false,      // new
    invoicing_access: false,  // new
  },
},
{
  tier: "PREMIUM",
  // ...
  features: {
    analytics_level: "advanced",
    lead_access: true,
    featured_eligibility: true,
    promotional_placement: true,
    response_tools: true,
    priority_support: true,
    store_access: true,      // new
    invoicing_access: true,  // new
  },
},
```

This needs to run on every environment (local, staging, production) via the
existing `npm run db:seed` — same procedure already used and documented in
`server.md` §4B, no new deployment step.

---

## 10. Migration safety — vendors already using these features for free

Confirmed via direct query (local dev database, 2026-09-19): **zero**
`VendorStore` rows, **zero** `VendorInvoice` rows. Nothing to migrate
locally. **Staging and production have not been checked** — this must
happen before the gates in §4/§5 go live there, using the same read-only
query pattern:

```ts
const storeCount = await prisma.vendorStore.count();
const invoiceCount = await prisma.vendorInvoice.count();
```

If either count is non-zero on staging/production:
- Do **not** silently cut those vendors off. Either (a) grant them a
  standing `store_access`/`invoicing_access` override regardless of their
  plan tier (the cleanest way: a manually-created PREMIUM `Subscription`
  row for them at ₹0, or a small allowlist check in
  `entitlement.service.ts` — the allowlist approach is uglier long-term but
  faster to build and easy to remove later), or (b) directly message
  affected vendors ahead of the change with a grace period before
  enforcement begins.
- This is the same category of decision as `PLAN-2026-09-19-a-la-carte-
  vendor-features.md`'s PRO-subscriber migration note — don't reprice or
  restrict an existing user's experience without them knowing first.

---

## 11. Build order

1. **Schema/constants first, no behavior change yet:** add
   `store_access`/`invoicing_access` to `entitlement.constants.ts` (§2),
   `plan.schema.ts` (§8), and seed data (§9). Deploy this alone and verify
   `GET /vendors/me/effective-plan` (once built in step 3) returns the new
   fields correctly for a FREE and a PREMIUM test vendor — nothing is
   gated yet, this just gets the data flowing.
2. **Check staging/production for existing usage (§10)** before proceeding
   — this determines whether step 4 needs a grandfather mechanism first.
3. Build `assertVendorFeatureAccess` (§3) and the
   `GET /vendors/me/effective-plan` endpoint (§7b).
4. Add the backend gates: Vendor Store call sites (§4), Invoicing call
   sites (§5). Deploy and verify with a real FREE-tier test vendor account
   that mutations 403 and public storefront reads/orders still work.
5. Frontend: `UpgradePrompt` component (§7b), page-level gates on
   `/vendor/store` and `/vendor/invoices`, 403-handling in the four
   call-site files listed in §7a.
6. Admin: `PlanFormModal.tsx` toggles (§8), `SubscriptionBoard.tsx` copy
   (§7d).
7. Verification pass — see §12.

---

## 12. Verification checklist

Before calling this done:

- [ ] A FREE-tier vendor calling `POST /api/v1/vendor-store/me` gets a 403
      with the new message; a PREMIUM-tier vendor succeeds. (Confirmed exact
      mount: `apiV1Router.use("/vendor-store", vendorStoreRouter)` in
      `src/routes/index.ts`.)
- [ ] A FREE-tier vendor calling `POST /api/v1/vendor-invoices` gets a 403;
      PREMIUM succeeds. (Confirmed exact route:
      `vendorInvoiceRouter.post("/", ...)` mounted at `/vendor-invoices` in
      `src/routes/index.ts` → `invoiceController.createInvoice`.)
- [ ] A couple hitting `GET /api/v1/stores/:slug` and
      `POST /api/v1/stores/:slug/orders` succeeds regardless of the
      vendor's plan — confirms the public/private split in §4 wasn't
      accidentally inverted. (Confirmed exact mount:
      `apiV1Router.use("/stores", publicStoreRouter)`.)
- [ ] A vendor with an existing invoice, after being downgraded to FREE,
      can still `GET` and view/cancel that invoice but cannot create a new
      one or record a new payment against it.
- [ ] `getEffectivePlan()`'s existing lazy-expiry path (grace period /
      cancel-at-period-end) correctly flips `store_access`/
      `invoicing_access` to `false` without any new code — confirms §6's
      claim that no new expiry logic was needed.
- [ ] Admin can toggle Store/Invoicing access per plan in
      `PlanFormModal.tsx` and it's reflected in a vendor's effective plan
      within one request (no caching issue).
- [ ] `npm run typecheck`, `npm run lint`, and the existing backend unit
      test suite (`npm run test:unit`) all still pass after adding the two
      new entitlement keys — the `PlanFeatures` interface change is the one
      spot most likely to surface a missed call site via a type error.

---

## Open questions

1. Confirm §10's migration approach (grant-override vs. advance-notice) once
   the staging/production counts are known — cannot be decided from the
   code alone.
2. Confirm §7c's show-always-gate-on-click nav recommendation, or prefer
   hiding the nav item for FREE vendors instead.

Resolved during this pass (no longer open): `getLeadPrefill`'s only
frontend caller is `InvoiceEditor.tsx`, exclusively to pre-fill a new
invoice draft — confirmed via a repo-wide search, gating it in §5 is safe.
