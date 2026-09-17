# Plan: Verified signup, profile-setup wizards, vendor-signup fix, and in-app inbox

Status: ALL 6 PHASES DONE (built + verified live 2026-09-16/17, see §Progress log at the end). The full 9-item request is complete. Read `PENDING-WORK.md` and the coding-conventions memory before touching any of this — this plan assumes and follows those conventions (module layering, verify-before-build, `apiFetch`'s `public` flag, no unrequested commits).

This plan covers 9 requested items. It groups them into 6 build phases ordered so each phase either stands alone or unblocks the next, and flags the exact current-state evidence behind each decision (from a full codebase investigation completed today) so nothing here is guesswork.

---

## 0. Current-state findings that drive this plan

- **No email-verification gate exists anywhere**, backend or frontend. `User.emailVerifiedAt` (nullable timestamp) is set by `auth.service.ts`'s `verifyEmail()`, but `login()` never checks it, no middleware checks it, and the frontend's `proxy.ts`/`lib/auth/dal.ts` route guards only check role, never verification. The *only* place `emailVerifiedAt` has any effect today is vendor-listing status progression (`vendor.service.ts`'s `submitForReview`/`advanceIfEmailNowVerified`), which parks a listing in `PENDING_VERIFICATION` instead of `PENDING_APPROVAL` — not an app-access gate.
- **Signup auto-logs-in and jumps straight to profile setup** (`SignupWizard.tsx`'s `handleCredentialsSubmit`), with zero verification interstitial. `verify-email/page.tsx` exists but is only reachable by clicking the emailed link — it's not wired into the signup flow's navigation at all.
- **"Edit email" doesn't exist.** `AccountDetailsForm` renders `me.email` as a hardcoded `disabled` input. No backend endpoint accepts an email change (`users.routes.ts` has no such route; `updateProfileSchema` has no `email` field).
- **Vendor onboarding is a single "Business Name" field**, used identically in two places (inline in `SignupWizard`'s vendor branch, and standalone at `/vendor-onboarding`). No category/location/pricing/description is asked at onboarding time — that's all deferred to the vendor dashboard's profile editor. No draft/autosave/localStorage exists anywhere in this flow.
- **The couple side has no profile-setup wizard at all** — only a flat "Wedding details" section on the account page (`WeddingDetailsForm`: weddingDate, partnerName, guestCount only). No function-type, no time-of-function, no category-of-interest, no price-range fields exist on `WeddingProfile` today.
- **The "Register as Vendor" bug is exactly reproducible** at `wedhub-frontend-app/app/(auth)/signup/page.tsx:24-27`: any already-authenticated visitor hits an unconditional `redirect(roleHomeRoute[session.role])` before `?type=vendor` is ever read. For a signed-in `END_USER`, `roleHomeRoute.END_USER = "/shortlist"` — matching the reported symptom exactly. Root cause: `role` is a single enum column on `User` (`END_USER | VENDOR | ADMIN`), so one account can never hold both roles — a customer genuinely cannot "become" a vendor on the same account, which is why the fix is to offer logout (to sign up fresh as a vendor), not to silently redirect.
- **No inbox/messaging system exists at all.** `messaging/` is a literal empty `.gitkeep` stub, unregistered in `routes/index.ts`, with zero Prisma models. `NEW_MESSAGE`/`USER_REPLIED` notification event types exist as unused placeholders. This is fully greenfield.
- **Notification infrastructure is solid and reusable.** `notificationService.notify({ userId, eventType, data, relatedEntityType, relatedEntityId })` is the one generic entry point every module already calls; `NEW_LEAD` exists end-to-end (enum + template + default channel + already fired from `enquiry.service.ts`). Both couple and vendor already have symmetric `/notifications` pages sharing one `NotificationsList` component. Delivery is fetch-on-load only — no websocket/SSE/polling infrastructure exists anywhere.
- **Matching logic exists but isn't a standalone reusable matcher.** `enquiry.service.ts::createMultiVendorEnquiry` inlines a call to `search.repository.ts::searchVendors({categoryId, cityId, priceMin, priceMax, ...})` + `vendor-ranking.service.ts::rankVendors()`, triggered synchronously by a customer-initiated multi-vendor enquiry POST. There is no persisted "couple preference profile" and no background job that scans new/updated couple profiles against vendors (or vice versa). Building item 8 means either reusing this call pattern at profile-save time, or building a new persisted-preference + matching step — this plan does the former (cheaper, reuses proven code, matches the existing architecture).
- **Form conventions**: no `react-hook-form`/`zod` resolver library is installed on the frontend; every existing form uses plain `useState` + manual validation + a single top-of-form (or field-level, ad hoc) error message, with Zod enforced server-side via `validateBody`. New forms in this plan should follow the same pattern for consistency, just applied per-field rather than only at the top.

---

## Phase 1 — Email verification gate (item 1) + edit email (item 9)

These are grouped because item 9's "re-verification" reuses exactly the token/email machinery item 1 needs anyway.

### 1a. Backend

- **Add a resend-verification endpoint.** `POST /auth/me/resend-verification` (authenticated) — reuses `generateOpaqueToken()` + `createEmailVerificationToken()` + `notify({eventType: "VERIFICATION"})` already in `auth.service.ts`'s `register()`; extract that block into a shared `issueVerificationEmail(userId, email)` helper called from both `register()` and this new endpoint. Rate-limit it (reuse the `registerRateLimiter` pattern, new limiter instance).
- **Add change-email endpoints:**
  - `POST /auth/me/change-email` (authenticated, body: `{ newEmail, currentPassword }`) — verifies password, checks `newEmail` uniqueness (409 if taken), and instead of changing `email` immediately: creates a `EmailChangeToken` (new model, same shape as `EmailVerificationToken` but also stores `newEmail`), and emails the verification link to the **new** address. `email` on `User` is not touched yet — prevents account lockout/hijack if the new address is mistyped or not owned by the user.
  - `POST /auth/confirm-email-change` (body: `{ token }`) — validates token, then in one transaction: updates `User.email = newEmail`, sets `emailVerifiedAt = now()` (the new address was just proven), and marks the token used. Returns success; frontend then prompts re-login if the session's email claim is stale (check what's in the JWT payload — currently only `sub`/`role` per the research, so no session invalidation is actually needed here, just a UI refresh).
  - New Prisma model `EmailChangeToken` (mirrors `EmailVerificationToken`, add `newEmail String @map("new_email")`), new migration.
- **Enforce the gate itself.** Add a new `requireVerifiedMiddleware` (in `common/middleware/`, next to `authenticate.middleware.ts`) that checks `req.user` against a fresh `emailVerifiedAt` read (needs one extra `User` lookup, or thread `emailVerifiedAt` onto the JWT payload at login time and re-issue on verify — **recommendation: add `emailVerifiedAt` as a JWT claim**, refreshed on login/refresh/verify, to avoid an extra DB hit per request; document the small staleness window this introduces, capped by access-token TTL).
  - Apply this middleware to: vendor profile-setup endpoints (`vendor-onboarding`'s `createVendor`, and the new couple profile-setup endpoint from Phase 2), NOT to read-only endpoints like `GET /me`, browsing, search, etc. — the ask is specifically "only after verification should profile setup happen," not "block the whole app."
- **Do not touch** `vendor.service.ts`'s existing `PENDING_VERIFICATION`/`advanceIfEmailNowVerified` logic — that's a separate, correct, pre-existing concern (listing approval progression) and stays as-is; the new gate is about *reaching* profile setup, not about listing approval.

### 1b. Frontend

- **New interstitial screen** shown immediately after registration, before the wizard's "profile" step: "Verify your email — we've sent a link to {email}. Check your inbox to continue." with a "Resend email" button (calls the new resend endpoint, basic cooldown timer to prevent spam-clicking) and a "Change email" link (see below). This replaces the current unconditional `setStep("profile")` jump in `SignupWizard.tsx`'s `handleCredentialsSubmit`.
- **Poll or re-check on return.** Since there's no websocket infra, use a simple approach consistent with the codebase's existing patterns (`SubscriptionBoard.tsx`'s payment-confirmation wait loop is the closest precedent): short-interval poll of `GET /users/me` (or a lightweight `/auth/me/verification-status`) while the interstitial is showing, OR simplest — rely on the emailed link itself opening `verify-email/page.tsx` in the same or a new tab, which on success shows "Verified! Continue" with a button routing back into the signup wizard's profile step (pass a flag/redirect param). **Recommend the second approach** (link-driven, no polling) since it needs no new infra and matches how `verify-email/page.tsx` already works — just wire it to redirect into profile setup on success instead of dead-ending at `/login`.
- **Gate profile-setup pages server-side too**, not just via the interstitial UX: `vendor-onboarding/page.tsx` and the new couple profile-setup page (Phase 2) both call `requireRole(...)` already — extend `lib/auth/dal.ts` with a `requireVerifiedRole(...roles)` that also redirects to a new `/verify-email/pending` page if `session.emailVerifiedAt` is null, so a verified-gate bypass via direct URL navigation is also blocked, not just the wizard's client-side step.
- **Edit email UI** (item 9): replace `AccountDetailsForm`'s disabled email input with an editable flow: click "Change email" → modal/inline form asking for new email + current password → on submit, call the new `change-email` endpoint → show "Check {newEmail} to confirm the change" banner. Add the confirm-page route (`/confirm-email-change?token=...`, mirrors `verify-email/page.tsx`).
- **Apply the same gate + edit-email pattern to the vendor account/settings page** (`(vendor)/vendor/settings/`) for symmetry — vendors need edit-email too, not just couples.

---

## Phase 2 — Customer (couple) profile-setup wizard (item 2)

### 2a. Data model

Add fields to `WeddingProfile` (confirmed empty today beyond weddingDate/guestCount/estimatedBudget/weddingStyle/partnerName/notes):
- `functionType: String?` — or better, a proper `FunctionType[]` enum-array / a join table if a couple can select multiple function types (engagement, sangeet, wedding, reception, etc.) — **needs a decision, see open questions below**.
- `expectedGuestCount` already exists as `guestCount` — reuse, just confirm the wizard also asks it explicitly per the request wording ("number of visitors expected").
- `functionTime: String?` or a proper `DateTime?`/time-of-day enum per function — depends on the multi-function-type decision above.
- Replace/extend the single `estimatedBudget: Decimal?` with a real range: add `budgetMin Decimal? @db.Decimal(12,2)` and `budgetMax Decimal? @db.Decimal(12,2)` per the request's "price range for the selected categories" — likely **per-category**, not one global range, which means this can't just be flat columns on `WeddingProfile`. **Recommendation:** new join model `WeddingProfileCategoryPreference` (weddingProfileId, categoryId, budgetMin, budgetMax) — one row per category the couple wants to explore, cleanly modeling "vendors/functions customer would like to explore" + "price range for the selected categories" together, and this is exactly the shape Phase 3's matching needs (join against `VendorCategory` + `VendorProfile.startingPrice`).
- Support **multiple event dates** per the request ("event date/dates" plural) — add a small `WeddingProfileEventDate` join model (weddingProfileId, date, label) rather than overloading the single `weddingDate` column, since venues/functions on different days is a real Kerala-wedding pattern (mehendi/sangeet/wedding/reception on separate days).

This is a real schema change — flag it clearly rather than shoehorning multi-value concepts into single columns.

### 2b. Backend

- New endpoint(s) under `users` module (or a new `wedding-profile` sub-resource, following existing `PUT /users/me/wedding-profile` naming): extend `upsertWeddingProfileSchema`/`upsertWeddingProfile` to accept the new nested shape (event dates array, category-preference array with per-category budget range, guest count, function times).
- Gate this endpoint behind `requireVerifiedMiddleware` from Phase 1.
- On successful save (not draft — see 2c), trigger Phase 3's matching-and-notify step.

### 2c. Frontend — multi-step wizard with draft-save (items 2, 4, 5)

- New route, e.g. `(couple)/profile-setup/page.tsx`, reached right after email verification for `END_USER` role (replaces today's flat account-page-only wedding form as the *onboarding* path; the account page's `WeddingDetailsForm` can stay for later edits, or redirect into the same wizard in "edit mode" — recommend the latter for one source of truth).
- **Steps** (each its own screen, matching the request's field list): 1) Event date(s) + function type(s) per date, 2) Expected guest count + time of function, 3) Categories/vendor types to explore, 4) Price range per selected category, 5) Review & submit.
- **Save-as-draft (item 4):** each step's data is written to `localStorage` (per the codebase's existing browser-storage conventions — no cross-device sync needed for a draft, consistent with "per-viewer convenience" scope) AND optionally POSTed to a `PATCH /users/me/wedding-profile/draft` endpoint (same shape, but doesn't trigger Phase 3 matching) so the draft also survives a device change if the user is logged in elsewhere — **recommend building the localStorage version first** (simpler, no new endpoint) and only adding server-side draft persistence if the user wants cross-device draft recovery.
- **Tab-switch / back-button confirmation (item 4):** a `beforeunload` handler plus a client-side router-transition guard (Next.js App Router: intercept `popstate`/link clicks within the wizard via a shared `WizardGuard` wrapper component) that shows a confirm dialog — "Save your progress before leaving?" with Save / Discard / Cancel — reusing the draft-save call above.
- **Field-level validation (item 5):** each step's fields get inline validation on blur/submit (required-ness, date not in the past, guest count within a sane range, price-range min ≤ max), mirroring the manual-`useState`-based-validation convention already used elsewhere (`VendorOnboardingForm`), just applied per-field with individual error text under each input instead of one top banner.

---

## Phase 3 — Vendor-specific onboarding questions only (item 3) + draft/validation parity

- **Confirm scope with the request's wording**: "vendor specific questions only should be asked" during profile setup. Today vendor onboarding asks literally one generic field (business name). Expand the *onboarding* step (not just the later dashboard editor) to ask the vendor-relevant subset up front: business name, primary category, primary city, starting price / price range, short description — pulling directly from existing `VendorProfile` fields (no new columns needed here, this is UI work surfacing fields that already exist in the schema but are currently only editable post-onboarding).
- Explicitly do **not** ask any couple-specific questions (event date, guest count, etc.) in this flow — keep the two wizards fully separate, which the current codebase already does structurally (separate route groups), this phase just enriches the vendor one.
- Apply the same **draft-save + tab/back-button confirmation + field-level validation** pattern built in Phase 2c here too, so both wizards behave consistently. Factor the `WizardGuard` component and draft-save hook so it's shared, not duplicated, between the couple and vendor wizards.
- Gate behind `requireVerifiedMiddleware`/`requireVerifiedRole` from Phase 1.

---

## Phase 4 — Fix "Register as Vendor" redirect (item 6)

Small, isolated, no dependencies on the other phases — **can be built and shipped first, independently, as a quick win.**

- In `wedhub-frontend-app/app/(auth)/signup/page.tsx`, change the unconditional session redirect (lines 24-27) to special-case `type === "vendor"` for an already-authenticated `END_USER`:
  - Since one account can't hold both roles, show a small interstitial instead of redirecting straight through: "You're signed in as {email} (customer account). Vendor accounts are separate — log out to register as a vendor, or continue to your account." with a **"Log out and continue to vendor signup"** button (calls existing `logout()` then routes to `/signup?type=vendor` fresh) and a secondary "Go to my account" link.
  - For a signed-in `VENDOR` or `ADMIN` hitting this same link, existing behavior (redirect to their dashboard) is still correct and unaffected.
- No backend changes needed — this is purely the frontend redirect-logic fix.

---

## Phase 5 — In-app inbox for customers and vendors (item 7)

Greenfield module — the largest single piece of net-new work here.

### 5a. Data model (new)

- `Conversation` — id, participant references. Given roles are strict (`END_USER`/`VENDOR`), model as `coupleUserId`, `vendorId` (not `vendorUserId`, since a vendor listing is the addressable entity, consistent with how `Lead`/`Enquiry` already reference `vendorId`), optional `leadId`/`enquiryId` FK to link a conversation back to the lead that spawned it (nullable, for conversations started other ways later), `lastMessageAt`, timestamps.
- `Message` — id, conversationId, senderUserId, body, `readAt` per-recipient (or a separate `MessageReadReceipt` if group/multi-read tracking is ever needed — not needed now, keep it simple: one `readAt` nullable column, since conversations are always exactly 2 participants here), createdAt.
- Unique constraint on `(coupleUserId, vendorId)` for `Conversation` if the product intent is "one thread per couple-vendor pair" (recommended — matches how leads dedupe today) rather than allowing many parallel threads.

### 5b. Backend — new `messaging` module (currently just a `.gitkeep`)

Follow the established layering exactly: `messaging.controller.ts` → `messaging.service.ts` → `messaging.repository.ts` → `messaging.routes.ts` → `messaging.schema.ts` → `messaging.types.ts` → `index.ts`.

- `GET /messaging/conversations` (authenticated, either role) — list the caller's conversations, ordered by `lastMessageAt desc`, with last-message preview + unread count per conversation.
- `GET /messaging/conversations/:id/messages` — paginated message history; authz check the caller is a participant (couple or vendor owner).
- `POST /messaging/conversations` — start or get-existing (idempotent on the unique couple+vendor pair) a conversation, e.g. from a lead/enquiry detail view or vendor profile page's "Message" button.
- `POST /messaging/conversations/:id/messages` — send a message; on success, fire `notify({eventType: "NEW_MESSAGE"|"USER_REPLIED", ...})` to the other participant (these event types already exist as placeholders per the research — this phase is what finally fires them for real) and bump `lastMessageAt`.
- `POST /messaging/conversations/:id/read` — mark read, mirroring `notification.service.ts`'s `markAsRead` pattern.
- Register the router in `routes/index.ts` (currently absent).

### 5c. Frontend — new inbox pages, one per role, following the existing symmetric-pages pattern

- `(couple)/inbox/page.tsx` and `(vendor)/vendor/inbox/page.tsx` — conversation list + thread view (can be one shared `InboxShell`/`ConversationThread` component parameterized by role, mirroring how `NotificationsList.tsx` is already shared between both roles).
- Add an inbox nav entry + unread-badge count next to the existing notification bell in both `PublicTopbar`/`CoupleBottomNav` and the vendor shell/nav — reuse the async-Server-Component unread-count-fetch pattern already used for notifications (`getMyUnreadNotificationCount()`-style), just for messages.
- No new real-time infra (websocket/SSE) in this phase, consistent with the rest of the app's fetch-on-navigation model — if live-updating chat is wanted later, that's a separate, larger infra decision (flagged as an open question below, not built speculatively).

---

## Phase 6 — Matched-prospect notification + inbox message (item 8)

Depends on Phase 2 (couple profile data to match against) and Phase 5 (inbox to deliver the "message" into).

- **Trigger point:** when a couple completes (not drafts) their profile-setup wizard from Phase 2, or updates it later, run a matching step: for each `WeddingProfileCategoryPreference` row (category + budget range), call the existing `search.repository.ts::searchVendors({categoryId, cityId: <couple's wedding location>, priceMin: budgetMin, priceMax: budgetMax}, "recommended")` + `rankVendors()` — the exact pattern already proven in `enquiry.service.ts::createMultiVendorEnquiry` — and take the top N (reuse `MULTI_VENDOR_SELECTION_SIZE = 3` constant or make it configurable).
- **For each matched vendor:** 
  - Fire `notify({userId: vendor.ownerUserId, eventType: "NEW_LEAD", ...})` — reusing the exact existing event type/template, no new enum value needed, since the request explicitly wants this to "look like a genuine lead/prospect," and `NEW_LEAD` is that exact vendor-facing framing already.
  - **Also create an inbox message** (Phase 5's `Conversation`/`Message`) from the couple to the vendor, auto-composed to read like a genuine enquiry (e.g. "Hi, we're planning our wedding on {date} in {location} for {guestCount} guests, and are exploring {category} vendors in the ₹{min}–₹{max} range. Would love to hear from you!") — per item 8's explicit ask that it "look like a message from customer... genuine lead/prospect," not a system-generated notice.
  - Also insert a `Lead` row (reusing `enquiry.repository.ts`'s existing `createEnquiryWithLeads` transaction shape) so this shows up in the vendor's existing Leads dashboard/analytics too, keeping one consistent lead-tracking system rather than a parallel one just for auto-matched prospects.
- **Guardrails to avoid spam:** re-run matching idempotently — don't re-notify the same vendor for the same couple profile version repeatedly (dedupe key similar to `Lead.dedupeKey`, or simply: only run this matching step once per profile *completion* and once per subsequent *meaningful edit* — e.g. category or budget changed — not on every trivial re-save).

---

## Decisions (confirmed 2026-09-16)

1. **Event dates**: independent sub-events. Each function the couple adds (engagement, sangeet, mehendi, wedding, reception, etc.) gets its own date, function type, time, and guest count via `WeddingProfileEventDate`.
2. **Function type**: fixed enum (`FunctionType`: ENGAGEMENT, SANGEET, MEHENDI, HALDI, WEDDING, RECEPTION, OTHER) with a free-text `otherLabel` field used only when `OTHER` is selected — keeps matching/filtering structured while not blocking unusual function names.
3. **Price range**: per-category, via `WeddingProfileCategoryPreference` (weddingProfileId, categoryId, budgetMin, budgetMax) as planned in Phase 2a.
4. **Draft persistence**: localStorage only for v1. No server-side draft endpoint.
5. **Change-email security posture**: new email must be clicked/confirmed before `User.email` changes at all (the safer design already written into Phase 1a).
6. **Inbox real-time**: fetch-on-load for v1, consistent with the rest of the app. No websocket/SSE infrastructure added. A manual refresh / re-navigation shows new messages.

These are locked in; the schema and endpoints below reflect them directly (no more "recommend X" hedging in Phase 2/5/6 — build to this).

---

## Suggested build order

1. Phase 4 (redirect fix) — standalone, ships immediately, no dependencies.
2. Phase 1 (verification gate + edit email) — foundational, everything else's "only after verification" requirement depends on it.
3. Phase 5 (inbox module) — needed before Phase 6 can deliver into it; can be built in parallel with Phase 2/3 since it has no dependency on the wizards.
4. Phase 2 (couple wizard) and Phase 3 (vendor wizard) — build together, sharing the `WizardGuard`/draft-save infra.
5. Phase 6 (matching + auto-lead) — last, since it depends on both Phase 2's data and Phase 5's inbox.

Verification bar for every phase, per project convention: `npx tsc --noEmit` clean on both `wedhub-backend/` and `wedhub-frontend-app/`, plus live DB/browser verification where feasible (flag explicitly if the dev environment lacks a running DB/dev server when a phase is completed, rather than claiming untested work passed).

---

## Progress log

### 2026-09-16 — Phase 4 (redirect fix) and Phase 1 (verification gate + edit email) done

**Phase 4**: `signup/page.tsx` now special-cases an already-signed-in `END_USER` hitting `?type=vendor` — shows `SwitchAccountForVendorSignup.tsx` (logout-and-continue, or stay signed in) instead of silently redirecting to `/shortlist`. Covered by a new e2e test in `phase-01-auth.spec.ts`, passing live.

**Phase 1**, backend:
- New `EmailChangeToken` Prisma model + 2 migrations (the token table itself, plus a follow-up for the `EMAIL_CHANGE_CONFIRMATION` notification event type I initially forgot to include in the first migration — caught via live testing, not assumed).
- `AccessTokenPayload` (JWT) gained an `emailVerified` claim, threaded through `issueTokenPair`/`login`/`loginWithGoogle`/`refresh` and their 2 external call sites (`challenge-entry.vendor-bootstrap.ts`, `vendor-claim.service.ts`) — all pass the real `user.emailVerifiedAt`, not a lazy default.
- New `requireVerifiedMiddleware`, applied to `POST /vendors` and `PUT /users/me/wedding-profile` only — not a whole-app gate.
- New `EmailNotVerifiedError` (403, code `EMAIL_NOT_VERIFIED`), new endpoints `POST /auth/me/resend-verification`, `POST /auth/me/change-email`, `POST /auth/confirm-email-change`, all rate-limited.
- Change-email delivers to the pending new address via a `Notification.data.overrideEmail` convention (not `user.email`) — verified live that the confirmation email is queued to the new address, not the old one.

**Phase 1**, frontend:
- `SignupWizard.tsx` gained a `"verify"` step between credentials and profile (both roles) — reuses resend + a `refreshSession()` re-mint (not a full logout) to pick up the now-verified JWT claim without asking for the password again.
- New `/verify-email/pending` page (server-gate backstop via new `requireVerifiedRole` in `lib/auth/dal.ts`) and `/confirm-email-change` page (mirrors `/verify-email`'s existing pattern).
- Editable email UI (`components/shared/ChangeEmailForm.tsx`, shared between couple account page and vendor settings) replacing the previously-hardcoded-disabled email input in both places.
- `lib/auth/session.ts`/`types.ts` decode the new `emailVerified` JWT claim into `Session`.

**Verified live, not just type-checked**: full `phase-01-auth.spec.ts` suite (7/7 passing) against a live backend + Postgres + Redis; direct API calls confirming the verify-email flow, both gated endpoints' 403s, and the full change-email round-trip (token issuance → confirm → `User.email` actually moved + re-verified) — all against the real dev database, test data cleaned up afterward.

**Unplanned but necessary side-fixes** (all pre-existing issues, not caused by this work, but blocking verification of it):
- `wedhub-backend/.env`'s `DATABASE_URL`/`REDIS_URL` used `localhost`, which this Windows dev machine's Node resolves to the IPv6 loopback first (nothing listening there) — switched both to `127.0.0.1`. This had been silently causing the backend's `/register` endpoint to hang for 5+ minutes per call (Redis) and made the live DB genuinely unreachable, unrelated to any app code.
- Recovered a **lost migration** (`20260915052839_add_studio_module_core`) whose `migration.sql` file was missing on disk (same failure mode as the lost docs file in `PENDING-WORK.md` §6) even though its tables (`studio_clients`, `studio_projects`, `project_shoots`, `project_notes` + 4 enums + a `categories` column) were already live in the database. Restored the corresponding models into `schema.prisma` by introspecting the live DB directly, reconstructed the migration file, and fixed up its recorded checksum — done only after explicit user confirmation, since the alternative (a naive new migration) would have silently DROPped 4 real tables. This is a genuinely new, real, but not-yet-built "studio" module (photography/videography back-office) — flagging its existence for whoever picks that up, since it isn't part of the 9 requested items here.
- `e2e/phase-01-auth.spec.ts` had 2 pre-existing bugs unrelated to this task, fixed because I was already touching the file: an ambiguous `"Continue"` button locator (a Google Sign-In button's accessible name also contains "Continue") and the exact bug already logged in `BugsItemsDoc/002` (stale `"I'm a vendor"`/`"I'm planning a wedding"` role-picker clicks that haven't existed since account type moved to the entry-link/query-param) — that doc explicitly said to fix it "the next time that file is touched."

### 2026-09-16 — Phase 5 (in-app inbox) done

**Backend**: new `Conversation`/`Message` Prisma models (one conversation per couple+vendor pair, enforced via a unique constraint — matches how `Lead` dedup already treats a couple+vendor pair as one relationship) and a full new `messaging` module (controller/service/repository/routes/schema/types, following the established layering exactly), registered at `/messaging` in `routes/index.ts`. Endpoints: list-my-conversations, start-or-get-existing conversation (couple-initiated only — a vendor only ever replies within a thread a couple started), list/send messages, mark-read, unread-count. Every read/write routes through a single `resolveParticipant()` authz check so a caller can never touch a conversation they aren't a couple or vendor-owner side of — verified live with a real third-party account getting a 403. `NEW_MESSAGE` (an existing but previously-unused notification event type) now fires for real on every send, to whichever side didn't just send it, with sender name + a truncated message preview.

**Frontend**: new `(couple)/inbox` and `(vendor)/vendor/inbox` pages sharing one `InboxView` client component (conversation list + thread, parameterized by `viewerRole` the same way `NotificationsList.tsx` is shared). Unread-message badges added next to the existing notification bell in both `PublicTopbar` (couple) and `VendorShell`/`VendorMobileNav` (vendor) — a second, independent badge from the notification one, since messages and notifications are counted separately. No new real-time infrastructure, per the confirmed decision — the list/thread refresh on navigation/reload only.

**A real bug found and fixed via live testing, not just type-checking**: `InboxView.tsx` (a Client Component) initially imported the server-only `lib/api/messaging.ts` (which pulls in `next/headers`) to fetch a conversation's messages after the initial page load — this type-checked fine (no cross-boundary type errors) but broke at runtime with a Next.js build error only surfaced when the page was actually opened in a browser. Fixed by adding a client-side counterpart (`listConversationMessagesClient` in `messaging-client.ts`) and switching `InboxView` to use it. This is exactly the class of bug `npx tsc --noEmit` cannot catch — flagging it as a reminder that the type-check bar is necessary but not sufficient; live rendering matters.

**Verified live**: a new `e2e/phase-messaging.spec.ts` drives the complete flow through the real UI — a vendor logs in and sees a real unread badge, opens the inbox, reads a message a couple sent via the API, replies through the real thread composer, and the couple logs back in and sees that reply in their own real inbox page. Passes together with the full `phase-01-auth.spec.ts` suite (8/8).

**Deliberately deferred, not built**: a "Message this vendor" button on the public vendor profile page. The request's core ask ("InApp Inbox should be there for both the customers and vendors") is fully met by the two inbox pages and nav integration; the plan's own Phase 5b description mentioned a profile-page entry point only as an illustrative example, not a hard requirement. `startConversation` is fully built and working — Phase 6's auto-matched-prospect feature will call it directly (no UI entry point needed for that path), and a manual "message this vendor" button can be added to the vendor profile page later as a small follow-up whenever wanted.

### 2026-09-16 — Phase 2 (couple profile-setup wizard) and Phase 3 (vendor onboarding wizard) done, built together

**Data model**: `WeddingProfile` gained `profileCompletedAt` (stamped only on a real submit, not a draft — this is what Phase 6 will key its "don't re-notify on every trivial re-save" guard off of) plus two new child models exactly as planned: `WeddingProfileEventDate` (one row per function — independent sub-events, confirmed decision) with a new `FunctionType` enum (ENGAGEMENT/SANGEET/MEHENDI/HALDI/WEDDING/RECEPTION/OTHER + free-text `otherLabel`), and `WeddingProfileCategoryPreference` (one row per category with its own budget range, unique per profile+category — confirmed per-category budgets, not one global range). `WeddingProfile.weddingDate` now mirrors the earliest event date automatically, computed correctly regardless of what order the couple adds functions in (a real bug I found and fixed via live API testing before it ever reached the frontend).

**Backend**: no new vendor-side schema at all — item 3's fields (category, city, pricing, description) already existed on `VendorProfile`/`VendorCategory` and already had working endpoints (`upsertMyProfile`, `setMyCategories`); this phase was purely about asking for them at onboarding time instead of only in the later dashboard editor. The couple side got one new endpoint, `POST /users/me/profile-setup` (plus a `GET` for resuming), gated behind `requireVerifiedMiddleware`, validating every submitted `categoryId` against the real `Category` table before writing anything (a clean 400 instead of a raw foreign-key-violation error), and writing the wedding-profile summary, event dates, and category preferences together in one transaction.

**Frontend — shared wizard infrastructure**: a `WizardGuard` component and `useWizardDraft` hook, used identically by both the new couple profile-setup wizard (`/profile-setup`, 5 steps) and the rebuilt vendor onboarding wizard (`/vendor-onboarding`, now 4 steps instead of 1 field). Drafts persist to `localStorage` only (confirmed decision — no server draft endpoint). Leaving a wizard with unsaved progress is caught three ways: the browser's native close/refresh prompt, a back-button interception via a synthetic history entry, and a same-app link-click interception — all three converge on one "Save draft and leave / Continue without saving / Cancel" dialog. Field-level validation (required-ness, no past dates, budget min ≤ max) shows inline per-field errors, not one top banner, matching the item 5 request directly.

**A real bug found and fixed via live testing, not just type-checking**: `WizardGuard`'s link-click interception was originally scoped to a `containerRef` wrapping only the wizard's own children — but a page's persistent header/logo/nav (the actual links someone would click to "leave") are usually siblings of the wizard component, not descendants of it, so the interceptor never saw those clicks at all and let them navigate straight through. Caught live when an e2e test clicked the page header's brand logo and landed on the homepage instead of seeing the confirmation dialog. Fixed by moving the listener to `document` in capture phase.

**A second real mistake caught before it did damage**: while building a client-safe wrapper for `listCategories`/`listLocations`, I used the Write tool on `lib/api/catalog-client.ts` without reading it first and overwrote a real, already-in-use function (`listFeaturedGalleryMediaClient`, used by the public gallery page's infinite scroll) — caught immediately by the very next `tsc --noEmit` run (the gallery page failed to resolve the import), recovered from git history, and merged correctly. Flagging this plainly: it was an avoidable process error (read-before-write), not something inherent to the change itself.

**A real product-flow gap found while wiring this up, resolved by asking rather than guessing**: `SignupWizard.tsx`'s existing vendor branch collected a business name inline and created the vendor row immediately, then routed to `/vendor/dashboard` — meaning the new richer `/vendor-onboarding` wizard would never actually be seen by a freshly-signed-up vendor, only by an edge case (a vendor account that somehow reaches the dashboard without a listing row). Fixed by having both the email-verification step and the Google sign-in path route a vendor straight to `/vendor-onboarding` instead, removing the now-fully-dead inline business-name form and its now-unreachable "done" screen entirely rather than leaving them as confusing dead code. The equivalent question for the couple side (route straight into the new 5-step wizard right after signup, vs. leave it as a some-day account-page task) was asked directly rather than assumed, given it changes what every new couple sees before reaching the site at all — confirmed: route straight in.

**Verified live**: direct API testing of the full profile-setup submission (multiple event dates including an OTHER function with a custom label, multiple category preferences with budget ranges, invalid-category rejection, the verification gate blocking an unverified account) and two new/updated e2e suites — `phase-profile-setup-wizard.spec.ts` (field validation, draft save, resume-after-reload, and the leave-confirmation dialog, including the bug above) and `phase-01-auth.spec.ts`'s updated couple/vendor signup tests, which now drive all the way through both full wizards to their real destination pages. All 3 e2e spec files pass together (10 tests).

### 2026-09-17 — Phase 6 (automatic vendor matching + prospect message) done, all 6 phases now complete

**A real gap found before writing any Phase 6 code, resolved by asking rather than guessing**: the couple profile-setup wizard built in Phase 2 never actually asked for a wedding city, despite `WeddingProfile.cityId` existing on the schema — matching vendors by category+budget alone with no location would surface irrelevant far-away vendors and generate low-quality leads. Asked directly whether to add the missing field now or ship location-less matching; confirmed to add it. Added a required "Wedding city" dropdown to the wizard's step 2, threaded `cityId` through the schema/service/repository, and updated the one already-shipped e2e test that exercises this step.

**Backend**: a new `matching` module (`matchProfileToVendors`), called from `users.service.ts::submitProfileSetup` after a successful save, fire-and-forget (never awaited, never blocks the wizard's own response). For each category preference, reuses the exact `searchRepository.searchVendors()` + `rankVendors()` pattern already proven in `enquiry.service.ts::createMultiVendorEnquiry` (same reasoning for not hard-filtering on budget — it excludes otherwise-eligible vendors), takes the top 3, and for each: fires the existing `NEW_LEAD` notification unchanged, creates a real `Lead`/`Enquiry` row (reusing `enquiry.repository.ts`'s transaction, using the previously-unused `CATEGORY_REQUEST` routing mode already sitting in the Prisma enum), and starts an inbox conversation with an auto-composed message reading like a genuine enquiry — e.g. *"Hi! We're planning our wedding on 20 March 2027 in Thiruvananthapuram for 300 guests, and we're exploring Groom Wear vendors in the ₹20,000–₹40,000 range. Would love to hear from you!"* — exactly matching item 8's explicit ask.

**Guardrails, both verified live against the real database**: (1) a fingerprint of the couple's city + category/budget selections determines whether a profile save is a "meaningful edit" worth re-running matching at all — re-submitting identical data does not re-trigger matching a second time; (2) inside matching itself, a 30-day per-vendor dedupe key (mirroring `Lead.dedupeKey`'s shape) means even a genuinely meaningful edit (e.g. a changed budget) that re-runs matching will not re-notify a vendor who was already told about this couple recently — confirmed by resubmitting with a changed budget and seeing the lead count stay at 1 for the same vendor.

**A real, reproducible bug found through live testing, not dismissed as a flake**: the new e2e test for this phase failed intermittently, and investigating instead of retrying blindly turned up a genuine pre-existing bug in the test suite's own cleanup, not in the feature: `vendors.owner_user_id` is `ON DELETE SET NULL`, not `CASCADE` (documented elsewhere in this same test file for a different vendor helper), so every prior test run across `phase-01-auth.spec.ts` and `phase-messaging.spec.ts` that created a vendor via the UI (rather than capturing and explicitly deleting its id) had been silently leaving an orphaned `Vendor` row behind — 29 had accumulated by the time this was caught. Each one competed inside `rankVendors().slice(0, 3)`'s top-N cutoff, so a new test's own vendor sometimes didn't make the cut and never got matched at all. Fixed the missing cleanup in both files (not just the new one), deleted all 29 accumulated rows, and re-verified reliably across multiple full combined runs. A separate, smaller issue in the same investigation: two new tests called `page.goto()` immediately after clicking "Log in" without waiting for the login button's own in-flight redirect to land first, occasionally losing that race — fixed by waiting for the redirect explicitly before navigating away.

**Verified live**: direct API testing of the complete matching pipeline (vendor setup with matching category/city/price, couple profile submission, confirming the resulting `Lead`, `NEW_LEAD` notification, and inbox message all appear correctly for the right vendor) plus a new `phase-matching.spec.ts` e2e test that drives the entire flow through the real wizard UI and confirms the match through the vendor's own real Leads dashboard and real Inbox page, not another API call. All 4 e2e spec files (13 tests total) pass together, confirmed across two consecutive full runs with zero leftover test data afterward.

**This closes out the full 2026-09-16 request.** All 9 originally-numbered items are built and verified: email verification gating profile setup (1), the couple profile-setup wizard (2), vendor-specific onboarding questions (3), draft-save and leave-confirmation (4), field-level validation (5), the vendor-signup redirect fix (6), the in-app inbox for both roles (7), automatic matched-prospect notifications and messages (8), and editable/re-verifiable email addresses (9).
