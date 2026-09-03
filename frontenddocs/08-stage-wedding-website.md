# Stage 6 — ₹49 Instant Wedding Website (Frontend)

## Stage Goal

Build the public/couple-facing half of the ₹49 Instant Wedding Website product: the multi-step creation flow (template → details → events → photos → preview → payment → published), the temporary preview page, the permanent published wedding-website page, and a "Wedding Website" module inside the existing couple (`(couple)`) dashboard. The Telegram-bot half of this feature is backend-only scope (see `../docs/12-stage-wedding-website.md`) and has no frontend deliverable in this stage.

**Real deviation from the feature spec, confirmed with the user 2026-09-03**: the spec's own "Feature Entry Points" section lists two web-adjacent entry points — the chatbot and a vendor-dashboard module. The user explicitly confirmed only end users (couples) should get website creation from the web app — no vendor dashboard entry point was built. The backend's ownership model still supports a `VENDOR`-role user owning a `WeddingWebsite` (ownership keys on `User.id`, not `Vendor.id` — see `../docs/12-stage-wedding-website.md`'s Ownership decision), so this is a **UI entry-point decision only**, not a backend restriction — a vendor could still reach the flow via a direct URL or a future Telegram conversation, they just have no dashboard link to it.

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
- **Couple dashboard module pattern**: Server-Component page (parallel data fetch, no extra ownership guard needed beyond `(couple)/layout.tsx`'s existing `requireRole("END_USER")`) wrapping the shared `WeddingWebsiteWizard` client component inside `<CoupleShell activeHref="/wedding-website">`, matching `app/(couple)/shortlist/page.tsx`'s existing shape. New `navLinks` entry appended to `wedhub-frontend-app/components/shared/CoupleShell.tsx` (desktop nav only — not added to `bottomNavLinks`, to avoid crowding the 5-item mobile bottom bar).
- **Public route structure**: the temporary preview and permanent published pages are new top-level public routes (not nested under `(vendor)/` or `(admin)/`) — `app/(public)/preview/[token]/page.tsx` and `app/(public)/wedding/[slug]/page.tsx`, following the same `(public)` route-group convention as `/vendors/[slug]`, `/category/[categorySlug]`, etc.

## Included Screens (all new — no mockup to port)

1. **Wedding website creation wizard** — multi-step (Template → Details → Events → Photos → Preview → Payment → Published), progress indicator, mobile-first. ✅ Done 2026-09-03 (`components/wedding-website/WeddingWebsiteWizard.tsx`, shared by all entry points).
2. **Temporary preview page** (`/preview/[token]`) — renders via the same template renderer as the published page; shows "expired" or "already used" states when the token is invalid. ✅ Done 2026-09-03.
3. **Published wedding website page** (`/wedding/[slug]`) — the permanent, public, indexable page: hero, couple names, date, countdown, couple photo, events, venue + Maps link, couple story, gallery, RSVP form, share buttons. ✅ Done 2026-09-03.
4. **Couple dashboard "Wedding Website" module** (`(couple)/wedding-website`) — entry/creation flow if no website exists yet, and once created, the wizard resumes at the right step (management view: status, edit, change template, manage events/photos, copy/share URL). ✅ Done 2026-09-03. **Not a vendor dashboard module** — see the Stage Goal section's note on this deviation from the feature spec, confirmed with the user.
5. **Admin read-only visibility** — a small addition to an existing or new admin list view (count, owner, template, payment status, website status, dates) — no dedicated admin CRUD screen per the feature spec's explicit "do not build a large admin system" instruction. **Not yet built on the frontend** — the backend endpoint (`GET /admin/wedding-websites`) exists and was verified live, but no admin UI consumes it yet.

## Task Checklist

### Frontend Arch Phase 12 — Wedding Website Creation, Preview & Publishing
- [x] Wizard shell + step routing (template/details/events/photos/preview/payment/published), draft persisted server-side after every step — ✅ Done 2026-09-03. `WeddingWebsiteWizard.tsx` calls `PATCH`/the relevant sub-resource endpoint at every step transition; no client-only local-storage-backed draft state.
- [x] Template selection step — 3 templates (Royal Wedding, Minimal Elegant, Traditional Indian Wedding), switching template before payment does not lose entered data — ✅ Done 2026-09-03. Template is data-driven: one `WeddingWebsiteRenderer` + a per-template `theme.ts` (colors/fonts/decorative touches only), not 3 separate implementations, per the feature spec's explicit instruction.
- [x] Wedding details step (bride/groom name, date, time, venue, address, Maps link/URL, short description; optional parents/hashtag/contact) — ✅ Done 2026-09-03. Social links field deferred (backend schema supports it, no UI built for it yet — small gap, not blocking).
- [x] Events step — repeatable add/edit/delete (name, venue, description; date/time fields exist on the model but aren't in this pass's add form) — ✅ Done 2026-09-03, no hardcoded max (matches the backend, which also has none).
- [x] Photos step — cover photo, couple photo, gallery (multi-upload) — ✅ Done 2026-09-03. **A real shape mismatch was caught during research and avoided**: `wedding-website-media`'s confirm endpoint returns the raw `Media` row (`status` + object keys), not the admin uploader's precomputed `{status,url}` projection — the poll condition here correctly checks `status === "READY"` and resolves the display URL client-side via `getPublicMediaUrl`, rather than copying the admin precedent's `.data.url` check verbatim.
- [ ] Couple story step (story, bride/groom descriptions; optional how-we-met) — **not yet in the wizard as its own step**; the backend fields exist and the renderer displays them if set, but there's no wizard UI to enter them yet. Real gap, not deferred deliberately.
- [x] Preview generation — "Preview Website" button calls the one-time preview endpoint; UI reflects the one-preview-per-draft rule from the backend's actual response (`previewUsedAt`), never inferred client-side — ✅ Done 2026-09-03, verified live (real countdown, real expiry-triggered CTA switch).
- [x] `/preview/[token]` page — ✅ Done 2026-09-03, verified live: real render in preview mode, expired state shows the correct CTA and never the underlying content, `noindex, nofollow` confirmed present in the actual HTTP response.
- [x] Payment step — "Publish My Website – ₹49" triggers Razorpay Checkout.js (`PublishCheckoutButton.tsx`, adapted from `CheckoutButton.tsx`); success handler polls the real draft status rather than trusting the checkout callback — ✅ Done 2026-09-03, verified live against a real signed webhook.
- [x] `/wedding/[slug]` published page — ✅ Done 2026-09-03, verified live: full render, real `generateMetadata` (title/canonical/OG image from cover photo/`robots: index,follow`).
- [x] Sharing UI — copy-link, WhatsApp share, Facebook share, native Web Share API (progressive enhancement, hydration-safe capability detection) — ✅ Done 2026-09-03 (`ShareButtons.tsx`).
- [x] RSVP form on the published page — ✅ Done 2026-09-03, verified live (public submit, no auth).
- [x] **Couple dashboard** `(couple)/wedding-website` module — ✅ Done 2026-09-03. **Not the vendor dashboard module the checklist originally specified** — confirmed with the user that only end users get this entry point from the web app; see the Stage Goal section's deviation note. New `navLinks` entry in `CoupleShell.tsx` (desktop only).
- [x] `sitemap.ts` updated to include published wedding-website URLs — ✅ Done 2026-09-03. Needed a small new backend endpoint (`GET /wedding-websites/published`, public, minimal — slug + updatedAt only) since no existing endpoint could enumerate published slugs without admin auth; preview URLs are never included.
- [x] `robots.ts` — `/preview` added to `disallow` — ✅ Done 2026-09-03.

## Acceptance Criteria

- A user can complete the full wizard on mobile without any step breaking, refresh mid-wizard without losing entered data, generate exactly one preview, see it expire correctly, and publish via a real, backend-verified ₹49 payment — verified live (Playwright + manual mobile-viewport check), not just built.
- The preview page and the published page are provably rendered by the same component (verified by reading the actual code, not just visual similarity).
- No public route ever exposes draft-only data, owner identity, or payment details beyond what the published page itself intentionally shows.
- `noindex, nofollow` is verified present on every preview page response (real HTTP response inspection, not just "the code sets it").

## Dependencies / Sequencing

Hard-blocked on backend Arch Phase 26 shipping first (see Backend Dependency above). Independent of every other Frontend Arch Phase's remaining work (Frontend Arch Phase 11's structured-data/blog items) — may be scheduled in parallel with those once its own backend dependency clears.

## Open Questions

- **Entry point: resolved 2026-09-03, superseding the feature spec's own list.** The spec named the chatbot and a vendor-dashboard module as the two entry points. Confirmed with the user: only end users (couples) get the web creation flow — built under `(couple)/wedding-website`, not `(vendor)/vendor/*`. No public homepage CTA was added either (not asked for). Telegram remains the other real entry point, still unbuilt (schema support exists, no conversation wiring yet).
- **Couple story step is a real, undeliberate gap** — the wizard has no UI for `coupleStory`/`brideDescription`/`groomDescription`/`howWeMet` yet, though the renderer displays them if set via direct API calls. Needs its own step added to `WeddingWebsiteWizard.tsx`.
- **No mockup exists for this feature** — every screen's visual design is new, not ported. The visual direction taken: stay within the existing design-token palette (`app/globals.css`), one shared `WeddingWebsiteRenderer` + a per-template `theme.ts` for the 3 templates' visual variation (colors, font-family switch between serif/sans, decorative divider glyphs) rather than three separate component trees, per the feature spec's own "data-driven, not three independent applications" instruction.
- **Admin visibility screen** — still not built on the frontend. The backend endpoint (`GET /admin/wedding-websites`) exists and is verified live; decide at implementation time whether it's a small addition to an existing admin page or its own minimal list page.
