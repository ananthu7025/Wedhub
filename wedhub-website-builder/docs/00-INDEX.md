# wedhub-website-builder — Docs Index

## What this project is

`wedhub-website-builder` is a new, standalone backend service that replaces WedHub's current fixed-3-template wedding website feature with a data-driven system supporting hundreds of user-selectable, richly designed, Canva-style templates — including Apple-product-page-style scroll-scrubbed hero sections.

It is deliberately **isolated** from `wedhub-backend`: its own database, its own job queue/workers, its own deploy process. It talks to `wedhub-backend` only across a narrow integration seam (JWT auth verification + a status-sync webhook). See [architecture/01-overview.md](architecture/01-overview.md) for why.

This is a **backend-only** project. There is no separate frontend app — the gallery/editor/public-site UI is added to the existing `wedhub-frontend-app`, which calls this service's API directly. See [frontend/01-integration-points.md](frontend/01-integration-points.md).

**Explicit non-goal:** the Telegram bot flow in `wedhub-backend/src/modules/telegram/` is untouched by this project. It keeps creating wedding websites the old fixed-enum way. Reconciling Telegram with this system is a separate future project — do not attempt it here.

## How to read this docs set

Read in this order if you're new to the project:

1. [architecture/01-overview.md](architecture/01-overview.md) — the big picture and why it's a separate service
2. [architecture/02-data-model.md](architecture/02-data-model.md) — Template / TemplateAsset / WebsiteContent shapes
3. [architecture/03-block-registry.md](architecture/03-block-registry.md) — the block system, standard vs. admin-only blocks
4. [architecture/04-scroll-scrub-rendering.md](architecture/04-scroll-scrub-rendering.md) — the Apple-style scroll animation mechanics
5. [architecture/05-integration-with-wedhub-backend.md](architecture/05-integration-with-wedhub-backend.md) — the seam between the two services
6. [architecture/06-performance-and-fallbacks.md](architecture/06-performance-and-fallbacks.md) — non-negotiable perf guardrails
7. [backend/](backend/) — project setup, API reference, jobs, database
8. [frontend/](frontend/) — what changes in `wedhub-frontend-app`
9. [tasks/00-INDEX.md](tasks/00-INDEX.md) — phased build plan with status tracking
10. [risks-and-open-questions.md](risks-and-open-questions.md) — known risks, unresolved decisions

## Stage table

| Stage | Doc | Covers | Status |
|---|---|---|---|
| 1 | [tasks/phase-1-foundation.md](tasks/phase-1-foundation.md) | Project scaffold, own DB/Redis, auth verification, deploy wiring | Not started |
| 2 | [tasks/phase-2-block-system.md](tasks/phase-2-block-system.md) | Template/content data model, standard block registry, static rendering | Not started |
| 3 | [tasks/phase-3-admin-authoring.md](tasks/phase-3-admin-authoring.md) | Admin template CRUD, custom_html escape hatch, thumbnails | Not started |
| 4 | [tasks/phase-4-scroll-scrub.md](tasks/phase-4-scroll-scrub.md) | TemplateAsset, ffmpeg pipeline, scroll-scrub renderer, beats | Not started |
| 5 | [tasks/phase-5-gallery-and-user-editing.md](tasks/phase-5-gallery-and-user-editing.md) | Public gallery, fork-to-user-content, prop editor | Not started |
| 6 | [tasks/phase-6-integration-and-launch.md](tasks/phase-6-integration-and-launch.md) | Webhook sync, payment-gated publish, perf validation, rollout | Not started |

## Origin

This project originates from a planning conversation on 2026-09-12 about scaling WedHub's `WeddingWebsite` feature (`wedhub-backend/prisma/schema.prisma:1963`, `wedhub-frontend-app/components/wedding-website/WeddingWebsiteRenderer.tsx`) beyond its current fixed 3-template enum. Key reference used during design: zareqia.com/templates (a gallery-of-named-presets product, e.g. "Royal Imperial", "Royal Elegance") — confirmed this is a curated-template-gallery model, not a freeform drag-and-drop canvas, which is why a structured JSON section/block tree was chosen as the template format over an absolute-position canvas or raw-HTML-only templates.
