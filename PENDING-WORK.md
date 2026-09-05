# WedHub — Pending Work & Status

> Read this file first in any new session on this project. It is written to stand alone — you should not need prior chat history to understand where things stand and how to continue. Last updated 2026-09-05.

## 1. What this is

WedHub's v1 build phase closed on 2026-09-05. Two review-feedback audits (backend + frontend) that had been driving active fix work were closed out — see §3. The user is now switching to **manual testing**: instead of working from a pre-written audit list, bugs will be found by hand and logged one at a time in a new top-level `BugsItemsDoc/` folder (user-maintained; not created by this reorg). The old build-phase documentation (`docs/` and `frontenddocs/`) has been merged and moved into `archive/backend/` and `archive/frontend/` — it's historical reference now, not an active backlog.

**Where things live:**
- `archive/backend/00-INDEX.md` and `archive/frontend/00-INDEX.md` — the historical build record (stage plans, progress logs, risk logs, both review-feedback audits).
- `BugsItemsDoc/` — where new manual-testing bug items get logged going forward (create this folder when the first bug is ready to log, if it doesn't exist yet).
- This file — the single source of truth for "what's the state of things right now."

**Git state as of writing:** this reorg itself (the `docs/`→`archive/backend/` and `frontenddocs/`→`archive/frontend/` moves/merges, this file, and the deleted-then-lost `docs/22-feature-inventory-brochure.html` — see §6) is **staged but not committed**. Everything in §3 (the actual code fixes) was already committed and pushed to `origin/main` before this reorg began — check `git log`/`git status` to confirm current state before assuming either way, since this file itself will not self-update as more commits land.

## 2. Coding conventions & git discipline — apply these on every task

These were established and repeatedly confirmed across the v1 build (see `archive/backend/18-session-handoff-2026-09-05.md` for the original detailed version). They apply regardless of what you're asked to do next.

**Review-before-build:** never build directly from a doc's claim, or trust a memory's claim about the code, without verifying it against the real current file first (grep/read it). This caught real bugs every time it was skipped in the past.

**Backend module shape:** `<name>.controller.ts` (thin, HTTP-only) → `<name>.service.ts` (business rules, transactions, authz) → `<name>.repository.ts` (Prisma queries only — services never call `prisma.*` directly) → `<name>.routes.ts` → `<name>.schema.ts` (Zod) → `.types.ts` → `index.ts`. Never raw `schema.parse()` in a controller try/catch — use `validateBody`/`validateQuery` middleware. Every `/me/*` mutating endpoint resolves ownership server-side (`getOwnedVendorOrThrow(userId)`-style) — never trust a client-supplied id.

**Frontend:** API client functions must be verified against the actual registered backend route (path, method, response shape) — never assumed from a doc; this exact bug class (frontend built against an assumed contract) recurred multiple times in this codebase's history. Server Components by default; `"use client"` only for genuine interactivity. Public/cacheable reads should avoid unconditionally touching `headers()` (forces dynamic rendering) — see `apiFetch`'s `public` flag in `wedhub-frontend-app/lib/api/client.ts` for the established pattern.

**Verification bar before calling anything "done":** `npx tsc --noEmit` clean on both `wedhub-backend/` and `wedhub-frontend-app/` is the non-negotiable minimum. Live DB/browser verification is preferred when feasible, but this dev environment frequently lacks a running dev server/Docker/DB — when that's the case, say so explicitly rather than claiming a live test that didn't happen (this came up repeatedly during the v1 build).

**Git discipline:** never commit unless the user explicitly asks. Stage exactly the files belonging to one unit of work — never a blanket `git add -A`. Always `git status` before anything that could discard uncommitted work. Prefer new commits over `--amend`; never force-push without explicit instruction.

**Agent delegation:** large, well-scoped research/build tasks can go to background `Agent` calls with precise, evidence-grounded prompts (exact file paths, patterns to mirror, explicit constraints on what NOT to touch) — never a vague "build feature X." Always independently spot-check a delegated agent's self-reported "done" against the real diff/result before trusting it.

## 3. What's fully done (as of 2026-09-05)

Both review-feedback tasklists (`archive/backend/16-review-feedback-tasklist-backend.md`, `archive/frontend/13-review-feedback-tasklist-frontend.md`) are closed out:

- **Backend**: vendor attribute N+1, non-transactional profile save, search blocking on synchronous analytics writes, search's sequential count query, uncacheable public data (`apiFetch`'s new `public` flag), repository-layering violations (`vendor.service.ts`, `search.service.ts`), duplicated pagination math (new `toPageParams` helper), orphaned unused "large" media variant (removed), no query/job observability (Prisma `$extends` query-duration logging added, media processor logs elapsed ms), no BullMQ worker concurrency tuning (media worker set to 3) — all fixed and committed.
- **Frontend**: unsupervised-agent payment bugs (admin metrics endpoint mismatch, `whatsappUrl` typing, `/search` redirect dropping filters, dead router, unguarded `coverMedia`, fake sample-story links, orphaned components), image compression + upload concurrency/retry across all 9 upload surfaces, public-data caching, homepage sequential fetch + Suspense streaming, featured-listings backend join (eliminating a cross-referencing hack), wedding-website gallery thumbnail sizing, `apiFetch` network-error class — all fixed and committed.

