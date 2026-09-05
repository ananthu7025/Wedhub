# Cross-Cutting Reference (Frontend)

> Rules and standards referenced by every stage. Changes here apply platform-wide. **Do not duplicate these into stage files** — link back to this doc instead. Mirrors [`../backend/01-reference-cross-cutting.md`](../backend/01-reference-cross-cutting.md)'s role for the backend; read that file too, since the backend's API contract, error format, and auth model are the ones this frontend consumes as-is, not reinvented.

See [`00-index.md`](00-index.md) for the Frontend Arch Phase / Arch Phase / Product Phase numbering convention.

---

## Coding Rules (frontend-specific)

| # | Rule | Why it matters | Most exercised by |
|---|---|---|---|
| 1 | Never re-derive business rules the backend already owns (entitlements, lead status transitions, pricing, verification levels) | The backend is the single source of truth per `01-reference-cross-cutting.md`'s "Final architectural rule" — the frontend renders backend state and calls backend endpoints, it does not decide plan limits, lead legality, or payment status client-side | Stage 3 (Vendor), Stage 4 (Admin) |
| 2 | Every private/role-gated route is protected server-side (middleware/layout auth check), never just hidden in the UI | Backend Coding Rule 5 ("all private resources require authorization") has a frontend mirror: a hidden nav link is not access control | All stages |
| 3 | Server Components by default; Client Components only where interactivity requires it (forms, modals, toggles, tab state) | Keeps data fetching close to the backend, minimizes shipped JS, matches Next.js App Router idioms | All stages |
| 4 | All server-side data fetching goes through one typed API client layer (`lib/api/`), never ad-hoc `fetch` calls scattered through components | One place to attach auth headers, handle the `{success, data, meta}` / `{success, error}` envelope, and centralize error handling | All stages |
| 5 | All forms are validated client-side with the same shape of rules as the backend's Zod schemas, but the backend validation is still authoritative | Fast UX feedback without ever trusting the client — mirrors backend Coding Rule 4 | Stage 2, 3 |
| 6 | Route groups map 1:1 to the three role-apps; no page imports components across role boundaries except shared `components/ui/` primitives | Keeps `(couple)`, `(vendor)`, `(admin)` independently reasoned about, matching the single-app/route-groups decision in `00-index.md` | All stages |
| 7 | No secret ever ships to the client — `NEXT_PUBLIC_*` env vars are the only ones readable in browser code, and only non-sensitive values (API base URL, public keys) belong there | Next.js inlines `NEXT_PUBLIC_*` into the client bundle at build time; anything else must stay server-only | Stage 1 |
| 8 | Do not hardcode plan names/prices/feature limits in UI copy or logic — render whatever the `/plans` and `/entitlements` endpoints return | Mirrors backend Coding Rule 8 exactly; plan prices are admin-configurable per `product.md` §26 | Stage 3, Stage 4 |
| 9 | Images from vendor-uploaded media or R2 always go through Next.js `<Image>` with the backend/CDN URL as `src` — never re-host, never inline base64 for real content | Matches backend Coding Rule 9 (no media binaries in Postgres) — the frontend must not defeat that by embedding binaries itself | Stage 2, 3 |
| 10 | Do not introduce state-management libraries, GraphQL layers, or a design-system package before the product needs them | Mirrors backend Coding Rule 10 — Next.js Server Components + a thin fetch layer + React state/Context is enough until proven otherwise | All stages |

## Definition of Done — Phase level

Every Frontend Arch Phase, in every stage file, must satisfy all of:

```
Screens implemented (matching the approved mockup in ../wedhub-frontend/)
+ Wired to real backend endpoints (no mock data left in committed code)
+ Loading states
+ Empty states
+ Error states (including backend validation errors surfaced per-field where applicable)
+ Auth/role gating enforced server-side
+ Responsive (mobile-first, matching the mockup's existing breakpoints)
+ Basic accessibility (semantic HTML, labeled form fields, keyboard-operable interactive elements)
+ Metadata/SEO basics for public pages (title, meta description, canonical — full SEO is Frontend Arch Phase 11)
+ Manual verification against the running backend (see "Verification standard" below)
+ A headed Playwright spec under wedhub-frontend-app/e2e/, run and watched, passing (see "Mandatory: headed Playwright verification" below)
+ Documentation (this phase's entry in `11-progress-log.md`, including the Playwright run's outcome)
```

A phase is **not** done just because the page renders with mock/placeholder data.

## Definition of Done — Screen level

For every individual screen/route:

