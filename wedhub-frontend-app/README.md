# WedHub Frontend

Next.js (App Router) frontend for WedHub, a wedding vendor discovery marketplace. See [`../frontenddocs/`](../frontenddocs/00-index.md) for the full delivery plan, [`../wedhub-frontend/`](../wedhub-frontend/index.html) for the approved static UI mockup this app implements screen-for-screen, and [`../product.md`](../product.md) / [`../wedhub_backend_architecture.md`](../wedhub_backend_architecture.md) for the source specs.

**Current status:** Frontend Arch Phase 1 (Auth Flows) — see [`../frontenddocs/11-progress-log.md`](../frontenddocs/11-progress-log.md).

## Prerequisites

- Node.js >= 20
- The backend running locally (`../wedhub-backend/`, `npm run dev`, default `http://localhost:4000`) — this app has no functionality without it; nothing here uses mock data.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run test:e2e:watch` | Playwright, headed — watch the browser exercise a phase's flows against the real backend. Run `npm run dev` (and the backend) first. |
| `npm run test:e2e` | Playwright, headless — for a quick pass/fail check once you've already watched a flow succeed headed at least once |

See [`../frontenddocs/01-reference-cross-cutting.md`](../frontenddocs/01-reference-cross-cutting.md)'s "Mandatory: headed Playwright verification" section — every Frontend Arch Phase needs a spec under `e2e/` run headed before it's marked done in the progress log. `e2e/support/test-users.ts` has the register/delete-via-psql pattern every spec that creates accounts should follow.

## Structure

```
app/
├── (public)/    — unauthenticated marketing/discovery pages
├── (couple)/     — authenticated couple app
├── (vendor)/     — authenticated vendor app
├── (admin)/       — authenticated admin platform
├── (auth)/        — login, signup
└── api/
    ├── auth/      — Route Handlers proxying the backend's /api/v1/auth/* endpoints,
    │                 forwarding/rewriting its httpOnly refresh cookie (see
    │                 ../frontenddocs/10-risks-and-open-questions.md Open Question 4)
    └── [...path]/ — generic authenticated proxy: attaches the session's access
                      token as a Bearer header and forwards everything else to
                      the backend, so Client Components never touch the token directly
components/ui/     — design-system primitives ported from ../wedhub-frontend/assets/css
lib/
├── api/           — typed server-side API client (lib/api/client.ts) + browser-side
│                     wrappers that call our own /api/* routes above
├── auth/           — session cookie handling, the Data Access Layer (dal.ts — the
│                     real authorization enforcement point), auth types
└── utils/
proxy.ts            — route-group auth gating (Next.js 16's renamed Middleware).
                       Optimistic only — see lib/auth/dal.ts for the real check.
```

See [`../frontenddocs/01-reference-cross-cutting.md`](../frontenddocs/01-reference-cross-cutting.md) for the full conventions this project follows, and [`../frontenddocs/03-stage-foundation.md`](../frontenddocs/03-stage-foundation.md) for how the auth/session architecture was decided.

## A note on this Next.js version

This project uses Next.js 16, which has real breaking changes from earlier versions (`middleware.ts` → `proxy.ts` being the one that bit us during setup). Before assuming a Next.js convention from memory, check `node_modules/next/dist/docs/` — the framework ships its own current docs, and `AGENTS.md` at the project root explains why.
