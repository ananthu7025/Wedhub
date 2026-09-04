## Implement Proper Vendor Marketplace Payment Architecture

We currently have a Vendor Store feature where vendors can create a store, list products/services/packages, generate a shareable URL, and customers can place orders. Currently, after placing an order, the order is collected and forwarded to WhatsApp.

I want to upgrade this into a proper **multi-vendor commerce/booking payment system**.

### Core requirement

Customers should be able to:

```text
Vendor Store
→ Browse products/services/packages
→ Add to cart / select package
→ Checkout
→ Pay online
→ Payment verified
→ Order/booking confirmed
→ Vendor notified
```

The payment should ultimately be settled to the **vendor's bank account**, rather than permanently passing through our platform's bank account.

We do NOT want the architecture:

```text
Customer → Our Bank Account → Vendor Bank Account
```

Instead, implement a proper **marketplace / connected-account payment architecture** using the appropriate Razorpay marketplace/split-settlement capability currently available for India.

---

## IMPORTANT: Audit Before Implementation

First inspect the entire existing codebase and understand:

* Current Vendor Store architecture
* Vendor schema/model
* Store schema/model
* Product/service/package schema
* Cart implementation
* Current order schema/model
* Current checkout flow
* WhatsApp order forwarding
* Authentication/authorization
* Vendor dashboard
* Customer checkout
* Existing Razorpay integration, if any
* Existing webhook implementation
* Existing payment-related environment variables
* Existing notification system
* Existing commission/fee logic
* Existing order status logic

Do NOT blindly create duplicate models or payment logic.

Reuse existing architecture wherever appropriate.

---

# Payment Architecture

Implement a marketplace payment architecture where:

```text
Customer
    ↓
itsmyKalyanam Store
    ↓
Checkout
    ↓
Razorpay
    ↓
Vendor's connected/linked payment account
    ↓
Vendor bank account
```

The platform should NOT require vendors to integrate Razorpay themselves.

Instead:

```text
Vendor Dashboard
    ↓
Enable Online Payments
    ↓
Razorpay seller/connected-account onboarding
    ↓
KYC + bank verification
    ↓
Payment account connected
    ↓
Vendor can receive online orders
```

The vendor should never need to enter Razorpay API keys or secrets into our application.

---

# Vendor Payment Onboarding

Add a proper payment onboarding section in the Vendor Dashboard.

Example:

```text
Payment Settings

Online Payments
Status: Not Connected

[Connect Bank Account]
```

After clicking:

```text
itsmyKalyanam
    ↓
Razorpay onboarding
    ↓
Vendor completes required KYC/bank details
    ↓
Return to itsmyKalyanam
```

Store the appropriate Razorpay connected-account/reference ID securely.

Track states such as:

```text
NOT_CONNECTED
ONBOARDING
PENDING_VERIFICATION
ACTIVE
RESTRICTED
DISABLED
```

Do not store unnecessary sensitive banking/KYC information in our database.

---

# Vendor Eligibility

A vendor should NOT be able to accept online payments until their payment account is properly enabled.

For example:

```text
Payment Account:
ACTIVE → Online payment enabled

Anything else → Online payment disabled
```

The vendor should still be able to receive normal enquiries/WhatsApp requests if online payments are not enabled.

---

# Checkout Architecture

The existing checkout should support:

```text
Cart
 ↓
Order Preview
 ↓
Customer Details
 ↓
Payment Method
 ↓
Razorpay Checkout
 ↓
Payment Verification
 ↓
Order Confirmation
```

Do NOT mark an order as `PAID` merely because the frontend says the Razorpay payment succeeded.

Payment status must be verified server-side.

---

# Payment States

Create a robust payment state machine.

For example:

```text
CREATED
PENDING
AUTHORIZED
CAPTURED
FAILED
REFUNDED
PARTIALLY_REFUNDED
CANCELLED
```

Order status should be independent from payment status.

Example:

```text
Order:
PENDING
CONFIRMED
PROCESSING
COMPLETED
CANCELLED

Payment:
PENDING
PAID
FAILED
REFUNDED
PARTIALLY_REFUNDED
```

Do not mix these two concepts.

---

# Webhooks

Implement proper Razorpay webhook handling.

The webhook must be the reliable source for payment-state synchronization.

Handle relevant events such as:

* Payment captured
* Payment failed
* Refund
* Transfer/settlement-related events where applicable
* Connected-account/onboarding events where applicable

Verify webhook signatures.

Make webhook processing **idempotent** so that receiving the same event multiple times does not create duplicate orders, duplicate notifications, or duplicate settlement records.

---

# Zero Platform Commission

For the initial implementation:

```text
Platform commission = ₹0
```

The platform should not take a percentage commission from vendor orders.

However, payment gateway processing fees must be handled according to the payment provider's supported marketplace/settlement mechanism.

Do NOT hard-code assumptions about Razorpay fees.

Create a configurable payment/fee structure so we can introduce:

```text
platformCommission
paymentGatewayFee
vendorAmount
```

later.

For now:

```text
platformCommission = 0
```

---

# Example

Customer purchases a ₹10,000 package.

The system should conceptually track:

```text
Order Amount:        ₹10,000
Platform Commission: ₹0
Gateway Fee:         Actual gateway fee
Vendor Settlement:   ₹10,000 - applicable gateway/settlement charges
```

The exact settlement mechanism must follow the current Razorpay marketplace API and compliance requirements.

Do NOT implement manual bank transfers.

---

# Multiple Vendor Protection

Very important:

A cart/order must NOT accidentally combine items from multiple vendors if the selected Razorpay marketplace architecture cannot safely support that transaction model.

If the payment provider requires one vendor/connected account per payment:

