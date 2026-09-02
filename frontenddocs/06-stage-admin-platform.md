# Stage 4 — Admin Platform (Frontend)

## Stage Goal

Build the internal operations platform: dashboard, vendor/user management, category/location catalog, lead oversight, review moderation, subscription/payment oversight, RBAC visibility, and audit log. Lower business priority than Stage 2/3 (this is an internal tool, not user/vendor-facing revenue surface), which is why it's sequenced after both per `00-index.md` — but the backend (Arch Phase 16) has been fully live since before this plan started, so there's no technical blocker, only a priority ordering.

## Included Frontend Arch Phases

- **Frontend Arch Phase 8** — Admin Core (Dashboard, Vendors, Users)
- **Frontend Arch Phase 9** — Admin Catalog & Moderation (Categories/Locations, Leads, Reviews)
- **Frontend Arch Phase 10** — Admin Monetization, Governance & Audit (Subscriptions, Roles, Audit Log, Settings)

## Product Roadmap Cross-Reference

Maps to product.md §2.3 "Admin goals" (all 15 points) and product.md §39's admin panel structure (Dashboard/Vendors/Users/Categories/Locations/Leads/Subscriptions/Payments/Reviews/CMS/Analytics/Settings nav map — this is the same nav map the admin mockup was built against).

## Backend Dependency

Arch Phase 16 (Admin Platform Backend) ✅ Done — covers dashboard metrics, user suspend/restore, audit log read, RBAC read-only visibility. Also depends on Arch Phase 4 (Categories/Locations), 9 (Leads), 10 (Reviews), 11–13 (Subscriptions/Entitlements/Featured Listings) for the domain data admin operates on — all ✅/⚠️ per `../docs/11-progress-log.md`. **Two real gaps exist** — see Open Questions below, both already identified during the admin mockup build.

## Included Mockup Screens

`admin/dashboard.html`, `admin/vendors.html`, `admin/vendor-detail.html`, `admin/vendor-create.html`, `admin/users.html`, `admin/categories-locations.html`, `admin/leads.html`, `admin/subscriptions.html`, `admin/reviews.html`, `admin/roles-permissions.html`, `admin/audit-log.html`, `admin/settings.html`, `admin/cms.html` (placeholder only — see below)

## Task Checklist

