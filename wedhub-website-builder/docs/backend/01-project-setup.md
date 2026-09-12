# Backend Project Setup

## Conventions inherited from `wedhub-backend`

This project mirrors `wedhub-backend`'s shape deliberately, so anyone familiar with that codebase can work in this one without relearning conventions:

- **Framework:** Express 4 + helmet, cors, cookie-parser, express-rate-limit, pino/pino-http logging.
- **Module shape:** `src/modules/<feature>/` with `.controller.ts` → `.service.ts` → `.repository.ts` → `.routes.ts` → `.schema.ts` (Zod) → `.types.ts`.
- **Shared code:** `src/common/` (constants, enums, errors, middleware, policies, types, utils).
- **External integrations:** `src/integrations/` (this project: `storage/r2.client.ts`, `wedhub-backend/backend-client.ts`).
- **Jobs:** `src/jobs/{queues,processors,schedules}/`, BullMQ + ioredis, lazy-singleton `Queue` + an `enqueueX()` helper (with `attempts`/`backoff`/`removeOnComplete`), a separate `worker.ts` entrypoint with graceful SIGTERM/SIGINT shutdown — run as its own PM2 process, distinct from the API process, exactly like `wedhub-backend/src/jobs/`.
- **Env config:** `src/config/env.ts` — single Zod-validated schema, `.coerce.number()` for numeric vars, fail-fast `process.exit(1)` on invalid config, exported `env`/`isProduction`/`isDevelopment`/`isTest`.
- **Database:** Prisma, schema at `prisma/schema.prisma`, migrations in `prisma/migrations/<timestamp>_<name>/`.
- **Testing:** Vitest, `tests/{unit,integration,e2e}/`.

## What's different from `wedhub-backend` (deliberately)

- **Own database.** A separate `DATABASE_URL` pointing at its own Postgres database (can share a Postgres *instance* with `wedhub-backend` to start if that's operationally simpler, but must be a distinct database/schema with its own connection pool — never the same Prisma client or schema file).
- **Own Redis.** A separate `REDIS_URL` / Redis logical DB index so BullMQ job traffic here never competes with `wedhub-backend`'s existing queues.
- **No local `User` table, no local login.** Auth is JWT verification only against `wedhub-backend`'s signing secret/JWKS — see [../architecture/05-integration-with-wedhub-backend.md](../architecture/05-integration-with-wedhub-backend.md).
- **ffmpeg dependency.** The frame-extraction worker needs `ffmpeg` available in its runtime environment (the Dockerfile's `runtime` stage must install it — `wedhub-backend`'s existing Dockerfile has no equivalent need).

## Local development

```
docker-compose.yml   # spins up local Postgres (own DB name, e.g. wedhub_website_builder) + Redis, mirroring wedhub-backend's docker-compose.yml shape (dev-only, not used to run the app itself)
.env.example          # DATABASE_URL, REDIS_URL, JWT_PUBLIC_KEY or JWKS_URL, R2 credentials + key prefix, PORT
```

Scripts (`package.json`, mirroring `wedhub-backend`'s script names):

```
dev            # tsx watch src/server.ts
worker         # tsx watch src/worker.ts
build          # tsc
start          # node dist/server.js
lint / lint:fix
typecheck
test / test:unit / test:integration / test:e2e
db:migrate / db:seed / db:reset
```

## Deployment

Added **additively** to the existing repo-root deploy infrastructure, without modifying existing entries:

- **`ecosystem.config.js`** (repo root, PM2) gains two new process entries: `wedhub-microsite-api` and `wedhub-microsite-worker` (the latter with a `kill_timeout` for graceful BullMQ drain, matching the existing `wedhub-worker` entry's pattern).
- **`scripts/deploy.sh`** gains a block for this project: `git pull` → `npm ci` → `prisma migrate deploy` → `npm run build` → included in the `pm2 restart ecosystem.config.js` step → health-check poll against this service's own `/health` endpoint.
- **`.github/workflows/deploy.yml`** — no structural change needed if it already just SSHes and runs `scripts/deploy.sh`; verify during Phase 1 implementation.
- **Hosting target:** intentionally left open (per project decision — see [../risks-and-open-questions.md](../risks-and-open-questions.md)). The service is structured as a standalone deployable (own `Dockerfile`, own env config) specifically so it is not locked into running on the same server as `wedhub-backend` if/when that becomes desirable.
