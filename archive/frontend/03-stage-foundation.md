# Stage 1 — Foundation (Frontend)

## Stage Goal

Stand up the real Next.js project, port the approved mockup's design system into it, and wire the shared auth flow (login/signup for all three roles). Nothing in this stage is a full feature, but every later stage depends on it existing and being correct — same relationship Stage 1 has in the backend plan.

## Included Frontend Arch Phases

- **Frontend Arch Phase 0** — Project Setup & Design System
- **Frontend Arch Phase 1** — Auth Flows

## Product Roadmap Cross-Reference

Maps to product.md §64's "Frontend: Next.js + TypeScript" recommendation and its four listed responsibilities (Public pages, SEO, User dashboard, Vendor dashboard, Admin UI) — this stage builds the shell all four live inside.

## Included Mockup Screens

- `auth/login.html`, `auth/signup.html`
- `index.html` (the mockup hub itself is not ported — it was a review aid, not a product screen)

## Task Checklist

### Frontend Arch Phase 0 — Project Setup & Design System ✅ Done — 2026-09-02
- [x] Resolve [Open Question 5](10-risks-and-open-questions.md#5-styling-approach-not-yet-chosen-tailwind-vs-ported-css-variables) — Tailwind vs. ported CSS variables — before writing any component
- [x] `npx create-next-app` (App Router, TypeScript, ESLint) at `../wedhub-frontend-app/` — landed on Next.js 16 / React 19 / Tailwind v4
- [x] Configure ESLint/Prettier matching `wedhub-backend`'s conventions (`.prettierrc` ported verbatim; `eslint-config-next`'s defaults kept as-is, no backend-style override needed for a React project)
- [x] Port design tokens from `../wedhub-frontend/assets/css/tokens.css` into Tailwind v4's CSS-first `@theme` block (`app/globals.css`)
- [x] Build initial `components/ui/` primitives: Button (primary/secondary/dark/ghost/danger variants, polymorphic `href` support), Card + CardHeader, Badge (crimson/blue/green/amber/red/grey variants), Input
- [ ] Remaining `components/ui/` primitives — DataTable, PillTabs, FilterPill, Modal, MetricCard, EmptyState, Toggle, StarRating — deferred to whichever Frontend Arch Phase first needs each (none of Phase 0/1's screens use them; Phase 2's search/vendor-profile screens are the first real need)
- [x] Root layout, global styles, Google Font (Plus Jakarta Sans) loading via `next/font/google`
- [x] `lib/api/client.ts` — typed fetch wrapper unwrapping the `{success, data, meta}` / `{success, error}` envelope, server-only, forwards the session's access token as `Authorization: Bearer`
- [x] `.env.example` with `NEXT_PUBLIC_API_URL`, `API_URL`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — committed (fixed `.gitignore` to match `wedhub-backend`'s exact `.env`/`.env.local`/`.env.*.local` pattern rather than create-next-app's default blanket `.env*`, which would have silently excluded `.env.example`)
- [x] Route group skeleton: `(public)`, `(couple)`, `(vendor)`, `(admin)`, `(auth)` — `(public)` has a real smoke-test page; the other three are proxy-gated but have no pages yet (expected — real content is Stage 2/3/4)
- [x] `npm run dev` serves a working root page; `next build`, `eslint`, `tsc --noEmit` all pass with zero errors

