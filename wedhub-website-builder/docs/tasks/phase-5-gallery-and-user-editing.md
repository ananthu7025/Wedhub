# Phase 5 — Gallery and User Editing

**Status:** Not started
**Depends on:** Phase 2 (block system), Phase 3 (admin authoring — need real templates to browse), Phase 4 (scroll-scrub — need it wired for full-fidelity templates, though this phase's core flow works with static-only templates too)
**Docs:** [../frontend/02-gallery-page.md](../frontend/02-gallery-page.md), [../frontend/03-editor-page.md](../frontend/03-editor-page.md), [../architecture/02-data-model.md](../architecture/02-data-model.md)

## Scope

- [ ] `GET /templates` (public catalog, filterable by `collection`) and `GET /templates/:slug` (detail, for "View Demo") — published-only for non-admin callers.
- [ ] `POST /website-content` — fork a `Template.content` into a new `WebsiteContent` row owned by the calling user (`ownerUserId` from JWT).
- [ ] `GET /website-content/:id` / `PATCH /website-content/:id` — the latter enforces the standard-blocks-only editing rule from Phase 3.
- [ ] `wedhub-frontend-app`: gallery page per [../frontend/02-gallery-page.md](../frontend/02-gallery-page.md) — grid, collection filter, View Demo, Use This Design.
- [ ] `wedhub-frontend-app`: editor page per [../frontend/03-editor-page.md](../frontend/03-editor-page.md) — canvas + property panel, schema-driven forms (reusing the category-attribute-form-builder pattern), drag-reorder among standard blocks, non-editable rendering of `scrub_sequence`/`custom_html` sections.
- [ ] `wedhub-frontend-app`: typed API client module for this service (see [../frontend/01-integration-points.md](../frontend/01-integration-points.md)), passing through the existing JWT.
- [ ] Preview action in the editor rendering the current draft via the same `mode: "view"` renderer used for the eventual public page.

## Explicit non-goals for this phase

- No public `/wedding/[publicSlug]` live-site route yet, and no publish/payment wiring (Phase 6) — this phase produces editable **drafts** only.
- No admin authoring UI polish beyond what Phase 3/4 already required.

## Done criteria

- A real user can: browse the gallery, view a demo, fork a template, land in the editor, edit at least the hero headline/cover image and reorder two sections, and see those changes reflected in the preview render — entirely through `wedhub-website-builder`'s API plus the new `wedhub-frontend-app` pages, with no `wedhub-backend` involvement in this flow yet (that arrives in Phase 6).
- Attempting to edit a `scrub_sequence` or `custom_html` section in the editor UI shows the "can't be edited" state, and a direct API call attempting the same is rejected server-side.
