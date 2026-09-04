# Stage 9 — Vendor GST Invoicing & Billing Engine

> **Arch Phase 27**
> Sourced from: Vendor Invoicing System Specification & GST Compliance Standards.
> Dependent on: Arch Phase 5 (Vendor Module), Arch Phase 6 (Media/Logo), Arch Phase 9 (Leads).

---

## 1. Goal

Enable vendors to create, manage, issue, and track statutory Indian GST tax invoices for their clients (couples) with:
- Configurable vendor GSTIN, PAN, tax address, state code, bank details, and UPI ID.
- Dynamic vendor logo resolution from `VendorProfile.logoMedia` (clean omission if logo not uploaded).
- Deterministic Indian GST calculations: Intra-State (CGST + SGST) vs Inter-State (IGST), SAC codes, discounts, round-off, and amount in words.
- Strict invoice immutability lifecycle: `DRAFT -> ISSUED -> PAID` or `CANCELLED`.
- Dedicated payment history tracking (`VendorInvoicePayment`) with partial/multiple payments and overpayment rejection.
- Transaction-safe atomic sequential invoice numbering (`INV-YYYY-XXXX`).
- Comprehensive audit activity trail and historical snapshot preservation.
- Full multi-tenant security isolation.

---

## 2. Architecture & Data Model

### Tables:
1. `vendor_billing_profiles`: 1-to-1 with `Vendor`. Stores default tax IDs, registered address, bank/UPI details, prefix, sequence counter, and terms.
2. `vendor_invoices`: Master invoice record storing seller snapshot, client snapshot, financial totals, status, and bank info snapshot.
3. `vendor_invoice_items`: Line items with SAC code, quantity, unit, price, discount, GST rate, CGST, SGST, IGST, and line total.
4. `vendor_invoice_payments`: First-class payment history (amount, paymentMethod: UPI/BANK_TRANSFER/CASH/CARD/OTHER, transactionReference, paymentDate, notes).
5. `vendor_invoice_activities`: Chronological audit log of invoice mutations.

---

## 3. Endpoints

All mounted under `/api/v1/vendor-invoices` (Protected: `authenticateMiddleware`, `authorize(Role.VENDOR)`):
- `GET /billing-profile`: Fetch vendor's billing settings.
- `PUT /billing-profile`: Upsert billing profile & default invoice terms.
- `GET /`: List invoices with status, date range, client search, and pagination.
- `GET /metrics`: Aggregated financial stats (total invoiced, received, balance, overdue).
- `POST /`: Create draft invoice.
- `GET /:id`: Get single invoice with items, payments, audit activities.
- `PATCH /:id`: Update draft invoice (reject if not DRAFT).
- `DELETE /:id`: Delete draft invoice (reject if not DRAFT).
- `POST /:id/issue`: Lock invoice as ISSUED; freeze all financial and snapshot fields.
- `POST /:id/cancel`: Cancel an ISSUED or DRAFT invoice.
- `POST /:id/duplicate`: Clone an invoice into a fresh DRAFT with new sequential number.
- `POST /:id/payments`: Record a payment; validate `amount <= balanceDue`; auto-mark PAID if fully settled.
- `DELETE /:id/payments/:paymentId`: Revert a payment and recalculate balance.
