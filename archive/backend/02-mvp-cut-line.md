# MVP Cut Line

> Resolves a "two callouts, one decision" problem: both source docs independently declare an MVP scope, and they don't fully agree. This file is the single authoritative MVP statement for the whole `docs/` set — every stage file's task checklist tags each Arch Phase against this doc rather than re-deciding scope locally.

See [`00-index.md`](00-index.md) for the Arch Phase / Product Phase distinction.

---

## What architecture.md says (§53, verbatim)

**In MVP:**

```
0 Foundation
1 Database
2 Auth
3 Users
4 Categories/Locations
5 Vendors
6 Media
7 Search
9 Enquiries/Leads
10 Reviews
11 Subscription foundation
14 Notifications
15 Telegram
16 Admin
17 SEO
```

**Explicitly deferred (post-launch):**

```
Advanced analytics       (→ Arch Phase 18)
Advanced ranking         (→ Arch Phase 7 extension)
WhatsApp                 (→ Arch Phase 37 in product.md, no Arch Phase)
AI matching              (→ product.md §38, no Arch Phase)
Complex promotions       (→ Arch Phase 13)
Pay-per-lead             (→ product.md §31-32, no Arch Phase)
Advanced CRM             (no Arch Phase)
Advanced recommendation engine (→ Arch Phase 7 extension)
Search engine migration  (→ Arch Phase 7 extension)
```

Note what's **missing from both lists**: **Arch Phase 8 (Favorites, Shortlists & Comparison)** and **Arch Phase 12 (Entitlement Enforcement)** are absent from the MVP list, but neither is named in the post-launch list either. This is a genuine gap in the source document, not something this docs set can silently paper over.

## What product.md says (§66, §71)

**§66 "Product MVP" declares in scope**, among other things:

- Public: homepage, category/city browsing, search, filters, vendor profile, portfolio, **reviews**, enquiry
- User: registration/login, **favorites**, **shortlists**, enquiries, basic wedding profile
- Business: Free plan, Pro plan, Premium plan, payment integration, **"Featured listing foundation"**
- Messaging: Telegram chatbot, enquiry creation, vendor notification

**§71 "Definition of a Successful MVP"** — a 17-point checklist ending in: *"The platform can scale horizontally without architectural rewrites."* This is the acceptance bar for "MVP is done," kept verbatim here and cross-referenced from every stage file that contributes to it.

## Conflicts requiring a decision

### 1. Arch Phase 8 (Favorites/Shortlists) — not in either list

Product.md §66 explicitly lists favorites and shortlists as MVP-scope user features, and product.md's own example scenarios (§57 "Example Couple Scenario", §59 "Example Venue Scenario") assume a user favorites/shortlists vendors *before* enquiring. Excluding Arch Phase 8 from MVP would break these scenarios.

**Recommendation: include Arch Phase 8 in MVP.** It's small relative to its stage (paired with Search and Reviews in Stage 3), and product.md's own MVP checklist requires it.

### 2. Arch Phase 12 (Entitlement Enforcement) — not in either list, but structurally required

Coding Rule 8 (see [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md)) forbids hardcoded plan checks (`if plan === "premium"`) in favor of an entitlement service. Arch Phase 11 (Subscription foundation) *is* in MVP — vendors can upgrade to Pro/Premium — but without Arch Phase 12, there is no mechanism to actually gate portfolio limits, analytics access, or any other paid feature. Product.md's own Subscription Scenario B (§28) states step 9 of the upgrade flow is *"Feature entitlements are updated"* — this cannot happen without Phase 12 existing in some form.

**Recommendation: include a minimal Arch Phase 12 in MVP** — enough entitlement-check plumbing to gate portfolio/video/analytics limits per plan. Full-featured entitlement tooling (e.g. admin UI for editing entitlements per plan) can still be deferred.

### 3. Arch Phase 13 (Featured Listings) — direct contradiction between the two docs

- Architecture.md §53 excludes Phase 13 from MVP (via "Complex promotions" in the deferred list).
- Product.md §66 explicitly lists **"Featured listing foundation"** under MVP Business scope.

These directly disagree.

