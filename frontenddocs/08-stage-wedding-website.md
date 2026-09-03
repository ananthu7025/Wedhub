# Stage 6 — ₹49 Instant Wedding Website (Frontend)

## Stage Goal

Build the public/vendor-facing half of the ₹49 Instant Wedding Website product: the multi-step creation flow (template → details → events → photos → preview → payment → published), the temporary preview page, the permanent published wedding-website page, and a "Wedding Website" module inside the existing vendor dashboard. The Telegram-bot half of this feature is backend-only scope (see `../docs/12-stage-wedding-website.md`) and has no frontend deliverable in this stage.

## Included Frontend Arch Phases

- **Frontend Arch Phase 12** — Wedding Website Creation, Preview & Publishing

## Origin and Numbering

Mirrors the backend's `../docs/12-stage-wedding-website.md` — this feature originates from a standalone feature spec ([`../wedhub_49_wedding_website_feature.md`](../wedhub_49_wedding_website_feature.md), supplied 2026-09-03), not from `product.md` or the 34-screen approved mockup (`../wedhub-frontend/`). **There is no mockup screen for this feature** — every screen in this stage is new UI with no existing visual reference to port from, unlike every prior Frontend Arch Phase. Design should follow the feature spec's own explicit UI/UX guidance (premium-feeling despite the low price, elegant wedding visuals, strong typography, large mobile-friendly buttons, minimal form friction) and this codebase's existing design system/component library — not invent a new visual language from scratch.

## Product Roadmap Cross-Reference

No existing Product Phase — parallel, standalone scope, same as the backend stage file.

## Backend Dependency

Backend Arch Phase 26 (`../docs/12-stage-wedding-website.md`) — **hard blocker**, not started as of this file's creation (2026-09-03). Do not begin frontend implementation until Arch Phase 26 has at minimum: draft CRUD, template listing, preview generation/read, Razorpay order-creation + webhook publish, and the published-website read endpoint — re-read that stage file's actual shipped API surface before writing any API client code, per this docs set's standing discipline (never build against an assumed backend shape).

## Existing Frontend Infrastructure Reused

Per the feature spec's "Inspect Before Coding" requirement, applied to the frontend specifically:

- **Upload pattern**: `wedhub-frontend-app/app/(admin)/admin/cms/VendorPhotoUploader.tsx`'s presign→PUT→confirm→poll-until-`READY` client pattern (built 2026-09-03 for admin cold-start photo seeding) is the closest existing precedent for a non-admin, owner-driven photo upload widget — reused/adapted, not reinvented.
- **Payment checkout**: `wedhub-frontend-app/app/(vendor)/vendor/subscription/CheckoutButton.tsx` — the existing Razorpay Checkout.js integration pattern (order creation → Razorpay modal → verify). Reused for the ₹49 "Publish My Website" button.
- **SEO metadata pattern**: `wedhub-frontend-app/app/(public)/category/[categorySlug]/page.tsx`'s `generateMetadata` (title/description/canonical/OG/robots, `metadataBase` already configured at the root layout) — followed for the published wedding-website page. The preview page instead hardcodes `robots: { index: false, follow: false }` unconditionally, with no `generateMetadata`-derived indexability flag (a preview must never be indexable, full stop — no conditional to get wrong).
- **Vendor dashboard module pattern**: Server-Component page (auth + parallel data fetch) wrapping a client `*Board.tsx`/`*Manager.tsx` component inside `<VendorShell activeHref="...">`, exactly as `vendor/subscription/page.tsx` and every other vendor module already does. New `navLinks` entry appended to `wedhub-frontend-app/components/shared/VendorShell.tsx`.
- **Public route structure**: the temporary preview and permanent published pages are new top-level public routes (not nested under `(vendor)/` or `(admin)/`) — `app/(public)/preview/[token]/page.tsx` and `app/(public)/wedding/[slug]/page.tsx`, following the same `(public)` route-group convention as `/vendors/[slug]`, `/category/[categorySlug]`, etc.

## Included Screens (all new — no mockup to port)

1. **Wedding website creation wizard** — multi-step (Template → Details → Events → Photos → Preview → Payment → Published), progress indicator, mobile-first.
2. **Temporary preview page** (`/preview/[token]`) — renders via the same template renderer as the published page; shows "expired" or "already used" states when the token is invalid.
3. **Published wedding website page** (`/wedding/[slug]`) — the permanent, public, indexable page: hero, couple names, date, countdown, couple photo, events, venue + Maps link, couple story, gallery, RSVP form, share buttons.
4. **Vendor dashboard "Wedding Website" module** (`(vendor)/vendor/wedding-website`) — entry card/CTA, and once created, a management view (status, edit, change template, manage events/photos, view RSVPs, copy/share URL).
5. **Admin read-only visibility** — a small addition to an existing or new admin list view (count, owner, template, payment status, website status, dates) — no dedicated admin CRUD screen per the feature spec's explicit "do not build a large admin system" instruction; likely a small new section on `(admin)/admin/dashboard` or its own minimal `(admin)/admin/wedding-websites` list page, decided at implementation time once the backend's admin read endpoint shape is known.

## Task Checklist

