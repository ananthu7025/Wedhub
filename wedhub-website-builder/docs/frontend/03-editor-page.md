# Editor Page Spec

## Layout

Two-panel layout:
- **Canvas (left/main):** the forked `WebsiteContent.content` rendered live through the shared block renderer in `mode: "edit"` (see [../architecture/03-block-registry.md](../architecture/03-block-registry.md)) — click-to-select a section, reorder via drag handles (`dnd-kit`, matching typical Next.js drag-reorder patterns already usable in this app).
- **Property panel (right):** for the currently selected section, a schema-driven form generated from that block type's Zod schema — reusing the pattern already established for category attribute forms (project memory: "Category attribute form builder", 13 field types, placeholder/help/uiVariant/aspectRatio conventions). Image props use the existing media upload components (see [01-integration-points.md](01-integration-points.md)).

## What's editable vs. not

- **Editable:** all standard block types' declared `props` (see [../architecture/03-block-registry.md](../architecture/03-block-registry.md)'s user-editable table) — text, images, colors/theme tokens, section order (add/remove/reorder among standard blocks only).
- **Not editable, but visible:** `scrub_sequence` and `custom_html` sections render in the canvas exactly as authored (so the user sees their full template, including the flagship animated hero), but have **no property panel** when selected — clicking one shows a simple "This section is part of your template design and can't be edited" state rather than an empty/broken form. The API also rejects any attempt to edit these via `PATCH /website-content/:id` server-side (see [../backend/02-api-reference.md](../backend/02-api-reference.md)) — the UI restriction is a courtesy, not the enforcement boundary.

## Save flow

- Autosave or explicit save (decide during Phase 5 implementation, consistent with whatever pattern the existing wizard uses for its step-by-step PATCH-on-each-step flow) calls `PATCH /website-content/:id` with the edited `content`.
- Preview: a "Preview" action renders the current draft `content` in `mode: "view"` — reusing the exact same public renderer component the eventual published page uses, matching the existing codebase's established principle (`WeddingWebsiteRenderer.tsx`'s documented rule that preview and published must never diverge into separate implementations).

## Publish

Publishing remains payment-gated exactly as today — this page's "Publish" action goes through the existing `wedhub-backend` payment flow (`PublishCheckoutButton.tsx`-equivalent), not a direct call to this service. See [../architecture/05-integration-with-wedhub-backend.md](../architecture/05-integration-with-wedhub-backend.md).