**Recommendation (thin-slice resolution):** ship only the *data model and admin CRUD* for featured listings at MVP (the `featured_listings` table, admin can create/edit/list a featured placement record). Defer: automatic campaign activation/expiry, vendor self-purchase flow, and homepage/search-result placement logic. This satisfies product.md's "foundation" wording without requiring the full Arch Phase 13 scope architecture.md defers.

## Final reconciled MVP phase list

| Arch Phase | Name | Stage file | MVP status |
|---|---|---|---|
| 0 | Architecture & Repository Setup | [03](03-stage-foundation.md) | ✅ Full |
| 1 | PostgreSQL & ORM Foundation | [03](03-stage-foundation.md) | ✅ Full |
| 2 | Authentication & Authorization | [03](03-stage-foundation.md) | ✅ Full |
| 3 | User Module | [03](03-stage-foundation.md) | ✅ Full |
| 4 | Category & Location Catalog | [03](03-stage-foundation.md) | ✅ Full |
| 5 | Vendor Module | [04](04-stage-marketplace-supply.md) | ✅ Full |
| 6 | Media & Portfolio | [04](04-stage-marketplace-supply.md) | ✅ Full |
| 7 | Search & Discovery | [05](05-stage-discovery-engagement.md) | ✅ Full (advanced ranking/search-engine migration deferred) |
| 8 | Favorites, Shortlists & Comparison | [05](05-stage-discovery-engagement.md) | ✅ Full — **decision above**, not in original list |
| 9 | Enquiries & Leads | [06](06-stage-lead-engine.md) | ✅ Full |
| 10 | Reviews & Trust | [05](05-stage-discovery-engagement.md) | ✅ Full |
| 11 | Subscription & Billing Foundation | [07](07-stage-monetization.md) | ✅ Full |
| 12 | Entitlement Enforcement | [07](07-stage-monetization.md) | ⚠️ Minimal — **decision above**, not in original list |
| 13 | Featured Listings & Promotions | [07](07-stage-monetization.md) | ⚠️ Thin slice only — **decision above**, direct doc conflict |
| 14 | Notifications | [08](08-stage-telegram-and-admin.md) | ✅ Full |
| 15 | Telegram Bot MVP | [08](08-stage-telegram-and-admin.md) | ✅ Full |
| 16 | Admin Platform Backend | [08](08-stage-telegram-and-admin.md) | ✅ Full |
| 17 | CMS & SEO Backend | [09](09-stage-growth-and-scale.md) | ✅ Full (matches both docs) |
| 18–25 | Analytics, Security, Testing, Observability, Deployment, Backup/DR, Performance, Production Review | [09](09-stage-growth-and-scale.md) | ❌ Post-MVP, except baseline security/testing needed to ship safely (see Stage 7) |

## What ships post-MVP

Merged from architecture.md §53 and product.md §67 (Post-MVP) and §72 (Non-Goals for MVP), de-duplicated:

- Advanced analytics, advanced search ranking, dedicated search-engine migration
- WhatsApp integration
- AI Wedding Assistant / natural-language search / automated lead qualification
- Full Featured Listings automation (campaign scheduling, vendor self-purchase, placement logic)
- Pay-per-lead billing
- Vendor CRM, vendor team accounts
- Appointment scheduling, online booking, online payment for bookings, booking commissions
- Native mobile apps
- Full wedding event management, guest seating, invitation creation, complex wedding budgeting
- Full vendor booking settlement, escrow
- Microservices, dedicated data warehouse, full video streaming infrastructure

## Definition of a Successful MVP (product.md §71, verbatim, kept as the acceptance bar)

1. Vendors can register.
2. Admin can create vendors.
3. Admin can approve vendors.
4. Vendors can build profiles.
5. Vendors can upload optimized portfolios.
6. Users can discover vendors.
7. Users can search by category/location.
8. Users can shortlist vendors.
9. Users can submit enquiries.
10. Vendors receive leads.
11. Vendors can respond/manage leads.
12. Admin can moderate the marketplace.
13. Vendors can upgrade subscriptions.
14. Payments are reliably reconciled.
15. Telegram can collect structured enquiries.
16. SEO pages can generate organic traffic.
17. The platform can scale horizontally without architectural rewrites.

Every stage file (03–09) should be checked against the relevant points above before being called "MVP-complete."
