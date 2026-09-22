# WedHub — Premium Feature Buildout (Implementation Plan)

**Document:** Implementation Plan — READY TO BUILD, decisions confirmed 2026-09-22
**Depends on:** `PLAN-2026-09-22-dynamic-plans-and-feature-registry.md` (shipped, live on prod/test) —
this plan extends that system's `FEATURE_CATALOG`/`assertVendorFeatureAccess` pattern, doesn't
replace it.
**Scope:** Six items from the user's Premium feature list, checked against actual code
(2026-09-22 audit) and now scoped precisely:

| # | Feature | Status before this plan | This plan's job |
|---|---|---|---|
| 1 | Shareable portfolio microsite | Built, ungated | Gate to Premium (frontend-only) |
| 2 | Verified/Pro badge | Built, admin-only, unlinked to plan | Auto-grant/revoke tied to Premium |
| 3 | Monthly lead cap (Free) + pay-per-lead unlock | Doesn't exist | Build from scratch |
| 4 | Priority search placement | Reserved slot, unfilled | Fill the existing `businessVisibility` term |
| 5 | Profile views count | Already built and working | **Nothing — confirm only** |
| 6 | Lead conversion analytics | Already computed (`conversionRate`), just never gated | Add a plan check to `/leads/analytics` |
| — | Email + chat support | Doesn't exist | **Out of scope — see §8** |

---

## 1. Confirmed decisions (2026-09-22)

1. **Microsite gating**: frontend-only. `GET /vendors/:slug` stays fully ungated (it's shared by
   both `/vendors/[slug]` discovery and `/portfolio/[slug]` — gating it server-side would break
   search/discovery). The `/portfolio/[slug]` page checks the vendor's plan after fetching data and
   renders an "unavailable" state instead of `VendorPortfolioView` when not Premium.
2. **Search ranking**: fill `vendor-ranking.service.ts`'s existing, currently-zero
   `businessVisibility` term (weight 0.1) — not `FeaturedListing` (a separate paid-campaign system,
   confirmed unrelated).
3. **Lead-unlock payment**: extend `Payment.purpose` with `LEAD_UNLOCK`, mirroring the `WEDDING_WEBSITE`
   precedent exactly (one-off purchase, no Subscription involved).
4. **Badge on downgrade**: auto-reverts, consistent with every other Premium entitlement (store,
   invoicing, featured eligibility all already revoke on downgrade).
5. **Lead cap and per-lead unlock price**: both admin-configurable, not hardcoded. The lead cap
   becomes a new `FEATURE_CATALOG` limit (like `portfolio_limit`). The unlock price is not a
   per-plan value (it's what a Free vendor pays regardless of which non-Premium plan they're on) —
   it needs a new, minimal platform-settings concept (§4), since none exists in this codebase today.

---

## 2. Feature 1 — Shareable portfolio microsite gated to Premium

### 2a. New entitlement key

`entitlement.constants.ts`: add to `FEATURE_CATALOG`:
```ts
{
  key: Entitlement.PORTFOLIO_PAGE_ACCESS,
  label: "Shareable Portfolio Page",
  description: "Public /portfolio/:slug page vendors can share via link, QR, or social bio",
  valueType: "boolean",
  defaultValue: false,
}
```
Add `PORTFOLIO_PAGE_ACCESS: "portfolio_page_access"` to `Entitlement`, add `portfolio_page_access:
boolean` to `PlanFeatures`. Same mechanical change as `store_access`/`invoicing_access` in the prior
plan — no new pattern needed here.

### 2b. Backend: new read-only endpoint for the frontend to check plan without duplicating logic

Reuse the existing `GET /vendors/me/effective-plan` pattern is for the *owning* vendor's own check
(vendor dashboard). The portfolio page is a **public, unauthenticated** page rendering a *different*
vendor's data — it needs a public way to know if `PORTFOLIO_PAGE_ACCESS` is on for that vendor's
plan. Add:

```
GET /vendors/:slug/portfolio-access → { available: boolean }
```

`vendor.controller.ts`, new function, calling `entitlementService.canVendorUse(vendor.id,
"portfolio_page_access")` after resolving the vendor by slug (reuse
`vendorRepository.findApprovedVendorBySlug`, same lookup `getPublicVendor` already does — a 404 if
the vendor itself doesn't exist/isn't approved, consistent with the rest of the public API). No
auth required — this is not sensitive data (a yes/no on plan feature), and gating it behind auth
would break server-rendering the public page for anonymous visitors.

