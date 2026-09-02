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

### Frontend Arch Phase 8 — Admin Core ✅ Built 2026-09-02 (Playwright verification pending — batched with Stage 4's remaining phases)
- [x] `(admin)/dashboard` — port `admin/dashboard.html`: metric grid wired to the real `GET /admin/dashboard` (totalUsers, totalVendors, activeVendors, paidVendors — ACTIVE-or-TRIALING subscriptions, totalLeads, totalEnquiries, conversionRate as a fraction, newRegistrations with its real window, revenue.total/thisMonth, mrr — ACTIVE-only, YEARLY normalized ÷12), recent-activity feed from real `GET /admin/audit-logs?limit=5`, pending-approvals quick-list from real `GET /admin/vendors?status=PENDING_APPROVAL&limit=4`. The mockup's week-over-week trend arrows on every card are omitted — confirmed via research that no previous-period comparison is computed anywhere in the backend
- [x] `(admin)/vendors` — port `admin/vendors.html`: status filter pills (All/Pending approval/Approved/Rejected/Suspended — Verified/Featured pills omitted, confirmed no backing enum value or data source for either), data table, wired to `wedhub-backend/src/modules/vendor-admin/`. Free-text search and a Plan column/filter are both omitted — confirmed neither exists on `GET /admin/vendors` (no `search` param, no subscription join)
- [x] `(admin)/vendors/[id]` — port `admin/vendor-detail.html`: full profile display (now including a real cover image and real portfolio-adjacent data via the same `logoMedia`/`coverMedia` resolution as Phase 5), verification-level control (real enum, cross-checked against backend Risk 6 — already resolved, matches exactly), approve/reject/suspend/restore/deactivate action bar (only showing the transitions the backend's `transitionStatus()` allow-list actually permits from the vendor's current status), real status-history audit trail. The mockup's "optional approval notes" and "Save as draft" actions are omitted — confirmed `approve()` takes no body at all (only reject/suspend require a reason) and no draft-save endpoint exists
- [x] `(admin)/vendors/create` — port `admin/vendor-create.html` reduced to only what's real (per user decision, 2026-09-02): business name + optional invitation email, calling `POST /admin/vendors` then `POST /admin/vendors/:id/invitations`. The mockup's category/city/phone/internal-note fields are dropped entirely rather than collected with nowhere to persist — confirmed `adminCreateVendorSchema`/`createInvitationSchema` accept only `businessName`/`invitedEmail` respectively; the invited vendor fills in the rest via the same self-service onboarding every vendor already uses (Frontend Arch Phase 5)
- [x] `(admin)/users` — port `admin/users.html`: filter pills (All/Active/Restricted/Deactivated — "Restricted" maps to the real `SUSPENDED` status, confirmed no distinct enum value exists; "Reported" omitted entirely, confirmed via an explicit backend code comment that `ReviewReport` ties a reporter to a review, not a user, so there's no real "this user was reported" data source), data table, suspend/restore actions wired to the real `wedhub-backend/src/modules/admin-users/` endpoints (confirmed solid ground — this module already had a real password-hash-leak bug fixed in it before this phase). No free-text search — confirmed `GET /admin/users` has no search param either

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

### Backend additions required for Frontend Arch Phase 8
- `GET /admin/vendors/:id` previously had no way to show the vendor's owner account (no `owner` relation joined) — the mockup's vendor-detail "Owner account" field had nowhere to read from. Resolved (per user decision, 2026-09-02) by adding a new, admin-only `VENDOR_ADMIN_INCLUDE` (`VENDOR_FULL_INCLUDE` + `owner: { select: { id, email, phone } }`) and a new `findVendorByIdForAdmin()` repository function, used only by `vendor-admin.service.ts`'s `getVendorDetail` — deliberately **not** merged into the shared `VENDOR_FULL_INCLUDE`, since that also backs the public `GET /vendors/:slug` endpoint and merging would have leaked an owner's email/phone publicly. Verified via curl that the public endpoint still omits `owner` after this change.
- No other backend changes were needed — `admin-dashboard`, `vendor-admin`, `admin-users`, and `admin-audit-logs` all already existed with exactly the shapes required, confirmed via a dedicated research pass then re-confirmed field-by-field via extensive live curl calls (admin login via a directly-provisioned ADMIN account — there is no self-registration path for ADMIN, confirmed via `registerSchema`) before writing any frontend code.
- A real type bug was caught during this curl verification (not code review): every admin vendor write endpoint (`verify`, `approve`, `reject`, `suspend`, `restore`, `deactivate`, and `PATCH .../detail`) returns a **scalar-only** `Vendor` row with no relations included at all (`prisma.vendor.update()` with no `include`) — only `GET /admin/vendors` and `GET /admin/vendors/:id` include the full relation set. An initial pass typed every write response as the rich `AdminVendorDetail` shape and replaced full component state with it directly, which would have wiped `profile`/`categories`/`owner` from the UI after any single action. Fixed by introducing a narrower `AdminVendorScalarOnly` type for every write endpoint and merging (not replacing) into existing component state.

**Playwright verification status**: `e2e/phase-08-admin-core.spec.ts` was written (4 tests: dashboard metrics/activity/pending-approvals; a full pending-vendor approve→verify→suspend→restore lifecycle plus a real create-vendor+invitation flow; real user suspend/restore) and passes `tsc`/`eslint` cleanly, but **has not yet been run** — per the same explicit user instruction as Frontend Arch Phase 7, Playwright verification is being batched across this phase and the rest of Stage 4 (Frontend Arch Phases 9–10) rather than run after each individual phase. Every backend integration point for this phase was independently confirmed via live curl before this pause (admin login, dashboard metrics, vendor list/detail/approve/reject/suspend/restore/create/invitation/verify, status-history, audit-logs, user list/detail/suspend/restore) — code-complete and backend-correct, not yet browser-verified.

See [`11-progress-log.md`](11-progress-log.md#frontend-arch-phase-8--admin-core) for the full write-up.

## Acceptance Criteria

- An admin user can log in, see real dashboard metrics, approve a real pending vendor, suspend and restore a real user, and see both actions reflected in a real audit log entry. **⚠️ Backend-verified via curl, browser verification pending (2026-09-02)** — every piece of this is real and confirmed working via curl (login, dashboard metrics, `POST /admin/vendors/:id/approve`, `POST /admin/users/:id/suspend`/`restore`, both producing real `AuditLog` rows readable via `GET /admin/audit-logs`), but the headed Playwright run confirming it end-to-end in a real browser is deferred to the combined Stage 4 verification pass (see the phase's own note above).
- Category/location catalog changes made in the admin UI are immediately reflected in the couple-facing search filters (Stage 2) — verify this cross-stage, since it's the same backend data. *(Frontend Arch Phase 9 scope — not yet built.)*
- The Roles & Permissions screen visibly communicates (via its warning banner) that it is informational only — verified by actually reading the rendered banner text, not just confirming the route exists. *(Frontend Arch Phase 10 scope — not yet built.)*
- The two known gaps (admin subscriptions list, lead reassignment) are either resolved with a real backend addition or explicitly, visibly marked unavailable in the UI — never silently mocked. *(Frontend Arch Phase 9/10 scope — not yet built.)*

## Dependencies / Sequencing

Requires Stage 1 (Foundation) complete. No technical dependency on Stage 2 or Stage 3, though building this stage after them (as recommended in `00-index.md`) means there's real vendor/lead/review data already flowing through the system to administer, which makes manual verification far more meaningful than administering an empty database. Frontend Arch Phase 8 → 9 → 10 is the natural internal order (core entities before catalog/moderation before monetization/governance), but all three could be reordered without technical issues if priorities shift.

## Open Questions

- [Open Question 2](10-risks-and-open-questions.md#2-admin-subscriptions-screen-has-no-backing-list-endpoint) — no `GET /admin/subscriptions` list endpoint exists yet; decide backend-addition vs. explicit-unavailable-state before completing Frontend Arch Phase 10.
- [Open Question 3](10-risks-and-open-questions.md#3-admin-leads-screen-has-no-reassignment-endpoint) — no lead-reassignment endpoint exists yet; omit or grey out that action in Frontend Arch Phase 9.
- [Open Question 16](10-risks-and-open-questions.md#16-admin-vendor-detail-had-no-owner-account-field-resolved) — **✅ Resolved 2026-09-02** — `GET /admin/vendors/:id` now includes the owner's email/phone via a new admin-only `VENDOR_ADMIN_INCLUDE`, without leaking it on the public vendor endpoint.
