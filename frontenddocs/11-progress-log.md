# Progress Log (Frontend)

> Running record of what has actually shipped on the frontend. Updated **after** each Frontend Arch Phase completes — not in advance. Mirrors [`../docs/11-progress-log.md`](../docs/11-progress-log.md)'s role for the backend. See [`00-index.md`](00-index.md) for the numbering convention and [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md) for the Definition of Done every phase below must satisfy before being marked complete.

**Convention:** when a Frontend Arch Phase finishes, (1) flip its row in the status table below from `⬜ Not Started` to `✅ Done` with the date, (2) fill in that phase's section further down with real routes/components/API-integration/flow-diagram — replacing the placeholder text, never leaving it half-filled, and (3) tick every task checkbox in the corresponding stage file (`03`–`07`) for that phase.

---

## Status Overview

| Frontend Arch Phase | Name | Stage | Status | Completed |
|---|---|---|---|---|
| 0 | Project Setup & Design System | [Stage 1](03-stage-foundation.md) | ✅ Done | 2026-09-02 |
| 1 | Auth Flows | [Stage 1](03-stage-foundation.md) | ✅ Done | 2026-09-02 |
| 2 | Public Discovery | [Stage 2](04-stage-couple-experience.md) | ✅ Done | 2026-09-02 |
| 3 | Shortlist, Compare & Enquiry | [Stage 2](04-stage-couple-experience.md) | ✅ Done | 2026-09-02 |
| 4 | Couple Account | [Stage 2](04-stage-couple-experience.md) | ✅ Done | 2026-09-02 |
| 5 | Vendor Onboarding & Profile Mgmt | [Stage 3](05-stage-vendor-experience.md) | ✅ Done | 2026-09-02 |
| 6 | Vendor Leads & Reviews | [Stage 3](05-stage-vendor-experience.md) | ✅ Done | 2026-09-02 |
| 7 | Vendor Monetization | [Stage 3](05-stage-vendor-experience.md) | ✅ Done | 2026-09-04 |
| 8 | Admin Core | [Stage 4](06-stage-admin-platform.md) | ✅ Done | 2026-09-04 |
| 9 | Admin Catalog & Moderation | [Stage 4](06-stage-admin-platform.md) | ✅ Done | 2026-09-04 |
| 10 | Admin Monetization, Governance & Audit | [Stage 4](06-stage-admin-platform.md) | ✅ Done | 2026-09-04 |
| 11 | Telegram Surfacing, SEO & Hardening | [Stage 5](07-stage-growth-and-hardening.md) | 🟡 In Progress (11b done 2026-09-03; 11a, 11c not started) | — |
| 12 | ₹49 Instant Wedding Website | [Stage 6](08-stage-wedding-website.md) | ⬜ Not Started (blocked on backend Arch Phase 26) | — |
| 13 | Vendor GST Invoicing & Billing | [Stage 7](09-stage-vendor-invoices.md) | ✅ Done | 2026-09-04 |

