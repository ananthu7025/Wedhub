# WedHub API & Frontend Gap Analysis

> Canonical, code-level gap analysis between the backend APIs (`wedhub-backend`) and the frontend web application (`wedhub-frontend-app`).
> Last updated: 2026-09-03 (incorporates Frontend Arch Phases 0 through 10 and the 2026-09-03 homepage redesign).

---

## 1. Executive Summary & Status Overview

WedHub's backend architecture was designed with extensive domain depth across 34 modules, strict Zod validation schemas, Prisma database relations, and transactional audit logging. The Next.js frontend (`wedhub-frontend-app`) has progressed through **10 of 12 planned Frontend Arch Phases**, expanding backend API consumption from ~40% to ~90%.

### Phase Completion Matrix

| Stage | Phase | Name | Status | Verified Backend Scope |
|---|---|---|:---:|---|
| **Stage 1: Foundation** | Phase 0 | Project Setup & Design System | ✅ Done | CSS tokens, Tailwind v4 @theme, UI primitives |
| | Phase 1 | Auth Flows | ✅ Done | `/auth/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password` |
| **Stage 2: Couple Experience** | Phase 2 | Public Discovery | ✅ Done | `/search/vendors`, `/vendors/:slug`, `/categories`, `/locations`, `/featured-listings` |
| | Phase 3 | Shortlist, Compare & Enquiry | ✅ Done | `/shortlists/favorites/items`, `/comparison/vendors`, `/enquiries/single-vendor` |
| | Phase 4 | Couple Account | ✅ Done | `/enquiries/mine`, `/reviews/mine`, `/review-media/*`, `/notifications/me`, `/users/me` |
| **Stage 3: Vendor Experience** | Phase 5 | Vendor Onboarding & Profile | ✅ Done | `POST /vendors`, `/vendors/me/detail`, `/profile`, `/categories`, `/service-areas`, `/attributes`, `/services`, `/packages`, `/submit`, `/media/*` |
| | Phase 6 | Vendor Leads & Reviews | ✅ Done | `/leads`, `/leads/:id`, `/leads/:id/status`, `/leads/:id/notes`, `/reviews/:id/respond` |
| | Phase 7 | Vendor Monetization & Settings | ✅ Done | `/plans`, `/subscriptions/me/*`, `/vendors/me/analytics`, `/leads/analytics`, `/notifications/me/preferences` |
| **Stage 4: Admin Platform** | Phase 8 | Admin Core | ✅ Done | `/admin/dashboard`, `/admin/vendors/*`, `/admin/users/*`, `/admin/audit-logs` |
| | Phase 9 | Admin Catalog & Moderation | ✅ Done | `/categories/*` (with `includeInactive`), `/locations/*`, `/admin/leads/*`, `/admin/reviews/*` |
| | Phase 10 | Admin Monetization & Governance | ✅ Done | `/admin/plans/*`, `/admin/subscriptions/coupons`, `/admin/roles`, `/admin/permissions`, `/admin/admin-users` |
| **Stage 5: Growth & Scale** | Phase 11 | Telegram Linking & CMS/SEO | ⬜ Not Started | `POST /telegram/link-token`, Category/City SEO landing pages (blocked on backend Arch Phase 17) |
| **Standalone** | — | Vendor Claim Flow | ⬜ Not Started | `/vendors/claim/:token/*` |

---

## 2. Core Registration API Analysis

### 2.1 Backend Contract vs. Frontend Signup Wizard

* **Backend Endpoint**: `POST /api/v1/auth/register` (handled by `registerSchema` in `auth.schema.ts`)
* **Frontend Proxy**: `POST /api/auth/register` (in `app/api/auth/register/route.ts`)
* **Frontend Client UI**: `SignupWizard.tsx` (in `app/(auth)/signup/SignupWizard.tsx`)

#### Field Breakdown:

| Field | Backend Schema | Frontend Form (`SignupWizard.tsx`) | Status / Handling |
|---|---|---|---|
| `email` | `z.string().email()` | Step 1 (`<Input type="email" required />`) | Passed directly |
| `password` | `z.string().min(8).max(128)` | Step 1 (`<Input type="password" minLength={8} required />`) | Passed directly |
| `role` | `z.enum(["END_USER", "VENDOR"])` | Step 2 (Account Type Buttons) | Passed directly |
| `phone` | `z.string().min(6).max(20).optional()` | **Not collected** | **Omitted**: Backend accepts it, but frontend UI never prompts for it |

### 2.2 Why User Details Are Split Across Multiple APIs

1. **User Names (`firstName`, `lastName`)**:
   * The database stores names in `UserProfile` (`user_id`, `first_name`, `last_name`), completely separate from the core `User` authentication credentials (`email`, `password_hash`, `role`).
   * `POST /auth/register` rejects unknown fields. Therefore, the frontend collects names in Step 3 of the wizard and saves them via a secondary, post-login call: `PATCH /api/users/me`.
