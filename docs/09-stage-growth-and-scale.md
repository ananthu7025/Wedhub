# Stage 7 — Growth & Scale

## Stage Goal

Grow organic acquisition (SEO/CMS/analytics) and harden the platform for real production traffic (security, testing, observability, deployment, backup, performance, final review). Also the designated home for forward-looking Post-MVP placeholders that have no architecture.md phase yet.

## Included Architecture Phases

- **Arch Phase 17** — CMS & SEO Backend
- **Arch Phase 18** — Analytics & Marketplace Metrics
- **Arch Phase 19** — Security Hardening
- **Arch Phase 20** — Testing
- **Arch Phase 21** — Observability
- **Arch Phase 22** — Docker & Deployment
- **Arch Phase 23** — Backup & Disaster Recovery
- **Arch Phase 24** — Performance Optimization
- **Arch Phase 25** — Production Readiness Review

## Product Roadmap Cross-Reference

**Product Phase 7 — Growth** (product.md §70: CMS, blog, city pages, analytics, SEO expansion) maps to Arch Phases 17 + 18. **Product Phase 8 — Scale** (product.md §70: Redis, workers, search engine, read replicas, CDN optimization, load testing) maps to Arch Phases 19–25 collectively — but note the breadth mismatch: product.md's "Scale" description is infra-scaling-only, while architecture.md's 19–25 is broader (also security, testing, DR, and final review — "harden and operationalize," not just infra scaling).

## Included Product Concerns

- SEO strategy: primary page combinations (Category, City, Category+City; future Style+Category+City); avoid thin pages — only index pages with useful content and meaningful vendor inventory; every indexable page needs unique title, meta description, canonical, H1, intro, listings, FAQs, breadcrumbs, structured data; segmented sitemaps — product.md §44.
- CMS content types: city guides, vendor guides, planning articles, category pages, FAQs, landing pages, promotional content — product.md §43.
- Full analytics event taxonomy — platform level (page view, search, filter, vendor impression/click/profile view, portfolio view, favorite, shortlist, enquiry started/completed, lead created, vendor response, subscription view, checkout started, payment completed, upgrade, cancellation) and vendor level (impressions, profile views, enquiries, leads, response rate/time, conversion) — product.md §46.
- Scalability targets: 10,000 daily visitors, thousands of vendors, millions of media objects, large portfolios, high search traffic, high enquiry volume; stateless application servers; scaling path `1 API instance → many`, `1 worker → many`, `Postgres primary → read replicas`, `Postgres search → dedicated engine`, `R2 → CDN` — product.md §63.
- Security/privacy/abuse-prevention requirements not already covered by [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md) — account deletion, data export, marketing/notification preferences, privacy settings; lead contact info visible only to authorized recipients — product.md §51.
- Critical business metrics and the North Star metric: *"Qualified wedding enquiries successfully connected to suitable vendors"*, with *"Vendor-generated booking opportunities per active vendor"* as a supporting metric — product.md §68–69. This stage is the measurement layer that makes these metrics observable.

## Post-MVP / Product Phase 9 placeholder (explicitly not a task checklist)

