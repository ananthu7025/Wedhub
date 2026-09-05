# Stage 8 — Standalone Vendor-First Digital Portfolio & 1-Click WhatsApp Share

> **Frontend Arch Phase 14**
> Sourced from: Vendor-First Branding Specification & Direct WhatsApp Lead Generation.
> Dependent on: Frontend Arch Phase 2 (`/vendors/[slug]`), Frontend Arch Phase 5 (`ProfileEditor`), Frontend Arch Phase 6 (Albums & Reviews).

---

## 1. Goal

Provide every vendor with a **dedicated, standalone digital portfolio page** (`/portfolio/[slug]`) where their business brand visually dominates, free from marketplace clutter, with 1-click WhatsApp lead connection, alongside an interactive **"Share Portfolio"** modal inside the vendor dashboard.

### Core Architecture & UX Principles
1. **Preserve Existing Marketplace Flow**: The existing marketplace page at `/vendors/[slug]` remains 100% untouched for couples browsing the directory, searching categories, or using the comparison engine.
2. **Vendor-First Identity**:
   - The vendor is the primary brand. The visitor feels like they are visiting the vendor's own website.
   - **Zero itsmyKalyanam platform header or navbar**.
   - No competitor links, no "Add to compare", no category search bars.
   - Vendor's uploaded logo, business name, cover imagery, and portfolio take visual dominance.
3. **1-Click Direct WhatsApp Contact**:
   - Deep-linked WhatsApp CTA button in both the header and sticky/floating on mobile (`https://wa.me/<phone>?text=...`).
   - Pre-fills a personalized greeting with the vendor's name and service context.
   - Direct Call button and in-app Enquiry modal fallback.
4. **Subtle Platform Attribution**:
   - Minimal and muted at the very bottom: `"Powered by itsmyKalyanam"`.
5. **Vendor Dashboard "Share Portfolio" Experience**:
   - Header button in `VendorShell.tsx` and quick action on `/vendor/dashboard`.
   - Generates live link `https://itsmykalyanam.com/portfolio/[slug]`.
   - 1-Click Copy Link with visual feedback.
   - 1-Click Share on WhatsApp.
   - Live Portfolio Preview button.
   - Dynamic QR Code generator for printing on studio displays and visiting cards.

---

## 2. Routes & Components

### Public Portfolio Route
- `app/(public)/portfolio/[slug]/page.tsx`: Server Component fetching vendor data, public albums, and reviews.
- `components/portfolio/VendorPortfolioView.tsx`: Main vendor-first layout.
- `components/portfolio/VendorPortfolioHeader.tsx`: Vendor brand header with WhatsApp & Call actions.
- `components/portfolio/VendorPortfolioGallery.tsx`: High-resolution photo & video showcase.
- `components/portfolio/VendorPortfolioPackages.tsx`: Itemized packages and pricing.
- `components/portfolio/VendorPortfolioAbout.tsx`: Bio, specifications, and category attributes.
- `components/portfolio/VendorPortfolioReviews.tsx`: Verified ratings and testimonials.
- `components/portfolio/FloatingWhatsAppButton.tsx`: Sticky mobile WhatsApp contact button.
- `components/portfolio/PortfolioAttribution.tsx`: Subtle "Powered by itsmyKalyanam" footer.

### Vendor Portal Action
- `components/vendor/SharePortfolioButton.tsx`: Interactive modal with copy link, WhatsApp share, live preview, and QR code generator.
- Mounted in `components/shared/VendorShell.tsx` header and `app/(vendor)/vendor/dashboard/page.tsx`.