2. **Couple Wedding Details (`weddingDate`, `budget`, `guestCount`)**:
   * Stored in the `WeddingProfile` table.
   * Collected post-registration in the Couple Account screen via `PUT /api/v1/users/me/wedding-profile`.
3. **Vendor Business Details (`businessName`, categories, pricing)**:
   * Stored in the `Vendor` and `VendorProfile` tables.
   * Collected post-registration during vendor onboarding via `POST /api/v1/vendors` and subsequent `PUT /api/v1/vendors/me/*` calls.

---

## 3. Comprehensive Validation Gaps (Client vs. Server)

A detailed comparison of backend Zod schema constraints versus frontend UI form validations:

| Domain & Field | Backend Validation Rule (Zod) | Frontend Validation (Client UI) | Risk / Behavioral Gap |
|---|---|---|---|
| **Login Identifier** | `z.string().min(1)` (can be email **or** phone) | `<Input type="email" required />` in `LoginForm.tsx` | **Artificial Restriction**: Backend allows phone login; frontend forces email format via HTML5 `type="email"`. |
| **Password Length** | `z.string().min(8).max(128)` | `<Input type="password" minLength={8} />` in `SignupWizard.tsx` | **No Max Length**: Frontend has no `maxLength={128}`. Inputs >128 chars trigger 400 Bad Request. |
| **Enquiry Contact Name** | `z.string().trim().min(1).max(200)` in `enquiry.schema.ts` | `<input required />` in `EnquiryModal.tsx` | **Whitespace & Length Gaps**: HTML `required` allows whitespace strings (`"   "`), which fails backend `trim().min(1)`. Frontend also lacks `maxLength={200}`. |
| **Enquiry Contact Phone** | `z.string().trim().min(6).max(20).optional()` | `<input type="tel" />` in `EnquiryModal.tsx` | **Min/Max Length Missing**: Entering a 3-digit phone passes client validation but fails with 400 Bad Request. |
| **Enquiry Message** | `z.string().trim().max(2000).optional()` | `<textarea rows={3} />` in `EnquiryModal.tsx` | **No Max Length**: Frontend lacks `maxLength={2000}`. |
| **Review Content** | `z.string().trim().max(3000).optional()` in `review.schema.ts` | `<textarea />` in `ReviewForm.tsx` | **No Max Length**: Review text can exceed 3000 chars in UI and fail with a 400 error upon submit. |
| **Review Photo Types** | Only `["image/jpeg", "image/png", "image/webp"]` in `media.schema.ts` | `<input type="file" accept="image/*" />` in `ReviewForm.tsx` | **Invalid MIME Types Allowed**: `accept="image/*"` allows `.gif`, `.bmp`, `.svg`, `.heic`, and `.tiff`. Uploading these crashes with `Unsupported file type` from backend. |
| **Vendor Tags** | `z.array(z.string().min(1).max(50)).max(20)` in `vendor.schema.ts` | Plain comma-separated text `<input />` in `ProfileEditor.tsx` | **Array Bounds Unchecked**: Entering >20 tags or a tag >50 chars causes backend save rejection. |
| **Vendor Languages** | `z.array(z.string().min(1).max(50)).max(20)` | Plain comma-separated text `<input />` in `ProfileEditor.tsx` | **Array Bounds Unchecked**: No checks for max 20 languages or max 50 chars per language. |
| **Vendor Team Size** | `z.coerce.number().int().min(0).max(10000).optional()` | `<input type="number" min="0" />` in `ProfileEditor.tsx` | **No Max Limit**: Frontend does not enforce `max="10000"`. |
| **Vendor Travel Policy** | `z.string().max(500).optional()` | `<textarea />` in `ProfileEditor.tsx` | **No Max Length**: Frontend has no `maxLength={500}`. |
| **Vendor Address** | `z.string().max(300).optional()` | `<textarea />` in `ProfileEditor.tsx` | **No Max Length**: Frontend has no `maxLength={300}`. |
| **Package Inclusions** | `z.array(z.string().min(1).max(200)).max(50)` | Repeatable inputs in `PackageModal.tsx` | **Bounds Unchecked**: Frontend does not enforce max 50 inclusions or max 200 chars per inclusion. |
| **Package Description** | `z.string().max(2000).optional()` | `<textarea />` in `PackageModal.tsx` | **No Max Length**: Frontend textarea has no `maxLength={2000}`. |
| **Guest Count (Wedding)** | `z.coerce.number().int().min(0).max(100000).optional()` | `<input type="number" min="0" />` in `AccountForms.tsx` | **No Max Limit**: Frontend enforces `min="0"`, but omits `max="100000"`. |
| **Partner Name** | `z.string().max(200).optional()` | `<input />` in `AccountForms.tsx` | **No Max Length**: Frontend has no `maxLength={200}`. |
| **Lead Status Reason** | `z.string().max(500).optional()` in `lead.schema.ts` | Dropdown selector in `LeadsBoard.tsx` | **Completely Omitted**: When setting status to `LOST` or `SPAM`, no reason text is captured or sent. |
| **Vendor Suspension Reason** | `z.string().min(1).max(1000)` in `vendor-admin.schema.ts` | `<textarea required />` in Admin Vendor Detail | **No Max Length**: Frontend checks for non-empty text, but lacks `maxLength={1000}`. |
| **User Suspension Reason** | `z.string().min(1).max(500)` in `admin-users.schema.ts` | `<textarea required />` in Admin User Detail | **No Max Length**: Frontend has no `maxLength={500}`. |
| **Category Creation** | `name: min(1).max(150)`, `description: max(2000)` in `categories.schema.ts` | Inputs in `CatalogBoard.tsx` | **Unenforced Text Limits**: Inputs lack `maxLength` limits; empty strings with whitespace bypass HTML required but fail backend `trim()`. |
| **Location Creation** | `name: min(1).max(150)`, `type: ["COUNTRY","STATE","CITY","AREA"]` | Inputs in `LocationTree.tsx` | **No Max Length**: Frontend lacks `maxLength={150}`. |

