# Stage 8 — ₹49 Instant Wedding Website

## Stage Goal

Ship a new, standalone monetized product: a couple (or vendor, acting as themselves) creates a mini wedding website (template + wedding details + events + photos), gets **one free temporary preview**, then pays ₹49 via Razorpay to publish it permanently at a shareable public URL. Reachable from two entry points — the Telegram bot and the public/vendor-facing web app.

## Origin and Numbering

This feature is **not** derived from `product.md` or `wedhub_backend_architecture.md` — it originates from a standalone feature spec ([`../wedhub_49_wedding_website_feature.md`](../wedhub_49_wedding_website_feature.md), supplied 2026-09-03) outside those two canonical source documents. Per [`09-stage-growth-and-scale.md`](09-stage-growth-and-scale.md)'s own Post-MVP section note ("when [a feature with no Arch Phase] is actually prioritized, this docs set needs a new Stage 8 file and new Arch Phase(s) beyond the current 26; do not invent one speculatively now") — this is that moment. This file is the new **Stage 8**, defining **Arch Phase 26**, the first Arch Phase not sourced from `wedhub_backend_architecture.md` §51's original 26-phase list.

The feature spec's own §"Important: Inspect Before Coding" and §"Implementation Process" explicitly require auditing existing infrastructure (auth, payments, storage, Telegram, dashboards, SEO) before designing anything new, and explicitly forbid duplicating equivalent existing systems. That audit was performed in full before this file was written — every architectural decision below cites the specific existing code it reuses or the specific existing pattern it follows, and every genuinely new piece of scope is called out as new, not assumed.

## Included Architecture Phases

- **Arch Phase 26** — Wedding Website Backend (draft/preview/payment/publish lifecycle, Telegram flow extension, admin visibility)

## Product Roadmap Cross-Reference

No existing Product Phase (product.md §70) covers this — it is a new monetized product line alongside subscriptions/featured-listings, not part of the original 9-phase roadmap. Closest analog: Product Phase 5 (Monetization)'s payment/billing infrastructure is reused wholesale (§"Payment Model Fit" below), but this is not a subscription — it's a one-time, standalone purchase. Treat this stage as parallel to, not sequenced after, Product Phase 9 (Advanced/Post-MVP).

## Key Business Rules (from the feature spec, verbatim intent)

These are restated here as the acceptance-test narrative for this stage, mirroring how `07-stage-monetization.md` treats product.md §28's 8 lettered scenarios:

1. One free public preview per draft.
2. Preview expires automatically (configurable, default 60 minutes).
3. Expired preview does not delete the draft — only public preview *access* is invalidated.
4. No permanent public website exists before a successful, backend-verified ₹49 payment.
5. Successful payment permanently publishes the website.
6. Editing after payment does not require another payment.
7. Preview URLs must never be indexed (`noindex, nofollow`) and must never appear in the sitemap.
8. Public visitors cannot access draft data, payment information, or owner information beyond what the published page itself shows.
9. Payment verification happens only on the backend — the frontend payment callback is never trusted.
10. Payment processing (webhook handling) is idempotent — a duplicate webhook must not double-publish or double-charge.
11. Users cannot bypass the ₹49 payment by manipulating frontend state — every publish-gating check re-verifies server-side.
12. The temporary preview and the permanent published website render through the exact same template/renderer — no parallel preview-only implementation.

## Existing Infrastructure Audit (summary — see the full research trace in this stage's Open Questions / design-decision notes below for citations)

Before any new code, the following existing systems were inspected and confirmed reusable:

