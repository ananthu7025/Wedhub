# MVP Cut Line (Frontend)

> Reconciles which of the 34 approved mockup screens (`../wedhub-frontend/`) and which Frontend Arch Phases are MVP vs. deferred, directly against the backend's own MVP decision in [`../docs/02-mvp-cut-line.md`](../docs/02-mvp-cut-line.md). The frontend cannot ship a screen as MVP if the backend surface it depends on is itself post-MVP — that's the primary filter here, not a separate frontend-only judgment call.

See [`00-index.md`](00-index.md) for the Frontend Arch Phase numbering convention.

---

## Governing principle

The backend's reconciled MVP list (`../docs/02-mvp-cut-line.md`, "Final reconciled MVP phase list") already decided this once. The frontend MVP list is **derived**, not re-litigated:

- If a backend Arch Phase is `✅ Full` MVP → the mockup screens depending on it are in scope for frontend MVP.
- If a backend Arch Phase is `⚠️ Minimal`/`⚠️ Thin slice` MVP (Arch Phase 12 Entitlements, Arch Phase 13 Featured Listings) → the frontend renders whatever the thin backend slice actually returns, not the full mockup vision for that feature. Concretely: the vendor `subscription.html` mockup's plan-gating badges are real (Arch Phase 12 minimal entitlements exist), but Featured Listings' "automatic campaign activation" and "vendor self-purchase flow" have no backend to call — the frontend does not build UI for flows the backend doesn't support yet.
- If a backend Arch Phase is `❌ Post-MVP` (Arch Phases 18–25) → no frontend screen depends on it at MVP; none of the 34 mockup screens do.

## Frontend Arch Phase MVP status