### Frontend Arch Phase 1 — Auth Flows ✅ Done — 2026-09-02
- [x] Resolve [Open Question 4](10-risks-and-open-questions.md#4-sessionauth-strategy-not-yet-chosen) — session/token strategy — before implementation. **Concrete mechanism verified against the real backend source**, not assumed — see the Open Question's resolution note for the full design (our own httpOnly `wedhub_session` cookie holding the 15-min access token; the backend's own `refresh_token` cookie forwarded through our `/api/auth/*` Route Handlers with its `Path` rewritten from `/api/v1/auth` to `/api/auth` — a real bug caught live: refresh 401'd with "Missing refresh token" until this path rewrite was added, because the backend's cookie path didn't match our route's path)
- [x] `proxy.ts` (project root — Next.js 16's renamed Middleware) — route-group auth gating by cookie presence + JWT role claim (decoded, not verified — optimistic only, per the bundled docs)
- [x] `lib/auth/dal.ts` — `verifySession()`/`requireRole()`/`getOptionalSession()`, memoized with React's `cache()`
- [x] `(auth)/login` — email-or-phone + password form. **No Google OAuth button** — checked `wedhub-backend/src/modules/auth/` directly and confirmed no OAuth support exists server-side, so none was built (a placeholder button linking nowhere would have been worse than omitting it); the mockup's role toggle was deliberately not carried into the real page, since the backend's returned role — not a client selection — determines where login redirects
- [x] `(auth)/signup` — multi-step wizard: credentials → account type (END_USER/VENDOR — ADMIN is intentionally not offered, matching `registerSchema`'s role enum) → register → auto-login → optional profile names (`PATCH /users/me`) → success. **Deviates from the mockup's single "Complete your profile" step**: the backend's `registerSchema` has no name field at all (confirmed by reading `auth.schema.ts`) — names are a separate `users` module concern, so registration and profile-naming are two real API calls, not one
- [x] Login/signup redirect to the correct role's home based on the backend's actual returned role
- [x] Logout action (`app/api/auth/logout/route.ts`, clears both cookies, forwards the backend's own clear-cookie response)
- [x] Error states: invalid credentials (shown inline), network/validation errors surfaced from the backend's real error message
- [x] Password reset / forgot-password — backend has this fully implemented (`forgotPassword`/`resetPassword` in `auth.service.ts`, confirmed by reading source, not assumed from the docs' phrasing) — built `(auth)/forgot-password` and `(auth)/reset-password` (token-based, via `?token=` query param) against the real endpoints, not deferred

**Also built, not originally itemized above but required to make Phase 1 actually work end-to-end:** `app/api/[...path]/route.ts`, a generic authenticated proxy that attaches the session's access token as `Authorization: Bearer` and forwards to the backend for every module except `/auth/*` — this is what lets Client Components call e.g. `/api/users/me` without ever touching the raw token. Documented here since it's a Stage-1-level piece of plumbing every later stage depends on, not a one-off.

See [`11-progress-log.md`](11-progress-log.md#frontend-arch-phase-0--project-setup--design-system) for the full write-up.

## Acceptance Criteria

- `npm run dev`, `build`, `lint`, `typecheck` all pass with zero errors. ✅ Verified.
- Every `components/ui/` primitive visually matches its mockup counterpart at the same breakpoints (900px mobile cutover, per the mockup's existing CSS). ✅ Verified for the primitives built so far (Button, Card, Badge, Input) via rendered HTML class inspection; remaining primitives verified as each is built in later stages.
- A user can register as a couple or vendor, log in, and land on the correct role's home route, all against the real running backend (no mock auth). ✅ Verified live: registered a real END_USER and a real VENDOR test account against the running backend + Postgres, logged in, confirmed correct redirect target per role, confirmed `PATCH /users/me` persisted and was readable back via `GET /users/me`. Test accounts deleted afterward.
- An unauthenticated request to any `(couple)`/`(vendor)`/`(admin)` route redirects to login server-side (verify by hitting the URL directly, not just by checking the nav hides a link). ✅ Verified via direct `curl` requests (no cookie) to `/vendor/dashboard` — 307 redirect to `/login?next=...`.
- A vendor cannot reach `(admin)` routes and vice versa, enforced server-side. ✅ Verified via `curl` with a real VENDOR session cookie against `/couple/*` and `/admin/*` — both correctly redirected to `/login`; the matching END_USER→`/vendor`/`/admin` case was verified the same way.

## Dependencies / Sequencing

Frontend Arch Phase 0 → 1, strictly linear (auth needs the API client and design system primitives to exist first). **Nothing in Stage 2, 3, or 4 can start before this stage's acceptance criteria are met** — same rule as the backend's Stage 1.

## Open Questions

- [Open Question 4](10-risks-and-open-questions.md#4-sessionauth-strategy-not-yet-chosen) — session/auth strategy, must resolve before Frontend Arch Phase 1 implementation.
- [Open Question 5](10-risks-and-open-questions.md#5-styling-approach-not-yet-chosen-tailwind-vs-ported-css-variables) — styling approach, must resolve before Frontend Arch Phase 0 implementation.
