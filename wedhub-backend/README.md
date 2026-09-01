# WedHub Backend

Modular monolith backend for WedHub, a wedding vendor discovery marketplace. See [`../docs/`](../docs/00-index.md) for the full delivery plan, and [`../wedhub_backend_architecture.md`](../wedhub_backend_architecture.md) / [`../product.md`](../product.md) for the source specs.

**Current status:** Arch Phase 0 (Architecture & Repository Setup) — see [`../docs/11-progress-log.md`](../docs/11-progress-log.md).

## Prerequisites

- Node.js >= 20.12 (uses native `--env-file` support and `process.loadEnvFile`)
- Docker (for local Postgres/Redis) — install [Docker Desktop](https://www.docker.com/products/docker-desktop/) if `docker --version` doesn't resolve

## Setup

```bash
cp .env.example .env
npm install
docker compose up -d      # starts Postgres + Redis
npm run dev
```

Then check:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/v1
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run typecheck` | TypeScript strict-mode check, no emit |
| `npm test` | Full Vitest suite |
| `npm run db:migrate` / `db:seed` / `db:reset` | Wired to Prisma starting Arch Phase 1 — currently stubbed |

## Structure

```
src/
├── app.ts / server.ts   — Express app assembly + HTTP bootstrap
├── config/              — env validation, logger
├── common/               — shared errors, middleware, types, utils
├── modules/              — one folder per business domain (auth, vendors, leads, ...)
├── jobs/                 — background queues/processors/schedules (Redis + BullMQ, later phases)
├── integrations/          — external providers (payment, storage, telegram, email, sms)
└── routes/               — /api/v1 router
```

Each module follows the same internal pattern once implemented: `*.controller.ts` → `*.service.ts` → `*.repository.ts`, plus `*.schema.ts` and `*.policy.ts`. See [`../docs/01-reference-cross-cutting.md`](../docs/01-reference-cross-cutting.md) for the full convention and coding rules.
