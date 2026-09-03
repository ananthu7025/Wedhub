# WedHub — Verified Bug List

> Source: `docs/api-frontend-gap-analysis.md` (written by another agent). Every item below was
> independently re-verified against the real running code before being listed here — several claims
> in that doc turned out to be stale or fabricated and are **not** included (see "Rejected findings"
> at the bottom). Only confirmed, real defects are tracked as tasks.
>
> Created: 2026-09-03

## Status legend
- [ ] Not started
- [x] Fixed

---

## Tasks

### 1. [x] Admin lead search filter is validated but silently dropped
**Where**: `wedhub-backend/src/modules/leads/lead.controller.ts` (`listAllLeadsAdmin`, ~line 66-72), `lead.service.ts` (`listAllLeadsAdmin`, ~line 92-94), `lead.repository.ts` (`findAllLeadsAdmin`/`countAllLeadsAdmin`, ~line 87-101).
**Bug**: `listLeadsQuerySchema` (`lead.schema.ts:25-30`) validates a `search` query param, but the controller destructures only `{ status, page, limit }` — `search` is accepted by validation and then thrown away. The repository's filter type doesn't even have a `search` field. Admins typing a search term in the leads UI get unfiltered results with no error.
**Fix**: Thread `search` through controller → service → repository, filtering leads (likely by contact name/email/phone or vendor business name — check what the admin leads UI actually expects to search on) with a Prisma `contains`/`OR` clause, case-insensitive.
**Fixed 2026-09-03**: `search` now filters on `enquiry.contactName`/`contactEmail`/`message` and `vendor.businessName` (case-insensitive), mirroring the vendor-facing `listOwnLeads` filter. Added a real search box to the admin leads UI (it was deliberately left unbuilt before — see the comment that used to be in `AdminLeadsTable.tsx`). Verified against real seeded data: a real term matched 8 leads, a nonsense term matched 0.

### 2. [x] RBAC tables exist but are completely unused — `authorize()` only checks the legacy role enum
**Where**: `wedhub-backend/src/common/middleware/authorize.middleware.ts`.
**Bug**: `authorize()` did `allowedRoles.includes(req.user.role)` — a hardcoded check against the `User.role` enum (`END_USER`/`VENDOR`/`ADMIN`). The `Role`, `Permission`, `RolePermission`, and `AdminUser` tables (`schema.prisma:107-155`) are fully modeled and the admin UI (Phase 10) lets admins view roles/permissions/admin-user assignments — but none of it fed into an actual access-control decision. Every admin route just checked `role === ADMIN`.
**Fixed 2026-09-04**: `authorize()` now additionally requires a real `AdminUser` → `Role` link with at least one permission whenever `Role.ADMIN` is in play (scoped to the ADMIN case only — `end_user`/`vendor` roles have no `AdminUser` rows and nothing consults them per-request today). Found and closed a real, separate gap along the way: 3 of 4 existing `ADMIN`-role users (`phase2-admin-test@`, `phase3-admin-test@`, `phase8-admin-test@`) had **no** `AdminUser` row at all — created before the RBAC tables/`create-admin.ts`'s pattern existed. Backfilled all 4 with a real link to the `"admin"` role (which carries all seeded permissions) before flipping the enforcement on, so no existing admin lost access. There are still no create/assign endpoints for custom roles — the admin UI remains view-only for `Role`/`Permission`/`AdminUser` — so this enforcement changes nothing observable today; it only starts mattering once a restricted, non-`"admin"` role can actually be created and assigned (a separate, not-yet-built piece, explicitly out of scope for this fix per user decision).
**Also fixed as a consequence**: no `error.tsx` boundary existed anywhere in the frontend, so an admin whose access is denied by the new check would have hit a raw 500/crash instead of a real message. Added `wedhub-frontend-app/app/(admin)/error.tsx` (the first error boundary in the app) — shows "You don't have access to this" for a permission-shaped error, a generic retry message otherwise. Verified live in a real browser: a test user promoted to `ADMIN` with no `AdminUser` link correctly sees the new message instead of a crash; the real `admin@wedhub.dev` account (and the 3 backfilled legacy admins) retain full 200-status access across dashboard/vendors/roles-permissions pages.