### Frontend Arch Phase 12 — Wedding Website Creation, Preview & Publishing
- [ ] Wizard shell + step routing (template/details/events/photos/preview/payment/published), draft persisted server-side after every step (per Business Rule "user should not lose entered information on refresh/close/abandon" — no client-only local-storage-backed draft state that could silently diverge from the server's `WeddingWebsite` row)
- [ ] Template selection step — 3 templates (Royal Wedding, Minimal Elegant, Traditional Indian Wedding), switching template before payment must not lose entered data (template is just a column on the same draft row)
- [ ] Wedding details step (bride/groom name, date, time, venue, address, Maps link/URL, short description; optional parents/hashtag/contact/social links) with required-field validation
- [ ] Events step — repeatable add/edit/delete (name, date, time, venue, description), no hardcoded max unless the backend defines one
- [ ] Photos step — cover photo, couple photo(s), gallery — reuses the upload pattern above; client-side file-type/size validation mirroring the backend's own limits (read `WEDDING_WEBSITE_PHOTO`'s actual size cap from the backend once built, do not assume it matches the vendor-portfolio image cap)
- [ ] Couple story step (story, bride/groom descriptions; optional how-we-met)
- [ ] Preview generation — "Preview Website" button calls the one-time preview endpoint; UI must correctly reflect the one-preview-per-draft rule (disabled/relabeled once `previewUsedAt` is set, per the backend's actual response — never inferred client-side)
- [ ] `/preview/[token]` page — renders the real template renderer in preview mode; expired/already-invalid states show the "Your preview has expired" copy + Publish CTA per the feature spec, never the underlying website content
- [ ] Payment step — "Publish My Website – ₹49" triggers the reused Razorpay Checkout.js flow; success handler does **not** mark the website published client-side — it only triggers a re-fetch of the draft's real status (the webhook is the actual publisher, same discipline as the existing subscription checkout flow)
- [ ] `/wedding/[slug]` published page — full render (hero, countdown, events, venue+Maps, gallery, story, RSVP form, share buttons), real `generateMetadata` (title/description/canonical/OG image from cover photo/robots: index,follow)
- [ ] Sharing UI — copy-link, WhatsApp share (`https://wa.me/?text=...`), Facebook share, native Web Share API where supported (progressive enhancement, not a hard requirement)
- [ ] RSVP form on the published page (name, attending Yes/No/Maybe, guest count, message) — public, no auth required, submits to the backend's public RSVP endpoint
- [ ] Vendor dashboard `(vendor)/vendor/wedding-website` module — entry CTA if no website exists yet; management view once one does (status badge: Draft/Preview Used/Payment Pending/Published; edit, change template, manage events/photos, view RSVPs, copy/share)
- [ ] `sitemap.ts` updated to include published wedding-website URLs (reusing the existing `listSeoCombinations()`-style pattern — a new backend endpoint enumerating published slugs, or extended `/seo/combinations`, decided once the backend module exists) — preview URLs must never appear here
- [ ] `robots.ts` — confirm `/preview` is added to the `disallow` list as defense-in-depth beyond the per-page `noindex` meta tag

## Acceptance Criteria

- A user can complete the full wizard on mobile without any step breaking, refresh mid-wizard without losing entered data, generate exactly one preview, see it expire correctly, and publish via a real, backend-verified ₹49 payment — verified live (Playwright + manual mobile-viewport check), not just built.
- The preview page and the published page are provably rendered by the same component (verified by reading the actual code, not just visual similarity).
- No public route ever exposes draft-only data, owner identity, or payment details beyond what the published page itself intentionally shows.
- `noindex, nofollow` is verified present on every preview page response (real HTTP response inspection, not just "the code sets it").

## Dependencies / Sequencing

Hard-blocked on backend Arch Phase 26 shipping first (see Backend Dependency above). Independent of every other Frontend Arch Phase's remaining work (Frontend Arch Phase 11's structured-data/blog items) — may be scheduled in parallel with those once its own backend dependency clears.

## Open Questions

- **No mockup exists for this feature** — every screen's visual design is new, not ported. Confirm the general visual direction (reuse existing design tokens/components, follow the feature spec's "premium despite ₹49" guidance) before or during implementation rather than after several screens are already built in a possibly-wrong direction.
- **Vendor dashboard entry point vs. public/couple entry point** — the feature spec requires two entry points (chatbot, vendor dashboard) but does not explicitly require a *public, non-vendor, non-Telegram* web entry point (e.g. a "Create Your Wedding Website" CTA reachable from the public homepage for a couple who isn't a vendor and isn't using Telegram). Given the backend's ownership design already supports a plain `END_USER` creating one (`../docs/12-stage-wedding-website.md`'s Ownership decision), confirm whether this stage should also add a public homepage entry point, or whether "vendor dashboard + Telegram only" is the intended v1 surface — the feature spec's own "Feature Entry Points" section only lists those two, so default to **not** adding a third public entry point unless confirmed otherwise.
- **Admin visibility screen location** — decide at implementation time (small addition to an existing admin page vs. a new minimal one) once the backend's actual admin read endpoint shape is known; do not build ahead of that.
