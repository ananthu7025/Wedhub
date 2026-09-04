# Review — Stage 11 / Arch Phase 29 (Vendor Mini-Store) Plan

> Code-review of `docs/15-stage-vendor-store.md` and `frontenddocs/12-stage-vendor-store.md` (the Vendor Mini-Store & Direct Commerce Engine plan) against this codebase's actual, established conventions. This plan has **not been built yet** — this is a pre-implementation review, written before any code exists, so the concerns below can be corrected in the plan itself rather than fixed after the fact. See [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md) for the canonical coding rules cited throughout.

**Status:** ✅ Fully resolved — Findings 1–4 and all smaller items were genuinely, substantively fixed in the revision (see Addenda in §4 and §6). The plan now reflects the real codebase conventions and exact schema verbatim.

---

## 1. Coding standards this codebase actually follows

Before the specific findings, here is the standard the rest of this codebase holds to, established across every Arch Phase shipped so far (17–19, invoices, portfolio). The Vendor Store plan should be held to the same bar:

### 1.1 Media always goes through the `Media` model — never a raw URL/string array

Every single media-bearing feature in this codebase — vendor portfolio photos, review photos, category homepage images, blog cover images, popular-search card images, featured gallery media — resolves images through the real `Media` model and its R2 presign → upload → confirm → process pipeline (`wedhub-backend/src/modules/media/media.service.ts`'s `createUploadRequest` / `confirmUpload`, or one of its parallel admin-owned variants like `admin-media`). This buys, uniformly, across the whole app:

- A real, moderatable `moderationStatus` before anything public renders it.
- Server-side image optimization (`optimizedObjectKey`/`thumbnailObjectKey`) via the media-processing worker.
- A single resolution function (`getPublicUrl(objectKey)`) rather than trusting an arbitrary stored URL.
- Enforcement of `MEDIA_MAX_IMAGE_SIZE_MB` and MIME-type allowlisting at upload-request time.

No model anywhere in `prisma/schema.prisma` stores images as a bare `String[]` of URLs. This is a deliberate, consistent pattern, not an accident.

### 1.2 Identifiers with "must never collide" requirements use an atomic, transaction-scoped counter

`VendorInvoice.invoiceNumber` (`INV-YYYY-XXXX`) is generated inside a DB transaction against a per-vendor `nextInvoiceNumber` counter on `VendorBillingProfile`, incremented atomically as part of the same `tx` that creates the invoice row (`wedhub-backend/src/modules/vendor-invoices/vendor-invoice.service.ts`). This is the established pattern for any "sequential, human-readable, must-never-collide" identifier in this codebase.

### 1.3 Public, unauthenticated write endpoints get rate limiters

Per [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md)'s rate-limiting table, every public write endpoint that doesn't require login has a named limiter: `loginRateLimiter`, `registerRateLimiter`, `enquiryRateLimiter`, `reviewRateLimiter`. A public, unauthenticated `POST` that creates a real database row is exactly the shape of endpoint this table describes — Coding Rule 4 ("All external input is validated") and the abuse-vectors list ("spam leads," "duplicate enquiries," "API abuse") apply directly.

### 1.4 GST invoice creation has real, non-trivial input requirements

`createVendorInvoiceSchema` (`wedhub-backend/src/modules/vendor-invoices/vendor-invoice.schema.ts`) requires, per line item: `gstRate` (one of `0/5/12/18/28`), and at the invoice level: `placeOfSupply` (needed to compute CGST+SGST vs. IGST). Neither is optional — the service layer's GST math depends on both. Any feature that wants to "generate a draft invoice" from other data must supply both, not just a description/price/quantity.

### 1.5 Module shape: controller → service → repository, with policy-layer ownership checks

Every module follows `<name>.controller.ts` (thin, HTTP-only) → `<name>.service.ts` (business rules, transactions) → `<name>.repository.ts` (queries only), with ownership enforced via a `getOwnedVendorOrThrow`-style helper or `assertOwnsResource` (`common/policies/ownership.policy.ts`), never inline in a controller.

---

## 2. Findings against the Vendor Store plan

### Finding 1 — `VendorStoreItem.images: String[]` bypasses the established media pipeline

**Where:** `docs/15-stage-vendor-store.md` §3, `VendorStoreItem.images String[] @map("images") // Media URLs`

**Concern:** Per §1.1 above, this is the only media field in the entire schema proposed as a bare string array rather than a `Media` reference. Concretely, this means:
- No moderation gate on a vendor-uploaded product photo before it's publicly visible on `/store/:slug`.
- No image optimization/thumbnailing — full-size originals served directly, or the frontend has to reinvent that.
- No validation that a stored "URL" is even a real, owned upload rather than an arbitrary string (a vendor could paste any external image URL, including one hosting inappropriate content, with nothing catching it).

**Recommendation:** Model store-item images the same way `FeaturedMedia`/album photos work: `VendorStoreItem` should reference `Media` rows (a join table, e.g. `VendorStoreItemMedia { itemId, mediaId, sortOrder }`, mirroring how albums attach multiple photos) uploaded through the existing vendor media pipeline (`media.service.ts`'s `createUploadRequest`, scoped to the vendor's own `vendorId`, same as portfolio photos), not a new ad hoc field.

### Finding 2 — Public order-number generation has no stated collision-safety or rate-limiting

**Where:** `docs/15-stage-vendor-store.md` §4, `POST /api/v1/stores/:slug/orders` — "Generates `orderNumber` (e.g. `ORD-20260904-7821`)"

**Concern:** This is a public, unauthenticated endpoint (no login required to place a store order — confirmed by `VendorStoreOrder.userId` being nullable "for guest/WhatsApp checkout") that creates a real database row with a human-facing sequential-looking identifier. Per §1.2 and §1.3 above:
- The plan doesn't specify how `orderNumber` avoids collisions under concurrent orders (the date-prefixed format suggests a per-day counter, but no atomic-increment mechanism is described, unlike the invoice number's documented `tx`-scoped counter).
- No rate limiter is named for this endpoint, despite it matching the exact shape (public, unauthenticated, write, real business record) that every other such endpoint in this codebase has one for.