---

## 4. Endpoint & Parameter Gaps by Domain

### 4.1 Discovery, Search & Catalog
* **Backend Endpoints**: `GET /search/vendors`, `GET /categories`, `GET /locations`, `GET /featured-listings`
* **Gaps**:
  1. `serviceAreaId` is accepted by `searchVendorsQuerySchema`, but the search sidebar only exposes `cityId`.
  2. `attr[<attributeId>]` dynamic category-attribute query parameters are supported by backend SQL, but the search sidebar has no dynamic attribute filter UI.
  3. `GET /search/vendors` does not join `Review` or `Location` in its SQL projection. Rating and city name were omitted from search cards to prevent N+1 queries.
  4. `GET /featured-listings` returns minimal vendor info (`id`, `businessName`, `slug`). Frontend cross-queries `GET /search/vendors` to get cards with pricing and photos.

### 4.2 Vendor Self-Service & Profile Management
* **Backend Endpoints**: `POST /vendors`, `GET /vendors/me/detail`, `PUT /vendors/me/profile`, `PUT /vendors/me/categories`, `PUT /vendors/me/service-areas`, `PUT /vendors/me/attributes`, `POST/DELETE /vendors/me/services`, `CRUD /vendors/me/packages`, `POST /vendors/me/submit`
* **Gaps**:
  1. Omitted profile fields: `latitude`, `longitude`, `currency`, `availabilityNotes`, `seoTitle`, `seoDescription`, `canonicalUrl`.
  2. `socialLinks` accepts any record key on backend; frontend only renders `instagram` and `facebook`.
  3. `attachServiceSchema` supports optional `note: z.string().max(300)`; frontend only provides a checkbox.
  4. 5-Request Save Fan-Out: Clicking "Save changes" in `ProfileEditor.tsx` issues 5 sequential REST calls with no atomic transaction or rollback.

### 4.3 Shortlists & Vendor Comparison
* **Backend Endpoints**: `GET /shortlists`, `POST /shortlists`, `PATCH /shortlists/:id`, `DELETE /shortlists/:id`, `POST/DELETE /shortlists/favorites/items`, `POST/DELETE /shortlists/:id/share`
* **Gaps**:
  1. The frontend hardcodes all interactions to `/favorites/items`. The multi-board creation, renaming, deletion, and partner sharing (`/share`) features are 0% exposed in the UI.
  2. Item notes (`note: z.string().max(300)`) supported by `addItemSchema` are omitted in the UI.
  3. Prisma Decimal values serialize as strings (`"75000"`), requiring client-side numeric coercion before `.toLocaleString()`.

### 4.4 Enquiries & Leads Engine
* **Backend Endpoints**: `POST /enquiries/single-vendor`, `POST /enquiries/multi-vendor`, `GET /enquiries/mine`, `GET /leads`, `PATCH /leads/:id/status`, `POST /leads/:id/notes`
* **Gaps**:
  1. `createSingleVendorEnquirySchema` supports `preferredContactMethod` (`EMAIL`, `PHONE`, `WHATSAPP`), `weddingLocation`, and `serviceId`; the frontend enquiry modal omits all three.
  2. `POST /enquiries/multi-vendor` (batch quote requests) is unconsumed in the frontend.
  3. Lead status update `reason: z.string().max(500)` is omitted in `LeadsBoard.tsx`.

