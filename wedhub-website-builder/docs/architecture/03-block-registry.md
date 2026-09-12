# Block Registry

Every section in a `content.sections` array (see [02-data-model.md](02-data-model.md)) has a `type`. The block registry (`src/common/blocks/registry.ts`) maps each `type` to:

- a **Zod schema** validating that block's `props` shape
- a **React component** that renders it (shared between public "view" mode and the editor's "edit" mode — see below)
- an **editability tier**: `user-editable` or `admin-only`

This is the mechanism that makes "hundreds of templates" tractable: a template is just a preset JSON document composed from a small, shared library of block implementations — not hundreds of hand-built page components.

## Standard blocks (v1, user-editable)

| Type | Purpose | Notes |
|---|---|---|
| `hero` | Opening headline, couple names, cover image | Static image background by default; can be paired with `scrub_sequence` for the flagship animated variant |
| `story` | "How we met" / couple story text | |
| `events` | Ordered list of wedding events (ceremony, reception, ...) | Mirrors `WeddingWebsiteEvent`'s `sortOrder` pattern from `wedhub-backend` |
| `venue` | Venue name, address, map embed | |
| `gallery` | Photo grid | `mediaIds` reference uploaded media |
| `rsvp` | RSVP form | |
| `countdown` | Countdown to wedding date | |
| `contact_share` | Contact info + share buttons | |

A user editing their `WebsiteContent` only ever gets schema-driven prop forms for these block types — reordering sections, swapping images, editing text/colors within each block's declared schema. They never see or produce raw markup.

## Admin-only blocks (the "heavy UI" escape hatch)

| Type | Purpose | Notes |
|---|---|---|
| `scrub_sequence` | Apple-style scroll-scrubbed frame-sequence section with choreographed content beats | See [04-scroll-scrub-rendering.md](04-scroll-scrub-rendering.md). Requires an admin-uploaded video processed into a `TemplateAsset`. |
| `custom_html` | Arbitrary hand-authored HTML/CSS for one-off bespoke sections, optionally paired with a named animation component (e.g. `RoseGoldReveal`) | **Admin-authored only.** Never exposed in the end-user editing API. |

### Security boundary — why `custom_html` is admin-only, not a general feature

Raw HTML is a stored-XSS vector the moment anyone other than a trusted admin can write to it. The rule enforced at the API layer (not just the UI):

- **`POST/PATCH /templates`** (admin CRUD) accepts `custom_html`/`scrub_sequence` blocks in `content`.
- **`PATCH /website-content/:id`** (end-user editing) **rejects** any section with `type: "custom_html"` or `type: "scrub_sequence"` in the request body — these block types can only reach a `WebsiteContent` row via the initial fork from a `Template`, never via a subsequent user edit.
- Even though only admins author `custom_html`, the `html` string is still run through DOMPurify (or `rehype-sanitize`) server-side before storage — defense in depth against an admin's own mistake (e.g. pasting a snippet with a stray `<script>` from an untrusted source), not because admins are treated as adversarial.

If a genuine "let end users write custom sections" requirement emerges later, it needs its own locked-down mini-DSL or sanitized rich-text editor output (e.g. Tiptap JSON → safe render), not a raw-HTML passthrough extended to users. That is explicitly out of scope for this project as planned.

## Named animation components

For bespoke motion beyond what a generic `animation.preset` (`fade-up`, `scale-in`, `parallax`, ...) covers, `custom_html` blocks can reference a named component from a small, hand-built registry (e.g. `RoseGoldReveal`), matching the reference product's "cinematic opening" feel. This registry grows over time as new showcase templates are authored — it is the intended place for one-off bespoke visual ideas that don't warrant becoming a new general-purpose block type.

## Rendering contract

Every block component receives the same prop shape regardless of block type:

```ts
type BlockRenderProps<TProps> = {
  props: TProps;
  mode: "view" | "edit";
  websiteData: ResolvedWebsiteData; // for {{token}} interpolation
};
```

`mode: "edit"` adds selection outlines, click-to-select, and (for user-editable blocks) inline affordances; `mode: "view"` renders clean output for the public site. Both modes render through the *same* component — this mirrors the existing principle in `wedhub-frontend-app/components/wedding-website/WeddingWebsiteRenderer.tsx` that preview and published pages must share one render path, extended here to also cover the editor itself.
