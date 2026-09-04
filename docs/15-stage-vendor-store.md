# Stage 11 — Category-Gated Vendor Mini-Store & Direct Commerce Engine

> **Arch Phase 29**
> Sourced from: Vendor Mini-Store Specification, Admin Category Taxonomy Controls, Direct WhatsApp Commerce Engine, and Codebase Standards Review (`docs/16-vendor-store-plan-review.md`).
> Dependent on: Arch Phase 4 (Category & Location Catalog), Arch Phase 5 (Vendor Module), Arch Phase 6 (Media Pipeline), Arch Phase 27 (Vendor GST Invoices), Arch Phase 28 (Standalone Vendor Portfolio).

---

## 1. Executive Summary & Core Value Proposition

A **Vendor Store** enables eligible wedding vendors to operate an independent, branded mini-store (`/store/:slug` and embedded on `/portfolio/:slug?tab=store`) to list physical products, rental collections, digital invitations, or booking reservation tokens with a shareable URL and direct order capture.

### Key Tenets & Architectural Decisions:
1. **Category-Gated & Optional**: Heavy-consultation services (e.g., Banquet Venues, 1,000-guest Full Catering, Custom Mandap Setup) do not fit an e-commerce catalog. In contrast, product and fixed-package categories (e.g., Return Gifts & Favors, Invitation Cards, Bridal Jewelry Rentals, Trousseau Hampers, Mehendi Cone Kits, Instant Booking Tokens) thrive with catalog browsing.
2. **Admin-Controlled Category Enablement**: Superadmins control which categories are store-eligible directly from the Admin Taxonomy Board (`/admin/categories-locations`). A boolean toggle (`Category.hasStoreEnabled`) controls eligibility.
3. **Live Request-Time Category Resolution (Zero Async Debt)**: Per Coding Rule 10, when an admin disables a category, no background job is run. The public storefront checks `vendor.categories.some(c => c.hasStoreEnabled)` at read time. If disabled, public storefront queries return 404, while vendor order history remains safely archived in the dashboard.
4. **Standard Media Pipeline (No Raw URLs)**: Product photos go through the established `Media` pipeline (`MediaType.STORE_ITEM_PHOTO`) via `VendorStoreItemMedia` join table—enforcing presigned R2 uploads, file-size/MIME gates, moderation checks, and WebP optimization.
5. **Collision-Safe Atomic Order Numbers**: Orders use an atomic, transaction-scoped sequential counter (`VendorStore.nextOrderNumber`), formatted as `ORD-YYYY-XXXX` within `prisma.$transaction`, mirroring `VendorInvoice.invoiceNumber`.
6. **Public Endpoint Rate Limiting**: `POST /api/v1/stores/:slug/orders` is strictly protected by `storeOrderRateLimiter` (5 requests / 15 minutes per IP), registered in `common/middleware/rate-limit.middleware.ts`.
7. **Complete GST Invoicing Handoff**: `VendorStoreItem` captures `gstRate` (`0 | 5 | 12 | 18 | 28`), and orders capture `customerState`. The 1-click invoice conversion automatically maps `placeOfSupply`, calculates CGST/SGST/IGST, and generates a draft `VendorInvoice`.
8. **Strict Multi-Tenant Isolation**: All `/vendor-store/me/*` endpoints resolve vendor identity via `getOwnedVendorOrThrow(req.user.id)` and enforce ownership via `common/policies/ownership.policy.ts`.

---

## 2. Category Gating Architecture

```mermaid
flowchart TD
    Admin["Admin Catalog Board\n(/admin/categories-locations)"] -->|Toggle hasStoreEnabled| Cat["Category: Favors, Jewelry, Invites, etc."]
    Cat -->|Prisma Relation| VC["VendorCategory Mapping"]
    VC -->|Evaluate Eligibility (Live Query)| EligCheck{"Does Vendor have >= 1\nStore-Enabled Category?"}
    EligCheck -->|No| Locked["Vendor Dashboard: Store Tab Hidden\nor Category Ineligible Notice\nPublic /store/:slug returns 404"]
    EligCheck -->|Yes| StoreUnlocked["Vendor Dashboard: '/vendor/store' Unlocked\nCatalog & Orders Management"]
    StoreUnlocked -->|Publish Store| Storefront["Public Storefront:\n/store/:slug & /portfolio/:slug?tab=store"]
```

### Eligibility Resolution Rules:
- A vendor is eligible if their **primary category** or **any assigned secondary category** has `hasStoreEnabled == true`.
- **Live Check**: Verified dynamically at request time. If an admin disables a category, public store access is immediately gated without needing batch data migrations.

---

## 3. Database Schema (Prisma)