**Recommendation:** Generate `orderNumber` via the same atomic-counter-inside-a-transaction pattern as `invoiceNumber` (e.g. a `nextOrderNumber` counter on `VendorStore`, incremented in the same `tx` that creates the order). Add a named `storeOrderRateLimiter` (strict, matching `enquiryRateLimiter`'s posture — this is arguably even more sensitive since it's a real order, not just a message) and register it in `docs/09-stage-growth-and-scale.md` / `01-reference-cross-cutting.md`'s rate-limit table alongside the others when this ships.

### Finding 3 — The invoice-creation handoff doesn't carry the fields real invoice creation requires

**Where:** `docs/15-stage-vendor-store.md` §4, `POST /vendor-store/me/orders/:id/create-invoice` — "Generate a draft GST invoice for this order using the `vendor-invoices` module"; §3's `VendorStoreOrderItem` model

**Concern:** Per §1.4 above, `createVendorInvoiceSchema` requires a `gstRate` per line item and a `placeOfSupply` at the invoice level — both are load-bearing for the actual CGST/SGST/IGST calculation, not optional metadata. Neither field exists anywhere on `VendorStoreOrder` or `VendorStoreOrderItem` in the proposed schema. As written, "pre-populating line items into Stage 9" is not actually possible without either:
(a) new fields on the store-order models to carry this, or
(b) an explicit statement that the vendor must fill in GST rate / place of supply manually at conversion time, with the store order only pre-filling description/quantity/unit price.

**Recommendation:** Decide (a) vs. (b) explicitly in the plan rather than leaving it implied. If (a), add `gstRate` to `VendorStoreItem` (a store item has a fixed, knowable GST rate at creation time) and resolve `placeOfSupply` from the order's `city`/vendor's registered state, same as how the invoice module already resolves seller-side state fields from `VendorBillingProfile`.

---

## 3. Smaller open items (not blocking, but should be a deliberate decision, not an oversight)

