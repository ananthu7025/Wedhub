# API Reference

All endpoints require a valid JWT (issued by `wedhub-backend`) except where noted. Admin-only endpoints additionally require an admin role claim on that same token. See [../architecture/05-integration-with-wedhub-backend.md](../architecture/05-integration-with-wedhub-backend.md).

## Public catalog (gallery)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/templates` | any signed-in user | List published templates, filterable by `collection`/`category` — powers the gallery grid |
| GET | `/templates/:slug` | any signed-in user | Full template detail incl. `content` — powers "View Demo" |

## Website content (user-owned, forked from a template)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/website-content` | owner | Fork a `Template` into a new `WebsiteContent` ("Use This Design") |
| GET | `/website-content/:id` | owner | Fetch the user's content document for editing |
| PATCH | `/website-content/:id` | owner | Edit standard-block props only — **rejects** `custom_html`/`scrub_sequence` section edits (see [../architecture/03-block-registry.md](../architecture/03-block-registry.md)) |
| GET | `/public/website/:publicSlug` | none (public) | Public rendered content for the live/published site |

## Admin template authoring

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/admin/templates` | admin | Create a new template (any block type allowed, incl. `custom_html`/`scrub_sequence`) |
| PATCH | `/admin/templates/:id` | admin | Edit a template; server-side validation enforces the frame/section caps in [../architecture/06-performance-and-fallbacks.md](../architecture/06-performance-and-fallbacks.md) |
| POST | `/admin/templates/:id/publish` | admin | Move `DRAFT` → `PUBLISHED` |
| POST | `/admin/templates/:id/assets` | admin | Upload a video for a `scrub_sequence` section; enqueues frame-extraction job, returns the created `TemplateAsset` (status `PROCESSING`) |
| GET | `/admin/templates/:id/assets/:assetId` | admin | Poll `TemplateAsset.status` until `READY`/`FAILED` |

## Internal (service-to-service, not user-facing)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/internal/website-content/:id/publish` | shared internal secret | Called by `wedhub-backend` after Razorpay payment confirmation — flips `WebsiteContent.status` to `PUBLISHED` |

This service also **calls out** to `wedhub-backend` (not exposed here): `POST {wedhub-backend}/internal/microsite-webhook` — the idempotent status-sync webhook described in [../architecture/05-integration-with-wedhub-backend.md](../architecture/05-integration-with-wedhub-backend.md).

## Error conventions

Match `wedhub-backend`'s existing error-handling middleware shape (`src/common/errors/`) — to be confirmed/copied during Phase 1 implementation rather than inventing a new error envelope format.
