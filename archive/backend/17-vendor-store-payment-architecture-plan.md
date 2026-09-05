# Stage 13 / Arch Phase 30 — Vendor Marketplace Payment Architecture (Razorpay Route)

> **Implementation Plan & Architectural Blueprint**
> Sourced from an informal root-level brief (formerly `storefrondupdates.md`, folded into this file's "Implementation Log" section below and then deleted — see that section for the full self-reported build log), [`15-stage-vendor-store.md`](15-stage-vendor-store.md) (including its merged-in plan review, §5), and [`01-reference-cross-cutting.md`](01-reference-cross-cutting.md).
> Codebase Standards: Zero direct-binary uploads (Media pipeline only), atomic sequential counters inside `$transaction`, strict rate limiting on public endpoints, thin controllers, services owning business workflows, repositories doing queries only, and multi-tenant security isolation.

---

## 1. Executive Summary & Core Value Proposition

This document outlines the upgrade of the **Vendor Mini-Store** into a full-fledged **multi-vendor direct commerce and booking payment system**.

### Key Tenets & Architectural Decisions
1. **Marketplace Direct Settlement (No Platform Money Holding)**:
   - Payments flow directly from the customer to the vendor's bank account using **Razorpay Route / Linked Accounts** (`POST /v2/accounts`).
   - We do **NOT** operate as an intermediary holding customer funds in our platform bank account.
2. **Zero Platform Commission Initially**:
   - Initial commission is hard-coded to zero (`platformCommission = 0`), with configurable fee structures (`platformCommission`, `paymentGatewayFee`, `vendorSettlementAmount`) to allow future commission models without code refactoring.
3. **Vendor Payment Onboarding in Vendor Dashboard**:
   - Vendors connect their bank account via `/vendor/store/payments`.
   - Tracked states: `NOT_CONNECTED`, `ONBOARDING`, `PENDING_VERIFICATION`, `ACTIVE`, `RESTRICTED`, `DISABLED`.
   - Vendors **never** input Razorpay API keys or secrets.
   - Sensitive bank details (account numbers, IFSC) are stored masked (`•••• 4321`) in our database; Razorpay owns the raw banking tokens.
4. **Vendor Eligibility & WhatsApp Fallback Preservation**:
   - Only vendors with `ACTIVE` payment status have online checkout enabled.
   - For vendors who are not yet connected or are pending verification, the store seamlessly provides the existing **WhatsApp Inquiry & Order** flow. The WhatsApp channel is preserved throughout as a fallback and communication tool.
5. **Separation of Payment States from Order States**:
   - Order Status (`PENDING_CONFIRMATION`, `CONFIRMED`, `PROCESSING`, `SHIPPED_OR_READY`, `COMPLETED`, `CANCELLED`).
   - Payment Status (`CREATED`, `PENDING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`, `CANCELLED`).
   - Payment verification happens strictly server-side. Vendors cannot manually mark unpaid online orders as paid.
6. **Multi-Vendor Cart Protection**:
   - In WedHub, each store is dedicated to a vendor (`/store/:slug`). The backend strictly enforces that all cart items belong to the same `storeId`.
7. **Idempotent Webhooks**:
   - Webhooks are verified using `X-Razorpay-Signature` and logged in `webhook_events` before execution, ensuring duplicate deliveries never result in duplicate orders, settlements, or notifications.

---

## 2. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Customer Experience
        Storefront["Public Storefront (/store/:slug)"]
        Cart["Cart Drawer / Order Preview"]
        CheckElig{"Vendor Payment Account\nACTIVE?"}
        WPFlow["Place Order on WhatsApp\n(Fallback / Inactive Gateway)"]
        PayOnlineAction["Pay Online Securely\n(Razorpay Checkout.js)"]
        VerifyCall["POST /api/v1/stores/:slug/orders/:id/verify-payment"]
        ConfirmedScreen["Order Confirmed Screen\n(#ORD-YYYY-XXXX)"]
    end

    subgraph Backend Core (wedhub-backend)
        OrderRoute["vendorStoreRouter / publicStoreRouter"]
        OrderService["vendor-store.service.ts"]
        PaymentService["vendor-payment.service.ts"]
        RZPClient["integrations/payment/razorpay.client.ts"]
        WebhookRoute["POST /api/v1/webhooks"]
        WebhookService["webhook.service.ts"]
        DB[(PostgreSQL)]
    end

    subgraph Razorpay Rails (India)
        RZPOrders["Razorpay Orders API\n(transfers: [{ account: acc_vendor }])"]
        RZPRoute["Razorpay Route / Linked Account\n(acc_xxxxxxxx)"]
        VendorBank["Vendor Bank Account\n(Direct Settlement)"]
    end

    Storefront --> Cart
    Cart --> CheckElig
    CheckElig -->|No| WPFlow
    CheckElig -->|Yes| PayOnlineAction
    PayOnlineAction --> OrderRoute
    OrderRoute --> OrderService
    OrderService --> PaymentService
    PaymentService --> RZPClient
    RZPClient --> RZPOrders
    RZPOrders -.->|Split upon capture| RZPRoute
    RZPRoute -.->|T+2 Settlement| VendorBank
    PayOnlineAction --> VerifyCall
    VerifyCall --> PaymentService
    PaymentService --> DB
    VerifyCall --> ConfirmedScreen
    RZPOrders -->|Webhook: payment.captured| WebhookRoute
    WebhookRoute --> WebhookService
    WebhookService --> DB
```

---

## 3. Database Schema Changes (`prisma/schema.prisma`)

### 3.1 New Enums

```prisma
enum StorePaymentStatus {
  CREATED
  PENDING
  AUTHORIZED
  CAPTURED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
  CANCELLED
}

enum VendorPaymentAccountStatus {
  NOT_CONNECTED
  ONBOARDING
  PENDING_VERIFICATION
  ACTIVE
  RESTRICTED
  DISABLED
}
```

### 3.2 New Models

```prisma
model VendorPaymentAccount {
  id                     String                     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  vendorId               String                     @unique @map("vendor_id") @db.Uuid
  provider               String                     @default("razorpay")
  razorpayAccountId      String?                    @unique @map("razorpay_account_id") // acc_xxxxxxxx
  status                 VendorPaymentAccountStatus @default(NOT_CONNECTED)
  legalBusinessName      String?                    @map("legal_business_name")
  businessType           String?                    @map("business_type") // individual, proprietorship, partnership, private_limited
  contactEmail           String?                    @map("contact_email")
  contactPhone           String?                    @map("contact_phone")
  bankName               String?                    @map("bank_name")
  accountNumberMasked    String?                    @map("account_number_masked") // e.g. "•••• •••• 1234"
  ifscCode               String?                    @map("ifsc_code")
  chargesEnabled         Boolean                    @default(false) @map("charges_enabled")
  payoutsEnabled         Boolean                    @default(false) @map("payouts_enabled")
  onboardingUrl          String?                    @map("onboarding_url") @db.Text
  onboardingUrlExpiresAt DateTime?                  @map("onboarding_url_expires_at")
  kycDetails             Json?                      @map("kyc_details")
  createdAt              DateTime                   @default(now()) @map("created_at")
  updatedAt              DateTime                   @updatedAt @map("updated_at")

  vendor                 Vendor                     @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  orders                 VendorStoreOrder[]

  @@index([status])
  @@map("vendor_payment_accounts")
}

model VendorStoreOrderRefund {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId          String   @map("order_id") @db.Uuid
  razorpayRefundId String?  @unique @map("razorpay_refund_id")
  amount           Decimal  @db.Decimal(10, 2)
  currency         String   @default("INR")
  status           String   @default("PROCESSED") // PENDING, PROCESSED, FAILED
  reason           String?  @map("reason")
  createdAt        DateTime @default(now()) @map("created_at")

  order            VendorStoreOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@map("vendor_store_order_refunds")
}
```

### 3.3 Modified Models

#### `Vendor`
```prisma
model Vendor {
  // Existing fields...
  paymentAccount VendorPaymentAccount?
}
```

#### `VendorStoreOrder`
```prisma
model VendorStoreOrder {
  id                     String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderNumber            String                 @unique @map("order_number")
  storeId                String                 @map("store_id") @db.Uuid
  userId                 String?                @map("user_id") @db.Uuid
  customerName           String                 @map("customer_name")
  customerPhone          String                 @map("customer_phone")
  customerEmail          String?                @map("customer_email")
  shippingAddress        String?                @map("shipping_address") @db.Text
  city                   String?                @map("city")
  customerState          String?                @map("customer_state")
  pincode                String?                @map("pincode")
  eventDate              DateTime?              @map("event_date")
  
  // Financial breakdown
  subtotal               Decimal                @default(0) @map("subtotal") @db.Decimal(10, 2)
  discount               Decimal                @default(0) @map("discount") @db.Decimal(10, 2)
  gstAmount              Decimal                @default(0) @map("gst_amount") @db.Decimal(10, 2)
  totalAmount            Decimal                @map("total_amount") @db.Decimal(10, 2)
  currency               String                 @default("INR") @map("currency")

  // State separation
  status                 StoreOrderStatus       @default(PENDING_CONFIRMATION) @map("status")
  paymentStatus          StorePaymentStatus     @default(PENDING) @map("payment_status")
  orderChannel           String                 @default("WHATSAPP") @map("order_channel") // WHATSAPP or ONLINE

  // Payment rails snapshot
  paymentProvider        String                 @default("razorpay") @map("payment_provider")
  razorpayOrderId        String?                @unique @map("razorpay_order_id")
  razorpayPaymentId      String?                @unique @map("razorpay_payment_id")
  vendorPaymentAccountId String?                @map("vendor_payment_account_id") @db.Uuid
  platformCommission     Decimal                @default(0) @map("platform_commission") @db.Decimal(10, 2)
  gatewayFee             Decimal                @default(0) @map("gateway_fee") @db.Decimal(10, 2)
  vendorSettlementAmount Decimal?               @map("vendor_settlement_amount") @db.Decimal(10, 2)
  paidAt                 DateTime?              @map("paid_at")

  notes                  String?                @map("notes") @db.Text
  invoiceId              String?                @unique @map("invoice_id") @db.Uuid
  createdAt              DateTime               @default(now()) @map("created_at")
  updatedAt              DateTime               @updatedAt @map("updated_at")

  store                  VendorStore            @relation(fields: [storeId], references: [id], onDelete: Cascade)
  invoice                VendorInvoice?         @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  vendorPaymentAccount   VendorPaymentAccount?  @relation(fields: [vendorPaymentAccountId], references: [id], onDelete: SetNull)
  items                  VendorStoreOrderItem[]
  refunds                VendorStoreOrderRefund[]

  @@index([storeId, status])
  @@index([customerPhone])
  @@index([paymentStatus])
  @@map("vendor_store_orders")
}
```

---

## 4. Razorpay Integration & Route API Details

### 4.1 Linked Account Creation (Route)
Under the India Razorpay Route integration:
- Primary merchant creates Linked Accounts using `POST https://api.razorpay.com/v2/accounts`.
- Payload parameters:
  - `email`, `phone`, `type: "standard"`, `legal_business_name`, `business_type`.
  - Linked Bank Account details or Stakeholder details.
- Razorpay returns `id: "acc_xxxxxxxxx"`, `status: "created" | "activated"`.

### 4.2 Split Payment via Orders API
When a customer checks out an online store order:
```typescript
const razorpayOrder = await razorpayClient.orders.create({
  amount: Math.round(totalAmount * 100), // in paise
  currency: "INR",
  receipt: order.orderNumber,
  transfers: [
    {
      account: vendorPaymentAccount.razorpayAccountId, // e.g. "acc_12345678"
      amount: Math.round(vendorSettlementAmount * 100), // in paise
      currency: "INR",
      notes: {
        storeOrderId: order.id,
        orderNumber: order.orderNumber,
        vendorId: store.vendorId,
      },
      on_hold: 0, // Auto-settle per standard schedule
    },
  ],
  notes: {
    purpose: "VENDOR_STORE_ORDER",
    storeOrderId: order.id,
    orderNumber: order.orderNumber,
    vendorId: store.vendorId,
    storeSlug: store.slug,
  },
});
```

### 4.3 Refunds with Reverse Transfers
When an order is refunded (full or partial):
```typescript
await razorpayClient.payments.refund(order.razorpayPaymentId, {
  amount: Math.round(refundAmount * 100),
  reverse_all: 1, // Automatically reverses the funds from the vendor's linked account
  notes: {
    orderId: order.id,
    reason: refundReason,
  },
});
```

---

## 5. API Endpoints Specification

### 5.1 Public Endpoints (`/api/v1/stores/:slug`)

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/stores/:slug` | Public | None | Returns store profile including `isOnlinePaymentEnabled: boolean` |
| `POST` | `/api/v1/stores/:slug/orders` | Public | Strict (`storeOrderRateLimiter`) | Creates order atomically. If `paymentMethod === 'ONLINE'`, generates Razorpay order and returns client credentials |
| `POST` | `/api/v1/stores/:slug/orders/:id/verify-payment` | Public | Strict (`storePaymentVerifyRateLimiter`) | Verifies Checkout.js HMAC signature (`order_id\|payment_id`), provisionally marks payment `CAPTURED`, advances order to `CONFIRMED` |

### 5.2 Vendor Dashboard Endpoints (`/api/v1/vendor-store/me`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/vendor-store/me/payment-account` | Vendor | Fetch payment account status, masked bank info, settlement totals |
| `POST` | `/api/v1/vendor-store/me/payment-account/connect` | Vendor | Submit bank & business details to initiate Razorpay Route onboarding |
| `GET` | `/api/v1/vendor-store/me/payments/summary` | Vendor | Financial summary: Total GMV, Settled Amount, Pending Settlements |
| `POST` | `/api/v1/vendor-store/me/orders/:id/refund` | Vendor | Issue full/partial refund with reverse transfer |

### 5.3 Webhooks (`/api/v1/webhooks`)

| Event Type | Action |
|---|---|
| `payment.captured` | Idempotently marks `VendorStoreOrder.paymentStatus = 'CAPTURED'`, `orderStatus = 'CONFIRMED'`, triggers vendor notifications |
| `payment.failed` | Marks `VendorStoreOrder.paymentStatus = 'FAILED'` |
| `refund.processed` | Records `VendorStoreOrderRefund`, updates order to `REFUNDED` or `PARTIALLY_REFUNDED` |
| `account.updated` / `account.activated` | Updates `VendorPaymentAccount.status` (e.g. to `ACTIVE` or `RESTRICTED`) |

### 5.4 Superadmin Endpoints (`/api/v1/admin/store-payments`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/admin/store-payments/overview` | Admin | Total GMV, Paid Orders count, Failed payments count, Total Refunds |
| `GET` | `/api/v1/admin/store-payments/accounts` | Admin | Table of all vendor payment accounts and KYC states |
| `GET` | `/api/v1/admin/store-payments/orders` | Admin | Global store orders & payments ledger |

---

## 6. Frontend Architecture & Screens (`wedhub-frontend-app`)

### 6.1 Public Storefront & Mini-Cart Drawer (`CartDrawer.tsx`)
- Detects `store.isOnlinePaymentEnabled`:
  - **If True**: Offers payment method radio selection:
    - 💳 **Pay Online Now** (Credit/Debit Card, UPI, NetBanking via Razorpay) — *Default*
    - 💬 **Order & Inquire via WhatsApp**
  - **If False**: Defaults seamlessly to existing WhatsApp order button: `"Place Order on WhatsApp"`.
- When "Pay Online Now" is clicked:
  - Calls `createPublicStoreOrder` with `paymentMethod: 'ONLINE'`.
  - Receives `orderId`, `orderNumber`, `razorpayOrderId`, `amount`, and `keyId`.
  - Opens Razorpay standard checkout modal.
  - On handler callback, sends `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` to `/verify-payment`.
  - Transitions to **"Payment Successful"** screen with order summary and optional WhatsApp link to notify the vendor.

### 6.2 Vendor Dashboard — Payments & Settlements (`/vendor/store/payments`)
- **Status Header**:
  - `NOT_CONNECTED`: Banner explaining online payments with a **"Connect Bank Account"** button.
  - `PENDING_VERIFICATION`: "Account Under Verification" notice.
  - `ACTIVE`: Green "Online Payments Active" badge.
- **Onboarding Modal**:
  - Legal business name, business entity type, contact email/phone, bank account number, IFSC code.
  - Submits to backend without exposing secrets.
- **Financial Metric Cards**:
  - Total Store Sales (GMV)
  - Paid Orders
  - Completed Settlements
  - Pending Settlements
- **Settlement & Transaction Ledger**:
  - Order Number, Customer, Amount, Settlement Amount, Payment Status, Date.
  - Action to trigger refunds for paid orders.

### 6.3 Vendor Store Orders Manager (`/vendor/store/orders`)
- Extended table columns:
  - **Order Number** & Date
  - **Customer Details**
  - **Order Status** (`CONFIRMED`, `PROCESSING`, `SHIPPED_OR_READY`, `COMPLETED`, `CANCELLED`)
  - **Payment Status Badge** (`PAID`, `PENDING`, `FAILED`, `REFUNDED`)
  - **Actions**: WhatsApp Chat deep link, Create GST Invoice, Issue Refund.

### 6.4 Admin Marketplace Finance Dashboard (`/admin/store-payments`)
- Metrics: Total Platform GMV, Commission Collected (₹0), Total Orders Paid, Total Refunds.
- Vendor Accounts Table: Vendor name, Razorpay Account ID, Status, Bank Name, Created Date.
- Global Orders Ledger: Searchable across all vendors and dates.

---

## 7. Security & Risk Mitigation

1. **Monetary Integrity**:
   - The frontend never submits total amount or item prices.
   - The server queries database prices and GST rates to compute subtotal, GST, and total.
2. **Multi-Vendor Isolation**:
   - Every cart checkout validates that all item IDs belong to the specified `storeSlug`. Mixed carts are rejected with a 400 validation error.
3. **Multi-Tenant Protection**:
   - All `/vendor-store/me/*` routes resolve vendor identity strictly via `getOwnedVendorOrThrow(req.user.id)`. Vendors cannot view or refund orders belonging to other stores.
4. **Secret Isolation**:
   - `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are strictly backend-only. The frontend receives only `RAZORPAY_KEY_ID`.
5. **Idempotent Webhooks**:
   - Duplicate webhook deliveries are rejected at the database level via unique constraint on `webhook_events.event_id`.

---

## 8. Migration & Rollout Plan

1. **Database Migration**:
   - Generate and apply Prisma migration `add_vendor_store_marketplace_payments`.
   - Existing store orders retain their existing rows with `paymentStatus = 'PENDING'` and `orderChannel = 'WHATSAPP'`.
2. **Backend Services Deployment**:
   - Deploy `vendor-payment` module, extended `razorpay.client.ts`, and updated `webhook.service.ts`.
3. **Frontend Deployment**:
   - Deploy updated `CartDrawer.tsx`, `/vendor/store/payments`, and `/admin/store-payments`.
4. **Verification**:
   - Verify Razorpay test payments end-to-end via Playwright spec `phase-16-store-payments.spec.ts`.

---

## Implementation Log (self-reported by the implementing agent, 2026-09-05)

> Moved verbatim from `storefrondupdates.md` (deleted after this move — its earlier sections were the informal source brief this plan formalized above; this section is its own record of what was actually built). **Status: schema models referenced below (`VendorStoreSettlement`, `VendorStorePaymentAttempt`, `razorpayStakeholderId`, `routeActivationStatus`, etc.) were spot-checked as real against `prisma/schema.prisma` on 2026-09-05. The 29 individual claims in §18 below (reservation-based inventory concurrency, refund/transfer reversal tracking, KYC hosted-onboarding flow, transfer reconciliation, etc.) have NOT been independently re-verified point-by-point — an earlier commit-diff audit found the payment core (webhook idempotency, ownership checks, atomic order numbering, FK/constraint discipline) sound, but did not check each claim below individually. Treat this section as a claimed changelog, not a verified one, until spot-checked.**

### 1. Architecture Overview

Upgraded WedHub's Vendor Mini-Store from a WhatsApp-only inquiry system into a multi-vendor direct commerce & booking marketplace using Razorpay Route (linked accounts & automated split settlements) in India with 0% platform commission (`platformCommission = 0`).

```text
Customer
   ↓
Vendor Store (/store/:slug)
   ↓
Cart Drawer & Checkout Selection (Online Payment vs. WhatsApp Order)
   ↓
Razorpay Route Checkout.js (orders.create with transfers split payload)
   ↓
Server-Side HMAC-SHA256 Signature Verification & Idempotent Webhook
   ↓
Settled Directly to Vendor's Linked Bank Account (0% Platform Fee)
```

Key principles claimed: direct (non-pooled) settlement; dual-channel ordering (WhatsApp remains available for vendors not yet payment-connected); a decoupled state machine (`StoreOrderStatus` for fulfillment vs. `StorePaymentStatus` for financial truth — only verified gateway responses set `CAPTURED`); zero platform commission baseline (`vendorSettlementAmount = totalAmount - gatewayFee`).

### 2. Database changes claimed

New enums: `StorePaymentStatus` (`CREATED`/`PENDING`/`AUTHORIZED`/`CAPTURED`/`FAILED`/`REFUNDED`/`PARTIALLY_REFUNDED`/`CANCELLED`), `VendorPaymentAccountStatus` (`NOT_CONNECTED`/`ONBOARDING`/`PENDING_VERIFICATION`/`ACTIVE`/`RESTRICTED`/`DISABLED`). New models: `VendorPaymentAccount` (1:1 with vendor; masked bank details only), `VendorStoreOrderRefund`. Extended `VendorStoreOrder` with subtotal/discount/gstAmount/platformCommission/gatewayFee/vendorSettlementAmount/paymentStatus/paymentProvider/razorpayOrderId/razorpayPaymentId/vendorPaymentAccountId/paidAt.

### 3. Backend modules/services claimed created

`src/modules/vendor-payments/` (types/schema/repository/service/controller/routes), `src/modules/admin-store-payments/` (marketplace metrics, connected-accounts ledger, orders ledger), extensions to `src/integrations/payment/razorpay.client.ts` (`createLinkedAccount`, `fetchLinkedAccount`, `createOrder` with Route `transfers` payload, `createRefund` with `reverseTransfer: true`), and webhook handling in `webhook.service.ts` for `notes.purpose === "VENDOR_STORE_ORDER"` on `payment.captured`/`payment.failed`/`refund.processed`/`account.updated`.

### 4. API endpoints claimed created/modified

| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/api/v1/vendor-store/me/payment-account` | Vendor | Get vendor linked bank account details |
| `POST` | `/api/v1/vendor-store/me/payment-account/connect` | Vendor | Connect/update bank account via Razorpay Route |
| `GET` | `/api/v1/vendor-store/me/payment-summary` | Vendor | GMV, settled amounts, and refund metrics |
| `POST` | `/api/v1/vendor-store/me/orders/:id/refund` | Vendor | Issue full or partial refund with reverse transfer |
| `POST` | `/api/v1/stores/:slug/orders` | Public (Rate-Limited) | Create store order (returns `whatsappUrl` or `razorpayOrderId`) |
| `POST` | `/api/v1/stores/:slug/orders/:id/verify-payment` | Public (Rate-Limited) | Cryptographic signature verification and payment capture |
| `GET` | `/api/v1/admin/store-payments/accounts` | Admin | List all connected vendor payment accounts |
| `GET` | `/api/v1/admin/store-payments/orders` | Admin | Global marketplace orders ledger |
| `GET` | `/api/v1/admin/store-payments/metrics` | Admin | Global GMV, settlements, and commission metrics |

**Historical note — discrepancy since fixed:** this section originally documented a table entry claiming `GET /admin/store-payments/metrics` as a real route; it was not — the actually-registered route is `/overview` (`admin-store-payments.routes.ts`), with a differently-shaped response than the frontend originally assumed. This was found during a 2026-09-05 audit and **fixed the same day**: the frontend now calls `/overview` and uses its real field names (`totalRefundsAmount`/`activeAccountsCount`/`totalAccounts`/`totalPlatformCommission`) — see the "Public-data caching / payment-bug fixes" entries in `18-session-handoff-2026-09-05.md` and `16-review-feedback-tasklist-backend.md` for the fix detail. The table row above (`/admin/store-payments/metrics`) is left as originally written for historical accuracy — the real route is `/overview`, not `/metrics`.

### 5. Frontend pages/components claimed created/modified

`CartDrawer.tsx` (payment-method toggle, Razorpay Checkout script loading, verification handler, success screen), `app/(vendor)/vendor/store/payments/page.tsx` + `PaymentsBoard.tsx` (0% commission banner, bank-linking form, settlement/GMV metric cards, online-orders ledger with refund modal), `StoreNavTabs.tsx` ("Payments & Payouts" tab), `StoreOrdersTable.tsx` (payment-status badges), `app/(admin)/admin/store-payments/page.tsx` + `AdminStorePaymentsBoard.tsx`, `AdminShell.tsx` ("Marketplace settlements" nav item).

### 6. Razorpay integration details claimed

Account type: Route Linked Account (`type: "standard"`). Payment method: standard Checkout.js. Transfer configuration includes `on_hold: 0` (instant settlement) and per-transfer `notes` (`storeOrderId`/`orderNumber`/`vendorId`). Signature verification: HMAC-SHA256 over `${razorpayOrderId}|${razorpayPaymentId}` with `RAZORPAY_KEY_SECRET`.

### 7-10. Vendor onboarding / payment / webhook / refund flows claimed

Vendor onboarding: fills legal entity/business structure/contact/bank details at `/vendor/store/payments` → backend calls Route `POST /v2/accounts` → stores masked account number, sets status `ACTIVE`. Payment flow: cart → "Pay Online Securely" → order created `PENDING` → Razorpay order with linked-account transfer → Checkout modal → `POST .../verify-payment` → signature + gateway-fetch verification → `paymentStatus = CAPTURED`. Webhook flow: signature verify → idempotency check against `webhook_events` → match `notes.purpose === "VENDOR_STORE_ORDER"` → atomic status transition. Refund flow: vendor selects refund (full/partial) with reason → Razorpay `POST /v1/payments/:id/refund` with `reverse_all: 1` → `VendorStoreOrderRefund` row created → order `paymentStatus` updated to `REFUNDED`/`PARTIALLY_REFUNDED`.

### 11-15. Security, environment variables, migration, testing, edge cases claimed

Security: bank account numbers never persisted in plain text (masked only); no gateway secrets exposed client-side; all monetary totals computed server-side; payment status changeable only via signature/webhook, never manually; public order/verify endpoints rate-limited. Env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `FRONTEND_URL`. Migration: `20260905093000_add_vendor_store_marketplace_payments`. Testing: `npm run test:unit` (schema/masking/commission-math checks), full typecheck + build on both projects. Edge cases claimed handled: vendor-not-connected (WhatsApp fallback), minimum order value (server+client enforced), duplicate webhook delivery (idempotency key), abandoned/dismissed payment modal (stays `PENDING`), over-refund protection (server-validated against refundable balance).

### 16. Razorpay/business requirements before production (claimed pending, operator-side)

Activate Razorpay Route on the dashboard; complete platform KYC; configure webhook URL subscribing to `payment.captured`/`payment.failed`/`refund.processed`/`transfer.processed`/`transfer.failed`; vendor linked accounts complete standard Razorpay digital onboarding verification.

### 17. "Real-World Production Gap Resolutions (Stage 13 Completion)" — claimed

1. Zero platform loss & gateway-fee retention: `calculateOrderFinancials` deducts `gatewayFee` from `totalAmount` so `vendorSettlementAmount = totalAmount - gatewayFee`; claims `tests/unit/vendor-payments.spec.ts` proves `gatewayFee + vendorSettlementAmount === totalAmount` with zero rounding error.
2. Atomic inventory decrement on payment capture (`markOrderPaymentCaptured`), `isAvailable = false` at zero stock.
3. `transfer.processed`/`transfer.failed` webhook handlers; bounced Route settlements append `[TRANSFER_BOUNCE: ...]` to the order and alert the vendor.
4. Hosted KYC onboarding via `createAccountLink` (`POST /v2/accounts/:id/account_links`), exposed as `POST /vendor-store/me/payment-account/kyc-link`.
5. Refund modal shows Order Total / Settled to Bank / Gateway Fee breakdown; banking-network notice that ~2.36% network fees are non-refundable.
6. `cleanupStalePendingOrders(olderThanMinutes = 60)` + admin trigger `POST /admin/store-payments/cleanup?minutes=60`.
7. Linked accounts default to `PENDING_VERIFICATION`/`chargesEnabled: false`/`payoutsEnabled: false`; online checkout gated on `status === "ACTIVE" && chargesEnabled && payoutsEnabled`, else WhatsApp fallback. `estimatedGatewayFee` vs. `actualGatewayFee` (reconciled from the `payment.captured` webhook's `payment.fee`). New `VendorStoreTransfer` entity tracking transfer lifecycle.
8. Enriched `idempotencyKeyFor` with `transfer?.entity.id`/`account?.entity.id`; a `transferAmountInPaise >= 100` guard against sub-rupee Route transfers; `createStorePaymentOrder` wrapped in try/catch inside `createStoreOrder` to mark orders `FAILED`/`CANCELLED` rather than leaving unpayable ghost orders; `Math.round(grandTotal * 100)` in `CartDrawer.tsx` against floating-point drift.

### 18. "Razorpay Route — Complete Test Mode Architecture & Final Audit Implementation (Stage 14)" — claimed, 29 points

All 29 points below are as self-reported by the implementing agent — preserved verbatim for reference, not yet independently re-verified point-by-point:

1. Full 4-step Route onboarding sequence (`POST /v2/accounts` → `POST /v2/accounts/:id/stakeholders` → `POST /v2/accounts/:id/products` → `PATCH /v2/accounts/:id/products/:id`) plus hosted account-onboarding links.
2. Extended `VendorPaymentAccount`: `razorpayStakeholderId` (unique), `razorpayRouteProductId` (unique), `razorpayAccountStatus`, `bankVerificationStatus`, `bankVerificationFailureReason`, `routeActivationStatus`, `routeRequirements`, `linkedAccountCreatedAt`, `transferEligibleAt`, `lastProviderSyncAt` — masked bank info only.
3. Centralized `canVendorAcceptOnlinePayments` in `vendor-payment.service.ts` (checks linked-account presence/active status/bank verification/active Route product/cooling-period expiry/provider capabilities), reused across storefront availability and checkout.
4. Removed reliance on local unbacked capability booleans — capabilities derived from provider API payloads.
5. `syncVendorPaymentAccountFromRazorpay(vendorId)` + `POST /vendor-store/me/payment-account/sync` + a "Sync Status" dashboard button.
6. Transfer-via-order: server-computed `transfers` payload, `currency: "INR"`, `partial_payment: false`, documented `on_hold: 0`.
7. Separated "Transfer Processed" (funds allocated to linked account) from "Settled to Bank" (confirmed provider settlement with UTR, via a new `VendorStoreSettlement` model); removed an artificial T+2 fallback timer.
8. New first-class `VendorStoreSettlement` model (`providerSettlementId` unique, `recipientAccountId`, `vendorId`, `orderId`, `amount`, `fees`, `tax`, `utr`, `status`, `processedAt`, `reconciledAt`).
9. Decoupled `transfer.failed` from `payment.failed` — a failed transfer doesn't invalidate the customer's already-captured payment; a separate vendor alert fires instead.
10. Hardened `VendorStoreTransfer` fields (`orderId`, `vendorId`, `paymentAccountId`, `razorpayOrderId`, `razorpayPaymentId`, `providerTransferId` unique, `amount`, `currency`, `status`, `failureCode`, `failureReason`, `processedAt`, `reversedAt`).
11. `reconcileTransfersForStoreOrder(orderId)` + admin endpoint `POST /admin/store-payments/orders/:id/reconcile`.
12. Distinguishes `estimatedGatewayFee` (pre-capture) from `actualGatewayFee` (provider-confirmed via webhook/reconciliation) — no more hardcoded 2%/2.36% assumption.
13. `platformCommission = 0` strictly server-enforced, not client-alterable.
14. New first-class `VendorStorePaymentAttempt` model preserving attempt history across payment retries.
15. Checkout idempotency via unique order numbering + customer checkout session tokens.
16. Server-side HMAC-SHA256 signature verification plus a provider payment-fetch verification before marking `CAPTURED`.
17. `payment.captured` webhook handles the browser-closed-before-frontend-verification case, confirming the order and updating inventory exactly once.
18. Webhook idempotency/dedup extended across `payment.captured`/`payment.failed`/`transfer.processed`/`transfer.failed`/`transfer.reversed`/`refund.processed`/account lifecycle events.
19. Inventory reservation strategy: subtracts items reserved by active checkout sessions from the last 15 minutes before accepting new checkouts, plus an atomic decrement on capture, to prevent overselling.
20. `cleanupStalePendingOrders` transitions stale orders to `CANCELLED` (never deletes) and expires pending payment attempts, preserving the audit trail.
21. `VendorStoreOrderRefund` state machine (`CREATED`/`PENDING`/`PROCESSED`/`FAILED`) supporting full/partial refunds with cumulative-balance validation.
22. On refund, the corresponding `VendorStoreTransfer` transitions to `REVERSED`/`PARTIALLY_REVERSED` with a `reversedAt` timestamp and a provider reversal call.
23. Refund idempotency/over-refund prevention via transactional locks ensuring `alreadyRefunded + refundAmount <= totalAmount`.
24. Unique constraints on `razorpayAccountId`, `razorpayStakeholderId`, `razorpayRouteProductId`, `providerTransferId`, `razorpayPaymentId`, `providerSettlementId`.
25. `isValidPaymentStatusTransition`/`isValidTransferStatusTransition` state-machine guardrails. **Note (confirmed 2026-09-05):** these functions exist and are exported but were found NOT to be called from any service/repository code — the guard logic currently lives only in tests, not production enforcement.
26. Frontend Payments board: 6 onboarding states (Not Connected/Setup in Progress/Verification Pending/Additional Information Required/Online Payments Active/Restricted), 6 metric cards, a "Sync Status" button.
27. 29 unit tests in `tests/unit/vendor-payments.spec.ts` covering onboarding eligibility, cooling periods, financial math, state machines, webhook decoupling.
28. Claimed: backend typecheck 0 errors, `npm run test:unit` 29/29 passing; frontend `tsc --noEmit` 0 errors. **Confirmed independently 2026-09-05:** both projects do typecheck cleanly at this commit.
29. Claimed: entire Route pipeline is test-mode ready for end-to-end sandbox verification. **Not independently verified** — no real Razorpay test-mode credentials have been exercised against this flow in this environment (consistent with the long-standing, previously-documented limitation that this environment has no real Razorpay sandbox account).
