# Phase 1 — Foundation

**Status:** Not started
**Depends on:** nothing (first phase)
**Docs:** [../backend/01-project-setup.md](../backend/01-project-setup.md), [../architecture/01-overview.md](../architecture/01-overview.md), [../architecture/05-integration-with-wedhub-backend.md](../architecture/05-integration-with-wedhub-backend.md)

## Scope

- [ ] Scaffold the project structure per [../backend/01-project-setup.md](../backend/01-project-setup.md): `package.json`, `src/{app,server,worker}.ts`, `src/config/{env,redis}.ts`, `src/common/`, `tests/{unit,integration,e2e}/`.
- [ ] `docker-compose.yml` — local Postgres (own DB name) + Redis, mirroring `wedhub-backend/docker-compose.yml`'s shape.
- [ ] `prisma/schema.prisma` — empty/minimal schema to start (real models arrive in Phase 2), confirm `prisma migrate dev` works end-to-end against the local Postgres.
- [ ] `src/modules/auth/jwt-verify.middleware.ts` — verifies `wedhub-backend`-issued JWTs (same signing secret/JWKS). No local login, no local `User` table.
- [ ] Health-check endpoint (`GET /health`) matching whatever convention `wedhub-backend`'s deploy health-check poll expects.
- [ ] `Dockerfile` — multi-stage (base/deps/build/runtime), Node 20-alpine, **plus `ffmpeg` installed in the runtime stage** (new requirement vs. `wedhub-backend`'s Dockerfile — do not just copy it verbatim).
- [ ] `.env.example` with all required vars documented (`DATABASE_URL`, `REDIS_URL`, JWT verification key/JWKS URL, R2 credentials + key prefix, `PORT`).
- [ ] CI: lint/typecheck/test workflow (can be a new job in `.github/workflows/deploy.yml` or a separate workflow file — confirm which during implementation).
- [ ] Add `wedhub-microsite-api` and `wedhub-microsite-worker` entries to the repo-root `ecosystem.config.js` (additive only — do not modify existing `wedhub-api`/`wedhub-worker`/`wedhub-web` entries).
- [ ] Add this project's build/migrate/restart steps to `scripts/deploy.sh` (additive block).

## Explicit non-goals for this phase

- No `Template`/`WebsiteContent` models yet (Phase 2).
- No admin authoring, no block registry, no rendering (Phases 2–5).
- No changes to `wedhub-backend` itself yet (that's Phase 6) — this phase only adds new, additive entries to shared deploy config files.

## Done criteria

- `npm run dev` boots the API against local Postgres/Redis with a working `/health` endpoint.
- `npm run worker` boots the (currently empty) worker process cleanly and shuts down gracefully on SIGTERM.
- A request carrying a valid `wedhub-backend`-issued JWT is correctly authenticated by the middleware; an invalid/missing token is correctly rejected.
- `npm run typecheck && npm run lint && npm test` all pass.