### 4.5 Reviews & Review Media
* **Backend Endpoints**: `POST /reviews`, `GET /reviews/mine`, `GET /vendors/:id/reviews`, `POST /review-media/*`, `POST /reviews/:id/respond`, `POST /reviews/:id/report`, `PATCH /reviews/:id`
* **Gaps**:
  1. `createReviewSchema` accepts `title` and `eventDate`; frontend only collects rating, service, text, and photos.
  2. Review editing (`PATCH /reviews/:id`) and review reporting (`POST /reviews/:id/report`) have no UI.
  3. No private vendor-scoped reviews endpoint: `(vendor)/vendor/reviews` must call public `GET /vendors/:vendorId/reviews`, meaning pending/flagged reviews are invisible to the vendor.

### 4.6 Media & Albums
* **Backend Endpoints**: `POST /media/upload-requests`, `POST /media/:id/confirm`, `GET /media/me`, `PATCH/DELETE /media/:id`, `CRUD /vendors/me/albums`
* **Gaps**:
  1. The entire Album management system (`albumSelfRouter`) is 0% exposed in `PortfolioManager.tsx`.
  2. Caption and tag updates (`PATCH /media/:id`) have no UI editor.

### 4.7 Vendor Monetization & Subscriptions (Phase 7)
* **Backend Endpoints**: `GET /plans`, `GET /subscriptions/me`, `POST /subscriptions/me/upgrade`, `POST /subscriptions/me/cancel`, `POST /subscriptions/me/undo-cancel`, `GET /subscriptions/me/invoices`
* **Gaps**:
  1. Razorpay checkout requires real keys (`NEXT_PUBLIC_RAZORPAY_KEY_ID`); in local dev, `CheckoutButton.tsx` renders a "payments not configured" message.
  2. Yearly billing interval: Seed data includes `YEARLY` plans, but the UI only renders monthly cards.
  3. Entitlements: Only 3 of 8 plan entitlement keys (`portfolio_limit`, `video_limit`, `analytics_level`) are enforced by backend code.

### 4.8 Admin Core & Moderation (Phases 8, 9, 10)
* **Backend Endpoints**: All `/admin/*` routers.
* **Gaps**:
  1. Scalar-only responses on Admin writes: `POST /admin/vendors/:id/approve`, `verify`, etc., return raw scalar `Vendor` rows with zero joined relations (`profile`, `categories`, `owner`). The frontend must merge them into existing state.
  2. Admin leads search: `GET /admin/leads` schema accepts `search`, but the backend SQL query ignores it.
  3. Active Subscriptions table: Mockup shows an active subscriptions list, but backend only has refund/coupon mutation endpoints.
  4. RBAC tables (`Role`, `Permission`, `AdminUser`) exist in DB, but backend `authorize()` middleware only checks `User.role === ADMIN`.

---

## 5. Critical Architectural Disconnects

### Disconnect 1: Notification Preferences Save Path Mismatch
* **Frontend Behavior**: In `AccountForms.tsx`, couple notification toggles call `updateMyProfile()` (`PATCH /api/v1/users/me`), saving to `user_profiles.preferences` JSON.
* **Backend Behavior**: The notification engine (`notification.service.ts`) queries `prisma.notificationPreference` (table `notification_preferences`, managed by `PUT /api/v1/notifications/me/preferences`).
* **Impact**: Changing notification toggles in the couple account page **has zero effect on actual backend email/SMS delivery**. *(Note: Phase 7 created `notification-preferences-client.ts` for the vendor settings page, but the couple account form has not yet been migrated to it).*

### Disconnect 2: Silent Lead Status Updates
* **What Happens**: Vendors advance lead statuses (`CONTACTED` → `RESPONDED` → `WON`) in `LeadsBoard.tsx`.
* **Backend Limitation**: None of the lead update controllers trigger `notificationService.notify()`.
* **Impact**: Couples who submitted enquiries receive **zero in-app or email notifications** when a vendor responds or accepts a booking. They must manually refresh `/enquiries`.

---

## 6. Unimplemented Modules & Upcoming Surface

The following features represent the remaining unbuilt surface:

1. **Phase 11: Growth, SEO & Telegram**:
   * Telegram bot account linking via one-time tokens (`POST /telegram/link-token`).
   * Static category and city SEO landing pages, XML sitemap, and structured JSON-LD data.
2. **CMS & Editorial Content (Backend Arch Phase 17)**:
   * The 2026-09-03 homepage redesign introduced editorial sections (`POPULAR_SEARCH_CARDS`, `REAL_WEDDING_STORIES`, `LATEST_BLOGS`, `GalleryInspiration`). These are currently hardcoded with `TODO(backend)` comments, awaiting dedicated backend CMS models.
3. **Vendor Claim**:
   * Token inspection and onboarding via invitation tokens (`/vendors/claim/:token/*`).
