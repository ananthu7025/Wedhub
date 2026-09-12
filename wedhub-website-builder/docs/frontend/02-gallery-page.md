# Gallery Page Spec

Reference inspiration: zareqia.com/templates — a grid of named template cards, filterable by collection ("Zareqia Royal" vs "Zareqia Classics"), each with a "View Demo" and "Use This Design" action. Confirmed via a user-provided screenshot during design — see project memory "Website template builder" for the full trace.

## Layout

- Grid of `Template` cards, each showing: `thumbnailKey` image, `name`, a short description (stored as a `props` field on the template's hero-equivalent section, or a dedicated `Template.description` column — decide during Phase 5 implementation), and a `collection` badge.
- Filter/tab control across the top for `collection` (e.g. "Royal", "Classic", and whatever collections get authored over time) — mirrors the reference site's collection-tab UX.
- Two actions per card:
  - **View Demo** — opens the template's `content` rendered read-only in `mode: "view"` through the shared block renderer (see [../architecture/03-block-registry.md](../architecture/03-block-registry.md)), using placeholder/sample data for `{{token}}` interpolation.
  - **Use This Design** — calls `POST /website-content` to fork the template into a new `WebsiteContent` owned by the current user, then navigates to the editor page for that new content ID.

## Data source

`GET /templates?collection=...` (see [../backend/02-api-reference.md](../backend/02-api-reference.md)) — only `status: PUBLISHED` templates are ever returned to non-admin callers.

## Non-goals for this page

- No freeform browsing of `custom_html` internals or `scrub_sequence` authoring details — the gallery only ever shows the finished rendered demo, never the underlying JSON/admin tooling.
