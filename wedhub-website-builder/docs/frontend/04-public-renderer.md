# Public Renderer Spec

## Principle

Same rule the existing feature already established and documents explicitly in `WeddingWebsiteRenderer.tsx`: **preview and published pages render through the exact same component**, never a parallel implementation. This project extends that principle to also cover the editor's live canvas (see [03-editor-page.md](03-editor-page.md)) — one renderer, three `mode`s of consumption (`edit` in the editor, `view` for both preview and published).

## Rendering

- Server-rendered (SSR/RSC, matching the existing Next.js app's pattern) for the public `/wedding/[publicSlug]` page — fetches `GET /public/website/:publicSlug` (no auth) from `wedhub-website-builder`, or via a `wedhub-backend` proxy (see [../architecture/05-integration-with-wedhub-backend.md](../architecture/05-integration-with-wedhub-backend.md)'s Option A/B, finalized in Phase 6).
- `scrub_sequence` sections hydrate client-side (scroll-driven canvas painting cannot be server-rendered) but their **poster frame** is part of the initial SSR output for LCP — see [../architecture/06-performance-and-fallbacks.md](../architecture/06-performance-and-fallbacks.md).
- `custom_html` sections are rendered as pre-sanitized HTML (sanitization happens server-side at template-save time, not at render time — see [../architecture/03-block-registry.md](../architecture/03-block-registry.md)) via `dangerouslySetInnerHTML` scoped only to this pre-sanitized string, never user-supplied content.

## SEO/metadata

Follows the existing `generateMetadata` convention already used elsewhere in the app (title/description/canonical/OG/robots) — no new metadata approach invented. Draft/unpublished content must never be reachable at a public, indexable URL, matching the existing preview-token/`noindex` handling already built for the current feature.

## Non-goal

This doc does not cover the Telegram-created, fixed-enum website's rendering — that stays on `WeddingWebsiteRenderer.tsx` exactly as it is today, untouched (see [../architecture/01-overview.md](../architecture/01-overview.md)).