| Frontend Arch Phase | Name | Backend dependency | MVP status |
|---|---|---|---|
| 0 | Project Setup & Design System | — | ✅ Full |
| 1 | Auth Flows | Arch Phase 2 ✅ | ✅ Full |
| 2 | Public Discovery | Arch Phase 4,5,6,7 ✅ | ✅ Full |
| 3 | Shortlist, Compare & Enquiry | Arch Phase 8,9 ✅ | ✅ Full |
| 4 | Couple Account | Arch Phase 9,10,14 ✅ | ✅ Full |
| 5 | Vendor Onboarding & Profile Mgmt | Arch Phase 5,6 ✅ | ✅ Full |
| 6 | Vendor Leads & Reviews | Arch Phase 9,10 ✅ | ✅ Full |
| 7 | Vendor Monetization | Arch Phase 11 ✅, 12 ⚠️, 13 ⚠️ | ⚠️ Full for subscription display/upgrade; thin for entitlement-gated UI limits; Featured Listings UI is admin-CRUD-only (matches backend thin slice) |
| 8 | Admin Core | Arch Phase 16 ✅ | ✅ Full |
| 9 | Admin Catalog & Moderation | Arch Phase 4,9,10,16 ✅ | ✅ Full |
| 10 | Admin Monetization, Governance & Audit | Arch Phase 11,12,13,16 ✅ | ⚠️ Same thin-slice caveat as Frontend Arch Phase 7 for Subscriptions/Featured Listings tabs; Roles & Permissions ships as explicitly **read-only** (matches the backend's real state — see `../docs/08-stage-telegram-and-admin.md`) |
| 11 | Telegram Surfacing, SEO & Hardening | Arch Phase 15 ✅, 17 ⬜ | ⚠️ Telegram deep-link surfacing is MVP (backend ready); SEO page generation is blocked until backend Arch Phase 17 ships — see [Open Question 1](10-risks-and-open-questions.md#1-frontend-arch-phase-11-partially-blocked-on-backend-arch-phase-17) |

## Mockup screens explicitly deferred or thinned at MVP

Cross-referencing the 34 screens against the table above:

- **`couple/compare.html`** — MVP. Backend Arch Phase 8 (Favorites/Shortlists/Comparison) is full MVP per the backend's own reconciliation (product.md's own scenarios require it).
- **`vendor/subscription.html`** — MVP for viewing current plan, plan comparison, upgrade/downgrade actions (Arch Phase 11 is full MVP backend). The mockup's invoice/payment history table is MVP since Arch Phase 11 includes payment reconciliation.
- **`vendor/analytics.html`** — MVP, but only for metrics the backend actually computes. Cross-check against `wedhub-backend/src/modules/` before wiring each metric card; do not invent a metric the backend doesn't expose.
- **`admin/subscriptions.html`** — MVP for the Plans tab (admin plan CRUD is real, Arch Phase 11). The Active Subscriptions table is a genuine gap: no `GET /admin/subscriptions` list endpoint exists yet in the shipped backend (confirmed during the admin mockup build — see the admin agent's note inline in that file). Ship the UI, but see [Open Question 2](10-risks-and-open-questions.md#2-admin-subscriptions-screen-has-no-backing-list-endpoint) before marking Frontend Arch Phase 10 done — this may require either a small backend addition or an explicit "not yet available" empty state, decided at implementation time, not silently mocked.
- **`admin/roles-permissions.html`** — MVP, but strictly as a **read-only visibility** screen, matching backend reality exactly (RBAC tables exist and are seeded since backend Arch Phase 2/3, but nothing enforces them — `Role.ADMIN` on `User` is the only real gate today). Do not build editable permission checkboxes; that would misrepresent what the system actually does.
- **`admin/leads.html`** — MVP for viewing/filtering. The mockup's "Reassign" action has no backing endpoint (confirmed by the admin mockup build) — ship the status list/filter UI, defer or grey out reassignment until a backend endpoint exists.
- **`admin/cms.html`** — explicitly **not MVP**. This is a placeholder nav target only (added during the mockup phase so the admin sidebar had somewhere to point), directly blocked on backend Arch Phase 17 which has not started. Do not build real CMS UI against it yet.
- **SEO pages** (category pages, city pages, blog/guides, structured data, sitemap) — **not MVP** for the same reason: no backend Arch Phase 17. These aren't even in the 34-screen mockup (the mockup covers app screens, not marketing/SEO content pages) — they're new scope entirely, correctly sequenced last in Frontend Arch Phase 11.
- **Telegram bot itself** — out of frontend scope entirely (it's its own conversational UI, already fully built in backend Arch Phase 15). The frontend's only Telegram surface is the "Chat on Telegram" deep-link CTA already present in `couple/home.html` and `couple/vendor-profile.html` mockups — that's MVP, trivial, and is all Frontend Arch Phase 11's "Telegram Surfacing" half means.

## What ships post-MVP (frontend)

Directly inherited from `../docs/02-mvp-cut-line.md`'s post-MVP list, translated to frontend terms — no frontend screens exist yet for any of these, so there is nothing to defer beyond simply not building them:

- Advanced analytics dashboards beyond the metrics the backend computes today
- WhatsApp-based discovery UI
- AI Wedding Assistant / natural-language search UI
- Featured Listings self-serve purchase flow, campaign scheduling UI
- Pay-per-lead billing UI
- Vendor CRM / team-account UI beyond the simple team-members list already in `vendor/settings.html`
- Booking/appointment scheduling UI
- Native mobile apps (this is a responsive web app, per product.md §3.6 "Mobile first" — not a separate mobile codebase)
- Full CMS authoring UI, blog/guides pages, SEO landing pages (blocked on backend Arch Phase 17)

## Definition of a Successful Frontend MVP

Directly mapped from `../docs/02-mvp-cut-line.md`'s product.md §71 checklist — the frontend-observable half of each point:

1. Vendors can register. → `auth/signup.html` vendor path wired (Frontend Arch Phase 1)
2. Admin can create vendors. → `admin/vendor-create.html` wired (Frontend Arch Phase 8)
3. Admin can approve vendors. → `admin/vendor-detail.html` approve/reject action wired (Frontend Arch Phase 8)
4. Vendors can build profiles. → `vendor/profile-edit.html` wired (Frontend Arch Phase 5)
5. Vendors can upload optimized portfolios. → `vendor/portfolio.html` wired to real R2 upload/processing (Frontend Arch Phase 5)
6. Users can discover vendors. → `couple/home.html`, `couple/search.html` wired (Frontend Arch Phase 2)
7. Users can search by category/location. → `couple/search.html` filters wired (Frontend Arch Phase 2)
8. Users can shortlist vendors. → `couple/shortlist.html` wired (Frontend Arch Phase 3)
9. Users can submit enquiries. → enquiry modal in `couple/vendor-profile.html` wired (Frontend Arch Phase 3)
10. Vendors receive leads. → `vendor/leads.html` wired (Frontend Arch Phase 6)
11. Vendors can respond/manage leads. → status updates in `vendor/leads.html` wired (Frontend Arch Phase 6)
12. Admin can moderate the marketplace. → `admin/reviews.html`, `admin/vendors.html` wired (Frontend Arch Phase 9)
13. Vendors can upgrade subscriptions. → `vendor/subscription.html` wired to real Razorpay checkout (Frontend Arch Phase 7)
14. Payments are reliably reconciled. → invoice/payment history renders real backend data (Frontend Arch Phase 7) — no frontend-side payment logic, per Coding Rule 1
15. Telegram can collect structured enquiries. → already true backend-side; frontend adds the deep-link CTA only (Frontend Arch Phase 11)
16. SEO pages can generate organic traffic. → **not achievable at frontend MVP** — blocked on backend Arch Phase 17, tracked as the one open gap against this checklist (see Open Question 1)
17. The platform can scale horizontally without architectural rewrites. → satisfied by Next.js's stateless-by-default rendering model + the single typed API client layer; no frontend-specific rework anticipated

Point 16 is the only checklist item this frontend plan cannot satisfy at MVP through no fault of its own — it is exactly the item the backend's own pause-point decision (`../docs/11-progress-log.md`, "Paused here, 2026-09-02") anticipated when it named Arch Phase 17 as the next backend phase to resume.