### Category, MediaType & VendorInvoice Extension:
```prisma
enum MediaType {
  LOGO
  COVER
  PORTFOLIO
  VIDEO
  REVIEW_PHOTO
  CATEGORY_IMAGE
  WEDDING_WEBSITE_PHOTO
  POPULAR_SEARCH_IMAGE
  BLOG_COVER_IMAGE
  // Arch Phase 29 — Product & rental item photos subject to moderation and worker WebP variants
  STORE_ITEM_PHOTO
}

model Category {
  // Existing fields...
  hasStoreEnabled Boolean @default(false) @map("has_store_enabled")

  @@index([hasStoreEnabled])
}

model VendorInvoice {
  // Existing fields...
  storeOrder VendorStoreOrder? // Back-reference for 1-to-1 relation with VendorStoreOrder.invoiceId
}
```

### Core Models:

```prisma
enum StoreItemType {
  PHYSICAL_PRODUCT   // e.g. Return gifts, trousseau boxes, jewelry
  RENTAL_ITEM        // e.g. Temple jewelry rental, bridal attire rental
  DIGITAL_DOWNLOAD   // e.g. E-invitations, wedding video presets
  SERVICE_TOKEN      // e.g. ₹5,000 date reservation token, trial makeup deposit
}

enum StoreOrderStatus {
  PENDING_CONFIRMATION // Order initiated / WhatsApp sent
  CONFIRMED            // Vendor accepted and acknowledged availability
  PROCESSING           // Packing / crafting in progress
  SHIPPED_OR_READY     // Handed to courier or ready for pickup
  COMPLETED            // Fulfilled & closed
  CANCELLED            // Out of stock or customer cancelled
}

model VendorStore {
  id                 String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  vendorId           String             @unique @map("vendor_id") @db.Uuid
  storeName          String             @map("store_name") // Defaults to business name
  slug               String             @unique @map("slug") // Shareable URL slug
  tagline            String?            @map("tagline")
  aboutStore         String?            @map("about_store") @db.Text
  isEnabled          Boolean            @default(true) @map("is_enabled")
  currency           String             @default("INR") @map("currency")
  whatsappOrderPhone String?            @map("whatsapp_order_phone") // Validated Indian mobile
  shippingPolicy     String?            @map("shipping_policy") @db.Text
  returnPolicy       String?            @map("return_policy") @db.Text
  minOrderValue      Decimal?           @map("min_order_value") @db.Decimal(10, 2)
  nextOrderNumber    Int                @default(1) @map("next_order_number") // Atomic counter for ORD-YYYY-XXXX
  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt          DateTime           @updatedAt @map("updated_at")

  vendor             Vendor             @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  items              VendorStoreItem[]
  orders             VendorStoreOrder[]

  @@map("vendor_stores")
}

model VendorStoreItem {
  id               String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  storeId          String                 @map("store_id") @db.Uuid
  title            String                 @map("title")
  slug             String                 @map("slug")
  description      String?                @map("description") @db.Text
  itemType         StoreItemType          @default(PHYSICAL_PRODUCT) @map("item_type")
  price            Decimal                @map("price") @db.Decimal(10, 2)
  compareAtPrice   Decimal?               @map("compare_at_price") @db.Decimal(10, 2)
  gstRate          Int                    @default(18) @map("gst_rate") // 0, 5, 12, 18, 28 for GST invoice handoff
  minOrderQuantity Int                    @default(1) @map("min_order_quantity")
  stockQuantity    Int?                   @map("stock_quantity") // Null means unlimited / made-to-order
  isAvailable      Boolean                @default(true) @map("is_available")
  tags             String[]               @default([]) @map("tags") // e.g. ["Handmade", "Bestseller"]
  sortOrder        Int                    @default(0) @map("sort_order")
  createdAt        DateTime               @default(now()) @map("created_at")
  updatedAt        DateTime               @updatedAt @map("updated_at")

  store            VendorStore            @relation(fields: [storeId], references: [id], onDelete: Cascade)
  media            VendorStoreItemMedia[]
  orderItems       VendorStoreOrderItem[]

  @@unique([storeId, slug])
  @@index([storeId, isAvailable])
  @@map("vendor_store_items")
}

model VendorStoreItemMedia {
  id        String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  itemId    String          @map("item_id") @db.Uuid
  mediaId   String          @map("media_id") @db.Uuid
  sortOrder Int             @default(0) @map("sort_order")
  createdAt DateTime        @default(now()) @map("created_at")

  item      VendorStoreItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  media     Media           @relation(fields: [mediaId], references: [id], onDelete: Cascade)

  @@unique([itemId, mediaId])
  @@index([itemId, sortOrder])
  @@map("vendor_store_item_media")
}

model VendorStoreOrder {
  id              String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderNumber     String                 @unique @map("order_number") // e.g. ORD-2026-0001
  storeId         String                 @map("store_id") @db.Uuid
  userId          String?                @map("user_id") @db.Uuid // Nullable for guest/WhatsApp checkout
  customerName    String                 @map("customer_name")
  customerPhone   String                 @map("customer_phone")
  customerEmail   String?                @map("customer_email")
  shippingAddress String?                @map("shipping_address") @db.Text
  city            String?                @map("city")
  customerState   String?                @map("customer_state") // For placeOfSupply GST tax calculation
  pincode         String?                @map("pincode")
  eventDate       DateTime?              @map("event_date") // Wedding/event date
  totalAmount     Decimal                @map("total_amount") @db.Decimal(10, 2)
  status          StoreOrderStatus       @default(PENDING_CONFIRMATION) @map("status")
  orderChannel    String                 @default("WHATSAPP") @map("order_channel") // WHATSAPP, DIRECT_WEB
  paymentStatus   String                 @default("PENDING") @map("payment_status") // PENDING, ADVANCE_PAID, PAID
  notes           String?                @map("notes") @db.Text
  invoiceId       String?                @unique @map("invoice_id") @db.Uuid // Linked VendorInvoice once converted
  createdAt       DateTime               @default(now()) @map("created_at")
  updatedAt       DateTime               @updatedAt @map("updated_at")

  store           VendorStore            @relation(fields: [storeId], references: [id], onDelete: Cascade)
  invoice         VendorInvoice?         @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  items           VendorStoreOrderItem[]

  @@index([storeId, status])
  @@index([customerPhone])
  @@map("vendor_store_orders")
}

model VendorStoreOrderItem {
  id                 String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId            String           @map("order_id") @db.Uuid
  itemId             String?          @map("item_id") @db.Uuid
  itemTitle          String           @map("item_title")
  unitPrice          Decimal          @map("unit_price") @db.Decimal(10, 2)
  gstRate            Int              @default(18) @map("gst_rate") // Snapshotted from item
  quantity           Int              @map("quantity")
  totalPrice         Decimal          @map("total_price") @db.Decimal(10, 2)
  customizationNotes String?          @map("customization_notes")

  order              VendorStoreOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  item               VendorStoreItem? @relation(fields: [itemId], references: [id], onDelete: SetNull)

  @@map("vendor_store_order_items")
}
```

