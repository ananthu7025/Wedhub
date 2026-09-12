# Architecture Overview

## The problem

WedHub's current wedding website feature (`WeddingWebsite` model, `wedhub-backend/prisma/schema.prisma:1963`) is a fixed 3-template enum (`ROYAL_WEDDING`, `MINIMAL_ELEGANT`, `TRADITIONAL_INDIAN`) rendered by one hardcoded React component (`WeddingWebsiteRenderer.tsx`). Content lives in flat named DB columns (`brideName`, `venueName`, `coupleStory`, ...), and "template" variation is just a Tailwind theme-token swap (`theme.ts`) on one fixed section order. This cannot scale to hundreds of visually distinct, user-editable templates — there is no template *data model*, no block/section system, and no path to richer visual treatments like scroll-driven animation.

## The goal

A gallery of hundreds of named, richly designed templates (in the spirit of products like Zareqia's template collections) that users can browse, pick, and customize — including flagship templates with Apple-product-page-style scroll-scrubbed sections (a background frame sequence that plays back as the user scrolls, with text choreographed against the same scroll position) — while keeping end-user editing safe (schema-driven forms only, never raw HTML).

## Why a separate service, not a module inside `wedhub-backend`

Three concrete reasons, not just "clean architecture" preference:

1. **CPU isolation.** Extracting frame sequences from admin-uploaded videos via ffmpeg is CPU/memory-intensive. Running that on the same process pool as `wedhub-backend`'s API risks slowing down vendor search, bookings, and payments during template processing.
2. **Storage/bandwidth isolation.** Hundreds of templates, each potentially with multiple scroll-scrub sections at multiple responsive frame widths, is a materially different storage and egress profile than vendor photos. Scaling this independently (and monitoring it independently) matters.
3. **Blast radius.** A bug, crash, or traffic spike in the new feature (a template goes viral) must not be able to degrade the core marketplace. Separate process, separate database, separate deploy.

## What stays in `wedhub-backend`

- **Identity/auth** — issues the JWT this service verifies. No user table is duplicated here.
- **Payments** — Razorpay, `Payment.purpose = WEDDING_WEBSITE`, webhook handling. This service is only ever told "payment confirmed, allow publish" — it never checks payment state itself.
- **The `WeddingWebsite` row** — stays the anchor record. Gains a small mirror of this service's state (see [05-integration-with-wedhub-backend.md](05-integration-with-wedhub-backend.md)), not the full content.
- **Telegram bot flow** — completely untouched. Telegram-created websites keep using the old fixed-enum path indefinitely; this project does not wire into it.

## What this service owns

- `Template` catalog (the gallery of presets)
- `TemplateAsset` (processed video/frame-sequence media for scroll-scrub sections)
- `WebsiteContent` (a user's forked, edited copy of a template)
- The block/section content schema and validation
- The ffmpeg frame-extraction job queue/workers
- Template and content REST APIs consumed directly by `wedhub-frontend-app`

## System context

```
                     ┌─────────────────────────┐
   Browser  ───────► │   wedhub-frontend-app    │
                     │   (Next.js, existing)    │
                     └───────┬──────────┬───────┘
                             │          │
                  auth/pay   │          │  templates/content/gallery/editor
                             ▼          ▼
                  ┌────────────────┐  ┌───────────────────────────┐
                  │ wedhub-backend │  │ wedhub-website-builder     │
                  │ (existing)     │◄─┤ (new, isolated service)    │
                  │ - auth         │  │ - Template catalog         │
                  │ - payments     │  │ - WebsiteContent           │
                  │ - WeddingWebsite│  │ - TemplateAsset/ffmpeg     │
                  │   (mirror cols)│  │ - own Postgres + Redis     │
                  │ - Telegram     │  │                            │
                  │   (untouched)  │  │                            │
                  └────────────────┘  └───────────────────────────┘
                          ▲                   │
                          └── status webhook ──┘
                             (idempotent, mirrors
                              existing WebhookEvent
                              pattern)
```

## Non-negotiable constraints carried through every doc in this set

- Template format is a **structured JSON section/block tree**, not a freeform absolute-position canvas, not raw-HTML-only templates (see [02-data-model.md](02-data-model.md)).
- The raw-HTML/custom-animation escape hatch (`custom_html` block) is **admin-authored only**, never exposed to end users (see [03-block-registry.md](03-block-registry.md)).
- Scroll-scrub background media is **admin-uploaded per template**, never per end-user — bounds processing/storage cost.
- This service has **no local User table** — `ownerUserId`/`createdByUserId` fields are opaque IDs taken from a verified JWT, never local foreign keys.
- The Telegram bot flow is out of scope, permanently, for this project.
