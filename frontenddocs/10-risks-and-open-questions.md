# Risks & Open Questions (Frontend)

> Canonical log of every frontend-specific ambiguity, and every place the approved mockup, `product.md`, or the actual shipped backend surface disagree. Mirrors the role of [`../docs/10-risks-and-open-questions.md`](../docs/10-risks-and-open-questions.md) for the backend. Stage files link back to the specific entry relevant to them — full analysis lives here, once.

**Convention:** append new entries here first, then cross-link from affected stage files. Never the reverse.

**Entry format:** Title / Source citations / Description / Impact / Recommendation / Status / Related stage file(s).

---

## 1. Frontend Arch Phase 11 partially blocked on backend Arch Phase 17

- **Citations:** `../docs/11-progress-log.md` ("Paused here, 2026-09-02" note — backend deliberately paused before Arch Phase 17 for frontend-integration signal), `00-index.md` (Frontend Arch Phase → Backend Arch Phase dependency map)
- **Description:** Frontend Arch Phase 11 bundles two independent halves: Telegram surfacing (trivial, backend Arch Phase 15 is done) and SEO page generation (category pages, city pages, structured data, sitemap — needs backend Arch Phase 17, CMS & SEO Backend, which has not started).
- **Impact:** If Frontend Arch Phase 11 is scheduled as a single unit, it will stall waiting on backend work outside this plan's control.
- **Recommendation:** Treat Frontend Arch Phase 11 as two independently schedulable sub-efforts in `07-stage-growth-and-hardening.md`: ship Telegram surfacing whenever Stage 5 is reached; hold SEO page work until backend Arch Phase 17 ships, and re-read that backend phase's actual API surface before starting (do not guess its shape now).
- **Status:** Open — blocked on backend, not a frontend decision to resolve alone.
- **Related stage files:** [07-stage-growth-and-hardening.md](07-stage-growth-and-hardening.md)

## 2. Admin Subscriptions screen has no backing list endpoint