### 2c. Frontend: gate at the page level

`wedhub-frontend-app/app/(public)/portfolio/[slug]/page.tsx`: fetch `portfolio-access` alongside
the existing vendor data fetch (parallel, not sequential — don't add a waterfall). If
`available: false`, render a small "This vendor's shareable page isn't active" state instead of
`VendorPortfolioView` — not a 404 (the vendor is real and approved, just doesn't have this feature;
a 404 would be misleading and break any external links/QR codes pointing at a real vendor).

The discovery page (`/vendors/[slug]/page.tsx`) is untouched — it never calls the new endpoint,
never checks this flag, continues to work for every vendor regardless of plan.

### 2d. `SharePortfolioButton.tsx` (share/QR button rendered elsewhere, e.g. `VendorShell.tsx`)

This button currently always renders for an approved vendor (`VendorShell.tsx:198-200,
243-245` — confirmed in the earlier audit). It should stop rendering (or render a disabled/
upgrade-prompt state) for a non-Premium vendor, since sharing a link to a page that shows
"unavailable" is a bad experience. `VendorShell.tsx` already fetches `getMyVendor()` — add a
`getMyEffectivePlan()` call (already exists, from the dynamic-plans work) alongside it, check
`plan.features.portfolio_page_access` before rendering the button.

---

## 3. Feature 2 — Verified/Premium badge tied to plan

### 3a. What "tied to plan" means here, precisely

`verificationLevel` stays exactly as it is today — an admin-controlled, audited field with 4 real
values (UNVERIFIED/IDENTITY_VERIFIED/BUSINESS_VERIFIED/PLATFORM_VERIFIED), used for identity/business
verification, which is a *different concept* from "this vendor pays for Premium." Conflating them
(auto-setting `verificationLevel` on subscription events) would corrupt that audit trail — a vendor
whose Premium lapses would falsely appear to have had their *identity verification* revoked, and an
admin later manually verifying a Free vendor's identity would look inconsistent next to a Premium
vendor who never went through that process at all.

**Instead: a separate, purely plan-derived badge**, shown *in addition to* whatever
`verificationLevel` badge already exists (they can both show — e.g. "✓ Business Verified" AND "⭐
Premium Vendor" as two independent badges). No `Vendor` schema change needed — this badge is just
`plan.features.featured_eligibility` (already exists) reused as the signal, OR a very thin new
boolean if a distinct visual/semantic meaning is wanted. Recommend reusing `featured_eligibility` —
adding yet another near-identical boolean (`premium_badge`) for no behavioral difference would be
exactly the kind of redundant catalog entry the dynamic-plans work was built to avoid.

**Revised decision given this**: no new entitlement key needed. "Auto-revert on downgrade" is
already true for free, for free — `featured_eligibility` already flips to `false` the moment
`getEffectivePlan()` re-evaluates post-downgrade (existing, working code, zero new work).

### 3b. Frontend rendering

`wedhub-frontend-app/app/(public)/vendors/[slug]/page.tsx` (lines ~84-89, ~259, ~308 per the
existing `VERIFICATION_LABEL` map): add a second, independent badge —
`{plan.features.featured_eligibility && <Badge variant="crimson">⭐ Premium Vendor</Badge>}` next to
the existing `VERIFICATION_LABEL` badge. Requires `getPublicVendor`'s response (or a small
follow-up call, mirroring §2b's public-and-cheap pattern) to expose this — add
`isPremiumEligible: boolean` to the public vendor payload directly in `getPublicVendor`
(`vendor.controller.ts`), computed via `canVendorUse(vendor.id, "featured_eligibility")`. This is
simpler than §2b's separate endpoint because it's a single extra field on an already-existing
response, not a distinct micro-page's gate.

### 3c. Also show it in search/vendor cards

`VendorCard.tsx` (search results, homepage) — same `isPremiumEligible` flag, once threaded through
the search response (§4 already adds a plan lookup to search for the ranking boost — reuse that
same lookup to also expose this flag, avoiding two separate plan-data joins per search request).

---

## 4. Feature 4 — Priority search placement (filling the reserved `businessVisibility` slot)

### 4a. Backend: compute a real `businessVisibility` value

`vendor-ranking.service.ts`'s formula already has the term reserved at weight 0.1, currently
hardcoded to `0`. Change: `businessVisibility = plan.features.featured_eligibility ? 1 : 0` — the
simplest possible real value (binary: Premium vendors get the full 0.1 weight, everyone else gets
0), matching the "small, standing boost" framing from the decision in §1.2. No new entitlement key
— reuses `featured_eligibility` again (a vendor who's eligible for featured placement is exactly
the "should rank slightly higher" cohort; introducing a third, near-identical
`priority_search_boost` key would be the same redundancy problem flagged in §3a).

### 4b. Where the plan lookup happens

`search.repository.ts`'s raw SQL (`VendorSearchRow`) doesn't select subscription data today. Two
implementation options:
- **(a) Batch lookup after the SQL query**: `search.service.ts` already only calls `rankVendors`
  for `sort=recommended` (confirmed in audit) — for that path, after fetching the page of vendor
  rows, batch-fetch each vendor's `featured_eligibility` via a single `getEffectivePlan`-shaped
  query (not N+1 — one query for all vendor IDs on the page, joining `Subscription`+`SubscriptionPlan`),
  merge into the `RankableVendor` objects before calling `rankVendors`.
- **(b) SQL-level EXISTS/join**: add a subquery to `search.repository.ts`'s raw SQL directly.
  More invasive (touches hand-written SQL, higher regression risk), and only pays off if this needs
  to affect the SQL `ORDER BY` itself — it doesn't, since `rankVendors` re-sorts in application code
  after the fact.

**Recommend (a)** — smaller, isolated change, consistent with `rankVendors` already being a
post-fetch, in-memory step; page sizes here are small (confirmed `limit` params in the 8–48 range
across call sites), so one batch query per search request is cheap.

### 4c. `sort=relevance` note

Confirmed in audit: `relevance` and `recommended` share the same SQL `ORDER BY` but only
`recommended` gets the JS re-sort. This plan does **not** change that — `businessVisibility` only
applies to `sort=recommended`, matching the existing scope of `vendor-ranking.service.ts` exactly.
Out of scope to extend to `relevance` unless asked.

---

## 5. Feature 6 — Lead conversion analytics, gated

`lead.repository.ts::getVendorLeadAnalytics` already computes `conversionRate: won/received` — this
is **not a new metric**, just an ungated one. `lead.routes.ts:20`'s `GET /leads/analytics` route has
no entitlement check today (confirmed in audit).

Two sub-decisions folded into one small change:
- Keep the *basic* funnel counts (received/contacted/won counts) available to every vendor — these
  aren't a "conversion analytics" feature, they're baseline visibility into your own leads.
- Gate the `conversionRate` field itself (and any deeper breakdown, e.g. by category/time period,
  if one exists in the response — confirm exact response shape during implementation) behind
  `analytics_level` (already exists, already means "basic vs advanced insight depth" everywhere
  else in the app — e.g. profile-view daily breakdown). No new entitlement key.

`lead.controller.ts::getAnalytics`: call `canVendorAccess(vendorId, "analytics_level")`, conditionally
omit `conversionRate` from the response (or return it as `null`) when the result is `"basic"`.
Frontend (wherever this is rendered — likely `wedhub-frontend-app/app/(vendor)/vendor/leads/`)
shows an inline upgrade prompt in that field's place for basic-tier vendors, same pattern as
`AnalyticsBoard.tsx`'s existing basic-vs-advanced UI (confirmed in audit as already having this
exact upgrade-prompt pattern for the profile-view daily breakdown — reuse it, don't invent a new one).

---

## 6. Feature 3 — Lead cap (Free) + pay-per-lead contact unlock (the big one)

This is two related but separable pieces: **(a)** a monthly lead *volume* cap for Free vendors, and
**(b)** paying to unlock a specific lead's *contact details* once received. Both admin-configurable
per the confirmed decisions.

### 6a. Schema — the lead cap (a `limit`-type FEATURE_CATALOG entry)

`entitlement.constants.ts`:
```ts
{
  key: Entitlement.MONTHLY_LEAD_LIMIT,
  label: "Monthly Leads",
  description: "Maximum new leads a vendor can receive per calendar month (0 = unlimited)",
  valueType: "limit",
  defaultValue: 0, // 0 means unlimited — see §6a note below on the sentinel value
}
```
Add `MONTHLY_LEAD_LIMIT: "monthly_lead_limit"` to `Entitlement`, add to `PlanLimits`. Admin sets
this per plan through the already-built `PlanFormModal` (dynamic-plans work) — Free gets e.g. `25`,
Premium gets `0` (unlimited), both fully admin-editable afterward, matching the "admin can config"
answer.

**Sentinel value note**: every other `limit`-type feature (`portfolio_limit`, `video_limit`) is a
real, always-enforced cap — there's no existing "0 = unlimited" convention anywhere in this catalog.
Introducing one here is a new convention. Document it clearly in the `FeatureDefinition.description`
(as above) and in `entitlement.service.ts`'s enforcement function (§6b) so it's not mistaken for "cap
of zero, no leads ever" — an easy and dangerous misread otherwise.

### 6b-note. Single-vendor vs. multi-vendor enquiry — the cap only applies to the latter (confirmed 2026-09-22)

`enquiry.service.ts` has two creation paths: `createSingleVendorEnquiry` (a couple explicitly chose
one vendor) and `createMultiVendorEnquiry` (auto-matches up to `MULTI_VENDOR_SELECTION_SIZE`
vendors). The monthly cap **only filters the multi-vendor fan-out** — a couple's direct, intentional
enquiry to one specific vendor always creates a Lead regardless of that vendor's cap. Filtering the
single-vendor path would return a fake 201 success with zero leads created (confirmed: the
controller always responds 201 with whatever `leads` array comes back, no length check) — a broken,
silent failure for a couple's deliberate action. The cap's entire purpose is throttling *how many
vendors get auto-matched* in the fan-out case, where other under-cap vendors can absorb the
enquiry instead; there's no equivalent "someone else absorbs it" option when the couple picked one
vendor by name.

### 6b. Enforcement — where a lead is actually created

Leads are created by matching an `Enquiry` to vendor(s), not by a vendor action — confirmed via the
`Lead` model (`enquiryId`+`vendorId`, fans out from one Enquiry to multiple vendor Leads). Find the
exact service function that creates `Lead` rows from a new `Enquiry` (likely in `enquiries` module,
not `leads` — the audit didn't trace this specific creation path; **first implementation step is
locating it precisely**, since gating the wrong function silently doesn't work). Once found:

```ts
// Before creating a Lead row for a given vendorId:
const plan = await getEffectivePlan(vendorId);
const cap = plan.limits.monthly_lead_limit;
if (cap > 0) {
  const receivedThisMonth = await leadRepository.countLeadsSince(vendorId, startOfCurrentMonth());
  if (receivedThisMonth >= cap) {
    // Do NOT throw/block the enquiry — the COUPLE is submitting this, not the vendor. Blocking
    // would silently fail a real couple's enquiry because of a vendor-side plan limit they have
    // no knowledge of or control over — a much worse failure mode than the entitlement-check
    // precedent elsewhere (canVendorUpload throws because the VENDOR is the one taking the gated
    // action; here the vendor is not the actor).
    // Instead: skip creating a Lead for THIS vendor only (the Enquiry may still fan out to other,
    // under-cap vendors normally) and log it, so a capped-out vendor simply stops appearing as a
    // recipient for new enquiries until the next month, without anyone getting an error.
    logger.info({ vendorId, cap }, "Vendor at monthly lead cap — enquiry not routed to this vendor");
    continue; // or equivalent skip in the fan-out loop
  }
}
```

This is a meaningfully different enforcement shape from every other gate in this system
(`assertVendorFeatureAccess` throws because a *vendor* is doing something; this is a *silent skip*
during someone else's action) — call this out explicitly in code comments so a future reader
doesn't "fix" it into a throw and break enquiry submission for couples.

`leadRepository.countLeadsSince(vendorId, since)`: new repository function, `prisma.lead.count({
where: { vendorId, createdAt: { gte: since } } })`.

### 6c. Contact-detail redaction on the vendor-facing Lead read

Confirmed in audit: `lead.repository.ts` currently includes full `Enquiry` (with contact fields) on
every lead a vendor fetches — zero redaction. This is genuinely new gating, not a reuse of the
couple-facing `redactContactFields`/reveal-contact flow (different direction, different data).

**New field on `Lead`**: `contactUnlockedAt DateTime?` — null means not yet unlocked (Free vendor,
hasn't paid), non-null means unlocked (either because the vendor is on Premium, or because they paid
for this specific lead). Set at read-time the first time a Premium vendor views a lead (so a
downgrade-then-upgrade-again vendor doesn't need to re-pay for leads they already had full access
to under their earlier Premium period — locking in "seen while Premium" access is more consistent
with the never-destroy principle used elsewhere, e.g. `sweepMediaToLimits` hiding rather than
deleting), or explicitly via the new unlock-payment flow (§6d).

`lead.repository.ts::findLeadById`/`listVendorLeads`: after fetching, if
`!lead.contactUnlockedAt && !(await canVendorUse(vendorId, ...))`, redact `enquiry.contactName`
partially (e.g. first name + last initial — a couple's name isn't the sensitive part, phone/email
are) and null out `contactPhone`/`contactEmail`, same shape as the existing
`redactContactFields`'s `hasContactInfo`-flag pattern (reuse that naming convention for
consistency: `hasFullContactInfo: boolean` on the lead response).

**Premium vendors**: since `monthly_lead_limit` is `0` (unlimited) and nothing blocks them, add a
parallel simple rule — a Premium vendor's leads are *never* redacted (`contactUnlockedAt` gets set
automatically the moment they're created for a Premium vendor, no payment ever involved). This
needs one line in the lead-creation path (§6b) — check `canVendorUse(vendorId, "featured_eligibility")`
(reusing the Premium-cohort signal, consistent with §3a/§4a's reuse decisions) at creation time and
set `contactUnlockedAt = now()` immediately if true.

### 6d. Pay-per-lead unlock flow (Free vendor only)

**New endpoint**: `POST /leads/:id/unlock` — vendor-authenticated, ownership-checked (same
`getOwnedVendorOrThrow` pattern as every other vendor-scoped mutation).

1. Look up the lead, confirm `vendorId` matches, confirm `contactUnlockedAt` is null (409 if already
   unlocked — no double-charging).
2. Look up the current unlock price (§7 — platform setting, not hardcoded).
3. Create a Razorpay order (`createOrder`, same call as `initiateUpgrade` §2 of the dynamic-plans
   audit) for that amount.
4. Create a `Payment` row: `purpose: "LEAD_UNLOCK"`, `pendingVendorId: vendorId`, new field
   `unlockedLeadId: leadId`, `razorpayOrderId`, `amount`, `currency`. No `subscriptionId`,
   no `pendingPlanId` — this payment never touches the Subscription system at all, exactly like
   `WEDDING_WEBSITE`.
5. Return `{ orderId, paymentId, amount, currency }` — same checkout-info shape the frontend
   `CheckoutButton.tsx` already knows how to render (reuse that component, don't build a new one).

**Schema**: `Payment.purpose` enum gets a third value, `LEAD_UNLOCK`. `Payment` gets a new nullable
`unlockedLeadId String? @db.Uuid` + `unlockedLead Lead? @relation(...)`, mirroring the existing
`weddingWebsiteId`/`weddingWebsite` pair exactly (schema.prisma:1714-1739's shape). Migration:
purely additive (new enum value, new nullable FK column + index) — safe against non-empty
production data, no backfill needed (no `LEAD_UNLOCK` payments have ever existed).

**Webhook**: `webhook.service.ts::handlePaymentCaptured` gets a new branch, positioned exactly like
the existing `WEDDING_WEBSITE` branch (§2 of the earlier audit, around line 155): on
`payment.purpose === "LEAD_UNLOCK"`, set `Lead.contactUnlockedAt = now()` for `payment.unlockedLeadId`,
fire a `lead_contact_unlocked` analytics event. This is the *only* place `contactUnlockedAt` gets
set for a paid unlock — the frontend must poll/re-fetch after checkout (same
`pollForActivation`-shaped pattern `SubscriptionBoard.tsx`/`CheckoutButton.tsx` already use for
subscription checkout — reuse it, don't invent a new polling loop).

**Frontend**: wherever a vendor views a lead (`wedhub-frontend-app/app/(vendor)/vendor/leads/` —
exact file TBD at implementation time), if `hasFullContactInfo: false`, show a blurred/masked
phone-email placeholder with an "Unlock for ₹{price}" button instead of the real values. Button
triggers `POST /leads/:id/unlock`, opens the same Razorpay Checkout.js flow as subscription upgrade,
polls for `contactUnlockedAt` to appear, then re-fetches the lead to reveal real values.

---

## 7. New: minimal platform-settings concept (needed for §6d's unlock price)

No such concept exists in this codebase today (confirmed via audit — no `PlatformSetting`,
`SiteConfig`, or equivalent). Building a generic key-value settings system is more than this one
price needs; scope tightly:

```prisma
model PlatformSetting {
  key       String   @id  // e.g. "lead_unlock_price_inr"
  value     Json
  updatedAt DateTime @updatedAt
  updatedByUserId String? @db.Uuid
}
```

One admin endpoint: `PATCH /admin/settings/:key` (ADMIN-only), one read function
`getPlatformSetting(key, fallback)` used by §6d's price lookup (`getPlatformSetting("lead_unlock_price_inr",
49)` — a hardcoded fallback only for the case the row doesn't exist yet, never the source of truth
once an admin has set it). One small admin UI control — a single "Lead unlock price (₹)" number
input, could live on the existing `/admin/subscriptions` page (a natural home, since it's
billing-adjacent) rather than a whole new admin section for one setting.

**Explicitly not building**: a general settings framework, multiple configurable prices, or
anything beyond this one value — if more platform settings are needed later, this model already
supports adding more keys without a schema change (that's the point of the `key`/`value` shape),
so this is not a premature abstraction, just deliberately minimal scope today.

---

## 8. Explicitly out of scope — Email + chat support

Confirmed via audit: zero prior art (no ticket model, no helpdesk module), and the existing
`Conversation`/`Message` model is structurally couple↔vendor, not vendor↔platform-admin (its unique
constraint on `(coupleUserId, vendorId)` would need to change meaning, not just be reused, to
support vendor-to-admin threads — a real data-model fork, not a small extension).

This is a genuinely separate, standalone feature (a support/ticketing system) that doesn't belong
bundled into a "Premium plan wiring" pass — it deserves its own plan when prioritized, covering:
ticket data model, admin-side inbox, notification/email integration, SLA/priority handling if
wanted. **Recommendation: drop from Premium's feature list until it's actually built**, or mark it
"Coming soon" in plan marketing copy rather than implying it's live — shipping a Premium plan that
silently promises support that doesn't exist is worse than not listing it.

---

## 9. Build order

1. **Schema migration**: `PlatformSetting` model (§7), `Payment.purpose` LEAD_UNLOCK + `unlockedLeadId`
   (§6d), `Lead.contactUnlockedAt` (§6c). One migration, purely additive, safe against non-empty prod
   data (confirmed: zero existing Payment/Lead rows reference anything this touches).
2. **`entitlement.constants.ts`**: add `portfolio_page_access`, `monthly_lead_limit` to
   `FEATURE_CATALOG`. (`featured_eligibility` is reused for the badge/ranking/Premium-unlimited-leads
   signals — no new keys needed for those, per §3a/§4a/§6c.)
3. **Locate the actual Enquiry→Lead fan-out creation path** (flagged in §6b as needing precise
   identification before writing the cap-check) — first real implementation step, not assumed.
4. **Lead cap enforcement** (§6b) + **contact redaction** (§6c) — core of feature 3, build and test
   together since they share the `Lead`/`Enquiry` read path.
5. **Lead-unlock payment flow** (§6d): `Payment.purpose` branch in `webhook.service.ts`, new
   `POST /leads/:id/unlock` endpoint, `PlatformSetting` read/write endpoints.
6. **Portfolio-page gating** (§2): new `portfolio_page_access` key, public
   `GET /vendors/:slug/portfolio-access` endpoint, frontend gate on `/portfolio/[slug]` +
   `SharePortfolioButton.tsx`.
7. **Badge + search ranking** (§3, §4): both reuse `featured_eligibility` — smallest pieces, do
   together. `getPublicVendor` gets `isPremiumEligible` field; `vendor-ranking.service.ts`'s
   `businessVisibility` term gets filled via the batch lookup in `search.service.ts`.
8. **Lead conversion analytics gate** (§5): smallest single change, `canVendorAccess("analytics_level")`
   check in `lead.controller.ts::getAnalytics`.
9. **Admin UI**: `monthly_lead_limit` shows up automatically in `PlanFormModal.tsx`'s existing
   catalog-driven Features section (zero new admin UI code needed — this is exactly what that
   generic rendering was built for). Only new admin UI needed: the one `lead_unlock_price_inr`
   input (§7), smallest possible addition to `/admin/subscriptions`.
10. Full verification pass — §10, including a live test of the couple-submits-enquiry → capped
    vendor silently skipped → other vendors still matched flow, since that's the one path in this
    entire plan that deliberately does NOT throw on the gated condition.

---

## 10. Verification checklist

- [ ] `npx tsc --noEmit` clean on both `wedhub-backend/` and `wedhub-frontend-app/`.
- [ ] A Free vendor at their lead cap: a new couple enquiry still succeeds (couple never sees an
      error), and is routed to other, under-cap vendors normally — only skips creating a `Lead` row
      for the capped vendor specifically.
- [ ] A Free vendor under their cap still receives leads normally; cap resets at the start of the
      next calendar month (no manual admin action needed).
- [ ] A Free vendor's lead shows redacted contact info (`hasFullContactInfo: false`,
      phone/email null) until unlocked.
- [ ] `POST /leads/:id/unlock` creates a real Razorpay order; after webhook confirms payment,
      `contactUnlockedAt` is set and the lead's contact info becomes visible on next fetch.
- [ ] A Premium vendor's leads are never redacted — `contactUnlockedAt` set automatically at
      creation time, no payment flow ever triggered.
- [ ] A vendor who paid to unlock a specific lead while on Free, then upgrades to Premium, still
      sees that lead's contact info (never double-gated).
- [ ] `/portfolio/:slug` for a non-Premium vendor shows the "unavailable" state, not a 404, not the
      full portfolio. `/vendors/:slug` (discovery) is completely unaffected for the same vendor.
- [ ] `SharePortfolioButton` doesn't render (or shows an upgrade prompt) for a non-Premium vendor
      in their own dashboard.
- [ ] Search with `sort=recommended` ranks a Premium vendor's businessVisibility term at 1 (verify
      via the score breakdown/logs) and a Free vendor's at 0; `sort=relevance` and other sorts are
      unaffected (confirmed unchanged per §4c).
- [ ] Public vendor profile (search cards, `/vendors/:slug`, `/portfolio/:slug`) shows the Premium
      badge only for a currently-Premium vendor; badge disappears immediately after downgrade/lapse
      (next `getEffectivePlan()` re-evaluation, same mechanism as every other entitlement).
- [ ] `/leads/analytics` response omits (or nulls) `conversionRate` for a basic-analytics vendor,
      includes it for advanced.
- [ ] Admin can edit `monthly_lead_limit` per plan through the existing `PlanFormModal.tsx` Features
      section with zero new admin-UI code (confirms §9 step 9's "already works" claim).
- [ ] Admin can set `lead_unlock_price_inr` via the new settings endpoint/UI, and a subsequent
      unlock purchase charges the new price, not the hardcoded ₹49 fallback.
- [ ] Migration applied cleanly against a non-empty local DB seeded with real Lead/Payment rows.

---

## Open questions — need your input during/before build

1. **Exact Enquiry→Lead creation function** — not identified by the prior audit (it looked at the
   `leads` module, not `enquiries`); first implementation step, not a blocking design question, but
   flagging so it's not assumed already known.
2. **Partial name redaction exact rule** (§6c: "first name + last initial") — confirm this exact
   shape, or specify a different partial-reveal rule, before implementation.
3. **`lead_unlock_price_inr` default fallback value** (§7 code shows `49` as an example fallback,
   used only if no admin has set a value yet) — confirm ₹49, or leave unset until an admin
   explicitly configures it (in which case the endpoint should probably error rather than silently
   charge an assumed default on a truly unconfigured platform).