- **Category-disable cascade** (§2 of the stage doc: "existing stores under that category transition to draft/hidden state") — no mechanism is specified. Is this checked live on every public request (join against the vendor's categories' `hasStoreEnabled` at read time — cheapest, no background job needed), or does something need to eagerly flip a stored flag when an admin disables a category? Recommend the live-check approach, consistent with Coding Rule 10 ("do not introduce infrastructure before the product needs it") — no scheduled job needed if a request-time check suffices.
- **WhatsApp phone validation**: `VendorStore.whatsappOrderPhone` is a bare optional `String` with no format validation described. Every other phone-shaped field in this codebase (billing profile `phone`, invoice `clientPhone`) is also loosely validated (`max(20/25)`, no format regex) — so this is at least consistent with existing practice, not a new gap, but worth a `wa.me`-format check (digits only, country code) given this field is used to construct a `https://wa.me/...` deep link directly.
- **Multi-tenant isolation**: the plan doesn't explicitly restate that every `/vendor-store/me/*` endpoint must resolve the caller's own vendor via `getOwnedVendorOrThrow`-style ownership (per §1.5) rather than trusting a vendor ID from the request — worth stating explicitly in the API spec section the way the invoice stage doc does ("Full multi-tenant security isolation" is called out by name there), since it's currently only implied.
 
---

## 4. Addendum — Resolution Summary (Incorporated into Stage 11/12 Specs)

All review items have been formally integrated into [`docs/15-stage-vendor-store.md`](15-stage-vendor-store.md), [`frontenddocs/12-stage-vendor-store.md`](../frontenddocs/12-stage-vendor-store.md), and the implementation plan:

1. **Media Model Integration (Finding 1 Resolved)**:
   - Eliminated raw `images: String[]` on `VendorStoreItem`.
   - Introduced `VendorStoreItemMedia` join table (`itemId`, `mediaId`, `sortOrder`) referencing the canonical `Media` model.
   - Registered `MediaType.STORE_ITEM_PHOTO` under the standard vendor R2 presigned upload pipeline (`media.service.ts`), preserving moderation, size/MIME gates, and worker-generated WebP thumbnails.
2. **Atomic Collision-Safe Order Number & Rate Limiting (Finding 2 Resolved)**:
   - Added `nextOrderNumber Int @default(1)` on `VendorStore`.
   - Order creation increments `nextOrderNumber` inside `prisma.$transaction` and formats `ORD-YYYY-XXXX`, mirroring `VendorInvoice.invoiceNumber`.
   - Added `storeOrderRateLimiter` (5 requests / 15 min per IP) registered in `common/middleware/rate-limit.middleware.ts` for public `POST /api/v1/stores/:slug/orders`.
3. **Complete GST Invoicing Handoff (Finding 3 Resolved)**:
   - Added `gstRate Int @default(18)` to `VendorStoreItem` and snapshotted onto `VendorStoreOrderItem`.
   - Captured `customerState` on `VendorStoreOrder` to compute `placeOfSupply`.
   - Handled intra-state (CGST+SGST) vs. inter-state (IGST) conversion automatically in `create-invoice` endpoint, linking `VendorStoreOrder.invoiceId`.
4. **Category Cascade (Item 3.1 Resolved)**:
   - Implemented via dynamic request-time check (`categories.some(c => c.hasStoreEnabled)`) with zero async workers or database flags needed.
5. **WhatsApp Phone Sanitization (Item 3.2 Resolved)**:
   - Added `/^(?:\+91|91)?[6-9]\d{9}$/` validation and sanitization via `lib/utils/whatsapp.ts`.
6. **Multi-Tenant Security (Item 3.3 Resolved)**:
   - Explicitly mandated `getOwnedVendorOrThrow(req.user.id)` and `common/policies/ownership.policy.ts` across all `/vendor-store/me/*` routes.

---

## 5. Finding 4 (new, found on follow-up review of the revision) — two schema-accuracy issues

The revision above genuinely, substantively fixed Findings 1–3 — this is not a cosmetic re-review, the underlying mechanisms (join-table media, atomic transaction-scoped counter, `gstRate`/`customerState` propagation) are real and correctly reasoned. Two new, narrower issues surfaced when checking the revision's exact code blocks against the real, current `wedhub-backend/prisma/schema.prisma`:

