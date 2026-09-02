# Progress Log (Frontend)

> Running record of what has actually shipped on the frontend. Updated **after** each Frontend Arch Phase completes — not in advance. Mirrors [`../docs/11-progress-log.md`](../docs/11-progress-log.md)'s role for the backend. See [`00-index.md`](00-index.md) for the numbering convention and [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md) for the Definition of Done every phase below must satisfy before being marked complete.

**Convention:** when a Frontend Arch Phase finishes, (1) flip its row in the status table below from `⬜ Not Started` to `✅ Done` with the date, (2) fill in that phase's section further down with real routes/components/API-integration/flow-diagram — replacing the placeholder text, never leaving it half-filled, and (3) tick every task checkbox in the corresponding stage file (`03`–`07`) for that phase.

---

## Status Overview

| Frontend Arch Phase | Name | Stage | Status | Completed |
|---|---|---|---|---|
| 0 | Project Setup & Design System | [Stage 1](03-stage-foundation.md) | ✅ Done | 2026-09-02 |
| 1 | Auth Flows | [Stage 1](03-stage-foundation.md) | ✅ Done | 2026-09-02 |
| 2 | Public Discovery | [Stage 2](04-stage-couple-experience.md) | ⬜ Not Started | — |
| 3 | Shortlist, Compare & Enquiry | [Stage 2](04-stage-couple-experience.md) | ⬜ Not Started | — |
| 4 | Couple Account | [Stage 2](04-stage-couple-experience.md) | ⬜ Not Started | — |
| 5 | Vendor Onboarding & Profile Mgmt | [Stage 3](05-stage-vendor-experience.md) | ⬜ Not Started | — |
| 6 | Vendor Leads & Reviews | [Stage 3](05-stage-vendor-experience.md) | ⬜ Not Started | — |
| 7 | Vendor Monetization | [Stage 3](05-stage-vendor-experience.md) | ⬜ Not Started | — |
| 8 | Admin Core | [Stage 4](06-stage-admin-platform.md) | ⬜ Not Started | — |
| 9 | Admin Catalog & Moderation | [Stage 4](06-stage-admin-platform.md) | ⬜ Not Started | — |
| 10 | Admin Monetization, Governance & Audit | [Stage 4](06-stage-admin-platform.md) | ⬜ Not Started | — |
| 11 | Telegram Surfacing, SEO & Hardening | [Stage 5](07-stage-growth-and-hardening.md) | ⬜ Not Started (11b blocked on backend Arch Phase 17) | — |

**Overall: 2 / 12 Frontend Arch Phases complete.** Preceding this: the 34-screen static mockup (`../wedhub-frontend/`) is done and approved — it is the visual/content contract this plan implements, not itself a Frontend Arch Phase. The backend (16/26 Arch Phases, Stages 1–6) is done and paused before backend Arch Phase 17 specifically to let this frontend build-out happen next.

---

## How each phase entry is written (template — copy this block per phase when it ships)

```
## Frontend Arch Phase N — <Name>

### What this unlocks

### Routes implemented

### Components added

### Backend endpoints consumed

### Flow

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

### Notes

- **Real bug found and fixed via live verification, not assumed correct**: the first end-to-end refresh test failed with `{"code":"AUTHENTICATION_ERROR","message":"Missing refresh token"}` even though login had just succeeded and the cookie was present in the browser's jar. Root cause: the backend sets `refresh_token` scoped to `Path=/api/v1/auth`; our Route Handler lives at `/api/auth/refresh` — a different path — so the browser correctly never attached the cookie to that request (standard cookie path-scoping behavior, not a bug in the browser or backend). Fixed with `rewriteRefreshCookiePath()` in `lib/auth/backend.ts`, which rewrites the `Path` attribute to `/api/auth` before forwarding the `Set-Cookie` header, applied identically in the login, refresh, and logout handlers (logout's `clearCookie` response needed the same rewrite to actually clear the cookie the browser held, since cookie deletion also requires an exact path match). Re-verified after the fix: full login → refresh → logout cycle tested live against the real backend, including confirming the refresh token actually **rotates** on each refresh call (a different token value after refresh than after login) and that logout's response correctly expires both cookies (`Expires: Thu, 01 Jan 1970`).
- **Scope decision, verified not assumed**: read `wedhub-backend/src/modules/auth/auth.service.ts` directly and confirmed no Google OAuth implementation exists server-side — the login page has no Google button (a non-functional one would be worse than none). Read `auth.schema.ts` and confirmed `forgotPassword`/`resetPassword` service functions exist and are wired to real routes — built both pages against them rather than leaving the mockup's "Forgot password?" link dangling or faking a "coming soon" state.
- **Real signup-flow deviation from the mockup, discovered by reading the backend schema rather than assumed from the mockup's UI**: `registerSchema` (`wedhub-backend/src/modules/auth/auth.schema.ts`) has no name field at all — only `email`, `phone?`, `password`, `role`. The mockup's single "Complete your profile" step (name + business name in one screen) doesn't correspond to one backend call. Built as: register (email/password/role only) → auto-login → a genuinely separate optional step that calls `PATCH /users/me` with `firstName`/`lastName`. This is a real API-shape correction, not a design preference — documented here so nobody "fixes" the signup wizard back to match the mockup's single-step assumption without knowing why it was split.
- **Live end-to-end verification performed** (not claimed from reading code alone): registered a real END_USER test account and a real VENDOR test account against the running backend + Postgres (`docker compose` stack, same one Stage 1–6 backend work used), through this app's own `/api/auth/register` → `/api/auth/login` → `/api/users/me` (generic proxy `PATCH` then `GET`) chain, confirming the profile update actually persisted server-side. Verified `proxy.ts`'s role gating in all six directions (unauthenticated → each of `/couple`, `/vendor`, `/admin`; each authenticated role → the other two roles' routes) via direct `curl` requests with real session cookies — not inferred from reading the gating logic alone. Verified the already-authenticated-user-hits-`/login`-redirects-to-their-dashboard behavior the same way. All test accounts (`frontend-smoke-test@wedhub.dev`, `frontend-vendor-test@wedhub.dev`) were deleted from the database after verification — no test data left behind.
- Password reset's actual email delivery (Resend, per backend Arch Phase 14) was not verified end-to-end in this phase — the backend's response contract was verified (`{"success":true,"data":{"message":"If an account exists..."}}`, correctly not leaking account existence), but the follow-through of receiving and clicking a real emailed link was not exercised here. Worth a manual pass before this ships to real users, tracked informally rather than as a formal Open Question since it's a one-time manual check, not an architectural gap.