### 3. [x] Notification preference toggles write to the wrong table — have zero effect on real notifications
**Where**: `wedhub-frontend-app/app/(couple)/account/AccountForms.tsx` (`NotificationPreferencesForm.persist`, ~line 156-164) calls `updateMyProfile({ preferences: { notifications: next, ... } })` → backend `users.schema.ts` `updateProfileSchema.preferences` → a JSON blob on `UserProfile`. Meanwhile `wedhub-backend/src/modules/notifications/notification.service.ts` (`resolveChannels`, ~line 16-24) reads from the dedicated `notification_preferences` table (`schema.prisma:1264-1277`, keyed by `userId + eventType + channel`) via `notificationRepository.findPreferences`.
**Bug**: These are two entirely disconnected storage paths. A couple toggling "email notifications off" in their account page updates a JSON field nobody reads; the actual send logic checks a completely different table that's never written by this UI. Toggling preferences silently does nothing.
**Note**: Per the existing gap-analysis doc, Phase 7 already built the correct client (`notification-preferences-client.ts`) for the vendor settings page, which presumably does hit the right endpoint (`PUT /notifications/me/preferences`) — confirm this before reusing it.
**Fix**: Point `AccountForms.tsx`'s couple notification toggles at the same `PUT /notifications/me/preferences` endpoint/client the vendor settings page already uses, instead of `updateMyProfile()`. Remove the dead `preferences.notifications` JSON write once migrated (or leave it and just stop relying on it — confirm nothing else reads it first).
**Fixed 2026-09-03**: `NotificationPreferencesForm` now calls `setNotificationPreference()` (`PUT /notifications/me/preferences`), same as the vendor settings page. Per user decision, the old SMS and marketing-email toggles were removed rather than rewired — neither has a real backing API (no `SMS` channel exists at all; no marketing-email event type exists). Only "Email notifications" remains, now wired to the real `LEAD_STATUS_UPDATED`/`EMAIL` preference (see #4). The old `preferences.notifications` JSON field on `UserProfile` is left alone (harmless, unused, mirrors a real backend field shape) since nothing else reads it.

### 4. [x] Lead status changes never notify the couple who submitted the enquiry
**Where**: `wedhub-backend/src/modules/leads/lead.service.ts` — `updateStatus` (vendor-facing, ~line 45-79) and `updateStatusAdmin` (~line 104-124).
**Bug**: Neither function calls `notificationService.notify()` (or imports the notification module at all). When a vendor moves a lead from `CONTACTED` → `RESPONDED` → `WON`, the couple who submitted the enquiry gets no in-app notification and no email — they have to manually refresh `/enquiries` to find out anything happened.
**Fix**: After `leadRepository.updateLeadStatus` succeeds in both functions, call `notificationService.notify()` with an appropriate event type (check `NotificationEventType` enum for an existing lead/enquiry-status value, or add one) targeting the couple's `userId` on the enquiry.
**Fixed 2026-09-03**: No existing event type actually fit — every one of the 17 pre-existing `NotificationEventType` values is vendor- or account-facing (`USER_REPLIED`'s template is written from the vendor's inbox perspective, not a couple-facing one). Added a new `LEAD_STATUS_UPDATED` event type (migration `20260903060908_add_lead_status_updated_notification_event`), fires on every status transition in both `updateStatus` (vendor) and `updateStatusAdmin` (admin), per user decision — not narrowed to "meaningful" transitions only. Skips silently for guest enquiries (`Enquiry.userId` is nullable). Defaults to `EMAIL + IN_APP`, matching `VENDOR_APPROVED`/`VENDOR_REJECTED`'s channel choice for the equivalent vendor-side event. Verified end-to-end against the real database: triggering a real status change created 2 real `Notification` rows with correct title/body/vendor name.

### 5. [x] Signup password field has no max-length guard — 129+ char passwords fail only after submit
**Where**: `wedhub-frontend-app/app/(auth)/signup/SignupWizard.tsx` (~line 110-114).
**Bug**: Backend `passwordSchema` (`wedhub-backend/src/modules/auth/auth.schema.ts:4-7`) caps passwords at `max(128)`. The signup input has `minLength={8}` but no `maxLength`, so a password over 128 characters passes client validation, gets submitted, and fails with a 400 from the server with no client-side warning first.
**Fix**: Add `maxLength={128}` to the password input in `SignupWizard.tsx`.
**Fixed 2026-09-03.**

### 6. [x] Broader pattern: most forms don't mirror backend Zod length/bounds limits client-side
**Where**: confirmed via repo-wide grep — only `ProfileEditor.tsx` uses any `maxLength` attribute anywhere in the frontend; every other form flagged in the gap-analysis doc's Section 3 table has zero client-side length/bounds enforcement matching its backend schema (enquiry contact name/phone/message, review content, vendor tags/languages/team size/travel policy/address, package inclusions/description, wedding guest count, partner name, lead status reason, suspension reason fields, category/location name & description).
**Bug**: Not a functional break — the backend still rejects invalid input with a 400 — but every one of these is a bad UX paper cut: the user fills a long form, submits, and only then learns a field was too long, with no early client-side signal.
**Fix**: Lower priority / do last. Go through the specific fields listed in `docs/api-frontend-gap-analysis.md` Section 3 and add matching `maxLength`/`min`/`max` attributes (and for the two `Array.max(N)` cases — tags/languages/inclusions — client-side count validation before submit, since HTML has no native array-length constraint).
**Fixed 2026-09-03**: Added matching `maxLength`/`min`/`max` to: `EnquiryModal.tsx` (contact name 200, phone 6–20, message 2000, plus `.trim()` before submit so whitespace-only no longer bypasses `required`), `ReviewForm.tsx` (content 3000), `ProfileEditor.tsx` (address 300, travel policy 500, team size max 10000, plus a pre-submit guard on tags/languages — 20 items × 50 chars each — that blocks the whole multi-request save fan-out before it starts rather than failing partway through), `PackageModal.tsx` (description 2000, inclusions capped at 50 items × 200 chars each, enforced at the "+ Add item" step), `AccountForms.tsx` (partner name 200, guest count max 100000), `VendorDetailBoard.tsx` (suspension reason 1000), `UserDetailBoard.tsx` (suspension reason 500 — this one uses a native `prompt()` with no `maxLength` support, so it's enforced as a pre-submit length check instead), `CatalogBoard.tsx` (category name 150, starting price label 60), `LocationTree.tsx` (location name 150, both country and child-node inputs). Also added the missing `reason` UI to the vendor leads board (`LeadsBoard.tsx`) — previously the field existed on the type and backend but nothing in the vendor UI ever collected or sent it — and a `maxLength={500}` to the admin lead detail reason input, which already worked correctly.

---

## Rejected findings (from the source doc — verified FALSE, not real)

These claims in `docs/api-frontend-gap-analysis.md` were checked against the current code and do
**not** describe a real bug. Not tracked as tasks. Worth fixing the source doc's accuracy at some
point, but not urgent.

- **"Login Identifier" (Section 3)** — claimed `LoginForm.tsx` uses `<Input type="email" required />`, forcing email-only format and blocking valid phone logins. **False**: `LoginForm.tsx:52-59` actually uses `type="text"` with placeholder "Email or phone" — there is no `type="email"` anywhere in the file. Phone login works fine.
- **"Review Photo Types" (Section 3)** — claimed frontend uses `accept="image/*"`, allowing `.gif`/`.bmp`/`.svg`/`.heic`/`.tiff` uploads that the backend then rejects. **False**: `ReviewForm.tsx:156` already uses `accept="image/jpeg,image/png,image/webp"` — an exact match to the backend's `IMAGE_MIME_TYPES` allow-list in `review-media.schema.ts:3`.
- **"5-Request Save Fan-Out" (Section 4.2)** — the "exactly 5 requests" framing is imprecise (the real count is data-dependent — 3 fixed calls plus a variable-length loop of service attach/detach calls, so it's rarely exactly 5). The underlying claim (sequential, no rollback, but each step does surface its own error) is real and is tracked as a lower-priority note under item 6 rather than its own task, since partial-save-with-error-shown is a real but low-severity gap, not silent data corruption.