The following are captured in product.md but have **zero corresponding architecture.md phase** today (see [Risk 5](10-risks-and-open-questions.md#5-pay-per-lead-has-no-architecture-phase)). This subsection exists so the docs set does not pretend these requirements were considered and dropped — they were captured and deliberately deferred by product.md itself:

- WhatsApp integration (product.md §37)
- AI Wedding Assistant / natural-language search / automated lead qualification (product.md §38)
- Pay-per-lead billing (product.md §31–32) — **when prioritized, this requires defining new Arch Phase(s) beyond the current 26; do not invent one speculatively now.**
- Booking/commission, vendor CRM, native mobile apps (product.md §67, §72)

**This actually happened once already**: the ₹49 Instant Wedding Website is a new, standalone monetized feature that arrived outside both `product.md` and `wedhub_backend_architecture.md` (from a separate feature spec, 2026-09-03) — exactly the scenario this subsection anticipated for pay-per-lead/WhatsApp/AI-assistant. It got its own new Stage 8 file ([`12-stage-wedding-website.md`](12-stage-wedding-website.md)) defining Arch Phase 26, rather than being folded into this file or invented speculatively here. Use that file as the template if/when pay-per-lead or another post-MVP item above is actually prioritized.

## Task Checklist

*(Longest checklist of any stage by nature of covering 9 architecture phases — kept in one file per the "not one-file-per-phase" structural decision, since none of these 9 phases has enough independent content to justify its own file.)*

### Arch Phase 17 — CMS & SEO Backend ✅ Done 2026-09-04 (static pages/FAQs descoped — see note below)
- [x] **City pages, category pages, category+city pages** — ✅ Done 2026-09-03. Generated from a template (real `Category`/`Location` names + a live vendor count from the same real-vendor gate `/search/vendors` uses — `status: APPROVED`, not soft-deleted) rather than hand-authored per combination, since there can be hundreds of real combinations. New `seo` backend module: public `GET /seo/page?categoryId=&cityId=` (computed title/H1/description/canonical/OG fields/`indexable`/`vendorCount`) and `GET /seo/combinations` (every indexable combination, backs the sitemap). New `SeoOverride` model (admin CRUD at `/admin/seo-overrides`) lets an admin hand-override one specific combination's title/description/OG image/indexability — mirrors the existing `VendorProfile.seoTitle` override-over-a-computed-default pattern. Frontend: new `/category/[categorySlug]`, `/category/[categorySlug]/[citySlug]`, `/city/[citySlug]` routes with real `generateMetadata` (title, description, canonical, OG, robots) and real vendor listings (reuses `/search/vendors`), plus `/admin/seo` admin UI. Not literally `/vendors/<category>/<city>` per architecture.md's example routes — that collides with the already-shipped `/vendors/[slug]` vendor-detail route (Next.js forbids two differently-named dynamic segments at the same route level, and 14+ files already link to `/vendors/[slug]`); `/category` and `/city` are the equivalent non-colliding routes actually implemented.
- [x] **Vendor SEO metadata** — already existed (`VendorProfile.seoTitle`/`seoDescription`/`canonicalUrl`, Arch Phase 5) and is already consumed by `/vendors/[slug]`'s `generateMetadata`; noted here only so this phase's checklist doesn't imply it's still open.
- [x] **Internal linking metadata, canonical URL fields, meta title/description, OG title/description/image** — ✅ Done 2026-09-03, as part of the category/city page work above. Breadcrumbs (Home / Category / City) render on every SEO landing page as the internal-linking element.
- [x] **Sitemap data, indexability status** — ✅ Done 2026-09-03. `MIN_VENDORS_FOR_INDEXABLE_PAGE = 3` (product.md §44's "avoid thin pages" — a combination below this count still renders normally for visitors but is marked `noindex` and excluded from the sitemap). New `wedhub-frontend-app/app/sitemap.ts` (single sitemap for now — real inventory is far under the 50,000-URL segmentation threshold) and `app/robots.ts`, both backed by `GET /seo/combinations`. Also added `metadataBase` (`NEXT_PUBLIC_SITE_URL`) to the root layout, needed for `alternates.canonical`/OG URLs to resolve — nothing set this before.
- [x] **"Real Wedding Stories" content** — ✅ Done 2026-09-04. Turned out not to need an independent content model at all: a new `WeddingStory` model references a real, public `Album` (already belongs to a real `Vendor` with real photos) plus the narrative fields an Album doesn't have (couple names, location, tag, snippet). Full admin CRUD (`/admin/wedding-stories`) + public `GET /wedding-stories/featured/homepage`, wired into the homepage replacing the hardcoded `REAL_WEDDING_STORIES` array. Supersedes an earlier 2026-09-03 decision to keep this section static — see `frontenddocs/10-risks-and-open-questions.md` Open Question 21's follow-up note.
- [x] **Curated "Popular Searches" / trending-search content model** — ✅ Done 2026-09-04. Resolved as editorial (admin-curated), not analytics-driven — Arch Phase 18 (Analytics & Marketplace Metrics) doesn't exist yet, so there's no real search-volume signal to derive "popular" from. Unlike wedding stories/gallery below, no existing real entity (Album/Media) to curate over — a genuinely standalone new `PopularSearchCard` model (`id`, `title`, `locationBlurb`, `priceLabel`, `imageUrl`, `searchQuery`, `isFeatured`, `sortOrder`), following the `Category.imageUrl` precedent for its image field (plain nullable `String` url, not a `Media` relation, since there's no owning vendor). A new small, additive `MediaType.POPULAR_SEARCH_IMAGE` enum value (migration `20260904085052_add_popular_search_cards`, same shape as the `CATEGORY_IMAGE` precedent) backs its admin upload pipeline: `POST /admin/media-uploads/popular-search-image-upload-requests` + `.../:id/confirm`, parallel to the existing category-image routes (kept separate rather than reusing `CATEGORY_IMAGE`, so admin-media's per-mediaType confirm checks stay unambiguous). Full admin CRUD at `/admin/popular-searches` + public `GET /popular-searches/featured/homepage`, wired into the homepage replacing the hardcoded `POPULAR_SEARCH_CARDS` array; the section now hides itself entirely when no cards are curated (same as Featured Vendors), rather than rendering an empty grid — no fixed-slot/sample-fallback here since there's no real entity to sample from and per-card content would be fully fabricated. Admin UI: `PopularSearchCardsBoard.tsx` + `PopularSearchImagePicker.tsx` in `wedhub-frontend-app/app/(admin)/admin/cms/`, alongside `WeddingStoriesBoard`/`FeaturedMediaBoard`. Ships with zero rows — no fabricated sample cards in the migration or seed data.
- [x] **Inspiration gallery** — ✅ Done 2026-09-04. Same resolution as wedding stories: sourced from real vendor portfolio `Media` instead of a separate CMS model. A new `FeaturedMedia` model lets an admin curate specific, already-approved `Media` rows; category comes from the media's vendor's real primary `VendorCategory`, no separate category field needed. Full admin CRUD (`/admin/featured-media`) + public `GET /gallery/featured/homepage`, wired into `GalleryInspiration.tsx` replacing the hardcoded `GALLERY_ITEMS` array.
- [x] **Blog/article content model** — ✅ Done 2026-09-04, the last item of this phase. Same standalone-editorial resolution as Popular Searches above (no existing entity to curate over — a blog post is genuinely new content): new `BlogPost` model (`id`, `title`, `slug` unique auto-generated from title via the existing `slugify`/`generateUniqueSlug` utility when not admin-supplied, `category` free-text tag, `coverImageUrl`, `excerpt`, `bodyMarkdown`, `readTimeMinutes`, `publishedAt` nullable — null=draft/set=published, doubling as the only publish mechanism via a plain `PATCH`, no separate publish endpoint — `isFeatured`, `sortOrder`, `seoTitle`/`seoDescription` overrides falling back to title/excerpt). A new small, additive `MediaType.BLOG_COVER_IMAGE` enum value (migration `20260904090914_add_blog_post`, same shape as `CATEGORY_IMAGE`/`POPULAR_SEARCH_IMAGE`) backs its admin upload pipeline: `POST /admin/media-uploads/blog-cover-image-upload-requests` + `.../:id/confirm`. Public endpoints: `GET /blog/featured/homepage` (top 6 featured+published, replacing the hardcoded `LATEST_BLOGS` array), `GET /blog` (published-only, paginated, most-recent-first), `GET /blog/:slug` (published-only — a draft slug 404s, never leaked). Full admin CRUD at `/admin/blog`. Body content is authored as Markdown (`bodyMarkdown`, plain text column) and rendered client-side via `react-markdown` (new dependency, v10.1.0) — no rich-text/HTML sanitization pipeline needed. Frontend: real `/blog` list page and `/blog/[slug]` detail page (real `generateMetadata` from `seoTitle`/`seoDescription`/`coverImageUrl` with `notFound()` on a missing/unpublished slug, same pattern as `/category/[categorySlug]`), homepage teaser section now hides itself when empty (same convention as Popular Searches) instead of always rendering. Admin UI: `BlogPostsBoard.tsx` (with a Markdown Preview toggle) + `BlogCoverImagePicker.tsx` in `wedhub-frontend-app/app/(admin)/admin/cms/`. Sitemap (`app/sitemap.ts`) now includes every published post's URL. Ships with zero rows — no fabricated posts in the migration or seed data.
- **Static pages / FAQs — descoped from this phase, 2026-09-04 (explicit user decision):** genuinely unbuilt (no model, no endpoints — confirmed distinct from Blog, which covers dated/authored articles, not static About/Terms/Privacy-style pages or a Q&A FAQ structure). Unlike every other item in this phase, nothing on the live site currently renders a hardcoded static-page or FAQ array that this would replace, so closing Arch Phase 17 without it doesn't leave a known-fake UI element in place. Tracked as a standalone backlog item — pick it up as its own small scope (likely a `StaticPage`/`Faq` model + admin CRUD + a catch-all `/[slug]` or dedicated `/faq` public route, following this phase's now-established pattern) whenever prioritized, rather than continuing to gate this phase's completion on it.
- These items were found by cross-referencing the public homepage's actual rendered content against this checklist during a 2026-09-03 UI redesign pass — not previously itemized at this level of detail. They are additions to this existing phase's scope, not a new phase (per this file's own Post-MVP section note: don't invent new Arch Phases speculatively).
- **Small, real backend additions needed along the way (2026-09-04)**: neither the wedding-stories nor gallery admin curation screens were buildable without a way for an admin to browse real data across all vendors first — no such cross-vendor listing existed. Added `GET /admin/albums` (all real public albums, any vendor) and `GET /admin/media/approved` (all real approved media, any vendor), both small additions to the already-real `albums`/`media` modules, not new scope of their own.
- **Cold-start gap fixed (2026-09-03)**: both curation screens correctly show nothing until a real vendor has real approved photos — by design, not a bug. But on a fresh platform with zero/few vendors, there is nothing to curate yet (chicken-and-egg). Fixed by giving admin the ability to seed real content directly, still tied to a real vendor (never fabricated): `POST /admin/media-uploads/vendor-upload-requests` + `.../confirm` (admin uploads a real photo onto a chosen vendor's profile — same R2 presign→PUT→confirm pipeline as the vendor's own upload flow, auto-`APPROVED` since it's admin-sourced, skips the vendor's plan/entitlement limit check but the resulting `Media` row counts toward that limit going forward) and `POST /admin/albums` + `PATCH /admin/albums/:id` (admin creates/updates an album on a vendor's behalf, e.g. to set a cover). Frontend: `VendorPhotoUploader.tsx` (shared upload widget) wired into both `WeddingStoriesBoard.tsx` ("Create a new album from a vendor photo" — creates album, uploads photo, sets it as cover, in one flow) and `FeaturedMediaBoard.tsx` ("upload a photo for a vendor" fallback in the empty picker state, auto-features on success).
- **Homepage fixed-slot sample fallback (2026-09-03)**: separately from the admin-seeding fix above, the public homepage's "Real Wedding Stories" and "Gallery Inspiration" sections now always render a fixed number of cards (6 each) — real entries fill first, sample/placeholder cards (the original static content from before either section went live) fill any remaining slots, with zero visual distinction between real and sample cards per explicit user decision. As real entries are added, they displace samples one-for-one; once 6+ real entries exist for a section, zero samples render. Implemented via `fillWeddingStorySlots()`/`fillGallerySlots()` in `wedhub-frontend-app/app/(public)/page.tsx` / `components/shared/GalleryInspiration.tsx`, both mapping real and sample data into one normalized display shape so the card-rendering JSX never branches on real-vs-sample. Sample cards link to `/search` (no real vendor to link to); real cards link to the real vendor's profile. This is presentation-layer fallback only — no new backend model, no fabricated database rows.
- **Resolved the same day, NOT part of this phase**: the homepage's per-category image and "Starting at ₹X" price (used by the category carousel and bento grid) turned out not to be CMS content at all — just curation on top of the already-real `Category` model. Resolved by adding `imageUrl`/`isFeaturedOnHomepage`/`homepageSortOrder`/`startingPriceLabel` directly to `Category` (Arch Phase 4, already-shipped Category module) plus a public `GET /categories/featured/homepage` endpoint and admin write support — see [`03-stage-foundation.md`](03-stage-foundation.md) and `frontenddocs/10-risks-and-open-questions.md` Open Question 21. Mentioned here only so a future reader doesn't assume it's still an open Arch Phase 17 gap.

### Arch Phase 18 — Analytics & Marketplace Metrics
- [ ] Event tracking across the full funnel: visitor → search → vendor view → enquiry → lead → contact → qualified → won
- [ ] Search-to-profile rate, profile-to-enquiry rate, enquiry-to-contact rate, lead response/conversion rate
- [ ] Subscription conversion, revenue tracking, featured-listing performance
- [ ] Vendor analytics, admin analytics

### Arch Phase 19 — Security Hardening
- [ ] Dependency audit, security headers, CORS restrictions
- [ ] Input validation audit, authorization audit, file-upload security, webhook security
- [ ] Secret rotation procedure, password policy, session revocation, admin MFA foundation
- [ ] Audit-log verification, abuse detection, spam protection, SQL/query review, production error redaction

### Arch Phase 20 — Testing
- [ ] Test framework, test database
- [ ] Unit suite (services, policies, validators, ranking, entitlement logic, lead dedupe, subscription state transitions)
- [ ] Integration suite (DB operations, auth, vendor workflow, enquiries, leads, payments, reviews)
- [ ] E2E suite: user registration → vendor discovery → enquiry → lead; vendor registration → approval → subscription → lead; Telegram → enquiry → lead
- [ ] API contract tests, regression tests, coverage reporting

### Arch Phase 21 — Observability
- [ ] Structured logs, request IDs, error tracking, performance metrics
- [ ] Database monitoring, queue monitoring
- [ ] `/health`, `/health/live`, `/health/ready` endpoints, external provider monitoring, alerting

### Arch Phase 22 — Docker & Deployment
- [ ] Dockerfile (multi-stage), Docker Compose for development, production container
- [ ] PostgreSQL backup strategy, environment configuration, Nginx/Caddy, HTTPS, Cloudflare configuration
- [ ] CI pipeline, CD pipeline, database migration deployment, rollback strategy

### Arch Phase 23 — Backup & Disaster Recovery
- [ ] Automated PostgreSQL backups, backup retention, off-server backup
- [ ] R2 versioning where appropriate
- [ ] Restore test, DR documentation, migration backup procedure, incident recovery runbook

### Arch Phase 24 — Performance Optimization
- [ ] API latency monitoring, slow-query logging, database query analysis, index optimization
- [ ] Pagination optimization, cache hot data, Redis caching where useful, CDN optimization
- [ ] Image optimization, background-job optimization, connection-pool tuning, search optimization

### Arch Phase 25 — Production Readiness Review
- [ ] Full checklist across Backend / Database / Payments / Media / Marketplace / Messaging / Operations (architecture.md §25 final checklist, reproduced in full at implementation time)

## Acceptance Criteria

- SEO pages are backed by real content and meaningful vendor inventory — no thin pages auto-created.
- Funnel analytics are tracked end-to-end from visitor to won lead.
- Security, rate-limiting, and authorization are audited; unit, integration, and e2e suites are in place, including the three named e2e journeys.
- Health/readiness/liveness endpoints exist; deployment is reproducible via Docker with CI/CD; backups are verified via an actual restore test — **never trust an untested backup** (product.md §23 principle).
- Performance changes are driven by measurement, not assumption.
- Arch Phase 25's full production checklist is satisfied before declaring production-ready.

## Dependencies / Sequencing

Strict internal order Arch Phase 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 25 (architecture.md §52). This entire stage depends on Stages 1–6 being functionally complete — SEO, analytics, hardening, and testing all operate on real features, not scaffolding.

## Open Questions

- **Pay-per-lead has no architecture phase** ([Risk 5](10-risks-and-open-questions.md#5-pay-per-lead-has-no-architecture-phase)) — restated here as the actionable note: when pay-per-lead (or WhatsApp, or AI assistant) is actually prioritized, this docs set needs a new Stage 8 file and new Arch Phase 26+ definitions. This file is not the place to invent them speculatively.
