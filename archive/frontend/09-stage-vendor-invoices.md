# Stage 7 — Vendor GST Invoicing & Billing

> **Frontend Arch Phase 13**
> Sourced from: Vendor Invoicing System Specification & GST Invoicing UI.
> Dependent on: Backend Arch Phase 27 (`/api/v1/vendor-invoices`), Frontend Arch Phase 5 (Vendor Shell/Profile), Frontend Arch Phase 6 (Leads).

---

## 1. Goal

Provide wedding vendors on WedHub with a complete self-service GST billing interface inside the vendor portal:
1. **Invoice Dashboard (`/vendor/invoices`)**: Financial summary metrics (Invoiced, Received, Outstanding, Overdue), status tabs, date-range filters, client/invoice search, and master table.
2. **Invoice Creator (`/vendor/invoices/new`)**: Live GST calculations, place of supply toggle (Intra-state CGST+SGST vs Inter-state IGST), dynamic SAC-coded service rows, prefill from billing settings, and optional lead prefill (`?leadId=`).
3. **Invoice Detail Hub (`/vendor/invoices/[id]`)**: Comprehensive status management, immutable lock once issued, full payment history recording (`VendorInvoicePayment`), payment deletion/reversal, and audit log.
4. **Dedicated A4 Printable Tax Invoice (`/vendor/invoices/[id]/print`)**: Clean, formal tax invoice layout with `@media print` CSS. Dynamically includes vendor logo if uploaded; gracefully renders clean typography if logo is absent.
5. **Billing Profile Settings (`/vendor/invoices/settings`)**: Setup and persist GSTIN, legal name, PAN, tax address, state code, bank details, and default terms.
6. **Integrations**:
   - Sidebar navigation in `VendorShell.tsx`.
   - "Create Invoice" action on lead cards in `LeadsBoard.tsx`.