---

## 4. API Specification & Security Controls

### Admin Category Controls:
- `PATCH /api/v1/categories/:id`
  - Body: `{ hasStoreEnabled?: boolean }`
  - Auth: Admin only (`requireRole("ADMIN")`).
  - Response: Updated Category object with `hasStoreEnabled`.

### Vendor Self-Service Store API (`/api/v1/vendor-store`):
*All endpoints enforce strict multi-tenant isolation via `getOwnedVendorOrThrow(req.user.id)`.*
- `GET /api/v1/vendor-store/me`: Fetch vendor's store config, items count, orders count, and live category eligibility.
- `POST /api/v1/vendor-store/me`: Initialize or update store profile (name, slug, policies, whatsapp phone, isEnabled).
  - WhatsApp Phone Validation: Sanitized and validated via `/^(?:\+91|91)?[6-9]\d{9}$/`.
- `GET /api/v1/vendor-store/me/items`: List all items in the store (paginated, filterable by status).
- `POST /api/v1/vendor-store/me/items`: Create a store item:
  - Body: `{ title, price, compareAtPrice, gstRate, itemType, minOrderQuantity, stockQuantity, mediaIds: string[], tags }`.
  - Attaches uploaded `Media` rows owned by the vendor (mediaType `STORE_ITEM_PHOTO`).
- `PUT /api/v1/vendor-store/me/items/:id`: Update existing item and attached media sort order.
- `DELETE /api/v1/vendor-store/me/items/:id`: Archive or delete an item.
- `GET /api/v1/vendor-store/me/orders`: List received store orders.
- `PATCH /api/v1/vendor-store/me/orders/:id/status`: Update order status (`CONFIRMED`, `SHIPPED`, etc.).
- `POST /api/v1/vendor-store/me/orders/:id/create-invoice`:
  - Validates `VendorBillingProfile` exists.
  - Automatically maps `order.customerState` to `placeOfSupply` (determining CGST+SGST vs. IGST).
  - Uses itemized `gstRate`, `quantity`, and `unitPrice` to construct line items.
  - Creates draft `VendorInvoice` via `VendorInvoiceService` inside transaction.
  - Links `VendorStoreOrder.invoiceId` and returns the draft invoice for 1-click vendor review.

### Public Storefront API:
- `GET /api/v1/stores/:slug`: Public store metadata, vendor branding, contact details, policies.
  - Returns `404` if vendor's categories have `hasStoreEnabled == false` or `store.isEnabled == false`.
- `GET /api/v1/stores/:slug/items`: Public active items list with optimized WebP media URLs.
- `POST /api/v1/stores/:slug/orders`: Submit a new order inquiry / WhatsApp order intent:
  - **Rate Limiting**: Protected by `storeOrderRateLimiter` (5 requests / 15 min per IP).
  - **Atomic Counter Generation**: Generates `orderNumber` inside transaction:
    ```typescript
    const updatedStore = await tx.vendorStore.update({
      where: { id: store.id },
      data: { nextOrderNumber: { increment: 1 } },
      select: { nextOrderNumber: true },
    });
    const orderNumber = `ORD-${year}-${String(updatedStore.nextOrderNumber).padStart(4, "0")}`;
    ```
  - Saves order with status `PENDING_CONFIRMATION`.
  - Returns formatted WhatsApp URL pre-populated with order details and deep link.
  - Emits `store_order_initiated` analytics event.
