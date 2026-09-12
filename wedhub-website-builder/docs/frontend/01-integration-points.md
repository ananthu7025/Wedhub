# Frontend Integration Points

There is no separate frontend project for this feature — the gallery/editor/public-renderer UI is added to the existing `wedhub-frontend-app`. This doc describes what changes there, at a level of detail sufficient to scope the work; each page gets its own detail doc (02–04).

## New routes in `wedhub-frontend-app`

| Route (indicative) | Purpose | Detail doc |
|---|---|---|
| `app/(couple)/wedding-website/gallery/page.tsx` | Template gallery/browse | [02-gallery-page.md](02-gallery-page.md) |
| `app/(couple)/wedding-website/editor/[contentId]/page.tsx` | Section editor for a forked `WebsiteContent` | [03-editor-page.md](03-editor-page.md) |
| `app/(public)/wedding/[publicSlug]/page.tsx` (new template-driven variant, or an evolution of the existing route) | Public rendered site | [04-public-renderer.md](04-public-renderer.md) |

These are **additive** — the existing fixed-enum wizard (`components/wedding-website/WeddingWebsiteWizard.tsx`) and its routes keep working unchanged for Telegram-originated and any not-yet-migrated websites (see [../architecture/01-overview.md](../architecture/01-overview.md)'s Telegram non-goal).

## API client

A new typed client module (e.g. `lib/api/microsite.ts`, mirroring the existing `lib/api/wedding-website.types.ts` conventions) talks directly to `wedhub-website-builder`'s API (see [../backend/02-api-reference.md](../backend/02-api-reference.md)), passing through the same JWT the app already holds from `wedhub-backend` login — no second auth flow, no token exchange.

## Reused existing infrastructure

- **Media upload** — the existing upload components/flow (`components/wedding-website/PhotoUploader.tsx`, `GalleryUploader.tsx`) and the underlying R2/media pipeline are reused as-is for user-supplied images within standard blocks (gallery photos, cover images). No new upload UI is built for that.
- **Form patterns** — the schema-driven prop-editing forms (see [03-editor-page.md](03-editor-page.md)) should follow the same pattern already established for category attribute forms (project memory: "Category attribute form builder") rather than inventing a new form-rendering approach.
- **SEO/metadata** — the public renderer route follows the existing `generateMetadata` pattern (title/description/canonical/OG/robots) already used elsewhere in the app, matching how the current `/wedding/[slug]` route handles it.

## What does NOT move to the frontend

- No raw-HTML editing UI is ever exposed to end users (see [../architecture/03-block-registry.md](../architecture/03-block-registry.md)) — the editor page only ever renders schema-driven forms for user-editable block types.
- Admin template authoring (including `custom_html`/`scrub_sequence` creation and video upload) is a separate, admin-only surface — see [../tasks/phase-3-admin-authoring.md](../tasks/phase-3-admin-authoring.md) for whether this lives in `wedhub-frontend-app`'s existing `(admin)` route group or as a lighter internal tool; not yet finalized, tracked in [../risks-and-open-questions.md](../risks-and-open-questions.md).
