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

## Task Checklist

*(Longest checklist of any stage by nature of covering 9 architecture phases — kept in one file per the "not one-file-per-phase" structural decision, since none of these 9 phases has enough independent content to justify its own file.)*

### Arch Phase 17 — CMS & SEO Backend
- [ ] Static pages, city pages, category pages, category+city pages
- [ ] Vendor SEO metadata, blog posts, FAQs
- [ ] Internal linking metadata, canonical URL fields, meta title/description, OG title/description/image
- [ ] Sitemap data, indexability status
- [ ] **Blog/article content model** — needed to back `LATEST_BLOGS` in `wedhub-frontend-app/app/(public)/page.tsx` (currently a hardcoded static array with a `TODO(backend)` comment, added 2026-09-03 during a homepage redesign pass). Fields needed at minimum: title, category/tag, cover image, read-time or word count, publish date, slug/URL, body content.
- [x] **"Real Wedding Stories" content** — ✅ Done 2026-09-04. Turned out not to need an independent content model at all: a new `WeddingStory` model references a real, public `Album` (already belongs to a real `Vendor` with real photos) plus the narrative fields an Album doesn't have (couple names, location, tag, snippet). Full admin CRUD (`/admin/wedding-stories`) + public `GET /wedding-stories/featured/homepage`, wired into the homepage replacing the hardcoded `REAL_WEDDING_STORIES` array. Supersedes an earlier 2026-09-03 decision to keep this section static — see `frontenddocs/10-risks-and-open-questions.md` Open Question 21's follow-up note.
- [ ] **Curated "Popular Searches" / trending-search content model** — needed to back `POPULAR_SEARCH_CARDS` in `wedhub-frontend-app/app/(public)/page.tsx` (hardcoded placeholder: title, location blurb, indicative price, image, link). Could be editorial (admin-curated) or analytics-driven (derived from real search volume once Arch Phase 18 exists) — decide which when this is prioritized, don't assume. Still hardcoded — genuinely new editorial content, no existing real-data equivalent to curate over (unlike wedding stories/gallery below).
- [x] **Inspiration gallery** — ✅ Done 2026-09-04. Same resolution as wedding stories: sourced from real vendor portfolio `Media` instead of a separate CMS model. A new `FeaturedMedia` model lets an admin curate specific, already-approved `Media` rows; category comes from the media's vendor's real primary `VendorCategory`, no separate category field needed. Full admin CRUD (`/admin/featured-media`) + public `GET /gallery/featured/homepage`, wired into `GalleryInspiration.tsx` replacing the hardcoded `GALLERY_ITEMS` array.
- [ ] **Blog/article content model** — needed to back `LATEST_BLOGS` in `wedhub-frontend-app/app/(public)/page.tsx` (still a hardcoded static array with a `TODO(backend)` comment). Fields needed at minimum: title, category/tag, cover image, read-time or word count, publish date, slug/URL, body content. Still hardcoded — genuinely new editorial content, same as Popular Searches above.
- These items were found by cross-referencing the public homepage's actual rendered content against this checklist during a 2026-09-03 UI redesign pass — not previously itemized at this level of detail. They are additions to this existing phase's scope, not a new phase (per this file's own Post-MVP section note: don't invent new Arch Phases speculatively).
- **Small, real backend additions needed along the way (2026-09-04)**: neither the wedding-stories nor gallery admin curation screens were buildable without a way for an admin to browse real data across all vendors first — no such cross-vendor listing existed. Added `GET /admin/albums` (all real public albums, any vendor) and `GET /admin/media/approved` (all real approved media, any vendor), both small additions to the already-real `albums`/`media` modules, not new scope of their own.
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
