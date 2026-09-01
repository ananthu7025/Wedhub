# Stage 2 — Marketplace Supply

## Stage Goal

Build the supply side of the marketplace: vendors can exist, hold a complete profile, and manage a media/portfolio.

## Included Architecture Phases

- **Arch Phase 5** — Vendor Module
- **Arch Phase 6** — Media & Portfolio

## Product Roadmap Cross-Reference

Maps closely to **Product Phase 2 — Marketplace Supply** (product.md §70: vendor registration, admin vendor creation, categories, locations, vendor profiles, media).

## Included Product Concerns

- Vendor onboarding, two routes — product.md §5:
  - **Route A** (self-registration): account → verify → category → subcategory → business info → location → service areas → description → services → packages → pricing → portfolio → social links → business hours → availability → credentials → review → submit. Status flow: `DRAFT → PENDING_VERIFICATION → PENDING_APPROVAL → APPROVED`, with `REJECTED`/`SUSPENDED`/`DEACTIVATED` as alternate outcomes.
  - **Route B** (admin-created): admin creates vendor + category + location + initial profile; vendor receives invitation and must verify ownership before gaining control.
- Full vendor profile field catalog — product.md §6: identity, classification, location, commercial information, trust information, contact, operational information, SEO.
- Category-specific attributes (photographer style/count/delivery time; venue capacity/indoor-outdoor/parking/rooms/catering/accommodation; makeup bridal/groom/trial/travel/products) — product.md §7. Stored relationally where stable, JSONB where flexible.
- Vendor albums — name, description, cover, media, visibility, sort order — product.md §13.
- Media/portfolio: object storage only (never binary in Postgres), upload flow `Browser → signed upload URL → object storage → processing queue → optimized variants → CDN`, image variants (original/large/medium/thumbnail/WebP/AVIF) — product.md §12.
- Vendor approval rules: only becomes publicly searchable once required fields, verification, and admin approval are complete; admin can reject with a reason; approval history is stored — product.md §41.
- Admin vendor-creation scenario — product.md §40 (category → city → business name → contact → save as draft → invitation → claim → verify → complete profile → admin review → approve → public).
- Vendor suspension scenario — product.md §62 (admin changes `APPROVED → SUSPENDED` on valid complaints; public profile disappears; no new leads; historical records remain; reason recorded; restorable).

## Task Checklist

### Arch Phase 5 — Vendor Module
- [ ] Vendor creation, slug, profile, category assignment, service areas
- [ ] Services, packages, pricing, contact details, social links
- [ ] Vendor status workflow (`DRAFT → PENDING_VERIFICATION → PENDING_APPROVAL → APPROVED`, plus `REJECTED`/`SUSPENDED`/`DEACTIVATED`)
- [ ] Vendor ownership, admin-created vendor, vendor self-registration, vendor invitation
- [ ] Vendor approval, rejection, suspension
- [ ] Vendor profile completeness calculation

### Arch Phase 6 — Media & Portfolio
- [ ] R2 integration, signed upload URL generation, upload authorization
- [ ] Media ownership, media metadata, albums, album ordering, album visibility
- [ ] Portfolio limits, image validation, file-size validation, MIME validation
- [ ] Thumbnail generation, large/medium variants, processing queue
- [ ] Media deletion, media moderation, CDN URL strategy

## Acceptance Criteria

- Vendor can create a profile; admin can approve a vendor; only approved vendors appear publicly; vendor can update only their own profile; public vendor profile has a stable SEO slug.
- Images never pass through Node unnecessarily; portfolio survives backend restarts; invalid files are rejected; media permissions are enforced.

## Dependencies / Sequencing

Depends fully on Stage 1 (needs users, auth, roles, categories, locations). Internally, Arch Phase 6 (Media) depends on Arch Phase 5 (a vendor must exist to own media) — matches architecture.md §52's 5 → 6 order exactly.

## Open Questions

- **Verification-level enum mismatch** ([Risk 6](10-risks-and-open-questions.md#6-verification-level-enum-mismatch)) — must be resolved **before** implementing the vendor verification workflow fields in this stage. product.md §25 vs. architecture.md §24 define different 4-level hierarchies; pick one before building the schema and admin UI copy around it.
- Confirm whether category-attribute "comparison fields" (product.md §16, used by the vendor comparison engine) are modeled now, in this stage's `category_attributes` design, or deferred to Stage 3's comparison engine work. Recommend modeling the field definitions now (cheap, schema-only) even if the comparison UI itself ships in Stage 3.