**Overall: 12 / 13 Frontend Arch Phases fully verified complete, Phase 11 in progress.** The combined Playwright pass for Phases 7–10 (deferred since 2026-09-02) ran 2026-09-04 — all 15 tests pass, stable across repeated runs — see the "Combined Playwright verification — Phases 7–10" entry below for what it found and fixed (2 real production bugs, plus test-infrastructure gaps: a duplicated, incomplete admin-test-user helper that predated 2026-09-04's real RBAC enforcement, and several dead test-cleanup variables that never freed the unique slots/rows they created). Frontend Arch Phase 11b (SEO Page Generation) shipped 2026-09-03 once backend Arch Phase 17's page-generation slice unblocked it — see `07-stage-growth-and-hardening.md`'s checklist for the full item-by-item write-up. Preceding this: the 34-screen static mockup (`../wedhub-frontend/`) is done and approved — it is the visual/content contract this plan implements, not itself a Frontend Arch Phase. The backend (17/26 Arch Phases, Stages 1–6 done, Arch Phase 17 in progress) is ahead of the frontend on this phase's remaining CMS-content half (blog/FAQs/static pages).

---

## How each phase entry is written (template — copy this block per phase when it ships)

```
## Frontend Arch Phase N — <Name>

### What this unlocks

### Routes implemented

### Components added

### Backend endpoints consumed

### Flow

### Playwright verification

(which e2e/phase-NN-*.spec.ts file, confirmation it was run headed and watched, pass/fail outcome, and any real bugs vs. test-authoring mistakes it caught — see 01-reference-cross-cutting.md "Mandatory: headed Playwright verification")

### Notes
```

---

## Phase Entries

## Frontend Arch Phase 0 — Project Setup & Design System

### What this unlocks

A real Next.js 16 (App Router, React 19, Tailwind v4) project at `../wedhub-frontend-app/` exists, builds, lints, and typechecks cleanly, with the approved mockup's design tokens ported into Tailwind's theme and the first `components/ui/` primitives available. Every later Frontend Arch Phase builds pages inside this shell rather than starting from scratch.

### Routes implemented

- `(public)/` — smoke-test home page (design-system preview, links to login/signup; real content arrives in Frontend Arch Phase 2)

### Components added

- `components/ui/Button.tsx` — primary/secondary/dark/ghost/danger variants, `md`/`sm` sizes, polymorphic (`href` prop renders a `next/link`, otherwise a `<button>`)
- `components/ui/Card.tsx`, `CardHeader`
- `components/ui/Badge.tsx` — crimson/blue/green/amber/red/grey variants
- `components/ui/Input.tsx`
- `lib/utils/cn.ts` — trivial classname-join helper (no `clsx`/`tailwind-merge` dependency added; not needed yet at this scale)

### Backend endpoints consumed

None directly — this phase is infrastructure only.

### Flow

```
create-next-app (App Router, TS, Tailwind, ESLint)
   → app/globals.css: port ../wedhub-frontend/assets/css/tokens.css into a Tailwind v4 @theme block
   → components/ui/*: primitives styled against those theme tokens
   → lib/api/types.ts + client.ts: typed envelope-unwrapping fetch wrapper (server-only)
   → route group skeleton: (public) (couple) (vendor) (admin) (auth)
```

### Playwright verification

No dedicated Phase 0 spec — Phase 0 shipped no user-facing flow of its own (just the smoke-test page), and its one assertion (`home page renders ported tokens and buttons`) was folded into `e2e/phase-01-auth.spec.ts`'s "Design system smoke test" block rather than given a separate file, since splitting a single trivial assertion into its own spec file would have been pure overhead.

### Notes

- **Real Next.js 16 breaking change caught before it caused a bug**: the project's own generated `AGENTS.md` warns that this version may differ from training-data assumptions and to check `node_modules/next/dist/docs/` first. Doing so surfaced that `middleware.ts` is renamed to `proxy.ts` as of Next.js 16 (same mechanism, `NextResponse`/`NextRequest` API unchanged) — this was corrected in `frontenddocs/01-reference-cross-cutting.md` and `03-stage-foundation.md` *before* any auth code was written, avoiding a dead file that Next.js would have silently ignored.
- **Real CSS bug caught during the first build**: a `/* ... --brand-*/--text-*/--surface-* ... */` comment in the ported token file broke CSS parsing, because `--brand-*` immediately followed by `/--text-*` reads as a comment-close (`*/`) partway through. Fixed by rewording the comment; caught by actually running `next build`, not just eyeballing the CSS.
- Tailwind v4's CSS-first `@theme` directive auto-generates utility classes from `--color-*` custom properties (e.g. `--color-brand-primary` → `bg-brand-primary`/`text-brand-primary`/`border-brand-primary`) — verified live by inspecting the rendered HTML's class list against the compiled output, not assumed from Tailwind v3-era knowledge.
- Deliberately deferred the remaining `components/ui/` primitives (DataTable, PillTabs, FilterPill, Modal, MetricCard, EmptyState, Toggle, StarRating) — none of Frontend Arch Phase 0 or 1's actual screens need them; building them speculatively ahead of Frontend Arch Phase 2 (the first phase that does) would be exactly the kind of premature abstraction the project's own conventions warn against.
- Verified via: `npx tsc --noEmit` (clean), `npx eslint .` (clean, zero warnings), `npx next build` (clean production build, correct route manifest), and `npx next dev` + `curl` against the rendered HTML to confirm the ported tokens actually compiled into real Tailwind utility classes.

## Frontend Arch Phase 1 — Auth Flows

### What this unlocks

Real registration, login, logout, and password-reset for all backend-supported roles (END_USER, VENDOR — ADMIN accounts are backend-provisioned only, matching `registerSchema`'s role enum), with server-side route-group gating by role. Every later authenticated stage (couple/vendor/admin apps) builds on this session/auth foundation rather than re-solving it.

### Routes implemented

- `(auth)/login`, `(auth)/signup`, `(auth)/forgot-password`, `(auth)/reset-password`
- `app/api/auth/login`, `/register`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password` (Route Handlers — server-to-server proxies to the backend, never called directly from the browser)
- `app/api/[...path]` (generic authenticated proxy for every other backend module)
- `proxy.ts` (project root) — optimistic route-group gating for `/couple/*`, `/vendor/*`, `/admin/*`

### Components added

- `app/(auth)/login/LoginForm.tsx`, `app/(auth)/signup/SignupWizard.tsx`, `app/(auth)/forgot-password/ForgotPasswordForm.tsx`, `app/(auth)/reset-password/ResetPasswordForm.tsx` (all Client Components — form state/interactivity)
- `lib/auth/`: `constants.ts`, `types.ts`, `session.ts` (cookie read/write, JWT payload decode), `dal.ts` (`verifySession`/`requireRole`/`getOptionalSession`, React `cache()`-memoized), `backend.ts` (raw backend auth fetch + the cookie-path rewrite helper)
- `lib/api/auth-client.ts`, `lib/api/users-client.ts` (browser-side wrappers calling our own `/api/*` routes)

### Backend endpoints consumed

`POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`; `PATCH /api/v1/users/me`, `GET /api/v1/users/me` (via the generic proxy, used for verification).

### Flow

```
Browser → /api/auth/login (our Route Handler)
   → backendAuthFetch → backend POST /api/v1/auth/login
   → backend sets refresh_token cookie (httpOnly, SameSite=strict, Path=/api/v1/auth)
   → our handler rewrites that cookie's Path to /api/auth (see Notes — this fixed a real bug)
      and re-sets it on our own response
   → our handler also sets our own wedhub_session cookie (httpOnly, SameSite=lax, 15 min)
      containing just the backend's short-lived accessToken
   → browser now holds both cookies, scoped to our own origin

Later authenticated request from a Client Component → /api/users/me (our generic proxy)
   → reads wedhub_session cookie server-side, attaches Authorization: Bearer <accessToken>
   → forwards to backend /api/v1/users/me
   → backend verifies the JWT itself — our proxy never re-implements that check

Access token expiring → /api/auth/refresh (our Route Handler)
   → forwards the browser's refresh_token cookie (now correctly scoped to /api/auth) to
     backend POST /api/v1/auth/refresh
   → backend rotates the refresh token (reuse-detection, per backend Arch Phase 2) and
     returns a new accessToken
   → our handler re-sets both cookies again
```

### Playwright verification

`e2e/phase-01-auth.spec.ts` — six tests: design-system smoke test, full couple signup→profile-step→logout→login flow with role-gating checks, full vendor signup flow with role-gating checks, invalid-login error display, and both forgot-password screens. Run headed repeatedly (`npx playwright test --headed`, visible Chromium window, `slowMo: 400`) while the spec itself was being debugged — this is the first real exercise of the process now documented in `01-reference-cross-cutting.md`'s "Mandatory: headed Playwright verification" section, added mid-Phase-1 at the user's request that every future phase include a watchable browser verification step, not just curl.

Four real lessons came out of getting this spec right, each traced to a concrete cause rather than patched blindly:

1. **Test-authoring mistake**: the first version assumed clicking an account-type card went straight to a success screen. The headed run showed an intermediate profile-name step (First name/Last name) first — the real 4-step wizard in `SignupWizard.tsx`. Fixed the test to fill and submit that step; the app was already correct.
2. **Test-authoring mistake that looked like a real bug at first**: role-gating assertions expected a blocked route to land on `/login`, but it landed back on the user's own dashboard. Traced the actual redirect chain with `page.on("request"/"response")` logging rather than guessing: `proxy.ts` correctly blocks the wrong-role route → redirects to `/login` → the login page's own already-authenticated redirect immediately bounces the still-valid session back to *their own* dashboard, never showing the blocked route. This is the correct, secure end state — fixed the test's expected URL, not the app.
3. **A second, unrelated test-authoring mistake**: the vendor success screen was asserted to say "Welcome to WedHub!" — a string that was never actually written anywhere. Reading `SignupWizard.tsx` directly showed both roles share one "You're all set!" heading, differing only in subtext and the CTA button's label ("Complete your profile" for vendors vs. "Go to home" for couples). Fixed the assertion and the button-name selector to match the real, single string.
4. **A real test-coverage gap, not just a wrong assertion**: the test's own name promised "log out, and log back in" but never actually called logout — so the "re-login" was really just re-authenticating an already-valid session, and `/login` correctly redirected away before the form ever rendered, hanging the test on a `fill()` that could never resolve. There is no logout *button* anywhere in the app yet (nowhere to put one — no authenticated sidebar/topbar exists until Frontend Arch Phase 2+), so genuine logout coverage was added via `page.request.post("/api/auth/logout")` directly against the Route Handler, which is the actual thing Phase 1 delivers. This also caught that the test suite needed a longer global timeout (30s → 60s) once real multi-step flows were exercised properly, given `slowMo` deliberately slows every action for watchability.

**Separately, and correctly not "fixed"**: repeated back-to-back full-suite runs during the above debugging tripped the backend's real login rate limiter (10 attempts / 15 min, confirmed against `wedhub-backend/src/common/middleware/rate-limit.middleware.ts`'s actual config and the exact "Too many login attempts" error text it produces) on two separate occasions, including on what would otherwise have been the final clean run. Both are documented, expected, and left alone — the rate limiter working correctly on a dev machine that's been logging in dozens of times in twenty minutes is not a defect.

**Final verified state**: 5 of 6 tests passing on the last clean run, with the 6th ("Invalid login") blocked only by the rate limiter described above, not a code defect — every other test in the suite, including that same test on an earlier clean-window run, has passed. No test data was left in the database across any of these runs (`e2e/support/test-users.ts`'s `afterAll` cleanup, verified via direct `psql` query after each run). Re-running the full suite once more after the rate-limit window clears, with no further code changes expected, is a reasonable follow-up but not a blocker — the app behavior itself has been conclusively verified correct, including the one test still tripping the limiter.

### Notes

- **Real bug found and fixed via live verification, not assumed correct**: the first end-to-end refresh test failed with `{"code":"AUTHENTICATION_ERROR","message":"Missing refresh token"}` even though login had just succeeded and the cookie was present in the browser's jar. Root cause: the backend sets `refresh_token` scoped to `Path=/api/v1/auth`; our Route Handler lives at `/api/auth/refresh` — a different path — so the browser correctly never attached the cookie to that request (standard cookie path-scoping behavior, not a bug in the browser or backend). Fixed with `rewriteRefreshCookiePath()` in `lib/auth/backend.ts`, which rewrites the `Path` attribute to `/api/auth` before forwarding the `Set-Cookie` header, applied identically in the login, refresh, and logout handlers (logout's `clearCookie` response needed the same rewrite to actually clear the cookie the browser held, since cookie deletion also requires an exact path match). Re-verified after the fix: full login → refresh → logout cycle tested live against the real backend, including confirming the refresh token actually **rotates** on each refresh call (a different token value after refresh than after login) and that logout's response correctly expires both cookies (`Expires: Thu, 01 Jan 1970`).
- **Scope decision, verified not assumed**: read `wedhub-backend/src/modules/auth/auth.service.ts` directly and confirmed no Google OAuth implementation exists server-side — the login page has no Google button (a non-functional one would be worse than none). Read `auth.schema.ts` and confirmed `forgotPassword`/`resetPassword` service functions exist and are wired to real routes — built both pages against them rather than leaving the mockup's "Forgot password?" link dangling or faking a "coming soon" state.
- **Real signup-flow deviation from the mockup, discovered by reading the backend schema rather than assumed from the mockup's UI**: `registerSchema` (`wedhub-backend/src/modules/auth/auth.schema.ts`) has no name field at all — only `email`, `phone?`, `password`, `role`. The mockup's single "Complete your profile" step (name + business name in one screen) doesn't correspond to one backend call. Built as: register (email/password/role only) → auto-login → a genuinely separate optional step that calls `PATCH /users/me` with `firstName`/`lastName`. This is a real API-shape correction, not a design preference — documented here so nobody "fixes" the signup wizard back to match the mockup's single-step assumption without knowing why it was split.
- **Live end-to-end verification performed** (not claimed from reading code alone): registered a real END_USER test account and a real VENDOR test account against the running backend + Postgres (`docker compose` stack, same one Stage 1–6 backend work used), through this app's own `/api/auth/register` → `/api/auth/login` → `/api/users/me` (generic proxy `PATCH` then `GET`) chain, confirming the profile update actually persisted server-side. Verified `proxy.ts`'s role gating in all six directions (unauthenticated → each of `/couple`, `/vendor`, `/admin`; each authenticated role → the other two roles' routes) via direct `curl` requests with real session cookies — not inferred from reading the gating logic alone. Verified the already-authenticated-user-hits-`/login`-redirects-to-their-dashboard behavior the same way. All test accounts (`frontend-smoke-test@wedhub.dev`, `frontend-vendor-test@wedhub.dev`) were deleted from the database after verification — no test data left behind.
- Password reset's actual email delivery (Resend, per backend Arch Phase 14) was not verified end-to-end in this phase — the backend's response contract was verified (`{"success":true,"data":{"message":"If an account exists..."}}`, correctly not leaking account existence), but the follow-through of receiving and clicking a real emailed link was not exercised here. Worth a manual pass before this ships to real users, tracked informally rather than as a formal Open Question since it's a one-time manual check, not an architectural gap.

## Frontend Arch Phase 2 — Public Discovery

### What this unlocks

Full unauthenticated discovery surface: a real user can browse the home page, search/filter vendors, and view a complete vendor profile, all against real backend data. This is the highest-traffic, SEO-relevant part of the product (product.md §3.5/§3.6) and the foundation Frontend Arch Phase 3 (shortlist/compare/enquiry) builds directly on top of.

### Routes implemented

- `(public)/` — home page (hero search, category browse strip, featured vendors, Telegram CTA)
- `(public)/search` — filterable/sortable/paginated vendor search
- `(public)/vendors/[slug]` — vendor detail (identity, about, generic category attributes, portfolio, packages, reviews, sticky enquiry CTA)
- `(public)/vendors/[slug]/not-found.tsx` — real 404 page, triggered by a genuine backend 404, not simulated

### Components added

- `components/shared/PublicTopbar.tsx`, `VendorCard.tsx`, `VendorAttributes.tsx` (generic category-attribute renderer, switches on `dataType`)
- `components/ui/Input.tsx` reused; no new `ui/` primitives needed this phase
- `lib/api/vendors.types.ts` (search/vendor/category/location/review/album/featured-listing types, verified field-by-field against backend source, not guessed)
- `lib/api/catalog.ts` (all read-only catalog/search/vendor API functions)
- `lib/media/url.ts` (`getPublicMediaUrl()` — mirrors the backend's R2 URL-join exactly), `lib/media/category-icons.ts` (static frontend-side icon map, since `Category` has no icon field in the schema)
- `app/(public)/search/SortSelect.tsx` (small Client Component — the only interactive piece on an otherwise fully server-rendered search page)

### Backend endpoints consumed

`GET /search/vendors`, `GET /vendors/:slug`, `GET /vendors/:slug/albums`, `GET /vendors/:vendorId/reviews`, `GET /categories`, `GET /categories/:slug`, `GET /locations`, `GET /featured-listings`.

### Flow

```
Before writing any frontend code: dispatched a research pass that read
wedhub-backend source directly (search.service.ts, vendor.repository.ts,
categories.repository.ts, locations.repository.ts, review.repository.ts,
album.repository.ts, featured-listing.repository.ts, r2.client.ts) to get
exact field shapes and confirm nothing was assumed — this surfaced 4 real
gaps (Open Questions 7-10) that shaped the actual implementation before any
UI was built, rather than being discovered as bugs afterward.

Home page → GET /categories (browse strip) + GET /featured-listings
   (cross-referenced against GET /search/vendors for renderable cards, since
   featured-listings alone only returns {id, businessName, slug})

Search page → GET /search/vendors with the real query shape (keyword,
   categoryId, cityId, priceMin/Max, verified, sort, page, limit) + GET
   /categories and GET /locations?type=CITY for the filter sidebar

Vendor detail → GET /vendors/:slug (identity/profile/categories/packages/
   attributeValues) + GET /vendors/:slug/albums (portfolio, and the hero-
   image fallback source) + GET /vendors/:vendorId/reviews (using the
   detail response's real `id`, not the slug)
```

### Playwright verification

`e2e/phase-02-discovery.spec.ts` — 7 tests covering home (real categories, hero search submission, category-to-search navigation), search (real vendor appears, keyword narrows results, nonsense keyword shows the real empty state, clicking a result navigates correctly), and vendor detail (identity, all 5 category-attribute data types rendered correctly, package with inclusions, the real R2-hosted portfolio image resolving through Next.js's image optimizer, the Phase-3-scoped enquiry CTA linking to login, and a real 404 for an unknown slug). Run headed, watched, all 7 passing on the final run. One test-authoring fix needed: an early version's `getByText("Bengaluru")` matched two elements (the meta line and, coincidentally, a substring inside the vendor's own description paragraph) — fixed by matching the more specific `"Photography · Bengaluru"` string; not an app bug, and arguably a good sign real content was rendering richly enough to collide.

### Notes

- **This phase required real test data that didn't exist yet, and building it surfaced real, useful findings.** The dev database had zero vendors of any status. Rather than insert rows directly (which would validate nothing about the actual application), built one real vendor end-to-end through the actual backend API: registered a VENDOR account, created the vendor, set its profile/category/attributes/service-area/service/package, hit `POST /vendors/me/submit`, discovered submission requires `cityId` (settable only via `PUT /vendors/me/profile`, not the `PATCH /vendors/me/detail` endpoint one might guess — a real API-shape finding), discovered a vendor sits in `PENDING_VERIFICATION` until its owner's email is verified (auto-advances to `PENDING_APPROVAL` on the vendor's next read once verified — a genuinely well-designed piece of backend logic, found by reading `vendor.service.ts`'s `advanceIfEmailNowVerified` rather than guessing why `approve` returned a 409), marked the test owner's email verified directly in the dev DB (pragmatic, dev-only, reversible), then approved as a temporarily-promoted admin test account. This entire real workflow is now documented here for Frontend Arch Phase 5 (Vendor Onboarding) to build against with full confidence, not rediscover from scratch.
- **Also uploaded one real portfolio image through the actual R2 presigned-upload flow** (`POST /media/upload-requests` → real `PUT` to the returned presigned R2 URL with real JPEG bytes → `POST /media/:id/confirm`), then discovered the media-processing worker wasn't running to advance it out of `PROCESSING`/`PENDING` moderation — approved moderation via the real admin endpoint and set `status = READY` directly in the DB as a pragmatic dev-only unblock (the worker's actual job, image optimization/thumbnailing, is backend infrastructure outside this phase's scope; what mattered here was confirming the frontend correctly resolves a real object key to a real displayable image, which was independently confirmed by fetching the R2 public URL directly and getting a real 200 JPEG response, and by Next.js's image optimizer successfully proxying it).
- **Real, cited backend gaps found and worked around, not silently papered over** — see [Open Questions 7-10](10-risks-and-open-questions.md#7-vendor-detail-endpoint-cannot-resolve-the-vendors-logocover-image): (7) the vendor detail endpoint cannot resolve `logoMediaId`/`coverMediaId` to a URL at all (no relation joined, no public media-by-id endpoint) — worked around with an album-cover fallback for hero imagery; (8) search results carry no city/category name, rating, or review count — search cards show only what the backend actually returns rather than fabricating or making N+1 calls; (9) no star-rating distribution endpoint exists anywhere in the backend — omitted rather than approximated; (10) featured-listings returns minimal vendor data and categories have no icon field — cross-referenced against search and used a static frontend icon map respectively.
- **A real, useful backend finding not filed as an Open Question** (informational, not a gap requiring frontend work): `PATCH /vendors/me/detail` only accepts `businessName` — `cityId` looked like it should live there by symmetry with other "detail" fields, but actually lives on `PUT /vendors/me/profile`. Confirmed by reading `vendor.schema.ts` directly after a live 200-but-no-effect response revealed the assumption was wrong. No frontend action needed since Phase 2 only reads vendor data; flagged here for whoever builds Frontend Arch Phase 5's vendor profile editor.
- Test vendor (`frame-co-photography`, owned by `phase2-vendor-test@wedhub.dev`) and the temporarily-promoted admin account (`phase2-admin-test@wedhub.dev`) are **intentionally left in the dev database**, not cleaned up — unlike Phase 0/1's test accounts, this one is real, reusable fixture data that Frontend Arch Phase 3 (shortlist/enquiry against a real approved vendor), Phase 4 (reviews/enquiry-tracking), and Phase 5 (vendor-side view of this same vendor) all benefit from having available rather than recreating. If it ever needs to be rebuilt, the exact sequence of API calls is preserved in this entry's Notes above.

## Frontend Arch Phase 3 — Shortlist, Compare & Enquiry

### What this unlocks

A logged-in couple can now favorite vendors from any card (home/search/vendor detail), review their shortlist, select vendors to compare side-by-side, and submit a real enquiry to a vendor from their profile page. This is the first phase to introduce an authenticated `(couple)` route group, and the shared shell (`CoupleShell`) it built will carry through Frontend Arch Phase 4's remaining couple-account pages.

### Routes implemented

- `app/(couple)/layout.tsx` — the first real `(couple)` layout, calling `requireRole("END_USER")` (the actual enforcement point; `proxy.ts` already optimistically gated `/shortlist`/`/compare` since Frontend Arch Phase 1)
- `(couple)/shortlist` — real shortlist grid, checkbox multi-select, "Compare selected", remove-from-shortlist
- `(couple)/compare` — real side-by-side comparison table via `GET /comparison/vendors`

### Components added

- `components/shared/VendorHeartButton.tsx` — shortlist favorite/unfavorite toggle, used on `VendorCard` (home/search) and the vendor detail page header
- `components/shared/EnquiryCta.tsx` / `EnquiryModal.tsx` — the vendor-profile "Send Enquiry" button and its modal, prefilled from `GET /users/me`
- `components/shared/CoupleShell.tsx` — shared topbar + mobile bottom-nav shell for all `(couple)` routes (built now, ahead of Frontend Arch Phase 4's checklist item, since Phase 3 already needed it)
- `app/(couple)/shortlist/ShortlistGrid.tsx` — Client Component for the interactive parts of `/shortlist` (checkbox selection, remove action)
- `lib/api/shortlists.types.ts`, `lib/api/shortlists.ts` (server-only reads), `lib/api/shortlists-client.ts` (client-side writes through the generic authenticated proxy)

### Backend endpoints consumed

`POST /shortlists/favorites/items`, `DELETE /shortlists/favorites/items/:vendorId`, `GET /shortlists`, `POST /enquiries/single-vendor`, `GET /comparison/vendors`, `GET /users/me` (enquiry modal prefill).

### Flow

```
Before writing any frontend code: dispatched a research pass that read
wedhub-backend source directly (shortlist.routes.ts/.schema.ts/.service.ts,
enquiry.routes.ts/.schema.ts/.service.ts, lead.routes.ts/.schema.ts,
comparison.routes.ts/.schema.ts/.service.ts, authenticate.middleware.ts) —
this surfaced that /enquiries has no "list my enquiries" endpoint at all
(Open Question 11), that a dedicated /comparison/vendors endpoint already
exists and should be used instead of building the table from N vendor
fetches, and the exact real field names for enquiry submission (contactName,
contactEmail, contactPhone, weddingDate, budget, guestCount — not the
mockup's assumed shape).

Heart button (any VendorCard or vendor detail) → POST/DELETE
   /shortlists/favorites/items(/:vendorId) → optimistic UI, reverts on a
   failed response (the endpoint is not idempotent — 409 on duplicate add)

/shortlist → GET /shortlists (default "Favorites" list, vendor summaries
   embedded) → checkbox-select 2-5 → "Compare selected" → /compare?vendorIds=...

/compare → GET /comparison/vendors?vendorIds=a,b,c → real backend validation
   (2-5 vendors, same primary category) surfaced as-is, not reinvented
   client-side

Vendor profile "Send Enquiry" (authenticated only — unauthenticated visitors
   get a /login link instead) → modal prefilled from GET /users/me → POST
   /enquiries/single-vendor → real success/error state
```

### Playwright verification

`e2e/phase-03-shortlist-enquiry.spec.ts` — 6 tests: unauthenticated heart-click redirects to login; a logged-in couple can favorite from search, see it on `/shortlist`, and unfavorite it; unauthenticated "Send Enquiry" links to login; a logged-in couple can open the enquiry modal (email prefilled from real `GET /users/me` data), fill it, and submit a real enquiry (success screen confirmed); selecting 2 real shortlisted vendors and comparing shows real, visibly distinct data per column (different starting price, years experience, and `photography_style` attribute value); visiting `/compare` with only 1 vendor id shows the backend's real validation message. Run headed, watched, 6/6 passing on the final clean run (also re-verified `phase-01-auth.spec.ts` 6/6 and `phase-02-discovery.spec.ts` 7/7 still pass after this phase's changes — no regressions).

Real bugs this run caught (not test-authoring mistakes):
1. **`roleHomeRoute`'s `END_USER` entry pointed at `/couple/home` since Frontend Arch Phase 1** — a URL that could never resolve, because `(couple)` is a Next.js route *group* (parentheses strip from the URL) rather than a literal `/couple/` path segment. This was invisible until Phase 3 built the first real `(couple)` page to actually land on. Traced by comparing `curl -I` responses for `/couple/home` (404) vs. `/home` (307, same routing table) with a real session cookie. Fixed by pointing `END_USER` at `/shortlist` in all four files that defined `roleHomeRoute` (`LoginForm.tsx`, `login/page.tsx`, `signup/page.tsx`, `SignupWizard.tsx`); updated `phase-01-auth.spec.ts`'s role-gating assertions to match the corrected, now-real behavior.
2. **`GET /comparison/vendors`'s price fields serialize as strings, not numbers** — an earlier research pass reported `startingPrice: number`, which was wrong (missed that Prisma Decimal-over-JSON applies here too, same as everywhere else in this codebase). Caught visually in a headed run (`₹75000` instead of `₹75,000` — `.toLocaleString()` silently no-ops on a string that's already all-digits with no separators needed... actually returns the string unchanged since `String.prototype.toLocaleString` does locale-aware string comparison, not number formatting). Confirmed via a direct curl to the real endpoint, fixed the type (`lib/api/shortlists.types.ts`) and the render (`Number(vendor.startingPrice).toLocaleString(...)`).
3. **`phase-01-auth.spec.ts`'s "Design system smoke test" was already stale** (asserted a "WedHub" placeholder heading and "Primary" button that Frontend Arch Phase 2 had already replaced with the real home page) — found incidentally while regression-running Phase 1 alongside Phase 3, fixed to assert on the real hero heading instead.

Test-authoring mistakes (not app bugs), for the record: an early version of the enquiry-submit test never filled the modal's required "Your name" field (the test account had no `profile.firstName`/`lastName` to prefill it from, unlike email), so the native HTML5 `required` validation silently blocked the fetch — no network request was ever sent. Traced by adding response/console logging and a full-body dump on failure rather than guessing; fixed by filling the field explicitly in the test, with a comment explaining why it's needed here and not for email/phone.

### Notes

- **The real login rate limiter (10/15min, in-memory, IP-keyed) was tripped repeatedly during this phase's debugging** — restarting the backend dev process (which resets in-memory limiter state, a previously-documented safe move) was used between debug iterations rather than waiting out the window each time. Any Phase 1/2/3 combined run in one sitting will likely trip it too (documented, not a regression) — run phases separately, or restart the backend between attempts, if debugging across phases.
- **A second real, fully-APPROVED Photography vendor was built for this phase** ("Lens & Light Studios", slug `lens-light-studios`) entirely through the real backend API (register → build profile/category/attributes/service/package → submit → verify email → auto-advance → admin-approve — the same real workflow documented in Phase 2's notes), specifically so `/compare`'s same-category, 2+-vendor backend validation had real, distinct data to render (different starting price, years of experience, and `photography_style` attribute value from Frame & Co.). Left in the dev database as reusable fixture data alongside Frame & Co., for the same reasons given in Phase 2's notes.
- **[Open Question 11](10-risks-and-open-questions.md#11-no-list-my-enquiries-endpoint-exists-for-the-couple-side) newly filed**: no backend endpoint exists to list a couple's own past enquiries — confirmed by reading the entire `enquiries` module, not assumed. This blocks Frontend Arch Phase 4's `(couple)/enquiries` tracker page until resolved (new backend endpoint vs. an explicit "not yet available" state) — a decision to make when Phase 4 is actually reached, not now.
- Test accounts (`e2e-phase3-*@wedhub.dev`, created fresh per test run) were all deleted via `afterEach`/`afterAll` per the established convention — confirmed via `git status`-adjacent DB check, no leftover clutter beyond the two intentional vendor fixtures.

## Frontend Arch Phase 4 — Couple Account

### What this unlocks

A logged-in couple can now track every enquiry they've sent through its real per-vendor status, write a real review (with real R2-uploaded photos) once a vendor marks a lead WON, see their real notifications, and manage their wedding/account details and notification preferences — the full authenticated couple-account surface product.md's discovery/lead-engine loop depends on.

### Backend additions (required before this phase could be built against real data — see `../docs/11-progress-log.md`'s 2026-09-02 addendum for the full backend-side write-up)

- `GET /enquiries/mine` — couple-scoped, paginated, joins `Enquiry` → fanned-out `Lead[]` → `vendor` summary.
- `GET /reviews/mine` — couple-scoped, paginated, with vendor summary + attached photos.
- New `review-media` module (`POST /review-media/upload-requests`, `POST /review-media/:id/confirm`) + `POST /reviews`'s new optional `mediaIds[]` — a parallel, non-vendor-scoped photo-upload path (`Media.vendorId` is now nullable; new `Media.userId`/`reviewId` columns; new `MediaType.REVIEW_PHOTO`), reusing the existing R2 client and media-processing queue/worker unmodified.

All three verified live end-to-end (real R2 upload → real worker processing to `READY` with generated WebP variants → real admin approval → real public visibility on `GET /vendors/:vendorId/reviews`) before any frontend code was written against them — see that commit's own verification trace.

### Routes implemented

- `(couple)/enquiries` — status pill-tabs (All/Awaiting/In conversation/Closed), one card per Lead with a real 4-step status track and a "Write a review" action on WON leads
- `(couple)/reviews/write` — `?vendor=<slug>`-driven review form: star picker, service selector, text, multi-photo upload
- `(couple)/notifications` — real unread/read list, click-to-mark-read, mark-all-read
- `(couple)/account` — wedding details, account details (name editable; phone/email read-only, no backend endpoint updates them post-registration), notification preference toggles, logout, deactivate, delete

### Components added

- `components/shared/LeadStatusTrack.tsx` — maps the real 10-value `LeadStatus` enum onto the mockup's 4-step visual tracker (Sent/Viewed/Responded/Closed), plus a `statusBadge()` helper for the outcome badge
- `app/(couple)/enquiries/page.tsx` (Server Component, no separate client file needed — pill-tab filtering is URL-driven like the search page)
- `app/(couple)/reviews/write/page.tsx` + `ReviewForm.tsx` (Client Component: star picker, photo selection/preview/removal, upload-then-submit flow)
- `app/(couple)/notifications/page.tsx` + `NotificationsList.tsx` (Client Component: optimistic read-state updates)
- `app/(couple)/account/page.tsx` + `AccountForms.tsx` (4 independent Client Component forms: `WeddingDetailsForm`, `AccountDetailsForm`, `NotificationPreferencesForm`, `AccountActions`)
- `lib/api/account.types.ts`, `lib/api/account.ts` (server-only reads), `lib/api/account-client.ts` (client-side writes), `lib/media/upload.ts` (`uploadReviewPhoto()` — presigned-PUT-then-confirm, mirrors the pattern proven in Phase 2's vendor-portfolio upload)
- `components/shared/CoupleShell.tsx` extended with Enquiries/Notifications/Profile nav + a notification bell

### Backend endpoints consumed

`GET /enquiries/mine`, `GET /reviews/mine`, `POST /reviews` (with `mediaIds`), `POST /review-media/upload-requests`, `POST /review-media/:id/confirm`, `GET /notifications/me`, `POST /notifications/me/:id/read`, `POST /notifications/me/read-all`, `GET /users/me`, `PATCH /users/me`, `PUT /users/me/wedding-profile`, `POST /users/me/deactivate`, `DELETE /users/me`.

### Flow

```
Before writing any frontend code: dispatched a research pass that read
wedhub-backend source directly across enquiries/, reviews/, notifications/,
users/, and media/ — confirmed 3 real gaps (no couple-scoped enquiry list,
no couple-scoped review list, no review-photo upload path), presented to
the user as a scope decision (add the backend endpoints vs. ship reduced
scope), user chose to add all 3 endpoints before building the frontend.

/enquiries → GET /enquiries/mine → one card per Lead (not per Enquiry — a
   multi-vendor enquiry fans into independent per-vendor conversations) →
   LeadStatusTrack maps real LeadStatus onto the mockup's 4-step visual

WON lead → "Write a review" → /reviews/write?vendor=<slug> → GET
   /vendors/:slug (reused from Phase 2, gives real vendor.id + services[])
   → ReviewForm: star rating (required) → optional service → optional text
   → optional photos (each uploaded via POST /review-media/upload-requests
   → real PUT to R2 → POST /review-media/:id/confirm) → POST /reviews with
   collected mediaIds → real PENDING review, verifiedInteraction computed
   automatically server-side from the real Lead history

/notifications → GET /notifications/me → click a row or "Mark all as read"
   → POST /notifications/me/:id/read or /read-all → optimistic UI, real
   confirmation

/account → GET /users/me → 4 independent save actions, each hitting its own
   real endpoint (wedding-profile PUT is whole-resource upsert; profile
   PATCH's preferences field is whole-object-replace, not a merge — matched
   in the frontend's persist() calls to avoid accidentally dropping other
   preference fields on a single toggle)
```

### Playwright verification

`e2e/phase-04-couple-account.spec.ts` — 7 tests: enquiry tracker shows a real empty state then a real enquiry sent via the actual UI form; a lead moved to WON via the real vendor-side `PATCH /leads/:id/status` shows "Won · Booked" and a working "Write a review" link; a full review submission (5 stars + text) round-trips to `GET /reviews/mine`; the real "Welcome to WedHub" verification-email notification appears and marking it read updates the unread count live; wedding-details and account-details forms both save to their real endpoints and persist correctly across a full page reload; a notification-preference toggle persists across reload; logout clears the session and blocks re-entry to `/account`. Run headed, watched, 7/7 passing on the final clean run — 5 passed together in one run, the remaining 2 (which independently make extra login calls) confirmed passing on an isolated re-run after a rate-limiter reset, same documented pattern as Phase 3. Also re-verified Phases 1 (6/6), 2 (7/7), and 3 (6/6) individually — no regressions.

A genuinely pre-existing infrastructure issue was found and fixed as a pragmatic, dev-only, user-approved action (not an application code bug in the app built this phase — the review-photo pipeline itself worked correctly end-to-end on the first real attempt): the notification-delivery BullMQ queue had ~87 stale jobs accumulated from earlier phases' test-account cleanup cycles, at least one referencing a since-deleted `Notification` row — this crashed the worker on startup (`P2025`) every time, blocking review-photo processing verification. Cleared via a direct Redis `DEL` of the stale queue keys (approved by the user before acting, since it's queue-state deletion) rather than papering over it with a code change.

Test-authoring mistakes (not app bugs), for the record: an early Playwright locator for "Awaiting response" matched both the pill-tab button and the status badge (fixed with `{ exact: true }`); an early "save both forms" test used `.nth(1)` for the second "Save changes" button, which broke once the first button's own text changed to "Saved ✓" (shrinking the matched set) — fixed by scoping locators to each `<section>` via its heading instead of positional indexing.

### Notes

- **Two real, systemic product gaps found and filed as new Open Questions, not silently worked around**: [Open Question 11](10-risks-and-open-questions.md#11-no-list-my-enquiries-endpoint-exists-for-the-couple-side) (now resolved via this phase's backend addition) and [Open Question 12](10-risks-and-open-questions.md#12-no-notification-ever-tells-a-couple-a-vendor-responded-to-their-enquiry) (still open — confirmed via an exhaustive search of all 9 `notify()` call sites in the codebase that literally no event ever notifies a couple about vendor-side activity, including a lead moving to WON. The notifications page itself is correctly built and fully functional; it just has nothing real to show for that specific, most-anticipated scenario yet. Left open rather than fixed, since it's new backend business logic in `leads/`, not the small mechanical read-endpoint additions this phase's other 2 gaps needed).
- **The Phase 2 vendor test account's password had to be reset directly via psql** (`UPDATE users SET password_hash = ...`) before this phase's Playwright spec could log in as the vendor to move a lead to WON — the original password was never written down anywhere readable in this project's docs. Pragmatic, dev-only, reversible; documented inline in the spec file itself so it isn't rediscovered as a mystery later.
- `phase4-couple-test@wedhub.dev` (a manually-created account used for live curl verification before any Playwright was written) and its real enquiry/review/photo against Frame & Co. Photography are **intentionally left in the dev database** as reusable fixture data, same rationale as Phase 2/3's fixtures. All Playwright-created test accounts (`e2e-phase4-*@wedhub.dev`) were deleted via `afterEach` per the established convention.
- `npx tsc --noEmit`, `eslint`, and `next build` all pass cleanly on both the frontend and backend sides.

**This completes Stage 2 (Couple Experience) — Frontend Arch Phases 2, 3, and 4 are all done.**

## Frontend Arch Phase 5 — Vendor Onboarding & Profile Management

### What this unlocks

A vendor can now sign up, land on a real profile editor, fill in every field group (identity, classification, location, commercial, trust, contact, operational, category attributes), upload real portfolio photos/videos with live processing status, set a logo/cover, manage packages, and submit their listing for admin review — the full self-service onboarding loop Stage 3 depends on for everything after it (leads, reviews, monetization all assume a real, submitted vendor exists).

### Backend additions (required before this phase could be built against real data — see this file's earlier addenda for the established pattern)

- `VendorProfile.logoMediaId`/`coverMediaId` made writable (`PUT /vendors/me/profile`, validated against the vendor's own READY media) and readable (`VENDOR_FULL_INCLUDE` now joins `logoMedia`/`coverMedia`) — previously neither was possible at all. Closes [Open Question 7](10-risks-and-open-questions.md#7-vendor-detail-endpoint-cannot-resolve-the-vendors-logocover-image).
- `GET /categories` and `GET /categories/:slug` now embed each category's active `services` — there was no services-listing endpoint anywhere (the `services` module was an empty placeholder directory), needed for the profile editor's "services offered" picker. The list-endpoint half of this fix was caught live as a real 500 (`Cannot read properties of undefined (reading 'length')`) during manual verification, not by code review — the single-category fix shipped first, the list one was missed until the profile editor actually hit it.
- Separately, a real pre-existing worker crash (`notification-delivery` throwing `P2025` when a `Notification` row was deleted mid-flight by cascading test-account cleanup) was found and fixed while verifying the portfolio upload flow live — see the standalone commit "Fix notification-delivery worker crashing when a Notification row is deleted mid-flight". Not a Phase 5 feature, but it silently took down the shared media-processing worker process too (same Node process, same `startMediaProcessingWorker`/`startNotificationDeliveryWorker` pair), which is what made it impossible to reliably verify portfolio uploads until fixed.

All backend changes verified live end-to-end before any frontend code was written against them.

### Routes implemented

- `app/(vendor)/layout.tsx` — the first real `(vendor)` layout, calling a new `requireVendorOwnership()` (not `requireRole("VENDOR")` alone — confirmed via research that `/vendors/me/*` is ownership-gated, not role-gated, so a VENDOR-role user with no vendor row gets a 404 from every self-service route, not a 403)
- `(vendor)/vendor/dashboard` — real analytics (profile views/leads/reviews within a real 30-or-90-day window), status panel, live weighted completeness checklist
- `(vendor)/vendor/profile` — the 8-section field-group editor (Identity/Classification/Location/Commercial/Trust/Contact/Operational/category attributes), plus a submit-for-review action
- `(vendor)/vendor/portfolio` — upload dropzone, media grid with reorder/delete/set-as-logo/set-as-cover, real polling for PROCESSING→READY transitions
- `(vendor)/vendor/packages` — package list + add/edit modal with a repeatable inclusions list

### Components added

- `components/shared/VendorShell.tsx` (sidebar shell, matching the mockup's `.app-shell`/`.sidebar`) + `VendorLogoutButton.tsx`
- `lib/auth/require-vendor.ts` — the ownership-based route guard described above
- `lib/api/vendor-self.types.ts`, `vendor-self.ts` (server reads), `vendor-self-client.ts` (client writes), `vendor-onboarding-client.ts` (the one-time `POST /vendors` call used by signup)
- `app/(vendor)/vendor/profile/`: `ProfileEditor.tsx` (the main form, one global "Save changes" matching the mockup, not per-section saves), `LogoCoverPicker.tsx`, `ServicesSection.tsx`, `AttributesSection.tsx` (generic dataType-switching editable renderer, same principle as Stage 2's read-only `VendorAttributes.tsx`), `SubmitBar.tsx`
- `app/(vendor)/vendor/portfolio/PortfolioManager.tsx` — upload, reorder, delete, set-as-logo/cover, and a polling loop against `GET /media/me`
- `app/(vendor)/vendor/packages/`: `PackagesManager.tsx`, `PackageModal.tsx`

### Backend endpoints consumed

`POST /vendors`, `GET /vendors/me/detail`, `GET /vendors/me/analytics`, `PUT /vendors/me/profile`, `PUT /vendors/me/categories`, `PUT /vendors/me/service-areas`, `PUT /vendors/me/attributes`, `POST/DELETE /vendors/me/services(/:id)`, `POST/PATCH/DELETE /vendors/me/packages(/:id)`, `POST /vendors/me/submit`, `POST /media/upload-requests`, `POST /media/:id/confirm`, `GET /media/me`, `PATCH/DELETE /media/:id`, `GET /categories`, `GET /locations`.

### Flow

```
Before writing any frontend code: dispatched a research pass that read the
entire vendors module (routes/schema/service/repository/types) plus media,
categories, and entitlements — confirmed the full /vendors/me/* route
inventory, the exact profile-completeness formula and its two-tier
(required-for-submission vs. weighted-score) structure, that packages live
inside the vendors module (not a separate one), that reorder for both media
and packages is one-PATCH-per-item (no bulk endpoint), and precisely which
3 dashboard metrics are real vs. fabricated in the mockup. This surfaced 2
real backend gaps (logo/cover write support, services listing) before any
UI was built — see the backend-additions note above.

Signup (VENDOR path) → business name → real POST /vendors → DRAFT vendor →
   redirects to /vendor/profile (not /vendor/dashboard — a deliberate,
   real fix: the old flow never called POST /vendors at all and would have
   404'd forever, see "Real bugs" below)

/vendor/profile → fill 8 field-group sections → one "Save changes" →
   PUT .../profile + PUT .../categories + PUT .../service-areas +
   PUT .../attributes + diffed POST/DELETE .../services (attach/detach) →
   real profileCompleteness recalculated server-side after every call →
   "Submit for review" → POST .../submit → real REQUIRED_FOR_SUBMISSION
   validation (missing fields surfaced verbatim from the backend's own
   error, not re-derived client-side) → PENDING_VERIFICATION or
   PENDING_APPROVAL depending on real email-verification state

/vendor/portfolio → drag-drop or file picker → POST /media/upload-requests
   → real PUT to the presigned R2 URL → POST /media/:id/confirm → item
   shows PROCESSING → polls GET /media/me every 3s until the real
   sharp-based worker finishes → READY with real optimized/thumbnail webp
   variants → "Set as logo"/"Set as cover" → PUT .../profile with the real
   mediaId, validated server-side
```

### Playwright verification

`e2e/phase-05-vendor-profile.spec.ts` — 3 tests: the dashboard shows real analytics numbers, a real DRAFT status prompt, and the real weighted completeness checklist; the profile editor saves real fields (verified via a full page reload, not just optimistic UI), attaches a real service, creates a real package on the packages page, and successfully submits for review, landing on `PENDING_VERIFICATION`; the portfolio manager uploads a real photo through the real R2 flow, shows a genuine processing state, polls to a real READY image once the worker finishes, and sets it as the vendor's logo. Run headed, watched, 3/3 passing on the final clean run. Also re-verified Phases 1 (6/6, after a real fix to its own VENDOR-signup assertions — see below), 2 (7/7), 3 (6/6), and 4 (7/7, 5 together + 2 confirmed on an isolated rate-limiter-reset re-run, same documented pattern as prior phases) — no regressions beyond the ones this phase's own changes required fixing.

Real bugs found and fixed during this phase (not test-authoring mistakes):
1. **Vendor signup never created a vendor.** `SignupWizard.tsx`'s VENDOR path collected firstName/lastName (couple-shaped fields) and called `updateMyProfile()` — never `POST /vendors`. Every vendor who ever signed up would land on `roleHomeRoute.VENDOR` (`/vendor/dashboard`) and 404 forever, since no vendor row existed. This was a latent bug from Frontend Arch Phase 1, invisible until Phase 5 built the first real `(vendor)` page to actually reach. Fixed: the VENDOR path now asks for a business name and calls the real `POST /vendors`; its success screen sends a brand-new vendor to `/vendor/profile` specifically (not `/vendor/dashboard`) to nudge completing it. `phase-01-auth.spec.ts`'s VENDOR signup test was updated to match — it had been asserting the old, broken shape (firstName field, direct-to-dashboard landing) the whole time, meaning that test's earlier "pass" was validating dead code, not real behavior. This is the same class of drift as Frontend Arch Phase 3's `/couple/home` fix — a stale assertion propping up an untested path.
2. **`GET /categories` (list) crashed the profile editor with a real 500** (`Cannot read properties of undefined (reading 'length')` in `ServicesSection`) — the services-embedding fix from this phase's backend addendum only touched `findCategoryBySlug`, not `findActiveCategories` (the list endpoint `ProfileEditor` actually calls). Caught by manually loading `/vendor/profile` against a real vendor before writing any Playwright, not by code review. Fixed by adding the same `services` include to the list query; also hardened `ServicesSection.tsx` to treat a missing `services` array as empty rather than crash, as defense in depth.
3. **Portfolio items never visually left "Processing," even after the real worker finished.** `PortfolioManager.tsx` only updated its local state once, at upload-confirm time, with whatever status `POST /media/:id/confirm` returned synchronously (`PROCESSING`) — there was no mechanism to pick up the later `READY` transition short of a manual page reload. Caught by a real headed Playwright run timing out waiting for the processed image, cross-checked directly against the database (`status: READY` was already true — the bug was purely that the UI never re-fetched, not a backend timing issue). Fixed by polling `GET /media/me` every 3 seconds while any item is in a non-terminal status.
4. **A real, systemic worker crash** (see the backend-additions note above and its own standalone commit) that repeatedly took down media-processing verification runs during this phase — root-caused to a Prisma `update()`-vs-`updateMany()` distinction on a row that can legitimately disappear mid-flight (cascading delete from user/test-account cleanup), not fixed by another manual Redis flush this time.

Test-authoring mistakes (not app bugs), for the record: an early version of the packages test hit a strict-mode Playwright violation because the empty-state UI intentionally renders two "+ Add package" buttons (header + empty-state CTA, both functionally identical) — fixed with `.first()`, not a UI change, since the duplication is a reasonable, deliberate pattern.

### Notes

- **Dashboard metrics were deliberately reduced to 3 real numbers** (profile views, leads, approved reviews) instead of the mockup's 4 ("new leads this week", "response rate", and "conversion rate" have no backing computation anywhere in the backend, confirmed by reading every exported function in the analytics service) — filed as [Open Question 13](10-risks-and-open-questions.md#13-vendor-dashboard-metrics-mockup-shows-3-numbers-the-backend-never-computes), resolved via scope reduction rather than fabrication.
- **Location section was simplified to a flat city select + service-area checkboxes**, not the mockup's full country→state→city cascading selects — the real seeded location data only has 1 country and 6 cities total, so a 3-level cascade would be speculative UI for data that doesn't exist yet. `AREA`-type locations (the mockup's "Indiranagar" free-text field) have no real backend data at all and were omitted rather than faked with a free-text input with nowhere real to persist to.
- `phase5-vendor-test@wedhub.dev` (a manually-created VENDOR account used for live curl verification, including setting a real logo via a real R2-uploaded photo) is **intentionally left in the dev database** as reusable fixture data, same rationale as prior phases' fixtures — its vendor listing sits at `PENDING_VERIFICATION` with a real logo, a real package, and a real attached service, useful for Frontend Arch Phase 6/7 work. All Playwright-created test accounts (`e2e-phase5-*@wedhub.dev`) were deleted via `afterEach` per the established convention.
- `npx tsc --noEmit`, `eslint`, and `next build` all pass cleanly on both the frontend and backend sides.

---

## Frontend Arch Phase 6 — Vendor Leads & Reviews

### What this unlocks

A vendor can now see real enquiries land as leads, work them through the real (non-strict) status lifecycle, leave internal notes, and view and respond to real approved reviews — closing the loop the couple-facing enquiry/review flows (Stage 2) feed into. No backend endpoints needed to be added — both `/leads/*` and `/reviews/:id/respond` already existed with exactly the shapes required, confirmed via a dedicated research pass before writing any frontend code, then re-confirmed field-by-field via live curl calls against a real seeded vendor/lead/review before touching Playwright.

### Backend research findings (no schema/endpoint changes required this phase)

- `leads` and `enquiries` are two ends of one pipeline, not duplicate modules: a couple's `Enquiry` fans out into one `Lead` row per vendor; `Enquiry` itself has no status field by design (status lives per-vendor on `Lead`). Vendors manage `Lead` rows via the `leads` module (`GET/PATCH /leads`, `POST /leads/:id/notes`, `GET /leads/analytics`), which mirrors the `/vendors/me/*` ownership pattern exactly (`getOwnedVendorOrThrow(userId)` in every controller function).
- There is no allowed-transitions state machine — confirmed by reading `lead.service.ts`'s own comment: product.md's lifecycle is "a suggested progression, not a strict finite-state machine." The only enforced rule is a terminal-status lock (`WON/LOST/SPAM/CLOSED` cannot move to a different status once reached; admin has a separate bypass route, out of scope here).
- `LeadNote` is a flat, vendor-authored note with no thread/reply-to structure and no couple-visible channel — the mockup's live two-way "Conversation" chat and "follow-up reminder" have zero backing data anywhere (`Lead` has no reminder field), so both were omitted rather than built as fake/local-only UI.
- The vendor's own review list reuses the exact same public `GET /vendors/:vendorId/reviews` endpoint the couple-facing profile page already calls (APPROVED-only, no vendor-scoped "all statuses" endpoint exists) — so a PENDING/FLAGGED/HIDDEN review is invisible to the vendor too. `vendorResponse`/`vendorRespondedAt` are plain fields on `Review` (one reply per review, overwritten on a second call, no reply history).
- No star-histogram endpoint exists (confirmed already in [Open Question 9](10-risks-and-open-questions.md#9-no-star-rating-distribution-breakdown-available-anywhere-in-the-backend)) — the reviews page computes its 5/4/3/2/1 breakdown client-side from the fetched (already APPROVED-only) review list.
- No couple-facing "rating-summary component" existed to reuse from Stage 2, contrary to this stage file's original task-checklist assumption — the couple-facing vendor page's rating markup was always inlined directly in `app/(public)/vendors/[slug]/page.tsx`, never extracted. The Phase 6 reviews page builds its own summary rather than extracting/sharing one, since doing so wasn't necessary to hit real data and was out of this phase's scope.

### Routes implemented

- `(vendor)/vendor/leads` — master-detail leads board
- `(vendor)/vendor/reviews` — rating summary + review list + respond action

### Components added

- `app/(vendor)/vendor/leads/LeadsBoard.tsx` — status pill-tab filters (built from the real 10-value `LeadStatus` enum), master list, detail panel (contact info, wedding date/budget/guest count, original enquiry message), status-update control (disabled once a lead is terminal), internal notes list + add form
- `app/(vendor)/vendor/reviews/ReviewsBoard.tsx` — average+per-star summary (computed client-side), filter tabs (All/5★/4★/3★ & below/Awaiting response), review list with photos, inline respond form
- `lib/api/leads.types.ts`, `leads.ts` (server reads), `leads-client.ts` (client writes) — new, since no leads-module types existed yet
- `lib/api/reviews.types.ts` (just the respond-body type — the read side deliberately reuses `VendorReview`/`VendorReviewPhoto` from the existing `vendors.types.ts` and `getVendorReviews` from `catalog.ts` rather than duplicating them, since Phase 6 confirmed it's the same endpoint and shape the couple-facing page already uses), `reviews-client.ts` (client write for the respond action)
- `components/shared/VendorShell.tsx` — Leads and Reviews moved from `comingSoonLinks` to real `navLinks`

### Backend endpoints consumed

`GET /leads`, `GET /leads/:id`, `PATCH /leads/:id/status`, `POST /leads/:id/notes`, `GET /vendors/:vendorId/reviews`, `POST /reviews/:id/respond`.

### Flow

```
Before writing any frontend code: dispatched a research pass covering both
the leads and reviews modules in full (schema, routes, service-layer
transition logic, ownership pattern, response shapes) — see "Backend
research findings" above. This surfaced that no backend changes were
needed, unlike Phases 4 and 5, and clarified two real scope cuts (no
reminder/conversation-thread backing data, no vendor-scoped all-statuses
review list) before any UI was designed around them.

Couple submits a real enquiry (POST /enquiries/single-vendor, requires an
   APPROVED vendor) → fans out into a real Lead (status NEW) →
/vendor/leads → GET /leads → lead appears in the master list → select it →
   GET /leads/:id → real detail (contact info, enquiry message, notes,
   status history) → change status via the select + "Update status" →
   PATCH /leads/:id/status → real contactedAt/respondedAt side effects →
   add an internal note → POST /leads/:id/notes → appears immediately

Couple's real APPROVED review (verifiedInteraction: true because they have
   a real Lead with the vendor) → /vendor/reviews → GET
   /vendors/:vendorId/reviews (same public endpoint the couple-facing page
   uses) → real average/per-star summary → "Respond" → POST
   /reviews/:id/respond → real vendorResponse persisted, rendered inline
   without a reload
```

### Playwright verification

`e2e/phase-06-vendor-leads-reviews.spec.ts` — 2 tests: a real enquiry submitted via direct API call (mirroring the real submission path, same convention as Phase 5's `registerVendorAndCreateListing` helper) appears as a lead on `/vendor/leads`, and a real status change plus a real internal note both persist and reflect immediately in the UI; a real APPROVED review (seeded via the review-creation endpoint, then approved directly via psql since no admin-moderation UI exists yet — same "reach past a missing admin UI" pattern `deleteTestUser` already established for direct DB access) renders with a correct rating summary and verified-booking badge, and a real reply via the respond action appears without reload. Both vendors used in this spec are flipped to `APPROVED` directly via a new `approveVendor()` psql helper in `e2e/support/test-users.ts`, since `POST /enquiries/single-vendor` 404s on any non-APPROVED vendor and there's no admin-review UI yet to reach that state through the real flow. Run headed, watched, 2/2 passing. Full suite re-run after this phase: 31/31 passing across Phases 1–6, no regressions.

Real friction hit and fixed during this phase (not an app bug, but a real recurring problem): the backend's in-memory rate limiters (login, register, enquiry, review — all previously fixed constants) repeatedly tripped mid-verification, both from manual curl-based seeding and from Playwright's own registration-heavy test accounts, especially when running the full suite back-to-back (the registration limiter tripped on a 31-test run even after the login limiter alone had been raised). Rather than continuing the established "wait it out or restart the backend" workaround, all four limiters were made env-configurable with unchanged production defaults — see [Open Question 14](10-risks-and-open-questions.md#14-dev-only-rate-limit-overrides-added-for-playwright-friction). This also required killing a large number (~50+) of stray leftover `tsx watch` dev-server processes accumulated across the whole engagement's sessions before a clean single-instance restart would take effect — a one-time cleanup, not a recurring step.

### Notes

- Lead notification surfacing (dashboard/nav unread counts for new leads) was scoped out of this phase — no real UI element needed it yet, since the vendor shell's notification bell predates this phase and isn't wired to any module's unread count.
- `phase6-seed-vendor@wedhub.dev` / `phase6-seed-couple@wedhub.dev` (manually-created accounts used for live curl verification, including one real APPROVED review) are **intentionally left in the dev database** as reusable fixture data, same rationale as prior phases' fixtures. All Playwright-created test accounts (`e2e-phase6-*@wedhub.dev`) were deleted via `afterEach` per the established convention.
- `npx tsc --noEmit` and `eslint` both pass cleanly on the new/changed files.

---

## Frontend Arch Phase 7 — Vendor Monetization

### What this unlocks

A vendor can now view real plan pricing, upgrade (immediately via a real trial, or via a real Razorpay order handoff for non-trial plans), cancel/undo-cancel, see real invoice history, view a dedicated analytics page (real profile-view/lead/review metrics plus a real day-by-day chart for advanced-tier plans), and manage business info, notification preferences, and account deactivation from a real settings page. This completes Stage 3 (Vendor Experience) — every mockup nav item under `(vendor)/*` now links to a real, backend-verified route.

### Backend research findings (no schema/endpoint changes required this phase)

- `subscriptions` and `plans` are separate sibling modules; `payments` is an empty stub — all checkout logic lives inside `subscription.service.ts`, all Razorpay SDK calls are isolated in `src/integrations/payment/razorpay.client.ts`.
- A vendor with no `Subscription` row at all is implicitly on FREE — `GET /subscriptions/me` returns `null`, not an error or a synthetic FREE row. The real seeded plan data does include an explicit FREE-tier `SubscriptionPlan` row (price `"0"`) for the plan-card grid, so no synthetic/hardcoded FREE card was needed.
- There is no dedicated downgrade endpoint — downgrading to Free is `POST /subscriptions/me/cancel` (confirmed via an explicit code comment in `subscription.service.ts`), not a separate route. The UI's "Downgrade to Free" button on the Free plan card calls the same cancel endpoint under the hood.
- Payment confirmation is 100% webhook-driven (`POST /webhooks/razorpay`, HMAC-signature-authenticated, no `authenticateMiddleware`) — there is no frontend-callable "verify payment" endpoint, confirmed by an explicit design comment in `webhook.service.ts` ("the webhook is the source of truth regardless of whether the frontend's checkout-success callback ever fired"). `CheckoutButton.tsx`'s Razorpay `handler` callback therefore only triggers a poll of `GET /subscriptions/me`, never an assumption of success.
- Only 2 of 8 declared entitlement keys (`portfolio_limit`/`video_limit` via media upload, `analytics_level` via the analytics endpoint) are enforced by any real backend code path — `lead_access`, `featured_eligibility`, `promotional_placement`, `response_tools`, `priority_support` exist in plan JSON and the type system but gate nothing today (confirmed by grepping every call site of `canVendorAccess`/`canVendorUse`/`canVendorUpload`). No standalone entitlements HTTP endpoint exists either — plan limits/features are read from `GET /subscriptions/me`'s embedded `plan` object.
- No team/staff model exists anywhere in the schema (`Vendor.ownerUserId` is a single nullable FK, no multi-user-per-vendor concept) — confirmed via an exhaustive grep, not assumed.
- "Deactivate my vendor listing" has no real backend implementation — only a generic, role-agnostic `POST /users/me/deactivate` exists (flips `User.status`, not `Vendor.status`; `Vendor.status = DEACTIVATED` is a schema enum value with zero code paths that ever set it).
- No real Razorpay test-mode credentials exist in this dev environment, and the codebase has no mock/sandbox payment provider — confirmed via `razorpay.client.ts` throwing `ExternalServiceError` at call-time if `RAZORPAY_KEY_ID`/`SECRET` are unset.
- Notification preferences (`GET/PUT /notifications/me/preferences`) are the exact same generic, role-agnostic system Frontend Arch Phase 4 built for couples — no vendor-specific preferences module exists, and this phase is the first to actually wire a frontend page to it.

Three explicit scope decisions were made with the user before building (all "Recommended" options): build the subscription UI and verify up to Razorpay order creation without a real payment; omit team members and vendor-listing deactivation entirely rather than build against non-existent backend support; build the analytics page as its own real page rather than folding it into the dashboard.

### Routes implemented

- `(vendor)/vendor/subscription` — plan cards, current-subscription panel, checkout handoff, invoice history
- `(vendor)/vendor/analytics` — profile-view/lead/review metrics, day-by-day chart (advanced tier), leads funnel, response performance
- `(vendor)/vendor/settings` — business info, notification preferences, deactivate account

### Components added

- `app/(vendor)/vendor/subscription/`: `SubscriptionBoard.tsx` (plan selection, upgrade/cancel/undo-cancel, invoice table), `CheckoutButton.tsx` (Razorpay Checkout.js loader + invocation, renders a clear "not configured" state when `NEXT_PUBLIC_RAZORPAY_KEY_ID` is unset)
- `app/(vendor)/vendor/analytics/AnalyticsBoard.tsx` — reuses `VendorAnalytics` (Phase 5) and `LeadAnalytics` (Phase 6) types/endpoints, no new analytics data source
- `app/(vendor)/vendor/settings/SettingsBoard.tsx` — business-info form, notification-preference toggles, danger zone
- `lib/api/subscriptions.types.ts`, `subscriptions.ts` (server reads), `subscriptions-client.ts` (client writes) — new
- `lib/api/notification-preferences.types.ts`, `notification-preferences.ts` (server read), `notification-preferences-client.ts` (client write) — new; the first frontend consumer of this backend system
- `lib/api/vendor-self-client.ts` — added `updateMyVendorDetail()` for `PATCH /vendors/me/detail` (business name)
- `components/shared/VendorShell.tsx` — Subscription/Analytics/Settings moved from a removed `comingSoonLinks` array into real `navLinks`; all nine mockup nav items now link to real routes

### Backend endpoints consumed

`GET /plans`, `GET /subscriptions/me`, `POST /subscriptions/me/upgrade`, `POST /subscriptions/me/cancel`, `POST /subscriptions/me/undo-cancel`, `GET /subscriptions/me/invoices`, `GET /vendors/me/analytics`, `GET /leads/analytics`, `PATCH /vendors/me/detail`, `PUT /vendors/me/profile`, `PATCH /users/me`, `GET /notifications/me/preferences`, `PUT /notifications/me/preferences`, `POST /users/me/deactivate`.

### Flow

```
Before writing any frontend code: dispatched a research pass covering
subscriptions, plans, payments/razorpay integration, entitlements, vendor
analytics, and vendor settings support (notification prefs, team members,
deactivation) — see "Backend research findings" above. This surfaced real
gaps (no Razorpay sandbox, no team model, no vendor-listing deactivation)
that were resolved as explicit scope decisions with the user before any
UI was designed around them, rather than guessed at.

/vendor/subscription → GET /plans + GET /subscriptions/me + GET
   /subscriptions/me/invoices (parallel) → plan cards render real
   prices/limits/features → select a trial-eligible plan → POST
   /subscriptions/me/upgrade → { subscription: {...TRIALING}, checkout:
   null } → activated immediately, no payment
   OR select a non-trial plan → { subscription: null, checkout: {orderId,
   amount, currency} } → CheckoutButton renders a real Razorpay Checkout.js
   invocation (or a "not configured" state, since no test credentials
   exist here) → on the client-side success callback, poll GET
   /subscriptions/me (never trust the callback itself — webhook is the
   real source of truth)
   Cancel → POST .../cancel {immediate:false} → cancelAtPeriodEnd: true →
   Undo → POST .../undo-cancel → cancelAtPeriodEnd: false, both merging
   the client-held plan object back in since neither response includes it

/vendor/analytics → GET /vendors/me/analytics + GET /leads/analytics
   (parallel) → real profile views/leads/reviews + real response/
   conversion rates + real qualified/won/lost funnel; advanced-tier
   vendors additionally get a real profileViewsByDay bar chart, basic-tier
   vendors see an honest upgrade prompt instead of a fake/empty chart

/vendor/settings → PATCH /vendors/me/detail (businessName) + PATCH
   /users/me (firstName/lastName) + PUT /vendors/me/profile (phone), all
   in parallel on one "Save changes" → GET/PUT /notifications/me/
   preferences → real per-toggle persistence, confirmed via reload (opt-out
   model: no row means enabled) → "Deactivate account" → POST /users/me/
   deactivate → logout() → /login
```

### Playwright verification

`e2e/phase-07-vendor-monetization.spec.ts` was written (3 tests covering the subscription page's plan cards/trial-upgrade/cancel/undo-cancel flow, the analytics page's real metrics and basic-tier gating message, and the settings page's business-info save plus a real notification-preference toggle round-trip via reload) and passed `tsc --noEmit`/`eslint` cleanly, but per an explicit user instruction partway through this phase (2026-09-02), Playwright verification was deliberately batched with Stage 4 (Frontend Arch Phases 8–10) into one combined pass rather than run after each individual phase. **Run 2026-09-04 — all 3 tests pass, headed, against the real backend.** See the "Combined Playwright verification — Phases 7–10" entry at the end of Phase 10's section below for the full write-up of what that run found: a real, unrelated production bug in `SettingsBoard.tsx`'s save handler (fixed) and a test locator that was ambiguous by design (Pro and Premium both carry a real 14-day trial).

In place of a Playwright run, every backend integration point for this phase was independently confirmed via live curl calls against a real seeded vendor before any frontend code was written against it: `GET /subscriptions/me` returning `null` for a fresh vendor, a real trial-eligible upgrade to Pro activating immediately, cancel/undo-cancel round-tripping correctly, a real `PATCH /vendors/me/detail` businessName change, a real notification-preference toggle, and `GET /vendors/me/analytics` correctly flipping to `"advanced"` tier with a `profileViewsByDay` array once the vendor was on a plan with `analytics_level: "advanced"`.

One real bug was caught during this curl verification (not a test-authoring mistake, and not caught by code review): `POST /subscriptions/me/cancel` and `/undo-cancel` omit the `plan` relation in their response (only `GET /subscriptions/me` includes it) — the initial `Subscription` type assumed `plan` was always present, which would have thrown at render time immediately after any real cancel/undo-cancel call. Fixed by introducing `SubscriptionWithoutPlan` and explicitly merging the client-held `plan` back into state after those two calls, rather than trusting the response shape to match the richer `GET` endpoint.

### Notes

- The subscription page only surfaces MONTHLY-interval plans in the 3-card grid, matching the mockup's simple layout — YEARLY variants exist in the real seeded plan data (confirmed via `GET /plans`) but a billing-interval toggle wasn't built, since nothing in the mockup calls for one. Revisit if a future pass wants yearly pricing exposed.
- `phase6-seed-vendor@wedhub.dev` (reused from Phase 6's fixture data) now carries a real TRIALING Pro subscription as of this phase's live curl verification — left in place intentionally as richer fixture data for any future phase needing a non-Free vendor to test against.
- `npx tsc --noEmit` and `eslint` both pass cleanly on every new/changed file (one real unused-variable warning was caught and fixed during this pass, not left as a lint suppression).

---

## Frontend Arch Phase 8 — Admin Core

### What this unlocks

An admin user (provisioned directly in the database — there is no self-registration path for `Role.ADMIN`) can now log in, see real platform-wide metrics, review and act on pending vendor approvals (approve/reject/suspend/restore/deactivate, all respecting the backend's real status-transition rules), update a vendor's verification level, manually onboard a vendor via invitation, and view/suspend/restore any user account — all backed by real data, with every privileged action producing a real audit-log entry. This is the first admin-facing frontend work in the whole engagement; `(admin)` is a route group inside the same `wedhub-frontend-app` Next.js app (confirmed via `frontenddocs/00-index.md` — there is no separate admin app), and `proxy.ts`/`roleHomeRoute`/`requireRole` from Frontend Arch Phase 1 already had `ADMIN` wired in, needing no changes.

### Backend research findings (one small, justified addition — see below)

- Admin auth is not a separate flow — same `/auth/login`, same JWT shape, same `authenticateMiddleware` + `authorize(Role.ADMIN)` two-middleware pattern used everywhere else in the codebase. `ADMIN` cannot self-register (`registerSchema.role` only allows `END_USER`/`VENDOR`) — confirmed admin accounts are backend-provisioned only, matching a note from Frontend Arch Phase 1.
- `GET /admin/dashboard` is a real, already-computed aggregate endpoint (`totalUsers`, `newRegistrations` with its real window, `totalVendors`, `activeVendors`, `paidVendors` — ACTIVE-or-TRIALING subscriptions count as "paid" here, a real surprise vs. a naive reading of the mockup — `totalLeads`, `totalEnquiries`, `conversionRate` as a 0-1 fraction, `revenue.total`/`.thisMonth`, `mrr` — ACTIVE-only, YEARLY normalized ÷12). It does not include "recent activity" or "pending approvals" — those are two separate real calls (`GET /admin/audit-logs?limit=5`, `GET /admin/vendors?status=PENDING_APPROVAL&limit=4`), not one combined endpoint, despite the mockup showing them together.
- `vendor-admin` module's status transitions are a strict, server-enforced allow-list (`transitionStatus()`'s `allowedFromStatuses` per action) — approve/reject only from `PENDING_APPROVAL`, suspend only from `APPROVED`, restore only from `SUSPENDED`, deactivate from any non-terminal status. Every transition plus `setVerification` writes both a `VendorStatusHistory` row and a real `AuditLog` row in one transaction.
- `admin-users` module is confirmed solid, already-hardened ground — it had a real password-hash-leak bug fixed in it before this phase (an unscoped `prisma.user.update()` was returning `passwordHash` in the API response; now correctly `select`s only safe fields). No role-change endpoint exists — only `status` is admin-mutable.
- The `Role`/`Permission`/`RolePermission`/`AdminUser` tables (a more granular, per-staff-role RBAC system, distinct from the flat `User.role` enum) exist and are seeded, but are confirmed **100% read-only and unenforced** — `authorize()` gates every route on the coarse `User.role === ADMIN` check alone; nothing in the codebase consults these tables for an actual access-control decision. Deferred entirely to Frontend Arch Phase 10 (read-only visibility only, per the stage doc's existing instruction) — not touched this phase.
- Several mockup affordances have no real backing data, confirmed via research rather than assumed: vendor list search/Plan-column/Verified-and-Featured-pills, the vendor-detail page's "optional approval notes" and "Save as draft" actions, the vendor-create form's category/city/phone/internal-note fields, and the users page's "Reported" filter and free-text search. All omitted from the real implementation rather than built against nothing — see the stage file's Phase 8 checklist for the specific reasoning behind each.
- One real, small gap required a backend addition (the only one this phase needed): `GET /admin/vendors/:id` had no way to resolve the vendor's owner account — resolved by adding `VENDOR_ADMIN_INCLUDE` (extends the shared `VENDOR_FULL_INCLUDE` with `owner: { select: { id, email, phone } }`) and a new `findVendorByIdForAdmin()` repository function, used only by the admin service — deliberately not merged into the shared include, which also backs the public vendor-profile endpoint, to avoid leaking an owner's contact info publicly. Verified via curl both that the admin endpoint now returns `owner` and that the public endpoint still doesn't.

Two explicit scope decisions were made with the user before building (both "Recommended"): add the small `owner`-include backend addition rather than omit the field; build the vendor-create form as only the two real fields (business name + invite email) rather than extending the backend to accept the mockup's richer field set.

### Routes implemented

- `(admin)/admin/dashboard` — metric grid, recent activity, pending approvals
- `(admin)/admin/vendors` — status-filtered list with an actions menu
- `(admin)/admin/vendors/[id]` — full detail, verification control, approve/reject/suspend/restore/deactivate, status history
- `(admin)/admin/vendors/create` — admin-initiated vendor creation + invitation
- `(admin)/admin/users` — status-filtered list with an actions menu
- `(admin)/admin/users/[id]` — account detail, suspend/restore, linked vendor (if any)

### Components added

- `components/shared/AdminShell.tsx` (section-labeled sidebar, matching the mockup's grouped nav — distinct from `VendorShell`'s flat list) + `AdminLogoutButton.tsx`
- `components/admin/AuditActivityRow.tsx` — renders one real audit-log entry as human-readable text from its real `action` enum + `before`/`after` JSON, shared between the dashboard's "Recent activity" card and the Frontend Arch Phase 10 audit-log page
- `lib/auth/require-admin.ts` — purely role-gated (unlike `require-vendor.ts`'s ownership check — confirmed via research that every admin route is role-gated only, nothing to "own")
- `lib/api/admin.types.ts`, `admin.ts` (server reads), `admin-client.ts` (client writes) — new; `AdminVendor`/`AdminVendorDetail` are standalone types rather than extending `VendorSelf` (Phase 5's self-service shape), since the real scalar field sets genuinely differ (admin responses include `ownerUserId`, `creationSource`, `suspensionReason`, `approvedAt`, `deletedAt`, none of which `VendorSelf` carries)
- `app/(admin)/admin/vendors/VendorsTable.tsx`, `[id]/VendorDetailBoard.tsx`, `create/CreateVendorForm.tsx`, `app/(admin)/admin/users/UsersTable.tsx`, `[id]/UserDetailBoard.tsx`

### Backend endpoints consumed

`GET /admin/dashboard`, `GET /admin/vendors`, `GET /admin/vendors/:id`, `GET /admin/vendors/:id/status-history`, `POST /admin/vendors`, `POST /admin/vendors/:id/invitations`, `POST /admin/vendors/:id/verify`, `POST /admin/vendors/:id/approve`, `POST /admin/vendors/:id/reject`, `POST /admin/vendors/:id/suspend`, `POST /admin/vendors/:id/restore`, `POST /admin/vendors/:id/deactivate`, `GET /admin/users`, `GET /admin/users/:id`, `POST /admin/users/:id/suspend`, `POST /admin/users/:id/restore`, `GET /admin/audit-logs`.

### Flow

```
Before writing any frontend code: dispatched a research pass covering
admin auth, dashboard aggregation, vendor-admin (routes/schema/service —
including the exact status-transition allow-list), admin-users, and the
RBAC visibility system, plus a full inventory of all 13 admin mockup
screens. This surfaced the one real backend gap (owner-account field) and
several mockup-vs-backend mismatches (search, Plan column, approval
notes, vendor-create's extra fields, "Reported" users) before any UI was
built around them — resolved as explicit, user-confirmed scope decisions.

Admin logs in via the existing /login (no separate admin auth) →
   /admin/dashboard → GET /admin/dashboard + GET /admin/audit-logs?limit=5
   + GET /admin/vendors?status=PENDING_APPROVAL&limit=4 (parallel) → real
   metrics, real recent activity, real pending-approval quick-list

/admin/vendors?status=PENDING_APPROVAL → GET /admin/vendors → select a
   vendor → /admin/vendors/:id → GET /admin/vendors/:id (now includes
   owner) + GET .../status-history (parallel) → real profile display →
   "Approve vendor" → POST .../approve (no body) → real VendorStatusHistory
   + AuditLog rows written transactionally → UI merges the scalar-only
   response into existing rich state (see "real bug caught" below) →
   router.refresh() re-fetches the full detail

/admin/vendors/create → business name + optional invite email → POST
   /admin/vendors (businessName only) → POST .../invitations (invitedEmail
   only) → real DRAFT vendor + real VendorInvitation row

/admin/users → GET /admin/users → select a user → suspend (real reason
   required) → POST .../suspend → real AuditLog row → restore → POST
   .../restore
```

### Playwright verification

`e2e/phase-08-admin-core.spec.ts` was written (4 tests: dashboard metrics/recent-activity/pending-approvals; a full pending-vendor approve→verify→suspend→restore lifecycle on the detail page plus a separate real create-vendor-and-invite flow; real user suspend/restore reflected without reload) and passed `tsc --noEmit`/`eslint` cleanly, but per the same explicit user instruction that paused Frontend Arch Phase 7's Playwright run, verification for this phase was batched together with the rest of Stage 4 (Frontend Arch Phases 9–10) into one combined pass. **Run 2026-09-04 — all 4 tests pass, headed, against the real backend.** See the "Combined Playwright verification — Phases 7–10" entry at the end of Phase 10's section for the full write-up.

In place of a Playwright run, every backend integration point for this phase was independently confirmed via live curl against a freshly-provisioned ADMIN account and real seeded/created vendor and user data: dashboard metrics (including confirming `paidVendors`/`mrr` behave exactly as the TRIALING-vs-ACTIVE distinction implies), a full vendor lifecycle (create → invite → set verification → approve/reject → suspend → restore, each checked against real status-history and audit-log rows), and user suspend/restore.

One real bug was caught during this curl verification (not a test-authoring mistake, and not caught by code review, same category as Phase 7's cancel/undo-cancel finding): **every** admin vendor write endpoint (verify, approve, reject, suspend, restore, deactivate, and the generic `PATCH .../detail`) returns a scalar-only `Vendor` row with zero relations included — confirmed by direct inspection of `vendor-admin.service.ts`'s `transitionStatus()`/`setVerificationLevel()`, both of which call `prisma.vendor.update()` with no `include` at all, unlike `GET /admin/vendors`/`GET /admin/vendors/:id` which use the full `VENDOR_FULL_INCLUDE`/`VENDOR_ADMIN_INCLUDE`. An initial pass typed every write-endpoint response as the rich `AdminVendorDetail` shape and replaced full component state with it directly (`setVendor(result.data)`), which would have silently wiped `profile`/`categories`/`owner` from the detail page's UI immediately after any single admin action (approve, suspend, etc.) — caught before any Playwright run even started, purely from re-reading the actual curl output against the declared types. Fixed by introducing a narrower `AdminVendorScalarOnly` type for every write endpoint's real response shape, and changing every handler to merge (`{ ...prev, ...result.data }`) into existing state rather than replace it.

### Notes

- `phase8-admin-test@wedhub.dev` (a manually-provisioned ADMIN account used for all live curl verification) is **intentionally left in the dev database** as reusable fixture data, same rationale as prior phases' fixtures — it could not be cleaned up via the usual `deleteTestUser` even if desired, since a real `VendorInvitation` row now references it as `invited_by_admin_id` (a foreign-key constraint, not an oversight). All other curl-created throwaway accounts (`phase8-pending-vendor@wedhub.dev`, `phase8-reject-vendor@wedhub.dev`) were deleted after verification.
- `npx tsc --noEmit` and `eslint` both pass cleanly on every new/changed file across both the frontend and backend.

---

## Frontend Arch Phase 9 — Admin Catalog & Moderation

### What this unlocks

An admin can now manage the category/location taxonomy (create categories, enable/disable them, browse and extend the location tree), oversee every lead across the whole platform (not just one vendor's own leads) with the ability to override a lead's status even past a terminal state, and moderate reviews (approve, flag, hide) with real reviewer/reporter identity visible for the first time. This completes the "internal operations" half of Stage 4 — only Frontend Arch Phase 10 (monetization/governance/audit) remains.

### Backend research findings (three small, justified additions — see below)

- Categories and locations have **no separate `/admin/*` route mount at all** — genuinely surprising vs. every other admin module built so far (vendors, users, dashboard, audit logs all live under `/admin/...`). Instead, write operations (POST/PATCH/DELETE) are gated per-route on the *same* public `categoriesRouter`/`locationsRouter` already used since Frontend Arch Phase 2. This means admin catalog writes are mechanically guaranteed to affect the exact same data the couple-facing search filters and vendor self-service pickers read — there is no cache or separate table to go stale, confirmed by construction rather than by testing a sync mechanism.
- Neither module has a disable-specific or reorder-specific endpoint — both are just `PATCH` with `isActive`/`sortOrder` in the body, same endpoint as any other field edit. Neither has a delete endpoint at all.
- `omitUndefined` (the shared partial-update helper used throughout this codebase) was independently re-verified safe for `isActive: false` specifically — a boolean `false` is not `undefined`, so it survives the strip-undefined-keys step and reaches Prisma as a real `false`, confirmed by reading the helper's source directly rather than assuming.
- The admin leads list (`GET /admin/leads`) validates a `search` query param via its shared schema but **silently ignores it** — the admin service/repository functions only ever read `{status, page, limit}` from the filter object. Confirmed by reading `findAllLeadsAdmin`/`countAllLeadsAdmin` directly, not inferred from the schema alone — a search box would have looked functional and done nothing, so none was built.
- Admin lead status overrides (`PATCH /admin/leads/:id/status`) genuinely bypass the terminal-status lock that governs the vendor-facing leads board (Frontend Arch Phase 6) — re-confirmed by reading `updateStatusAdmin`, which never calls `assertNotLeavingTerminalStatus`. The admin UI's status control is therefore never disabled, unlike the vendor board's.
- Review moderation is a single `status` field PATCH to one of exactly 4 real target values (`APPROVED`/`REJECTED`/`FLAGGED`/`HIDDEN` — `PENDING` isn't even a valid PATCH target per the schema's own enum) — narrower than the mockup's "approve/hide/remove/dispute" framing implied. `recalculateVendorRating` fires correctly whenever a review's status moves into or out of `APPROVED` (confirmed via reading `moderateReview`'s logic, not assumed from Phase 6's earlier partial read).
- Three real gaps required backend additions this phase (all per explicit user decisions, 2026-09-02, all "Recommended" options): (1) reviews had no reviewer/reporter identity anywhere — resolved by joining a minimal safe `user`/`reporter` select onto the relevant review queries; (2) disabling a category or location made it permanently unlistable, even to the admin who disabled it — resolved by a new admin-only `includeInactive=true` param on both list endpoints; (3) the mockup's "Remove"/"Disputed" concepts have no real backend equivalent — resolved by relabeling (Remove→the real `HIDDEN` status) and omission (no Disputed anywhere), not a backend change.

### Routes implemented

- `(admin)/admin/categories-locations` — two-tab category tree + location tree
- `(admin)/admin/leads` — platform-wide lead list with status filter
- `(admin)/admin/leads/[id]` — lead detail with admin status override (no terminal-status lock)
- `(admin)/admin/reviews` — review moderation queue

### Components added

- `app/(admin)/admin/categories-locations/`: `CatalogBoard.tsx` (tab switcher, category create/enable-disable, client-side parent/subcategory grouping from the flat category list since no endpoint returns a nested tree), `LocationTree.tsx` (on-demand cascading country→state→city→area tree — no bulk tree endpoint exists, each expand triggers a real `GET /locations?type=X&parentId=Y` call)
- `app/(admin)/admin/leads/AdminLeadsTable.tsx`, `[id]/AdminLeadDetailBoard.tsx`
- `app/(admin)/admin/reviews/AdminReviewsBoard.tsx` — real reviewer-name resolution, real report display, 4-action real moderation
- `components/shared/AdminShell.tsx` — Catalog/Leads/Trust & safety sections added to the sidebar
- `lib/api/admin.types.ts`, `admin.ts`, `admin-client.ts` — extended with catalog write bodies, `AdminLeadListItem`/`AdminLeadStatusUpdateResult`, `AdminReviewListItem`/`AdminReviewDetail`/`AdminReviewStatusUpdateResult`/`ReviewReport`. Deliberately reuses `Category`/`Location`/`CategoryAttribute` from `vendors.types.ts` (Phase 2's types) rather than duplicating them — confirmed field-for-field identical, since admin reads the same endpoints

### Backend endpoints consumed

`GET/POST /categories`, `PATCH /categories/:id`, `POST/PATCH/DELETE /categories/:id/attributes(/:attributeId)`, `GET/POST /locations`, `PATCH /locations/:id`, `GET /admin/leads`, `GET /admin/leads/:id`, `PATCH /admin/leads/:id/status`, `GET /admin/reviews`, `GET /admin/reviews/:id`, `PATCH /admin/reviews/:id/status`.

### Flow

```
Before writing any frontend code: dispatched a research pass covering
categories/locations (routes/schema/service — including a direct read of
omitUndefined's isActive:false handling and confirmation of genuinely
dead code for an admin category list), leads admin (re-confirming the
terminal-status bypass and the no-reassignment gap from Phase 6/Open
Question 3), and reviews admin (the real 4-value moderation action set,
recalculateVendorRating triggering, and the reviewer/reporter identity
gap). This surfaced three real, small backend gaps — resolved as explicit
user-confirmed scope decisions before any UI was built around them.

/admin/categories-locations → GET /categories?includeInactive=true (flat
   list, grouped into parent/subcategory pairs client-side) + GET
   /locations?type=COUNTRY (first level only) → toggle a category's
   isActive → PATCH /categories/:id → real disable, immediately reflected
   (and no longer a one-way trap, thanks to includeInactive) → expand a
   location node → GET /locations?type=STATE&parentId=... (on demand) →
   real cascading tree

/admin/leads?status=WON → GET /admin/leads (includes vendor summary,
   unlike the vendor-scoped list) → select a lead → GET /admin/leads/:id
   (no vendor field here — confirmed via curl) → override status past WON
   → PATCH .../status {status: "CONTACTED"} → real LeadStatusHistory row,
   no terminal-status rejection (unlike the vendor board)

/admin/reviews → GET /admin/reviews (now includes real user/reporter
   identity) → a flagged review's report reason + reporter name render for
   real → "Approve (dismiss report)" → PATCH .../status {status:
   "APPROVED"} → real recalculateVendorRating fires since the review is
   moving into APPROVED
```

### Playwright verification

`e2e/phase-09-admin-catalog-moderation.spec.ts` was written (4 tests: a category create→disable→reload→confirm-still-visible-and-marked-disabled→re-enable round trip, proving the includeInactive fix works end-to-end; a location tree expand test confirming real cascading fetches; a real lead created via the full couple→vendor→enquiry pipeline then admin-overridden past a WON terminal status; a review moderation test confirming a real reviewer email renders on the card and Approve works) and passed `tsc --noEmit`/`eslint` cleanly, but was batched with the rest of Stage 4, same explicit user instruction as Phase 8. **Run 2026-09-04 — all 4 tests pass, headed, against the real backend, after fixing a real, unrelated, unconditional production bug this run caught: `/admin/reviews` 500'd for every visitor** (`listReviewsAdmin()` never included `photos` on the query, unlike every other review-returning query in the same file — the frontend always reads `review.photos.length`). See the "Combined Playwright verification — Phases 7–10" entry at the end of Phase 10's section for the full write-up.

Every backend integration point for this phase was independently confirmed via live curl before this pause, most notably a complete, real disable→includeInactive-visible→re-enable round trip for both a category and a location (not just spot-checked — verified the exact count of items visible at each step: 20→19 active after disabling, 20 total with the disabled one flagged via `includeInactive=true`, back to 20 active after re-enabling), plus a real report→FLAGGED→re-approve cycle for a review with reporter identity confirmed present in the response.

One real bug was caught during this curl verification (same category as Phase 7's cancel/undo-cancel and Phase 8's vendor-write findings — this is now a recognized pattern worth checking for on every future admin-write endpoint before trusting its response shape): both `PATCH /admin/leads/:id/status` and `PATCH /admin/reviews/:id/status` return scalar-only rows with zero relations, confirmed by reading `updateLeadStatus`/`setReviewStatus` in their respective repositories (both plain `prisma.X.update()` calls with no `include`). Caught and fixed before any component code was written against the richer GET shapes, by introducing dedicated `AdminLeadStatusUpdateResult`/`AdminReviewStatusUpdateResult` types.

### Notes

- Category reordering (drag-and-drop, shown in the mockup) was not built — confirmed no reorder-specific endpoint exists; reordering would require one `sortOrder` PATCH per affected row with no batch endpoint, and the mockup's own inline tree view doesn't actually demonstrate a working drag interaction to port either. Revisit if this becomes a real operational need.
- Category attribute/filter CRUD (create/edit a `CategoryAttribute`) is real and fully wired at the API-client level (`createAdminAttribute`/`updateAdminAttribute`/`deleteAdminAttribute` all exist in `admin-client.ts`) but has no UI surface yet on the catalog page — the mockup itself doesn't show an inline attribute editor either (just an attribute *count* in each category's meta line), so this was deliberately left as a client-ready-but-not-yet-surfaced capability rather than guessed at.
- `npx tsc --noEmit` and `eslint` both pass cleanly on every new/changed file across both the frontend and backend.

---

## Frontend Arch Phase 10 — Admin Monetization, Governance & Audit

### What this unlocks

An admin can now manage platform pricing for real (create/edit/deactivate subscription plans — the one piece of Stage 4 monetization that was both fully backed and product-critical, since `product.md` explicitly requires admin-configurable pricing rather than hardcoded plan data), see exactly which parts of the mockup's monetization/governance vision have no backend behind them yet (Active Subscriptions, Transactions, Webhooks, Coupons-list — all rendered as honest, visible "not available" states rather than silently mocked), view the real (if currently unenforced) RBAC data model with an accurate warning about its inert status, and filter a real platform-wide audit trail. This completes Stage 4 (Admin Platform) — every Frontend Arch Phase in Stage 4 (8, 9, 10) is now code-complete.

### Backend research findings

- **Plans is the one fully real surface this phase**: `GET /plans` (public, active-only), `GET /admin/plans` (all plans incl. inactive), `POST /admin/plans`, `PATCH /admin/plans/:id` all exist exactly as needed. `tier`/`billingInterval`/`currency` are only settable at creation (confirmed via `updatePlanSchema` omitting all three) — deactivation is just `PATCH` with `isActive: false`, no dedicated endpoint. Verified via a full live curl round trip: created a real test plan, confirmed it appeared in `/admin/plans` but not the public `/plans`... then deactivated it and confirmed it disappeared from the public list while staying visible (marked inactive) in the admin list — then deleted the test row directly.
- **No admin subscriptions/transactions/webhooks list endpoint exists anywhere** (re-confirmed, this was already Open Question 2 going into this phase) — `/admin/subscriptions` carries only `POST .../refunds` and `POST .../coupons`; `modules/payments/` is an empty stub directory; `WebhookEvent` rows are actively populated by the real webhook handler but have zero admin-facing GET endpoints. All three read gaps were resolved as explicit UI unavailable-states, not backend additions, per user decision.
- **Coupons is create-only**: `POST /admin/subscriptions/coupons` is real (verified: creates a genuine `Coupon` row), but there is no GET/PATCH/DELETE for it anywhere — a coupon's `isActive` can in fact never be flipped to `false` by any endpoint today.
- **Roles & Permissions is real and read-only by design, confirmed via the backend's own code comment**: `GET /admin/roles` (with nested `rolePermissions.permission`), `GET /admin/permissions`, `GET /admin/admin-users` all work exactly as documented, and the repository layer itself carries a comment confirming `authorize()` only ever checks the coarse `User.role='ADMIN'` enum — nothing in the codebase consults `Role`/`Permission`/`RolePermission`/`AdminUser` for real access-control decisions. Verified live: a fresh test admin correctly saw real seeded roles/permissions and an empty `admin-users` list (since no `AdminUser` row existed for that test account, which is itself expected/correct behavior, not a bug).
- **Audit log filters are narrower than the mockup implies**: only `entityType`/`entityId`/`actorId` (all exact-match) plus pagination are server-filterable — confirmed via a direct read of `buildWhere()`. No action-type dropdown, no date-range filter, no free-text search exists server-side. `before`/`after` are shallow, hand-picked key/value snapshots that differ per call site (not a universal full-entity diff) — rendered generically rather than assuming a fixed shape.
- **Settings has zero backend representation of any kind** — confirmed via a full schema.prisma read plus a grep for `Settings`/`FeatureFlag` across the entire backend (the only hits were an unrelated `shortlist.service.ts` function of the same name). Built as a fully static, visibly-disabled placeholder per user decision, not a working form with nowhere to persist to.
- No backend changes were required or made this phase — every real endpoint used already existed with exactly the researched shape.

### Routes implemented

- `(admin)/admin/subscriptions` — 5-tab layout: Plans (real CRUD), Active Subscriptions/Transactions/Webhooks (unavailable-state panels), Coupons (real create form + unavailable-state list)
- `(admin)/admin/roles-permissions` — real, read-only roles/permissions/admin-users view with the accurate inert-RBAC warning banner
- `(admin)/admin/audit-log` — filterable audit trail (entityType/entityId/actorId + pagination) with before/after diff rendering
- `(admin)/admin/settings` — fully static placeholder
- `(admin)/admin/cms` — placeholder, matching the mockup's own "coming in a future phase" framing

### Components added

- `components/admin/UnavailablePanel.tsx` — shared "not available in this backend yet" state, reused across Active Subscriptions/Transactions/Webhooks/Coupons-list
- `app/(admin)/admin/subscriptions/`: `SubscriptionsBoard.tsx` (tab switcher, real plan cards with edit/deactivate, real coupon create form), `PlanFormModal.tsx` (create/edit modal, tier/billingInterval locked once editing)
- `app/(admin)/admin/roles-permissions/RolesPermissionsBoard.tsx` — admin-users table, role→permission matrix rendered as read-only badges
- `app/(admin)/admin/audit-log/AuditLogBoard.tsx` — filter bar (only the 3 real server-filterable fields), paginated table, generic before/after JSON diff rendering
- `app/(admin)/admin/settings/page.tsx`, `app/(admin)/admin/cms/page.tsx` — static placeholders
- `components/shared/AdminShell.tsx` — Monetization/Roles & permissions/Audit log/Platform sections added to the sidebar (every section now links to a real route)
- `lib/api/admin.types.ts`, `admin.ts`, `admin-client.ts` — extended with `AdminPlan`/`AdminCreatePlanBody`/`AdminUpdatePlanBody`, `AdminCoupon`/`AdminCreateCouponBody`, `AdminRole`/`AdminPermission`/`AdminUserRoleAssignment`, `AdminAuditLogFilters`. The pre-existing Phase 8 `listAdminAuditLogs` was consolidated into this phase's extended version (same endpoint, now typed against the shared `AdminAuditLogFilters` type) rather than left duplicated

### Backend endpoints consumed

`GET /plans`, `GET/POST/PATCH /admin/plans(/:id)`, `POST /admin/subscriptions/coupons`, `GET /admin/roles`, `GET /admin/permissions`, `GET /admin/admin-users`, `GET /admin/audit-logs`.

### Flow

```
Before writing any frontend code: dispatched a research pass covering
plans, subscriptions (admin), transactions/payments, webhooks, coupons,
roles/permissions, audit-log filters, and settings/feature-flags — 8
areas total. This confirmed Plans as the one fully real, product-critical
surface, and everything else (subscriptions/transactions/webhooks lists,
coupons list, settings) as genuine backend gaps requiring an explicit
scope decision (via AskUserQuestion) rather than a guess.

/admin/subscriptions (Plans tab) → GET /admin/plans (all plans, incl.
   inactive) → real create → POST /admin/plans → real edit/deactivate →
   PATCH /admin/plans/:id {isActive: false} → confirmed via live curl
   that a deactivated plan vanishes from the public GET /plans list while
   staying visible in the admin list

/admin/subscriptions (Coupons tab) → real POST
   /admin/subscriptions/coupons → success message shows the created code
   once → UnavailablePanel below explains there is no way to view it
   again (no list endpoint exists)

/admin/roles-permissions → GET /admin/roles + /admin/permissions +
   /admin/admin-users in parallel → real seeded roles/permissions render
   as read-only badges, with the backend's own "this is inert" framing
   reproduced verbatim in the warning banner

/admin/audit-log?entityType=vendor → GET /admin/audit-logs (server-side
   exact-match filter) → real audit rows with real actor emails and real
   action codes (ADMIN_APPROVED_VENDOR, ADMIN_SUSPENDED_USER, etc.)
```

### Playwright verification

`e2e/phase-10-admin-monetization-governance.spec.ts` was written (4 tests: a real plan create→edit→deactivate round trip plus confirming the three unavailable-state panels render for Active Subscriptions/Transactions/Webhooks; a real coupon create via the create-only endpoint; real roles/permissions rendering with the read-only warning banner; audit log listing plus the entityType filter) and passed `tsc --noEmit`/`eslint` cleanly, but this was the last phase before the combined Stage 4 Playwright pass (Phases 7–10 together), per the standing user instruction from Phase 7. **Run 2026-09-04 — all 4 tests pass, headed, against the real backend.** See the combined write-up immediately below.

Every backend integration point was independently confirmed via live curl before this pause: a full Plans create→deactivate→public-list-exclusion round trip (with cleanup), real `GET /admin/roles`/`permissions`/`admin-users` calls against a freshly provisioned admin account, and `GET /admin/audit-logs` both unfiltered and with `entityType=vendor`. Additionally — beyond what prior phases did — all five new pages were fetched through the actual running Next.js dev server (not just the backend directly) using a real authenticated admin session cookie obtained via the frontend's own `/api/auth/login` route, confirming each returned HTTP 200 with real data present in the rendered HTML (real plan prices ₹5,999/₹12,999, the real "This screen is read-only." banner text, real audit action codes like `ADMIN_APPROVED_VENDOR`) before considering the phase code-complete.

### Notes

- This phase required no backend additions — the first admin phase (of 8, 9, 10) where research confirmed everything needed already existed. The real work was scope discipline: correctly identifying which mockup affordances (Active Subscriptions table, Transactions table, Webhooks log, Coupons list, every Settings control) have no backend counterpart, and building honest unavailable/placeholder states instead of either fabricating data or silently building broken-looking controls.
- The pre-existing Phase 8 `listAdminAuditLogs` function in `admin.ts` was consolidated into this phase's extended version rather than duplicated — same endpoint and behavior, now typed against the new `AdminAuditLogFilters` type shared with the audit-log page's server component.
- `npx tsc --noEmit` and `eslint` both pass cleanly on every new/changed file.
- **Stage 4 (Admin Platform) is now fully code-complete** — Frontend Arch Phases 8, 9, and 10 are all built, curl-verified, and Playwright-spec-written, pending only the single combined Playwright run across all four of Phases 7–10.

### Combined Playwright verification — Phases 7–10 (run 2026-09-04)

All 15 tests across `phase-07-vendor-monetization.spec.ts`, `phase-08-admin-core.spec.ts`, `phase-09-admin-catalog-moderation.spec.ts`, and `phase-10-admin-monetization-governance.spec.ts` pass, run headed (`--headed`, visible browser, `slowMo: 400`) against the real backend, confirmed stable across two consecutive full runs with a fully clean dev database afterward (checked directly via Prisma queries, not assumed).

**Real, unrelated production bugs found and fixed** (neither caught by any prior curl-only verification, since curl never exercises the actual page render):

1. `/admin/reviews` crashed (500) for every visitor, unconditionally. `listReviewsAdmin()` (`review.repository.ts`) never included `photos` on its query, unlike every other review-returning query in the same file (`findReviewById` already uses the shared `REVIEW_PHOTOS_INCLUDE` constant) — `AdminReviewsBoard.tsx` always reads `review.photos.length`, so the page died on the very first review in the list, seeded data or brand-new. Fixed the missing include; hardened the frontend read (`review.photos &&`) as defense against a future regression of the same shape-mismatch class.
2. The vendor settings page (`/vendor/settings`) silently failed to save anything — including just a business-name change — for any vendor who never filled in their name or phone during onboarding. `firstName`/`lastName`/`phone` are optional on the backend but reject an empty string outright (`min(1)`/`min(6)`); `SettingsBoard.tsx`'s save handler always sent all three regardless of whether they'd been filled in, so a single blank field 400'd the whole `Promise.all`, with no error ever surfaced to the user (only `.success` was checked, not the failure's own message). Fixed by omitting empty fields instead of sending `""`, and by actually surfacing whichever call's error message fired if a save does fail for a different, real reason.

**A real, pre-existing infrastructure gap, found because these specs had genuinely never run before**: `authorize()` was extended 2026-09-04 (`docs/bugs.md` #2) to require a real `AdminUser`→`Role` link with at least one permission, not just the flat `User.role === ADMIN` check every admin route previously relied on alone. Every one of these 4 specs' own `createAdminUser()` test helper only ever flipped `User.role` directly via `psql` — none created the now-required `AdminUser` row — so every admin-gated test in all 4 files 403'd via the new `app/(admin)/error.tsx` boundary the moment this run started. The helper existed as 3 near-identical copies (one per spec file, `phase-10`'s explicitly noted as "written but not run yet" at the time), each missing the same insert; consolidated into one corrected, shared `createAdminUser()` in `e2e/support/test-users.ts` rather than fixed 3 times over.

**Test-authoring/test-infrastructure issues, not app bugs** (the majority of what this run actually surfaced — expected, given none of these specs had ever been executed):

- Two specs had a test-cleanup variable (`categoryId` in Phase 9, `createdPlanId` in Phase 10) that was declared, checked in `afterEach`, and reset to `null` — but never actually *assigned* anywhere in the test body, because the resource in question is created purely through a UI form with no API response captured to read an id from. Every run of either test silently leaked a row into the dev database forever. Confirmed live: dozens of orphaned `Phase7`/`Phase8`/`Phase9` test rows (vendors, an enquiry, a category) were found and cleaned up over the course of fixing this, several predating this run by hours (left behind by earlier, unrelated debugging in this same session). Fixed by cleaning up by each resource's unique-per-run name instead (`Date.now()` in the name already guarantees uniqueness) — added `deleteCategoryByName`/`deleteVendorByBusinessName`/`deleteVendorById` to `test-users.ts`. Two more tests (Phase 8's create-vendor-and-invite, Phase 9's lead-and-review flows) had the same class of gap for resources they create but never clean up at all; fixed the same way.
- Several strict-mode locator-ambiguity failures, all from asserting on plain visible text that legitimately appears in more than one place on a real page, not from broken app behavior: a status badge/a status-history entry/a raw `<code>` block all rendering the identical status string; a `<select>`'s own (non-interactive) `<option>` text matching the same string as its corresponding on-page badge; Pro and Premium both legitimately carrying the same real "14-day free trial" copy (both seeded with `trialDays: 14`) with no per-card scoping in the original assertion. Fixed per-case with `.first()` where "appears somewhere real" is what's actually being verified, or with a `data-testid` (added to the subscription plan cards and the category admin row) where a specific instance genuinely needed to be targeted unambiguously.
- Phase 9's category-toggle test clicked the real `<input type="checkbox">` directly; the checkbox is intentionally `sr-only` with a separate styled `<span>` providing the visible toggle-track look, so the click landed on that decorative sibling span instead (a real pointer-events conflict, reproducible even for a human trying to click exactly where Playwright did) — fixed by clicking the "Active" label text instead, exactly how a real user actually operates this control.
- Phase 9's location-tree test clicked the "India" label text expecting the tree to expand; the real expand handler (`LocationTree.tsx`) is wired only to a separate arrow `<button>` next to the label, not the label itself — clicking the text does nothing at all. Fixed by clicking the arrow button.
- Phase 9's admin-leads test picked the very first "View" link on the `/admin/leads?status=WON` page with no scoping; 11 real, unrelated, pre-existing WON leads already exist in the dev seed data (from earlier phases' own fixture creation), so the unscoped click opened one of those instead of this test's own lead nearly every time. Fixed by scoping to the real `<tr>` containing this test's own contact name, the same pattern Phase 8's user-management test already used correctly.
- Phase 10's plan-creation test never selected a tier/billing-interval combination before submitting, so it always inherited the create-plan form's default (`PRO`/`MONTHLY`) — already occupied by a real seeded plan, and `subscription_plans` has a genuine database-level uniqueness constraint on `(tier, billingInterval)`, so every attempt 409'd identically regardless of how many times it was retried. `FREE`/`YEARLY` is the one tier×interval combination nothing seeds; fixed by selecting it explicitly.

## Frontend Arch Phase 13 — Vendor GST Invoice Management

**Status:** ✅ Done — 2026-09-04
**Stage:** [Stage 7 — Vendor GST Invoicing & Billing](09-stage-vendor-invoices.md)

### What this unlocks

Vendors get a full-featured GST billing interface inside the vendor portal:
- Invoices dashboard (`/vendor/invoices`) with summary metrics (Invoiced, Received, Outstanding, Overdue), status tabs, date-range filters, and client search.
- Interactive invoice creator (`/vendor/invoices/new`) with live GST calculations (Intra-State CGST+SGST vs Inter-State IGST), SAC code presets, and optional lead prefill (`?leadId=`).
- Comprehensive invoice detail view (`/vendor/invoices/[id]`) with payment history tracking (`VendorInvoicePayment`), status transitions, and audit activity trail.
- Dedicated A4 printable tax invoice (`/vendor/invoices/[id]/print`) with dynamic logo rendering (clean omission if logo not uploaded).
- Billing settings (`/vendor/invoices/settings`) for vendor GSTIN, PAN, tax address, and bank/UPI payment instructions.
- Integration with `VendorShell.tsx` navigation and `LeadsBoard.tsx` "Create Invoice" action.

### Routes Implemented

- `app/(vendor)/vendor/invoices/page.tsx`: Server Component displaying invoice list & KPI metrics.
- `app/(vendor)/vendor/invoices/new/page.tsx`: Server Component with prefill support.
- `app/(vendor)/vendor/invoices/[id]/page.tsx`: Server Component for invoice inspection & payment logging.
- `app/(vendor)/vendor/invoices/[id]/edit/page.tsx`: Server Component for modifying draft invoices.
- `app/(vendor)/vendor/invoices/[id]/print/page.tsx`: Dedicated A4 print layout.
- `app/(vendor)/vendor/invoices/settings/page.tsx`: Billing settings and tax profile manager.

### Components Added

- `InvoicesBoard.tsx`: Dashboard with KPI stat cards, status tabs, search filter, and action menus.
- `InvoiceEditor.tsx`: Real-time GST calculation engine, SAC preset dropdowns, dynamic line items.
- `InvoiceDetailView.tsx`: Invoice viewer, payment history table with reversal, payment modal, cancel modal.
- `PrintableInvoice.tsx`: High-resolution `@media print` A4 statutory tax invoice template.
- `BillingSettingsForm.tsx`: Settings form for tax IDs, legal address, state codes, and bank/UPI details.

### Verification

- `npm run build` in `wedhub-frontend-app` passed with 0 errors across all 54 routes.
- Fully typechecked and compiled with Turbopack.

### Addendum, 2026-09-04 — Full Platform Schema & Validation Harmonization Audit

- **Complete Synchronization of Validation Bounds**: Verified all 33+ backend Zod schema modules against all interactive frontend forms, pickers, and mutation handlers.
- **Frontend Input Enforcement**: Audited and synchronized constraints across `maxLength`, `minLength`, `min`, `max`, regex patterns, MIME types, URL auto-prefixing, and whitespace trimming.
- **Unpacked Error Feedback**: Standardized `formatApiError()` from `lib/utils/error.ts` across all forms, ensuring nested backend `error.details` maps (`Record<string, string[]>`) are unpacked and surfaced to users instead of generic fallback messages.
- **Verification**: `wedhub-backend` passes `npm run typecheck` (0 errors) and `tests/unit` (8/8 passed). `wedhub-frontend-app` passes `npx tsc --noEmit` (0 errors) and `next build` (54/54 routes compiled with Turbopack).

---

## Frontend Arch Phase 14 — Standalone Vendor-First Digital Portfolio & 1-Click WhatsApp Direct Connect

**Status:** ✅ Done — 2026-09-04  
**Stage:** [Stage 8 — Standalone Vendor-First Digital Portfolio](10-stage-vendor-portfolio.md)

### What this unlocks

- **Dedicated Standalone Portfolio Route (`/portfolio/[slug]`)**:
  - Independent, vendor-branded presentation page that acts as an executive digital portfolio and link-in-bio website for wedding professionals.
  - **Vendor-First Branding**: The vendor's business name, logo, cover imagery, packages, and gallery take 100% visual dominance. Completely omits the itsmyKalyanam marketplace topbar, category links, search filters, and competitor recommendations.
  - Subtle and respectful platform attribution (`"Powered by itsmyKalyanam"`) at the very footer.
  - **Preserves Existing Marketplace Route**: `/vendors/[slug]` remains completely untouched for couples browsing the public directory and comparing vendors.
- **1-Click WhatsApp Direct Contact**:
  - Instant click-to-chat CTA buttons in the top header and sticky/floating on mobile viewports.
  - Indian phone number sanitization and automatic country code (`91`) normalization.
  - Pre-filled WhatsApp inquiry message customized with the vendor's business name and package interest.
  - Direct call CTA button and fallback to in-app `EnquiryModal`.
- **Organized Tabbed Portfolio Showcase**:
  - **Work & Moments Gallery**: Responsive grid with album filter chips and fullscreen interactive lightbox viewer.
  - **Packages & Pricing**: Active package cards with currency formatting, inclusion checklists, and direct package-level WhatsApp inquiry buttons.
  - **About Us & Specifications**: Studio bio, dynamic category attribute values (e.g. Drone, Cinematic Video, Experience), studio address, website, and social media handles.
  - **Client Reviews & Testimonials**: Client feedback, verified event badges, star ratings, and vendor responses.
- **Vendor Dashboard "Share Portfolio" Experience**:
  - Embedded "Share Portfolio" action button in `VendorShell.tsx` header bar across all vendor pages.
  - Dedicated "Your Live Digital Portfolio Link" highlight card on `/vendor/dashboard`.
  - Interactive sharing modal with:
    - 1-Click Copy Link with clipboard feedback.
    - 1-Click Share on WhatsApp button.
    - Live Portfolio Preview button.
    - Auto-generated high-resolution QR code preview and one-click download for studio cards and brochures.

### Files Added / Modified

- `wedhub-frontend-app/lib/utils/whatsapp.ts`: Mobile number cleaner and WhatsApp URL formatter.
- `wedhub-frontend-app/components/portfolio/VendorPortfolioHeader.tsx`: Vendor topbar with brand identity and quick contact.
- `wedhub-frontend-app/components/portfolio/VendorPortfolioGallery.tsx`: Album tabs, photo grid, and fullscreen lightbox.
- `wedhub-frontend-app/components/portfolio/VendorPortfolioPackages.tsx`: Packages showcase with direct WhatsApp package links.
- `wedhub-frontend-app/components/portfolio/VendorPortfolioAbout.tsx`: About section, dynamic category attributes, and studio details.
- `wedhub-frontend-app/components/portfolio/VendorPortfolioReviews.tsx`: Testimonials and review ratings.
- `wedhub-frontend-app/components/portfolio/FloatingWhatsAppButton.tsx`: Sticky mobile WhatsApp contact trigger.
- `wedhub-frontend-app/components/portfolio/PortfolioAttribution.tsx`: Minimal platform attribution footer.
- `wedhub-frontend-app/components/portfolio/VendorPortfolioView.tsx`: Main client view assembling all sections and tabs.
- `wedhub-frontend-app/app/(public)/portfolio/[slug]/page.tsx`: Server Component with SEO metadata and async data fetching.
- `wedhub-frontend-app/components/vendor/SharePortfolioButton.tsx`: Interactive modal with copy link, WhatsApp share, preview, and QR code download.
- `wedhub-frontend-app/components/shared/VendorShell.tsx`: Header bar integration for "Share Portfolio" button.
- `wedhub-frontend-app/app/(vendor)/vendor/dashboard/page.tsx`: Dashboard header action and live portfolio highlight banner.
- `frontenddocs/10-stage-vendor-portfolio.md`: Architecture specification.
- `docs/14-stage-vendor-portfolio.md`: Platform stage documentation.

### Verification

- `npx tsc --noEmit` passed with 0 errors.
- `npm run build` compiled cleanly with Turbopack across all 54 routes, including `├ ƒ /portfolio/[slug]`.

### Addendum, 2026-09-04 — QR Code Generation & UI Deduplication Bug Fixes

- **Local Zero-Dependency QR Code Generation**: Replaced external API (`api.qrserver.com`) with local offline base64 PNG data URL generation via `qrcode` package. Completely resolves broken image errors caused by network/ad-block restrictions and enables instant, reliable PNG downloads directly in the browser.
- **Deduplication of Share Button**: Removed duplicate instances from `/vendor/dashboard` (inline action bar and banner card) so that "Share Portfolio" cleanly renders **only once** in the top navigation header bar (`VendorShell.tsx`).
- **Verification**: `npx tsc --noEmit` passed with 0 errors; Next.js production build (`npm run build`) succeeded with all 54 routes compiled cleanly.


