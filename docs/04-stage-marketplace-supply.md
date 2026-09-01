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

### Arch Phase 5 — Vendor Module ✅ Done — 2026-09-02
- [x] Vendor creation, slug, profile, category assignment, service areas
- [x] Services, packages, pricing, contact details, social links
- [x] Vendor status workflow (`DRAFT → PENDING_VERIFICATION → PENDING_APPROVAL → APPROVED`, plus `REJECTED`/`SUSPENDED`/`DEACTIVATED`)
- [x] Vendor ownership, admin-created vendor, vendor self-registration, vendor invitation
- [x] Vendor approval, rejection, suspension (+ restore, deactivate)
- [x] Vendor profile completeness calculation (partial formula — media weight arrives with Arch Phase 6)

See [`11-progress-log.md`](11-progress-log.md#arch-phase-5--vendor-module) for the full write-up.

### Arch Phase 6 — Media & Portfolio ⚠️ Done (code) — 2026-09-02 — real R2 flow unverified, see notes
- [x] R2 integration, signed upload URL generation, upload authorization
- [x] Media ownership, media metadata, albums, album ordering, album visibility
- [x] Portfolio limits, image validation, file-size validation, MIME validation
- [x] Thumbnail generation, large/medium variants, processing queue
- [x] Media deletion, media moderation, CDN URL strategy

**Important caveat:** all code is written, typechecked, and everything not requiring an actual object-storage round-trip is verified live (upload-request validation, ownership scoping, album CRUD, ADMIN-only moderation). The literal upload → confirm → background-process → READY flow **cannot be verified until a real Cloudflare R2 bucket's credentials are added to `.env`** — this is a genuine open item, not an oversight. See [`11-progress-log.md`](11-progress-log.md#arch-phase-6--media--portfolio) for exactly what was and wasn't tested.

## Acceptance Criteria

- Vendor can create a profile; admin can approve a vendor; only approved vendors appear publicly; vendor can update only their own profile; public vendor profile has a stable SEO slug.
- Images never pass through Node unnecessarily; portfolio survives backend restarts; invalid files are rejected; media permissions are enforced.
- **Pending real-world verification:** the worker actually generates large/medium/thumbnail variants and flips status to READY — requires real R2 credentials.

## Dependencies / Sequencing

Depends fully on Stage 1 (needs users, auth, roles, categories, locations). Internally, Arch Phase 6 (Media) depends on Arch Phase 5 (a vendor must exist to own media) — matches architecture.md §52's 5 → 6 order exactly.

## Open Questions

- **Verification-level enum mismatch** ([Risk 6](10-risks-and-open-questions.md#6-verification-level-enum-mismatch)) — **Resolved in Arch Phase 5.** Used product.md §25's version (`UNVERIFIED/IDENTITY_VERIFIED/BUSINESS_VERIFIED/PLATFORM_VERIFIED`). `VerificationLevel` is modeled as an independent, admin-awarded trust badge (`POST /admin/vendors/:id/verify`), decoupled from the `DRAFT→APPROVED` status machine — a vendor's verification level can change at any status.
- Category-attribute "comparison fields" (product.md §16) — **Resolved.** `category_attributes.isComparable` was already modeled in Stage 1/Arch Phase 4; this phase adds `vendor_attribute_values` (typed columns per `dataType`) so a vendor's actual attribute values exist for a future comparison engine to read.
- **New judgment calls resolved during Arch Phase 5** (not pre-existing risks, decided with user confirmation): (1) changing an APPROVED vendor's primary category re-triggers `PENDING_APPROVAL`; subcategory-only changes do not. (2) Subcategories are a free multi-select, not constrained to actual `Category.parentId` children of the primary category. (3) `PENDING_VERIFICATION → PENDING_APPROVAL` is automatic once the owner's email is verified — no separate admin verification action gates this transition. (4) Vendor slugs are frozen once a vendor leaves `DRAFT`; a slug change post-DRAFT is an explicit admin-only action, never an automatic side effect of a business-name edit.
- **New judgment calls resolved during Arch Phase 6:** (1) Redis + BullMQ were pulled forward from their originally-planned Arch Phase 14, since this stage's own acceptance criteria ("never make a normal HTTP request wait for expensive media processing") genuinely needs a real queue now, not later. (2) Media is scoped to vendor-owned types only (logo/cover/portfolio/video); blog images and promotional banners are deferred to Arch Phase 17 (CMS), though the `media` table itself stays generic enough to support them without a schema change. (3) `media.albumId` is nullable — media can exist standalone or organized into an album, matching product.md §13's framing of albums as an organizational layer, not a mandatory container.
- **This stage (Stage 2) is code-complete but Arch Phase 6's live object-storage flow needs the user to supply real Cloudflare R2 credentials before it's fully verified** — flagged explicitly rather than claimed as done. See the phase-6 checklist note above and the progress log for specifics.

**Stage 2 (Marketplace Supply) is now code-complete** — Arch Phases 5 and 6 both shipped, with the one caveat above.