### Frontend Arch Phase 8 — Admin Core
- [ ] `(admin)/dashboard` — port `admin/dashboard.html`: metric grid wired to the real `wedhub-backend/src/modules/admin-dashboard/` metrics (total users, total vendors, active vendors, paid vendors, leads, enquiries, revenue, MRR, conversion, new registrations — match the exact metric names/formulas the backend's `admin-dashboard.service.ts` actually computes, not the mockup's guesses), recent-activity feed from real audit logs, pending-approvals quick-list
- [ ] `(admin)/vendors` — port `admin/vendors.html`: status filter pills (All/Pending/Rejected/Suspended/Verified/Featured), search, data table, wired to `wedhub-backend/src/modules/vendor-admin/`
- [ ] `(admin)/vendors/[id]` — port `admin/vendor-detail.html`: full read-only profile display, verification-level control, approve/reject action bar with reason, audit trail card for that vendor. Verification levels must match the real enum (`UNVERIFIED, IDENTITY_VERIFIED, BUSINESS_VERIFIED, PLATFORM_VERIFIED` per product.md §25 — cross-check against [Risk 6 in the backend docs](../docs/10-risks-and-open-questions.md#6-verification-level-enum-mismatch) in case that mismatch is still unresolved)
- [ ] `(admin)/vendors/create` — port `admin/vendor-create.html`: the admin-initiated vendor creation form (Route B per product.md §5/§40), wired to the real admin vendor-creation endpoint
- [ ] `(admin)/users` — port `admin/users.html`: filter pills (All/Active/Restricted/Reported — confirm "Reported" has a real backing filter or if it should read "Restricted" only, since a prior backend note found no dedicated "reported users" data source), data table, suspend/restore actions wired to the real `wedhub-backend/src/modules/admin-users/` endpoints (this module is fully real and already had a password-hash-leak bug fixed in it — a good sign this is solid ground to build on)

### Frontend Arch Phase 9 — Admin Catalog & Moderation
- [ ] `(admin)/categories-locations` — port `admin/categories-locations.html`'s two-tab layout: category management (create/edit/disable/reorder, subcategories, attribute/filter config) and location management (country/state/city/area tree), wired to `wedhub-backend/src/modules/categories/` and `locations/` admin endpoints
- [ ] `(admin)/leads` — port `admin/leads.html`: status filter pills matching the real Lead Lifecycle enum, table with view-detail action. Per [Open Question 3](10-risks-and-open-questions.md#3-admin-leads-screen-has-no-reassignment-endpoint), omit or grey out the "Reassign" action — no backend endpoint exists for it
- [ ] `(admin)/reviews` — port `admin/reviews.html`: filter pills using the real backend status name (`FLAGGED`, not "Reported" — label the tab in user-friendly language but filter on the real enum value), review cards with approve/hide/remove/dispute actions wired to `wedhub-backend/src/modules/reviews/` admin endpoints

### Frontend Arch Phase 10 — Admin Monetization, Governance & Audit
- [ ] `(admin)/subscriptions` — port `admin/subscriptions.html`'s tabs: Plans (real CRUD against `wedhub-backend/src/modules/plans/` admin endpoints — this is real and important, since product.md explicitly requires admin-configurable pricing), Active Subscriptions (per [Open Question 2](10-risks-and-open-questions.md#2-admin-subscriptions-screen-has-no-backing-list-endpoint), decide and document the resolution before marking this done — do not silently mock), Transactions/Payments, Webhooks log, Coupons
- [ ] `(admin)/roles-permissions` — port `admin/roles-permissions.html` **exactly as read-only**, including its warning banner, matching `wedhub-backend/src/modules/admin-roles/`'s actual read-only scope (confirmed in `../docs/08-stage-telegram-and-admin.md`: Role/Permission/AdminUser tables are seeded and viewable but nothing enforces them beyond `User.role === ADMIN`). Do not build editable permission checkboxes — that would misrepresent the real system.
- [ ] `(admin)/audit-log` — port `admin/audit-log.html`: filterable audit trail wired to `wedhub-backend/src/modules/admin-audit-logs/`, with before/after diff rendering
- [ ] `(admin)/settings` — port `admin/settings.html`: feature flags, notification settings, lead rules, subscription rules — wire whatever the backend actually exposes as configurable; for anything the mockup shows that has no backend config endpoint, mark it clearly as a future/static placeholder rather than a working control
- [ ] `(admin)/cms` — port `admin/cms.html` **as the placeholder it already is**. Do not build real CMS functionality here; this route exists only so the sidebar has a valid target until backend Arch Phase 17 ships (see `07-stage-growth-and-hardening.md`)

See [`11-progress-log.md`](11-progress-log.md#frontend-arch-phase-8--admin-core) for the full write-up once complete.

## Acceptance Criteria

- An admin user can log in, see real dashboard metrics, approve a real pending vendor, suspend and restore a real user, and see both actions reflected in a real audit log entry.
- Category/location catalog changes made in the admin UI are immediately reflected in the couple-facing search filters (Stage 2) — verify this cross-stage, since it's the same backend data.
- The Roles & Permissions screen visibly communicates (via its warning banner) that it is informational only — verified by actually reading the rendered banner text, not just confirming the route exists.
- The two known gaps (admin subscriptions list, lead reassignment) are either resolved with a real backend addition or explicitly, visibly marked unavailable in the UI — never silently mocked.

## Dependencies / Sequencing

Requires Stage 1 (Foundation) complete. No technical dependency on Stage 2 or Stage 3, though building this stage after them (as recommended in `00-index.md`) means there's real vendor/lead/review data already flowing through the system to administer, which makes manual verification far more meaningful than administering an empty database. Frontend Arch Phase 8 → 9 → 10 is the natural internal order (core entities before catalog/moderation before monetization/governance), but all three could be reordered without technical issues if priorities shift.

## Open Questions

- [Open Question 2](10-risks-and-open-questions.md#2-admin-subscriptions-screen-has-no-backing-list-endpoint) — no `GET /admin/subscriptions` list endpoint exists yet; decide backend-addition vs. explicit-unavailable-state before completing Frontend Arch Phase 10.
- [Open Question 3](10-risks-and-open-questions.md#3-admin-leads-screen-has-no-reassignment-endpoint) — no lead-reassignment endpoint exists yet; omit or grey out that action in Frontend Arch Phase 9.
