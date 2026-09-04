# Stage 10 — Standalone Vendor Digital Portfolio & 1-Click WhatsApp Direct Connect

> **Arch Phase 28**
> Sourced from: Vendor-First White-Label Portfolio Specification & WhatsApp Lead Direct Connect.
> Dependent on: Arch Phase 5 (Vendor Profile), Arch Phase 6 (Albums & Media), Arch Phase 10 (Reviews).

---

## 1. Goal

Provide every registered vendor with an independent, vendor-first digital portfolio page (`/portfolio/:slug`) designed to act as their official digital brochure and link-in-bio website:
- **Vendor-First Branding**: The vendor's business name, logo, cover imagery, and portfolio galleries are the hero elements. Zero itsmyKalyanam navigation, competitor links, or marketplace clutter.
- **1-Click WhatsApp Lead Generation**: Deep link integration (`https://wa.me/...`) with pre-filled greeting and package interest context, enabling instant chats from mobile or desktop.
- **Complete Feature Showcase**: High-res album gallery with fullscreen lightbox, active package tiers with itemized inclusions, dynamic category-specific specifications, client testimonials, and in-app fallback inquiry form.
- **Dashboard Sharing Suite**: Embedded "Share Portfolio" tool inside the vendor navigation bar and dashboard featuring instant copy link, WhatsApp broadcast, preview button, and auto-generated high-resolution QR code for visiting cards and studio counter displays.
- **Non-Breaking Architecture**: Preserves the existing marketplace flow (`/vendors/:slug`) completely intact for couple discovery and directory comparison.

---

## 2. Technical Architecture & Endpoints

### Data Consumption:
The standalone portfolio reuses the existing public catalog endpoints without requiring schema alterations or redundant database columns:
- `GET /api/v1/vendors/:slug`: Pulls vendor detail, verified badges, category/city bindings, active packages, dynamic attribute values, and profile media.
- `GET /api/v1/vendors/:slug/albums`: Pulls published albums and high-res media.
- `GET /api/v1/vendors/:id/reviews`: Pulls approved client ratings, reviews, and vendor responses.

### Key Components:
1. `app/(public)/portfolio/[slug]/page.tsx`: Server Component with SEO metadata generation and 404 safety.
2. `components/portfolio/VendorPortfolioView.tsx`: Client orchestrator managing cover banner, header, segmented tabs (Portfolio / Packages / About / Reviews), EnquiryModal, and mobile floating action bar.
3. `components/portfolio/VendorPortfolioHeader.tsx`: Clean topbar with vendor logo monogram, business identity, WhatsApp button, and Call CTA.
4. `components/portfolio/VendorPortfolioGallery.tsx`: Responsive photo grid with album filters and fullscreen lightbox viewer.
5. `components/portfolio/VendorPortfolioPackages.tsx`: Package cards with INR formatting, inclusion lists, and package-specific WhatsApp enquiry links.
6. `components/portfolio/VendorPortfolioAbout.tsx`: Studio story, dynamic category attribute pills, specifications, studio location, and social links.
7. `components/portfolio/VendorPortfolioReviews.tsx`: Testimonials, star ratings, verified tags, and vendor responses.
8. `components/portfolio/FloatingWhatsAppButton.tsx`: Sticky pulsing WhatsApp action button on mobile viewports.
9. `components/vendor/SharePortfolioButton.tsx`: Vendor dashboard client modal with clipboard copy, WhatsApp direct share, preview link, and downloadable QR code.
10. `components/shared/VendorShell.tsx`: Integration in vendor dashboard topbar header.