```text
Cart containing Vendor A + Vendor B
```

must either:

1. be split into separate vendor orders/payments, OR
2. be prevented with a clear UI message.

Design this properly instead of assuming a multi-vendor cart can be sent as one normal payment.

---

# Order Model

Extend the existing order model rather than creating duplicate order systems.

The order should be capable of storing information similar to:

```js
{
  orderNumber,
  customerId,
  vendorId,
  storeId,

  items: [
    {
      productId,
      name,
      type,
      quantity,
      price,
      subtotal
    }
  ],

  subtotal,
  discount,
  totalAmount,

  currency,

  paymentStatus,
  orderStatus,

  paymentProvider: "razorpay",

  razorpayOrderId,
  razorpayPaymentId,

  vendorPaymentAccountId,

  platformCommission,
  gatewayFee,
  vendorSettlementAmount,

  createdAt,
  updatedAt
}
```

Adapt this to the existing project conventions rather than blindly copying this structure.

---

# Security Requirements

Follow proper payment security practices.

Never:

* Store card information
* Store CVV
* Store Razorpay secret keys in the database
* Trust frontend payment status
* Allow frontend users to modify order prices
* Allow vendors to manipulate settlement amounts
* Allow users to modify vendor IDs during checkout
* Process payments without validating the server-side order

All monetary values must be calculated server-side.

The frontend should only display values calculated/returned by the backend.

---

# Existing WhatsApp Flow

DO NOT completely remove the existing WhatsApp functionality.

Change the system to support multiple order methods:

```text
Online Payment
      OR
WhatsApp / Enquiry
```

For vendors who haven't connected online payments:

```text
[Send Enquiry on WhatsApp]
```

For vendors who have active payment onboarding:

```text
[Buy / Book Now]
```

After successful online payment:

```text
Order Confirmed
```

The vendor can additionally receive a WhatsApp notification if the existing notification system supports it.

WhatsApp should become a **notification/communication channel**, not the actual payment/order-processing system.

---

# Vendor Dashboard

Add:

### Payments

```text
Payment Account Status
Online Payments Enabled
Total Orders
Total Sales
Pending Settlements
Completed Settlements
```

### Orders

Vendor should be able to see:

```text
Order Number
Customer
Items
Amount
Payment Status
Order Status
Date
```

Vendor must NOT be able to manually mark an unpaid Razorpay order as paid.

---

# Admin Dashboard

Add marketplace payment visibility:

```text
Total GMV
Paid Orders
Failed Payments
Refunds
Vendor Payment Accounts
Pending Vendor Onboarding
Active Vendors
```

Admin should be able to inspect payment/order relationships without exposing sensitive payment information.

---

# Refunds

Design refunds properly.

The system should support:

```text
Full Refund
Partial Refund
```

Refund state must synchronize with Razorpay.

Do not simply change the order status to `REFUNDED` without actually processing/verifying the payment refund.

---

# Failure Scenarios

Handle all important edge cases:

### Payment succeeds but frontend closes

Webhook should still update the order.

### Customer pays but order creation fails

Design an idempotent recovery mechanism.

### Payment fails

Order should remain unpaid and customer should be able to retry.

### Duplicate webhook

Must not create duplicate records.

### Customer refreshes payment page

Must not create duplicate payments.

### Vendor payment account becomes disabled

New online payments must be blocked.

### Refund after settlement

Follow the payment provider's supported refund/settlement mechanism.

---

# Architecture Requirements

Maintain clean separation:

```text
Frontend
    ↓
API
    ↓
Order Service
    ↓
Payment Service
    ↓
Razorpay
    ↓
Webhook
    ↓
Payment Service
    ↓
Order Service
```

Do not put Razorpay business logic directly inside React components.

Create a dedicated backend payment service/module following the existing project architecture.

---

# Environment Variables

Review existing environment variables.

Payment secrets must only exist server-side.

Use appropriate variables for:

```text
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
```

and any additional marketplace/connected-account configuration required by the current Razorpay API.

Never expose secret values through frontend environment variables.

---

# UX

The payment setup should feel native to itsmyKalyanam.

Vendor should see:

```text
💳 Online Payments

Receive orders and bookings directly through your store.

[Connect Bank Account]
```

Customer should see:

```text
Order Summary

₹10,000

[Pay Securely]
```

After successful payment:

```text
✓ Payment Successful

Order #IK12345

Your order has been confirmed.

[View Order]
```

---

# IMPORTANT: Razorpay API Verification

Before writing payment code, verify the CURRENT Razorpay documentation for India and determine the correct current product/API for:

* Marketplace/connected accounts
* Vendor onboarding
* KYC
* Bank account linking
* Split payments/transfers
* Vendor settlements
* Platform fees
* Refunds
* Webhooks

Do not rely on outdated Razorpay Route documentation or assumptions.

If the current Razorpay architecture does NOT support the exact desired flow, clearly explain the limitation before implementing a workaround.

Do not implement an architecture that requires us to manually collect vendor money and manually transfer it to vendors unless explicitly approved.

---

# Deliverables

After implementation, provide:

1. Architecture overview
2. Database changes
3. Backend modules/services created
4. API endpoints created/modified
5. Frontend pages/components created/modified
6. Razorpay integration details
7. Vendor onboarding flow
8. Payment flow
9. Webhook flow
10. Refund flow
11. Security considerations
12. Environment variables required
13. Migration requirements
14. Testing instructions
15. Edge cases tested
16. Any Razorpay/KYC/business requirements we must complete before production

Most importantly:

**Do not break the existing Vendor Store, portfolio, WhatsApp ordering, vendor profiles, or existing order functionality while introducing online payments.**

First understand the existing architecture, then implement the payment system around it.
