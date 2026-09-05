# Stage 13 / Arch Phase 30 — Vendor Marketplace Payment Architecture (Razorpay Route)

> **Implementation Plan & Architectural Blueprint**
> Sourced from: `storefrondupdates.md`, `docs/15-stage-vendor-store.md`, `docs/16-vendor-store-plan-review.md`, and `docs/01-reference-cross-cutting.md`.
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
