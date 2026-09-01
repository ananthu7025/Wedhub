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