- **Payments**: `wedhub-backend/src/integrations/payment/razorpay.client.ts` (order creation, webhook signature verification, payment signature verification), `wedhub-backend/src/modules/webhooks/` (webhook route + idempotent event handling via `WebhookEvent`, already provider-agnostic), `wedhub-backend/src/modules/subscriptions/subscription.service.ts` (order-creation flow pattern — signed URL/order obtained before any DB row that depends on it, matching this stage's own token-before-persistence pattern below). All reused; no new payment provider, no new webhook route, no new signature-verification logic.
- **File upload/storage**: `wedhub-backend/src/integrations/storage/r2.client.ts` (signed-URL PUT pattern) + `wedhub-backend/src/jobs/queues/media-processing.queue.ts` / `wedhub-backend/src/jobs/processors/media-processing.processor.ts` (background resize/optimize worker, `large`/`medium`/`thumbnail` WebP variants). Reused as-is, no new storage provider, no new processing pipeline.
- **Telegram bot**: `wedhub-backend/src/modules/telegram/` — a single linear conversation state machine (`TelegramConversationState` enum, one open conversation per Telegram user, `collectedData` JSON scratch state materializing into a real row only at the end). Extended, not replaced — see "Telegram Flow Design" below.
- **Secure tokens**: `wedhub-backend/src/common/utils/token.util.ts` (`generateOpaqueToken()` + `hashToken()`), the established pattern for refresh tokens, email verification, password reset, and vendor invitations. Reused for the preview token.
- **Slugs**: `wedhub-backend/src/common/utils/slug.util.ts` (`slugify()`), plus a `generateUniqueSlug` pattern previously duplicated between `vendor.service.ts` and `categories.service.ts` — extracted into a shared helper as part of this stage (see "Slug Generation" below), rather than adding a third copy.
- **SEO**: `wedhub-backend/src/modules/seo/` and the frontend's `app/(public)/category/[categorySlug]/page.tsx` `generateMetadata` pattern (title/description/canonical/OG/robots) — followed for the published wedding-website page; the temporary preview page instead hardcodes `noindex, nofollow` unconditionally (no existing page in the codebase currently demonstrates a deliberately-noindex page — new, but a trivial application of the existing `Metadata`/`robots.ts` conventions).
- **Env config**: `wedhub-backend/src/config/env.ts`'s Zod-schema, `.default(...)`-for-feature-knobs convention (as used by `MEDIA_MAX_IMAGE_SIZE_MB` etc.) — followed exactly for the two new env vars this stage needs.

## Architectural Decisions (resolved 2026-09-03, confirmed with the user — these were genuinely undetermined by the existing codebase, not guessed)

### 1. Ownership — dual nullable owner columns, no account required for Telegram

`TelegramUser.userId` is **nullable** (`schema.prisma:1374`) — a Telegram user talking to the bot has no WedHub `User`/session unless they've separately signed up on the web app, and the rest of the Telegram flow (enquiries) already works without requiring one. Requiring an account for wedding-website creation would add real, unrequested friction and a new account-linking flow that doesn't exist today.

**Decision:** `WeddingWebsite` gets two nullable owner columns — `ownerUserId` (web-created, logged-in `User`) and `ownerTelegramUserId` (bot-created, no login, keyed on the chatting `TelegramUser`'s own row). Exactly one is set per row, enforced at the application layer (mirroring how `Media.vendorId`/`Media.userId` already coexist as mutually-exclusive nullable owner columns for `REVIEW_PHOTO`). Both `END_USER`- and `VENDOR`-role web users can create a website; ownership keys on the acting `User.id` directly (mirroring `WeddingProfile.userId`'s 1:1-with-User shape), never on `Vendor.id` — `Vendor.ownerUserId` is strictly `@unique` (one Vendor per User), and there is no "vendor creates content on behalf of a client" concept anywhere in this codebase to build a vendor-owned variant on top of. A vendor creating a wedding website is simply a `User` with a `VENDOR` role acting as themselves, not a special on-behalf-of relationship — that scope is explicitly not built in this stage.

### 2. Payment model fit — discriminator + nullable FK on the existing `Payment` table

The existing `Payment`/`Invoice` models are subscription-shaped: `Payment.pendingVendorId`/`pendingPlanId`/`pendingCouponId` are subscription-checkout-specific nullable FKs, and `Invoice.subscriptionId` is required (not nullable) — neither has a home for a plan-less, coupon-less, one-time ₹49 charge as-is.

**Decision:** Reuse `Payment` (not a parallel table) — add `purpose: PaymentPurpose` (`SUBSCRIPTION | WEDDING_WEBSITE`, default `SUBSCRIPTION` so every existing row is unaffected) and a new nullable `weddingWebsiteId` FK. The existing `pendingVendorId`/`pendingPlanId`/`pendingCouponId` stay null for `WEDDING_WEBSITE`-purpose rows. This reuses the exact same order-creation code path, the exact same `WebhookEvent` idempotency logic (already provider-agnostic, keyed only on `eventId`/`eventType` — no schema change needed there), and the exact same signature-verification code — the webhook handler's `payment.captured` branch gains a `switch (payment.purpose)` to dispatch to either the existing subscription-activation logic or a new `publishWeddingWebsite(...)` call. `Invoice` is **not** extended or reused for this — a ₹49 one-time receipt does not need the subscription-billing-period invoicing concept; if a receipt/confirmation is wanted later, it can read directly off the `Payment` row.

### 3. Telegram flow design — `flowType` discriminator on the existing `TelegramConversation`

The bot allows exactly one open (non-`COMPLETED`) conversation per Telegram user (`telegram.repository.ts`'s `findOpenConversation`), hardcoded today to the single "find a vendor" enquiry flow (one `TelegramConversationState` enum, one `collectedData` JSON shape, one giant `switch` in `advanceConversation`).

**Decision:** Add `flowType: TelegramFlowType` (`ENQUIRY | WEDDING_WEBSITE`, default `ENQUIRY`) to `TelegramConversation`, preserving the existing one-open-conversation-per-user invariant exactly (starting the wedding-website flow while an enquiry conversation is open resumes/overwrites it, the same way `/start` already resets/reuses the single row today — no new mutual-exclusion logic needed). New `WW_*` values are added to the *same* `TelegramConversationState` enum (e.g. `WW_SELECTING_TEMPLATE`, `WW_COLLECTING_COUPLE_NAMES`, `WW_COLLECTING_WEDDING_DATE`, `WW_COLLECTING_VENUE`, `WW_COLLECTING_EVENTS`, `WW_COLLECTING_PHOTOS`, `WW_PREVIEW_READY`, `WW_AWAITING_PAYMENT`, `WW_PUBLISHED`), namespaced by prefix to avoid any collision with the 11 existing enquiry states, and `advanceConversation`'s switch branches on `flowType` first, then `state` — not a parallel state machine, not a second table. `collectedData`'s TypeScript type becomes a union keyed by `flowType` (`EnquiryCollectedData | WeddingWebsiteCollectedData`), matching the existing "scratch state, nothing durable until the end" philosophy (`telegram.conversation.types.ts`'s own header comment) — with one deliberate exception: photo uploads cannot follow "nothing durable until the end," since an R2 signed upload URL requires a real `Media` row to exist. Uploaded photos during the Telegram flow create real, `draft`-status `Media` rows progressively (see "Photo Ownership" below), while text fields (couple names, venue, events) stay in `collectedData` until the draft `WeddingWebsite` row is created (at the `WW_SELECTING_TEMPLATE`→`WW_COLLECTING_COUPLE_NAMES` transition — the draft row is created as soon as a template is chosen, not deferred to the very end, since photos need a real `weddingWebsiteId` to attach to).

The `START` state's existing single-button prompt (`"Find a vendor"`, `telegram.conversation.service.ts:47-53`) gains a second button (`"💍 Create Your Wedding Website – ₹49"`, `callbackData: "start:create_website"`), and the `START` case in `advanceConversation` recognizes both `"start:find_vendor"` and the new `"start:create_website"` callback, setting `flowType` accordingly before transitioning.

### 4. Photo ownership — follow the `REVIEW_PHOTO` precedent exactly

`Media.vendorId` is nullable specifically so `REVIEW_PHOTO` media can be owned by `userId`+`reviewId` instead (schema comment, `Media` model) — the established precedent for a non-vendor-owned media type.

**Decision:** New `MediaType.WEDDING_WEBSITE_PHOTO` enum value, new nullable `Media.weddingWebsiteId` FK. A small, parallel `wedding-website-media.service.ts` (mirroring `review-media.service.ts`'s shape, not `media.service.ts`'s vendor-scoped one) handles `createUploadRequest(weddingWebsiteId, ...)`/`confirmUpload(weddingWebsiteId, mediaId)`, reusing the *exact same* R2 signed-URL-PUT-confirm flow and the *exact same* background processing queue/worker — zero changes to `r2.client.ts` or `media-processing.processor.ts`. Object key prefix: `wedding-websites/${weddingWebsiteId}/${randomUUID()}${ext}`, matching the existing `vendors/${vendorId}/...` / `review-photos/${userId}/...` per-owner-prefix convention.

### 5. Preview token — hash-and-store, following the majority auth-token convention

Two precedents exist: hash-and-store (refresh tokens, email verification, password reset, vendor invitations — `token.util.ts`'s `generateOpaqueToken()` + `hashToken()`) vs. store-raw (the shortlist `shareToken`, which has no working verification/lookup endpoint yet to study either way).

**Decision:** Hash-and-store, the majority and safer convention — protects against a DB read/backup leak revealing live, working preview URLs. `generateOpaqueToken()` produces the raw 64-hex-char token, which appears only in the returned preview URL (`/preview/{token}`); only `previewTokenHash = hashToken(token)` is ever persisted. Preview access re-hashes the presented token and looks up by hash — same shape as `resetPassword`'s existing lookup-by-hash-plus-expiry-check.

### 6. Slug generation — extract a shared helper, fix the existing duplication

`generateUniqueSlug` (base name → slug → append `-2`, `-3`... on case-insensitive collision) is currently copy-pasted, not shared, between `vendor.service.ts:19-30` and `categories.service.ts:33-44`.

**Decision:** Extract `generateUniqueSlug(base: string, existsCheck: (candidate: string) => Promise<boolean>): Promise<string>` into `wedhub-backend/src/common/utils/slug.util.ts`, and update both existing call sites (`vendor.service.ts`, `categories.service.ts`) to call the shared helper instead of their local copies, alongside the new `wedding-website.service.ts`'s own use of it. A small, low-risk refactor bundled into this stage rather than perpetuating a third copy-paste.

## Database Design (conceptual — adapt exact Prisma syntax at implementation time)

```text
enum WeddingWebsiteStatus { DRAFT, PUBLISHED }
enum WeddingWebsiteTemplate { ROYAL_WEDDING, MINIMAL_ELEGANT, TRADITIONAL_INDIAN }
enum PaymentPurpose { SUBSCRIPTION, WEDDING_WEBSITE }   // new enum, Payment.purpose default SUBSCRIPTION
// MediaType gains: WEDDING_WEBSITE_PHOTO

model WeddingWebsite {
  id                    Uuid, pk
  ownerUserId           Uuid?, nullable, FK -> User            // exactly one of these two is set
  ownerTelegramUserId   Uuid?, nullable, FK -> TelegramUser
  template              WeddingWebsiteTemplate
  status                WeddingWebsiteStatus @default(DRAFT)
  slug                  String? unique, nullable                // set only on publish

  brideName             String
  groomName             String
  weddingDate           DateTime?
  weddingTime           String?
  venueName             String?
  venueAddress          String?
  googleMapsUrl         String?
  shortDescription      String?
  brideParents          String?
  groomParents          String?
  weddingHashtag        String?
  contactInfo           String?
  socialLinks           Json?

  coupleStory           String?
  brideDescription      String?
  groomDescription      String?
  howWeMet              String?

  coverMediaId          Uuid?, nullable, FK -> Media
  couplePhotoMediaId    Uuid?, nullable, FK -> Media

  previewTokenHash      String?, nullable
  previewCreatedAt      DateTime?
  previewExpiresAt      DateTime?
  previewUsedAt         DateTime?                                // != null => the one free preview is consumed

  publishedAt           DateTime?

  createdAt / updatedAt DateTime

  events                WeddingWebsiteEvent[]
  gallery               Media[] (weddingWebsiteId FK, MediaType.WEDDING_WEBSITE_PHOTO)
  rsvps                 WeddingWebsiteRsvp[]
  payments              Payment[] (purpose=WEDDING_WEBSITE, weddingWebsiteId FK)
}

model WeddingWebsiteEvent {
  id, weddingWebsiteId FK, name, date, time, venue, description, sortOrder
}

model WeddingWebsiteRsvp {
  id, weddingWebsiteId FK, name, attending (YES|NO|MAYBE), guestCount, message, createdAt
}
```

Do not blindly copy this schema at implementation time — adapt field types/nullability to what the template renderer and the step-by-step draft flow actually need once built, per the feature spec's own "Do not blindly copy this schema" instruction. `Payment.weddingWebsiteId` (nullable FK) and `Payment.purpose` are the only changes to the existing `Payment` model.

## Preview / Publish State Machine

```text
DRAFT ──(generate preview, previewUsedAt was null)──> DRAFT, previewToken issued
                                                         │
                                            (visit /preview/{token})
                                                         │
                                    ┌────────────────────┴────────────────────┐
                              before previewExpiresAt              after previewExpiresAt
                                    │                                          │
                        render via WeddingWebsiteRenderer          "Your preview has expired" +
                        (preview mode, noindex/nofollow)           Publish CTA — draft NOT deleted
                                    │
                        ("Publish My Website – ₹49")
                                    │
                    Razorpay order created (Payment: purpose=WEDDING_WEBSITE, status=CREATED)
                                    │
                              user pays / abandons
                                    │
                    webhook: payment.captured, purpose=WEDDING_WEBSITE
                                    │
        status=PUBLISHED, slug generated, previewTokenHash cleared, publishedAt=now
                                    │
                        permanent public URL: /wedding/{slug}
                        (render via the SAME WeddingWebsiteRenderer, published mode, indexable)
```

A second preview attempt once `previewUsedAt != null` does not generate a new token — it returns the existing "your free preview has already been used" state with a Publish CTA, per Business Rule 1. Editing draft fields (template, details, events, photos) after the preview is used or expired is always allowed and never re-triggers a new preview or a new payment, per Business Rule 6.

## Task Checklist

### Arch Phase 26 — Wedding Website Backend
- [ ] `WeddingWebsite`/`WeddingWebsiteEvent`/`WeddingWebsiteRsvp` Prisma models, `Payment.purpose`/`Payment.weddingWebsiteId`, `Media.weddingWebsiteId`/`MediaType.WEDDING_WEBSITE_PHOTO`, migration
- [ ] Shared `generateUniqueSlug` helper extracted to `slug.util.ts`; `vendor.service.ts`/`categories.service.ts` refactored to use it
- [ ] `wedding-website` module: draft CRUD (create/get/update), scoped to `ownerUserId` OR `ownerTelegramUserId` — never both, never neither
- [ ] Template listing endpoint (3 seeded templates: Royal Wedding, Minimal Elegant, Traditional Indian Wedding) — template is data-driven (a `template` enum column selecting a renderer), not 3 separate implementations
- [ ] `wedding-website-media` module: upload-request/confirm for cover photo, couple photo, gallery — reuses R2 + processing queue unmodified
- [ ] Preview generation endpoint: enforces the one-free-preview rule (`previewUsedAt` check), generates `generateOpaqueToken()` + `hashToken()`, sets `previewCreatedAt`/`previewExpiresAt` (`now + WEDDING_WEBSITE_PREVIEW_EXPIRY_MINUTES`), marks `previewUsedAt`
- [ ] Public preview-read endpoint (`GET /wedding-website-previews/:token` or similar) — validates hash + expiry, returns only render-necessary fields (no owner info, no payment info), `404`/expired-state on invalid/expired token, never a 500 that leaks which failure mode occurred beyond "not available"
- [ ] Razorpay order-creation endpoint for the ₹49 charge (`purpose: WEDDING_WEBSITE`), reusing `razorpay.client.ts`'s `createOrder` unmodified
- [ ] Webhook `payment.captured` branch extended: `switch(payment.purpose)` dispatches to a new `publishWeddingWebsite(weddingWebsiteId)` — generates slug via the shared helper, sets `status=PUBLISHED`, clears `previewTokenHash`, sets `publishedAt`, all inside the same transaction pattern the subscription-activation path already uses
- [ ] Public published-website read endpoint (`GET /wedding-websites/:slug`) — indexable, full render data, no owner/payment info
- [ ] RSVP submit endpoint (public, rate-limited same as other public write endpoints) + owner-facing RSVP list endpoint
- [ ] `WEDDING_WEBSITE_PRICE_INR` (default 49) and `WEDDING_WEBSITE_PREVIEW_EXPIRY_MINUTES` (default 60) added to `env.ts`, following the existing `.default(...)`-for-feature-knobs convention
- [ ] Telegram flow: `TelegramConversation.flowType`, new `WW_*` states, `START` state's second button, progressive photo-upload handling mid-conversation, handoff to the same draft/preview/payment endpoints the web app uses (not a parallel implementation)
- [ ] Admin read-only visibility: count, owner, template, payment status, website status, created/published date — no admin CRUD beyond visibility, per the feature spec's explicit "do not build a large admin system for this" instruction

## Acceptance Criteria

- All 12 Key Business Rules above hold under live verification, mirroring `07-stage-monetization.md`'s scenario-based acceptance-testing discipline — especially: a second preview attempt after `previewUsedAt` is set does not mint a new token; an expired token is rejected by the backend (not just hidden by the frontend); the draft's own fields are provably untouched after preview expiry; the published website never becomes publicly fetchable before the webhook fires; a duplicate `payment.captured` webhook for the same order does not publish twice or create two `WeddingWebsite` rows.
- The preview and the published website are rendered by the same component/template system, verified by reading the actual render call in both code paths — not by visual inspection alone.
- Payment is verified only server-side; a forged/fabricated `paymentStatus` sent from a hypothetical malicious frontend has no effect on `WeddingWebsite.status`.
- No new payment provider, no new storage provider, no new secure-token scheme, no new webhook route was introduced — every one of those is a reused, existing system per the "Existing Infrastructure Audit" above.

## Dependencies / Sequencing

Depends on: Arch Phase 2 (Auth), Arch Phase 5/6 (Vendor + Media, for the R2/processing-queue reuse), Arch Phase 11 (Subscription & Billing Foundation, for the Razorpay/`Payment`/`WebhookEvent` reuse), Arch Phase 15 (Telegram Bot MVP, for the conversation-state-machine extension). Does not depend on, and is not blocked by, Arch Phases 17–25 (Stage 7) — this stage is independent, parallel scope, not a continuation of the growth/scale sequence.

## Open Questions

- **Vendor-on-behalf-of-client creation is explicitly out of scope for this stage** (see Ownership decision above) — if a future iteration wants a vendor to build a wedding website for a couple client (rather than for themselves), that requires a new "on behalf of" ownership/assignment concept that does not exist anywhere in this codebase today, and should get its own explicit design pass rather than being retrofitted onto the dual-nullable-owner-column model above.
- **RSVP notification**: the feature spec says the website owner should be able to "view RSVP responses from the dashboard" — it does not require real-time notification on a new RSVP. Whether an RSVP submission should trigger an existing `NotificationService` event (Arch Phase 14) is left undecided; default to no notification (dashboard-pull only) unless confirmed otherwise, to avoid over-engineering per the feature spec's own "do not over-engineer RSVP" instruction.
- **Google Maps integration**: per the feature spec's explicit instruction ("do not introduce unnecessary Google API costs for the basic ₹49 product"), `googleMapsUrl` is stored as a plain string (a Maps URL/link the user pastes in, or one the frontend constructs from `venueAddress` via a plain `https://www.google.com/maps/search/?api=1&query=...` link — no Maps API key, no geocoding). Confirm this reading holds at implementation time rather than silently adding a paid Maps API integration.
- **Future pricing tiers** (₹99 Premium, ₹199 Custom Domain, ₹299 Premium Templates, per the feature spec's "Future Extensibility" section) are explicitly not built now. The `PaymentPurpose`/template-enum/data-driven-renderer design above is intentionally extensible for them (a future tier is just a new price constant + a new template enum value + possibly a new `PaymentPurpose` value), but do not add speculative columns/branches for them ahead of time.