- [ ] Route defined in the correct route group
- [ ] Server-side auth/role check where the mockup implies a private screen
- [ ] Real API call(s) wired, matching the backend's actual request/response shape (check the relevant `*.schema.ts` / `*.controller.ts` in `wedhub-backend/src/modules/`, not just this doc)
- [ ] Loading UI (`loading.tsx` or inline skeleton, matching Next.js App Router conventions)
- [ ] Empty state (matches or adapts the mockup's `.empty-state` pattern)
- [ ] Error state (network failure, validation failure, not-found, forbidden)
- [ ] Responsive at the mockup's existing breakpoints (900px is the primary one used throughout `../wedhub-frontend/assets/css/base.css`)
- [ ] No hardcoded copy for backend-owned values (prices, statuses, plan names — render from API data)

## Verification standard

Same non-negotiable as the backend build (`../backend/01-reference-cross-cutting.md` implies this throughout, stated explicitly here): **never claim a screen "works" without actually running it against the live backend** (`npm run dev` in `wedhub-backend/`, real Postgres/Redis, real seeded data) and observing the real response in the browser/network tab. Screens that only compile, or that only render against hand-written mock JSON, are not verified. If the backend has a genuine gap for a screen (an endpoint that doesn't exist yet, e.g. admin subscription listing per [Open Question 2](10-risks-and-open-questions.md#2-admin-subscriptions-screen-has-no-backing-list-endpoint)), say so explicitly in that phase's progress-log entry rather than silently shipping against invented data.

### Mandatory: headed Playwright verification before marking any phase done

Every Frontend Arch Phase must have a Playwright spec under `../wedhub-frontend-app/e2e/` (one file per phase, `phase-NN-<name>.spec.ts`) that exercises the phase's actual user-visible flows end to end against the real running backend, and that spec must be **run headed** (`npm run test:e2e:watch`, or `npx playwright test --headed`) with a human watching the browser before the phase is marked done in `11-progress-log.md`. This is in addition to, not instead of, any `curl`-level API verification — curl proves the backend contract, Playwright proves the actual UI works the way a person would use it.

Rules for these specs, learned the hard way while building Frontend Arch Phase 0/1's own suite (`e2e/phase-01-auth.spec.ts`):

- **Every spec that creates data must delete it afterward** (`test.afterAll`/`afterEach`) — see `e2e/support/test-users.ts` for the pattern (register via the real API, delete via `psql` against the dev DB directly). Leftover `e2e-*@wedhub.dev` accounts in the database are a sign a spec's cleanup is broken, not something to leave for later.
- **A failing assertion is not automatically an app bug.** Before "fixing" the app, check whether the *test* mis-modeled the real flow (e.g. an intermediate wizard step the test skipped) or hit real, correct backend behavior (e.g. a rate limiter — see the note in `phase-01-auth.spec.ts` about the login/register limiters in `wedhub-backend/src/common/middleware/rate-limit.middleware.ts`, which are real, in-memory, and will trip during repeated back-to-back debug runs). Use `page.on("request"/"response")` logging and Playwright's trace/video artifacts (`test-results/`) to find the actual cause before changing anything.
- **Prefer asserting the real observed behavior over the intuitively-expected one**, once you've confirmed the real behavior is correct. Example from Phase 1: an already-authenticated user hitting a route blocked by their role gets redirected by `proxy.ts` to `/login`, then immediately bounced by the login page's own already-authenticated redirect back to *their own* dashboard — never to the blocked route, but also never staying on `/login`. The first version of the test wrongly asserted "ends up at `/login`"; the correct assertion is "ends up back at their own dashboard, never at the blocked route."
- A phase's spec does not need to cover every acceptance-criteria bullet with a dedicated `test()` — grouping related steps into one flow-shaped test (matching how a real user would move through the screens) is preferred over one assertion per test, since the point is watching a coherent flow, not a checklist.

## Repo & app layout

```text
wedhub-frontend-app/
├── app/
│   ├── (public)/            — unauthenticated marketing/discovery pages (home, search, vendor profile)
│   ├── (couple)/             — authenticated couple app (shortlist, enquiries, profile)
│   ├── (vendor)/             — authenticated vendor app (dashboard, profile editor, leads, subscription)
│   ├── (admin)/              — authenticated admin platform
│   ├── (auth)/               — login, signup (shared entry point for all three roles)
│   ├── layout.tsx, globals.css
│   └── api/                 — Next.js route handlers, only where a server-only proxy is genuinely needed (e.g. setting httpOnly cookies) — most calls go straight from Server Components to the backend
├── components/
│   ├── ui/                  — design-system primitives ported from ../wedhub-frontend/assets/css (Button, Card, Badge, DataTable, Modal, etc.)
│   ├── couple/, vendor/, admin/   — role-specific composed components
│   └── shared/               — cross-role composed components (e.g. vendor card used in both public search and couple shortlist)
├── lib/
│   ├── api/                 — typed API client, one file per backend module consumed (mirrors wedhub-backend/src/modules/ names)
│   ├── auth/                 — session/token handling, server-side role guards
│   └── utils/
├── styles/                  — tokens ported from ../wedhub-frontend/assets/css/tokens.css (as CSS variables or Tailwind theme, per Frontend Arch Phase 0 decision)
├── public/
└── proxy.ts                  — route-group auth gating (renamed from `middleware.ts` as of Next.js 16 — same mechanism, new filename; see `../wedhub-frontend-app/node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`)
```

Every role-scoped page follows the same internal pattern once implemented: a Server Component page that fetches via `lib/api/`, delegating interactive pieces to Client Components in `components/<role>/`.

## Design system porting rule

The approved mockup (`../wedhub-frontend/assets/css/tokens.css` + `base.css`) is the **exact** visual contract — same color tokens (crimson/jet-black/paynes-grey/emerald/red/amber palette), same font (Plus Jakarta Sans), same spacing/radius/shadow scale, same component visual language (cards, badges, pill-tabs, data tables, modals). Frontend Arch Phase 0 ports these into the chosen styling approach (Tailwind theme config or CSS modules with the same custom properties — decided in Frontend Arch Phase 0, see `03-stage-foundation.md`) rather than inventing a new visual language. Component *behavior* may be upgraded beyond the static mockup's inline `onclick` scripts (e.g. real controlled React state instead of `classList.toggle`), but the visual result for a given screen should be recognizably the same screen.

## API integration standard

- Base URL from `NEXT_PUBLIC_API_URL` (or a server-only `API_URL` for Server Component fetches that don't need to run in the browser) — never hardcode `http://localhost:4000`.
- Every response envelope is `{ success, data, meta }` or `{ success: false, error: { code, message, details } }`, exactly as defined in `../backend/01-reference-cross-cutting.md`'s "API design standards" — the typed API client layer (`lib/api/`) unwraps this once, centrally, so components never pattern-match on `success` themselves.
- Auth: the backend issues short-lived JWT access tokens + rotating opaque refresh tokens (`../backend/01-reference-cross-cutting.md`, Arch Phase 2). The frontend's session strategy (cookie-based vs. client-held token) is decided once in Frontend Arch Phase 1 and documented there — do not mix strategies across stages.
- Pagination: consume `meta.page/limit/total/totalPages` as-is; do not reimplement pagination math client-side beyond what's needed to render controls.
- Never trust client-side role/plan/price state for anything the backend enforces — mirrors backend Coding Rule 8 and the "Never trust" list in `../backend/01-reference-cross-cutting.md` (frontend roles, frontend prices, frontend subscription state, frontend payment status). The frontend may optimistically render, but the backend response after a mutation is the actual truth to reconcile against.

## Accessibility & performance baseline

- Semantic HTML first (`<button>` for actions, `<a>` for navigation, real `<table>` for tabular data — matching what the mockup already does).
- All form inputs have associated `<label>` elements (the mockup uses `.field-label` visually but not always a `for`/`id` pair — fix this when porting, don't carry the gap forward).
- Keyboard operability for all interactive elements (modals close on Escape, focus trapping in modals, visible focus states).
- Images: Next.js `<Image>` for real content, explicit `width`/`height` or `fill` with a sized container to avoid layout shift.
- No client-side data-fetching waterfalls where a Server Component fetch would do — this is a Next.js App Router project specifically to get this for free on public/SEO-relevant pages.

## Environment & secrets baseline

```text
NEXT_PUBLIC_API_URL          — backend base URL, safe to expose
API_URL                      — server-only variant if it ever needs to differ (e.g. internal network address)
NEXTAUTH_SECRET / SESSION_SECRET   — if cookie-based sessions are chosen in Frontend Arch Phase 1
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME  — for the "Chat on Telegram" deep link already present in the couple mockup
```

Never commit real secrets. `.env.example` documents every variable with a placeholder, same convention as `wedhub-backend/.env.example`.

## Final architectural rule (inherited from backend)

```text
PostgreSQL      → business truth (via the backend API — the frontend never touches the DB directly)
Backend API     → business logic, authorization, validation
Next.js         → presentation, SEO, client-side interactivity, routing
CDN/R2          → media delivery (consumed via URLs the backend returns)
```

The frontend owns presentation and user experience. It does not own business state, business rules, or become a second source of truth for anything the backend already governs.