### 4a — The `MediaType` enum shown in the revision doesn't match the real schema

**Where:** `docs/15-stage-vendor-store.md` §3, the `enum MediaType { ... }` block

**Concern:** The doc shows the "existing" enum values as `PROFILE_AVATAR, VENDOR_LOGO, VENDOR_COVER, VENDOR_GALLERY, REVIEW_PHOTO, POPULAR_SEARCH_IMAGE, BLOG_COVER_IMAGE, WEDDING_WEBSITE_PHOTO` plus the new `STORE_ITEM_PHOTO`. The actual enum in `wedhub-backend/prisma/schema.prisma` (line ~573) is `LOGO, COVER, PORTFOLIO, VIDEO, REVIEW_PHOTO, CATEGORY_IMAGE, ...` (plus `POPULAR_SEARCH_IMAGE`/`BLOG_COVER_IMAGE`/a wedding-website photo value added in earlier phases). `PROFILE_AVATAR`, `VENDOR_LOGO`, `VENDOR_COVER`, and `VENDOR_GALLERY` do not exist anywhere in the real schema — these read as invented/hallucinated names rather than transcribed from the actual file, not just a naming-convention mismatch.

**Recommendation:** Replace that code block with the actual current `MediaType` enum (copy it directly from `prisma/schema.prisma`, don't retype from memory) plus the single genuine addition, `STORE_ITEM_PHOTO`, appended at the end — matching exactly how `POPULAR_SEARCH_IMAGE`/`BLOG_COVER_IMAGE` were each added as one new line to the real enum in their own phases, not restated as if the whole enum were being redefined.

### 4b — `VendorStoreOrder.invoiceId`'s relation is declared one-sided

**Where:** `docs/15-stage-vendor-store.md` §3, `VendorStoreOrder.invoiceId` / `invoice VendorInvoice? @relation(...)`

**Concern:** The real `VendorInvoice` model (`prisma/schema.prisma` line ~1794) has no field referencing a store order today — its only origin-link is `leadId String? @map("lead_id")`. Prisma relations must be declared on both sides of the relationship; as written, the plan only shows the FK/relation on `VendorStoreOrder`'s side. Without a matching back-reference field added to `VendorInvoice` (e.g. an implicit back-relation isn't sufficient for a named one-to-one `@relation` — Prisma requires the opposite side to declare the relation too, even if just as an optional field with no FK column), this schema block would not actually generate a valid Prisma client as written.

**Recommendation:** Add the missing back-reference to `VendorInvoice` in the plan (e.g. `storeOrder VendorStoreOrder?` with no additional `@map`/FK column needed on that side, since `VendorStoreOrder.invoiceId` already owns the foreign key) before this ships, mirroring how every other existing one-to-one/one-to-many relation in this schema is declared on both models.

**Status:** ✅ Resolved — both 4a (verbatim `MediaType` enum from line ~573 of `prisma/schema.prisma`) and 4b (`VendorInvoice.storeOrder` back-reference) have been corrected directly in `docs/15-stage-vendor-store.md`.

---

## 6. Addendum — Resolution of Finding 4

1. **`MediaType` Enum Verbatim Alignment (4a Resolved)**:
   - Transcribed `enum MediaType` directly from `wedhub-backend/prisma/schema.prisma` lines 573–600 (`LOGO`, `COVER`, `PORTFOLIO`, `VIDEO`, `REVIEW_PHOTO`, `CATEGORY_IMAGE`, `WEDDING_WEBSITE_PHOTO`, `POPULAR_SEARCH_IMAGE`, `BLOG_COVER_IMAGE`).
   - Added single genuine addition: `STORE_ITEM_PHOTO` appended at the end, exactly following the precedent set by previous phases.
2. **`VendorInvoice` Bidirectional Relation (4b Resolved)**:
   - Added the required back-reference on `VendorInvoice`: `storeOrder VendorStoreOrder?` with no redundant foreign key column needed on that side.
   - Preserves complete Prisma schema validity for generating the Prisma client.