- **Citations:** Admin mockup build note (inline in `../wedhub-frontend/admin/subscriptions.html`'s build history) — confirmed no `GET /admin/subscriptions` list endpoint exists in `wedhub-backend/src/modules/subscriptions/` (only refund/coupon POST endpoints were found)
- **Description:** The approved mockup shows an "Active Subscriptions" table (vendor, plan, status, next billing date, MRR contribution) as if it were live data. The backend module that would back this has no list/read endpoint for it today — only mutation endpoints (refunds, coupons) and the vendor's own subscription view exist.
- **Impact:** Frontend Arch Phase 10 cannot wire this table to real data as-is. Building it against invented mock data would violate the verification standard in `01-reference-cross-cutting.md`.
- **Recommendation:** Two options, to be decided at implementation time (do not decide now, before Stage 4 is reached): (a) request a small backend addition — a paginated admin subscription-list endpoint, which is a natural, in-character extension of the existing `subscriptions` module and Arch Phase 16's admin patterns; or (b) ship the screen with an explicit "not yet available" empty state and defer the live table to a follow-up. Whichever is chosen, document it honestly in that phase's `11-progress-log.md` entry — do not silently mock the table and call the phase done.
- **Status:** Open — needs a decision when Stage 4 (Frontend Arch Phase 10) is actually reached.
- **Related stage files:** [06-stage-admin-platform.md](06-stage-admin-platform.md)

## 3. Admin Leads screen has no reassignment endpoint

- **Citations:** Admin mockup build note (inline in `../wedhub-frontend/admin/leads.html`'s build history) — confirmed only a single status-patch endpoint exists in `wedhub-backend/src/modules/leads/`, no dedicated reassign-to-vendor endpoint
- **Description:** The approved mockup's admin leads table includes a "Reassign" row action. No backend endpoint performs vendor reassignment for a lead — admins can only view/filter and (via the generic status-patch endpoint) mark spam or change status.
- **Impact:** Same category of risk as Open Question 2 — a mockup affordance with no real backend behind it yet.
- **Recommendation:** Ship the view/filter/status-change UI (real, backed by the existing endpoint). Grey out or omit the "Reassign" action until/unless a backend endpoint is added — do not fake it with a client-side-only state change that reverts on reload.
- **Status:** Open — resolve when Stage 4 (Frontend Arch Phase 9) is reached.
- **Related stage files:** [06-stage-admin-platform.md](06-stage-admin-platform.md)

## 4. Session/auth strategy not yet chosen

- **Citations:** `../docs/01-reference-cross-cutting.md` ("Authentication & authorization baseline" — short-lived JWT access tokens, opaque rotating refresh tokens, reuse-detection), `01-reference-cross-cutting.md` (this folder — "API integration standard" defers the strategy choice to Frontend Arch Phase 1)
- **Description:** The backend issues a JWT access token + refresh token pair (Arch Phase 2). The frontend has two standard ways to hold these in a Next.js App Router app: httpOnly cookies set via a Next.js Route Handler (most secure, requires a thin server-side proxy for login/refresh), or client-held tokens in memory/localStorage with manual attachment to requests (simpler, weaker against XSS). Neither is decided yet.
- **Impact:** This choice affects `middleware.ts`'s auth-gating implementation, the shape of `lib/api/`, and how Server Components authenticate their own fetches — it should be decided once, early, not per-stage.
- **Recommendation:** Default recommendation: httpOnly cookies via Route Handlers, since this is a role-gated multi-app (couple/vendor/admin) product where XSS-resistant session storage matters more than client-side token flexibility.
- **Status:** ✅ Resolved (2026-09-02) — httpOnly cookies via Next.js Route Handlers. **Concrete mechanism, verified against the actual backend source** (`wedhub-backend/src/modules/auth/auth.controller.ts`): the backend already sets its own `refresh_token` httpOnly cookie (`sameSite: strict`, `path: /api/v1/auth`, 30-day TTL) and returns a short-lived (15 min) `accessToken` as a JSON field — it reads the refresh token **only** from that cookie, never from a request body. Because of `sameSite: strict`, this only works if all `/api/v1/auth/*` calls are proxied through the frontend's own origin rather than called directly from browser JS. Design: `app/api/auth/login`, `/refresh`, `/logout` Route Handlers make server-to-server calls to the backend, forward the backend's `Set-Cookie: refresh_token=...` response header straight through to the browser (so the browser ends up holding the backend's own refresh cookie, scoped to the frontend's origin), and separately set our own httpOnly `wedhub_session` cookie containing just the short-lived `accessToken` for `proxy.ts`/DAL to read on every request. `lib/api/client.ts` attaches `Authorization: Bearer <accessToken>` from that session cookie; when a call 401s, the DAL calls our `/api/auth/refresh` Route Handler (which forwards the browser's `refresh_token` cookie to the backend) and retries once.
- **Related stage files:** [03-stage-foundation.md](03-stage-foundation.md)

## 5. Styling approach not yet chosen (Tailwind vs. ported CSS variables)

- **Citations:** `01-reference-cross-cutting.md` (this folder — "Design system porting rule")
- **Description:** The approved mockup (`../wedhub-frontend/assets/css/`) uses hand-written CSS with custom properties (`tokens.css`) and utility-ish component classes (`base.css`) — no framework. The real Next.js app can either port these files near-verbatim as global CSS, or translate the same tokens into a Tailwind theme config for more ergonomic component authoring. Both preserve the exact visual contract; they differ in developer ergonomics only.
- **Impact:** Affects every component built from Frontend Arch Phase 0 onward — should be decided once, first, not revisited mid-build.
- **Recommendation:** Decide explicitly at the start of Frontend Arch Phase 0 (see `03-stage-foundation.md`) based on team preference — this doc does not prescribe one, since both are equally valid ways to honor the same design tokens.
- **Status:** ✅ Resolved (2026-09-02) — Tailwind CSS with a custom theme mapping `tokens.css`'s colors/fonts/spacing/radius/shadow scale 1:1. `components/ui/` primitives authored with Tailwind utility classes against that theme rather than hand-written CSS.
- **Related stage files:** [03-stage-foundation.md](03-stage-foundation.md)

## 6. Vendor-facing entitlement UI depends on backend Arch Phase 12's "minimal" scope, not the mockup's full vision

- **Citations:** `../docs/02-mvp-cut-line.md` (Arch Phase 12 "⚠️ Minimal — enough entitlement-check plumbing to gate portfolio limits, video limits, and analytics access"), `02-mvp-cut-line.md` (this folder)
- **Description:** The `vendor/portfolio.html`, `vendor/analytics.html`, and `vendor/subscription.html` mockups imply rich plan-based gating (e.g. upload limits changing by plan, locked analytics sections for Free-plan vendors). The actual backend Arch Phase 12 implementation is described as "minimal" — it's not yet confirmed exactly which limits it enforces versus which are mockup aspiration.
- **Impact:** Risk of building frontend gating UI for a limit the backend doesn't actually enforce yet (or the reverse — backend enforces something the mockup never depicted).
- **Recommendation:** Before wiring `vendor/portfolio.html` and `vendor/analytics.html` in Frontend Arch Phase 5/7, read `wedhub-backend/src/modules/entitlements/` directly to get the real, current list of enforced limits, and reconcile the UI to exactly that list — do not assume the mockup's implied gating is accurate.
- **Status:** Open — needs a source-code check at implementation time, not resolvable from docs alone.
- **Related stage files:** [05-stage-vendor-experience.md](05-stage-vendor-experience.md)