**Explicitly deferred, not bugs:**
- Lightbox/full-screen gallery view for wedding websites — genuinely new feature, never built, not a regression.
- Large Client Component refactors (`InvoiceEditor.tsx` 1079 lines, `InvoiceDetailView.tsx` 924, `WeddingWebsiteWizard.tsx` 772, `InvoicesBoard.tsx` 569, `ProfileEditor.tsx` 541) — NICE-TO-HAVE, lowest priority, meant to be picked off one at a time, never as a big rewrite.
- Backend's "possibly-missing indexes" item — explicitly "verify before building": no seeded 10k–500k-vendor dataset exists in this dev environment to benchmark against, so nothing was added speculatively.

## 4. What's explicitly paused/stopped mid-task

**Backend integration test coverage** (the one remaining item in the backend tasklist, HIGH priority): only 3 unit spec files exist (`vendor-invoice.spec.ts`, `vendor-payments.spec.ts`, `vendor-store.spec.ts`); `tests/integration/` and `tests/e2e/` are empty `.gitkeep` stubs. Work was in progress and paused here:

- A real integration test needs a live Postgres to run against. Docker is **not running** in this dev environment (`docker ps` fails — no daemon).
- The project's own `docker-compose.yml` expects Postgres on port **5433** (`wedhub_dev` database) — this is not currently up.
- A **native Postgres 18 service** is running on this machine on port **5432** (separate from the project's expected setup) — not the same database, and not something to touch without deciding how first.
- A decision was pending on how to proceed (options were: stand up a new test DB on the native Postgres 18 instance, write tests without running them and flag them as unverified, or try starting Docker Desktop first) when the user interrupted to switch to manual testing instead.
- **To resume:** re-ask this question rather than assuming an answer — the right choice depends on what's available/acceptable in whatever environment resumes this work.

## 5. What's known-outstanding but not started at all

- **Arch Phase 19 Stages B+** (security hardening) — input/auth validation audit, file-upload/webhook security, secret rotation, password policy, session revocation, admin MFA, abuse detection, SQL review, error redaction. Only Stage A (CORS/Helmet/dependency audit) is done.
- **Backend Arch Phases 20–25** — testing infrastructure (beyond the 3 unit specs), observability/logging beyond what was added in §3, Docker/deployment config, backup/DR plan, performance work, production-readiness checklist.
- **Backend Arch Phase 26 / Frontend Phase 12** — the ₹49 Instant Wedding Website feature. Backend stalled with no logged detail in the progress log; frontend blocked on it entirely, never started.
- **Frontend Phase 11a/11c** — Telegram surfacing on the public site (11a) and production hardening — accessibility, Core Web Vitals, cross-browser pass (11c). 11b (SEO) is done.
- **`archive/backend/17-vendor-store-payment-architecture-plan.md`'s 29-point Implementation Log** — a self-reported build log from an unsupervised agent, only spot-checked (schema models confirmed real), never independently re-verified point-by-point.
- **`server.md`'s plaintext SSH credential** — flagged since the first build session, confirmed gitignored (not a repo-history leak), never moved to a real secrets manager.

## 6. Loose ends

- **`docs/22-feature-inventory-brochure.html` was lost during this reorg.** It was untracked (never `git add`ed by any session, origin/purpose unknown), and when `docs/` was fully emptied of tracked content via `git mv`/`git rm` and the now-empty directory was removed, this untracked file was removed along with it — confirmed via filesystem search afterward, no copy survives anywhere on disk, and `git log` confirms it was never committed so there's no way to recover it from history either. This was a real mistake in how the reorg was executed (an untracked file sitting in a directory should have been moved out explicitly first, before removing the directory) — flagging it plainly rather than glossing over it. If this file mattered, the user will need to recreate it or recall where it came from; it cannot be restored from this repository.

## 7. Important provenance note — read before trusting anything under `archive/`

Commits `727bda9..164bd46` in this repo's history were made by **a different, unsupervised AI agent** running directly on `main` while a supervised session had hit a usage limit — no branch, no review at the time. A full audit was done afterward (documented across `archive/backend/18-session-handoff-2026-09-05.md` and `archive/backend/17-vendor-store-payment-architecture-plan.md`) and every concrete bug found was fixed (see §3). No critical money/security/data-integrity defects were ever found in that work, but treat any *unaudited* claim from that period with the same "verify before trusting" discipline as everything else in this codebase.
