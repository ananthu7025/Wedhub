# Stage 5 — Growth & Hardening (Frontend)

## Stage Goal

Close the two remaining gaps between "the app works" and "the app is a production-ready, discoverable product": SEO page generation (blocked on backend Arch Phase 17) and Telegram surfacing (not blocked — trivial, backend Arch Phase 15 has been live since before this plan started). Also the natural place for a first real accessibility/performance pass across everything built in Stages 1–4, mirroring the backend plan's own Stage 7 (Growth & Scale) shape, though narrower — this frontend plan does not attempt to originate frontend equivalents of backend Arch Phases 19–25 (security hardening, testing, observability, deployment, DR, performance, production review), since those are largely backend/infra concerns already covered by the backend's own Stage 7. Where a frontend-specific equivalent genuinely matters (e.g. Core Web Vitals, frontend error tracking), it's folded into this stage rather than given a false sense of a full parallel 8-phase breakdown.

## Included Frontend Arch Phases

- **Frontend Arch Phase 11** — Telegram Surfacing, SEO & Production Hardening

## Product Roadmap Cross-Reference

Maps to product.md §3.5 ("SEO is a first-class acquisition channel") and Product Phase 7 (Growth), plus the Telegram half of Product Phase 6.

## Backend Dependency

- Telegram surfacing: Arch Phase 15 (Telegram Bot MVP) ✅ Done — no blocker.
- SEO page generation: Arch Phase 17 (CMS & SEO Backend) 🟡 In Progress per `../docs/11-progress-log.md` — the category/city/category+city page-generation slice shipped 2026-09-03 (unblocks 11b below); the blog/article content model shipped 2026-09-04 (see below); FAQs/static-pages content models remain unbuilt, see [Open Question 1](10-risks-and-open-questions.md#1-frontend-arch-phase-11-partially-blocked-on-backend-arch-phase-17).

## Included Mockup Screens

None new for Telegram surfacing (the "Chat on Telegram" CTA already exists in `couple/home.html` and `couple/vendor-profile.html` from Stage 2 — this phase just confirms it's a real, correctly-configured deep link, not new UI). SEO pages have **no mockup** — the 34-screen mockup covered app screens only, not marketing/content pages, so this sub-effort designs and builds genuinely new screens once backend Arch Phase 17's shape is known.

## Task Checklist

### Frontend Arch Phase 11a — Telegram Surfacing (not blocked, schedule any time in Stage 5)
- [ ] Confirm the real bot username (`wedhub-backend/.env`'s `TELEGRAM_BOT_TOKEN` resolves to `@VendorMatefinderBot` per prior backend work — verify this is still the intended production bot, or whether a rename is planned before launch) and set `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` accordingly
- [ ] Verify the deep-link format (`https://t.me/<bot_username>`) actually opens the bot and that the bot's `/start` flow works end-to-end from a fresh Telegram account (manual verification, not just "the link is well-formed")
- [ ] Confirm whether any deep-link parameters should be passed (e.g. `?start=<vendor_id>` to pre-seed the bot's conversation with a specific vendor context, if `wedhub-backend/src/modules/telegram/` supports start-parameter handling) — check the backend source, don't assume

### Frontend Arch Phase 11b — SEO Page Generation
- [x] **Category landing pages** — ✅ Done 2026-09-03. `/category/[categorySlug]`, server-rendered, real `generateMetadata` (title, description, canonical, OG, robots) from the backend's `GET /seo/page`.
- [x] **Location + category+city landing pages** — ✅ Done 2026-09-03. `/city/[citySlug]` and `/category/[categorySlug]/[citySlug]`, same pattern. Not literally `/[category]/[city]` under `/vendors` — that collides with the already-shipped `/vendors/[slug]` vendor-detail route (two differently-named dynamic segments can't share a route level in Next.js, and 14+ files already link to `/vendors/[slug]`); `/category`/`/city` are the equivalent non-colliding routes actually implemented. See `../docs/09-stage-growth-and-scale.md` Arch Phase 17 for the full write-up.
- [ ] Structured data (schema.org `Service`/`LocalBusiness` markup) on the landing pages — not yet added, deferred (no user decision yet on scope/priority for this on top of the base metadata work).
- [x] **Blog/guides pages** — ✅ Done 2026-09-04. Backend Arch Phase 17's `BlogPost` model + `/blog` public endpoints shipped, unblocking this item. Real `/blog` list page (paginated, published-only) and `/blog/[slug]` detail page (real `generateMetadata` from `seoTitle`/`seoDescription`/`coverImageUrl`, `notFound()` on a missing/unpublished slug, same pattern as `/category/[categorySlug]`), body rendered via the new `react-markdown` dependency (v10.1.0). Homepage's `LATEST_BLOGS` hardcoded array replaced with a real `listFeaturedBlogPosts()` call, teaser section now hides itself when empty. Admin authoring UI: `BlogPostsBoard.tsx` (with a Markdown Preview toggle) + `BlogCoverImagePicker.tsx`, wired into `/admin/cms`. "Guides" specifically (a distinct content type from Blog per product.md §39's "Blog, Guides, FAQs, Banners" enumeration) has no dedicated model of its own — treated as the same `BlogPost` model/routes for now, no separate Guides UI; revisit if a real product need for a distinct Guides shape emerges.
- [x] **Sitemap generation** — ✅ Done 2026-09-03. `app/sitemap.ts`, sourced from the backend's `GET /seo/combinations` (every indexable category/city/category+city combination — thin combinations, below `MIN_VENDORS_FOR_INDEXABLE_PAGE = 3`, are excluded).
- [x] **`robots.txt`, canonical URLs, OG metadata** — ✅ Done 2026-09-03 on the three new landing page types (`app/robots.ts`, `alternates.canonical`, `openGraph`, `robots` meta via `metadataBase` added to the root layout). Not yet retrofitted onto Stage 2's existing public pages (home, search, vendor profile) beyond `/vendors/[slug]`'s pre-existing title/description — Twitter card metadata also not added anywhere yet. Both remain open follow-ups, not done in this pass.
- [x] Admin SEO override UI — ✅ Done 2026-09-03. `/admin/seo`, lets an admin override one specific combination's title/description/OG image/indexability; separate from `/admin/cms` (homepage content curation) since these are generated pages, not curated content. `(admin)/cms.html`'s Pages/Guides/FAQs/Banners placeholders remain (Blog shipped 2026-09-04, see above and removed from the stub list on `/admin/cms`) — Pages/Guides/FAQs/Banners are still blocked on their own content models, not on this SEO work.

### Frontend Arch Phase 11c — Production Hardening
- [ ] Accessibility pass across all four stages' shipped screens: keyboard navigation, focus management in modals, form label associations, color-contrast check against the crimson/jet-black palette (verify AA contrast, especially crimson-on-white body text and badge text)
- [ ] Performance pass: Core Web Vitals on the highest-traffic public pages (home, search, vendor profile) — image optimization via `next/image` actually configured correctly (not just present), bundle-size check, Server Component usage audit (confirm nothing that could be a Server Component was accidentally left as a Client Component)
- [ ] Error boundary / `error.tsx` coverage per route group, not just a global catch-all
- [ ] Cross-browser/cross-device smoke pass at minimum on the 900px breakpoint the entire design system is built around

See [`11-progress-log.md`](11-progress-log.md#frontend-arch-phase-11--telegram-surfacing-seo--production-hardening) for the full write-up once complete.

## Acceptance Criteria

- The "Chat on Telegram" CTA genuinely opens a working bot conversation, verified manually.
- SEO pages (once unblocked) are server-rendered, indexable, and pass a basic Lighthouse SEO audit. Category/City/Category+City landing pages and the Blog list/detail pages meet this now; static pages/FAQs don't exist yet to evaluate.
- Sitemap and robots.txt are real and reflect actual site content, not static placeholders. The sitemap now also includes every published blog post's URL (2026-09-04), alongside the category/city combinations and wedding-website slugs already there.
- Point 16 of the Definition of a Successful MVP checklist (`02-mvp-cut-line.md`) — "SEO pages can generate organic traffic" — becomes achievable once this sub-phase completes; it is explicitly not achievable before backend Arch Phase 17 ships, and that's fine, not a failure of this plan.

## Dependencies / Sequencing

Requires Stages 1–4 complete (this is explicitly the last stage in the recommended build order). Frontend Arch Phase 11a (Telegram) has no blocker and can be done any time after Stage 2. Frontend Arch Phase 11b (SEO) is hard-blocked on backend Arch Phase 17 and should not be started speculatively. Frontend Arch Phase 11c (Hardening) is best done last, once there's a full surface to harden, but individual items (accessibility, image optimization) can reasonably be pulled forward into earlier stages if a reviewer flags a specific issue — this stage is where a *systematic* pass happens, not the only place fixes are allowed.

## Open Questions

- [Open Question 1](10-risks-and-open-questions.md#1-frontend-arch-phase-11-partially-blocked-on-backend-arch-phase-17) — the central open question for this entire stage. Re-check `../docs/11-progress-log.md` before scheduling Frontend Arch Phase 11b.
