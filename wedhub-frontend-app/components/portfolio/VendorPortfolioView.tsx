"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { VendorDetail, VendorAlbum, VendorReview } from "@/lib/api/vendors.types";
import type { CatalogItem } from "@/lib/api/vendor-catalog.types";
import { getPublicMediaUrl, isPreOptimizedMediaUrl } from "@/lib/media/url";
import { formatTelUrl } from "@/lib/utils/whatsapp";
import { trackEvent } from "@/lib/analytics/track";
import { VendorPortfolioGallery } from "./VendorPortfolioGallery";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { VendorPortfolioPackages } from "./VendorPortfolioPackages";
import { VendorPortfolioFeaturedPackages } from "./VendorPortfolioFeaturedPackages";
import { VendorPortfolioCatalog } from "./VendorPortfolioCatalog";
import { VendorPortfolioAbout } from "./VendorPortfolioAbout";
import { VendorPortfolioReviews } from "./VendorPortfolioReviews";
import { VendorPortfolioServiceAreas } from "./VendorPortfolioServiceAreas";
import { VendorPortfolioInstagram } from "./VendorPortfolioInstagram";
import { FloatingWhatsAppButton } from "./FloatingWhatsAppButton";
import { PortfolioAttribution } from "./PortfolioAttribution";
import { EnquiryModal } from "@/components/shared/EnquiryModal";
import { CheckAvailabilityModal } from "./CheckAvailabilityModal";
import { StarIcon, VerifiedBadgeIcon, StoreIcon } from "./icons";

interface VendorPortfolioViewProps {
  vendor: VendorDetail;
  albums: VendorAlbum[];
  reviews: VendorReview[];
  catalogItems?: CatalogItem[];
}

const SECTIONS = [
  { id: "portfolio", label: "Portfolio Gallery" },
  { id: "about", label: "About & Details" },
  { id: "packages", label: "Packages & Pricing" },
  { id: "catalog", label: "Catalog" },
  { id: "reviews", label: "Client Reviews" },
] as const;

export function VendorPortfolioView({ vendor, albums, reviews, catalogItems = [] }: VendorPortfolioViewProps) {
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const activeCatalogItems = catalogItems.filter((i) => i.isActive);
  // Item 12: sections the vendor has hidden from this public page — the
  // backend has already stripped the underlying packages/attributeValues/
  // serviceAreas/socialLinks data for a hidden section (see
  // vendor.controller.ts's redactHiddenSections), this just also skips
  // rendering that section's heading/wrapper and nav-bar entry rather than
  // showing an empty shell for it. "catalog" isn't part of that
  // vendor-toggleable mechanism — it's structurally absent for the vast
  // majority of vendors (only catalog-enabled categories have any items at
  // all), so it's filtered on real content instead.
  const hiddenSections = new Set([...(vendor.hiddenProfileSections ?? []), ...(activeCatalogItems.length === 0 ? ["catalog"] : [])]);
  const visibleSections = SECTIONS.filter(({ id }) => !hiddenSections.has(id));
  const [activeSection, setActiveSection] = useState<string>(visibleSections[0]?.id ?? "portfolio");
  // Pagination state for the portfolio grid below — VendorPortfolioGallery
  // shows 7 photos per page (see its own PAGE_SIZE), so the header's
  // prev/next controls need the same page-count math to know when to
  // disable themselves. Kept in sync manually rather than exposed by the
  // gallery component itself, since it has no other state to report back.
  const [portfolioPage, setPortfolioPage] = useState(0);
  const portfolioPageCount = Math.max(1, Math.ceil(albums.flatMap((a) => a.media).length / 7));
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const profile = vendor.profile;
  const phone = profile?.phone;
  const businessName = vendor.businessName;
  // Store link only makes sense if at least one of the vendor's categories
  // actually supports it — mirrors the eligibility half of the backend's
  // own gate (vendor-store.service.ts: category.hasStoreEnabled &&
  // category.isActive), which the public /store/[slug] page 404s on
  // otherwise. VendorDetail has no vendor-level store.isEnabled field to
  // check here, so this can't be a perfect match — a vendor whose category
  // supports a store but who has personally disabled their own store would
  // still see this link and land on that page's existing 404 handling.
  const hasStoreEligibleCategory = vendor.categories.some((vc) => vc.category.hasStoreEnabled && vc.category.isActive);

  useEffect(() => {
    trackEvent({
      eventType: "portfolio_view",
      vendorId: vendor.id,
      metadata: {
        slug: vendor.slug,
        businessName: vendor.businessName,
      },
    });
  }, [vendor.id, vendor.slug, vendor.businessName]);

  // Scroll-spy: highlight the tab whose section is currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    visibleSections.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- visibleSections is derived from vendor.hiddenProfileSections, which never changes after initial load (no client-side toggle on this page); re-running this effect on every render would re-attach the same observer repeatedly for no benefit.
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    const headerOffset = 56;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  // Resolve cover image
  const coverMedia = profile?.coverMedia;
  const heroAlbumMedia = albums[0]?.media?.[0];
  const coverKey =
    coverMedia?.optimizedObjectKey ??
    coverMedia?.originalObjectKey ??
    heroAlbumMedia?.optimizedObjectKey ??
    heroAlbumMedia?.originalObjectKey ??
    null;
  const coverUrl = coverKey ? getPublicMediaUrl(coverKey) : null;

  // Resolve logo image
  const logoKey =
    profile?.logoMedia?.thumbnailObjectKey ??
    profile?.logoMedia?.optimizedObjectKey ??
    profile?.logoMedia?.originalObjectKey ??
    null;
  const logoUrl = logoKey ? getPublicMediaUrl(logoKey) : null;

  const telUrl = formatTelUrl(phone);

  const totalPhotosCount = albums.reduce((acc, alb) => acc + (alb.media?.length || 0), 0);
  const activePackagesCount = vendor.packages?.filter((p) => p.isActive).length ?? 0;
  const reviewCount = vendor.reviewCount ?? reviews.length;
  const ratingNumber = Number(vendor.averageRating);
  const primaryCategory =
    vendor.categories?.find((c) => c.isPrimary)?.category?.name ??
    vendor.categories?.[0]?.category?.name ??
    "Wedding Professional";
  const isVerified = Boolean(vendor.verificationLevel && vendor.verificationLevel !== "UNVERIFIED");

  const handleHeroTelClick = () => {
    trackEvent({
      eventType: "portfolio_call_click",
      vendorId: vendor.id,
      metadata: { source: "hero", businessName },
    });
  };

  const handleOpenEnquiry = () => {
    trackEvent({
      eventType: "enquiry_started",
      vendorId: vendor.id,
      metadata: { source: "portfolio", businessName },
    });
    setEnquiryModalOpen(true);
  };

  const handleOpenAvailability = () => {
    trackEvent({
      eventType: "check_availability_click",
      vendorId: vendor.id,
      metadata: { source: "portfolio", businessName },
    });
    setAvailabilityModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 font-sans text-neutral-900 selection:bg-brand-primary/20">
      {/* Hero Banner with Cover Photo */}
      <div className="relative w-full">
        <div className="relative h-64 sm:h-80 md:h-[26rem] w-full overflow-hidden bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950">
          {coverUrl ? (
            <>
              <Image
                src={coverUrl}
                alt={`${businessName} Cover`}
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
                unoptimized={isPreOptimizedMediaUrl(coverUrl)}
                {...(coverMedia?.blurDataUrl ?? heroAlbumMedia?.blurDataUrl
                  ? {
                      placeholder: "blur" as const,
                      blurDataURL: coverMedia?.blurDataUrl ?? heroAlbumMedia?.blurDataUrl ?? undefined,
                    }
                  : {})}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
          )}

          {/* Category + headline overlay, bottom-left of hero */}
          <div className="absolute inset-x-0 bottom-0 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-28">
            <div className="mx-auto max-w-6xl">
              <span className="inline-block rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white mb-3">
                {primaryCategory}
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white max-w-2xl">
                {businessName}
              </h1>
              {profile?.shortDescription && (
                <p className="mt-2 max-w-xl text-sm sm:text-base text-white/85 line-clamp-2">
                  {profile.shortDescription}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Identity + actions card, overlapping hero bottom */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-16 sm:-mt-20 mb-6 rounded-3xl border border-neutral-200/80 bg-white p-5 sm:p-7 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              {/* Left Identity Details */}
              <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-gradient-to-tr from-neutral-100 to-neutral-200 shadow-md">
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt={businessName}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized={isPreOptimizedMediaUrl(logoUrl)}
                      {...(profile?.logoMedia?.blurDataUrl
                        ? { placeholder: "blur" as const, blurDataURL: profile.logoMedia.blurDataUrl }
                        : {})}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-black text-neutral-800">
                      {businessName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900">
                      {businessName}
                    </h2>
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                        <VerifiedBadgeIcon className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-xs sm:text-sm font-medium text-neutral-500">
                    {primaryCategory}
                    {vendor.city?.name && ` · ${vendor.city.name}`}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {ratingNumber > 0 && (
                      <div className="flex items-center gap-1 font-bold text-neutral-800">
                        <StarIcon className="w-3.5 h-3.5 text-amber-500" filled />
                        <span>{ratingNumber.toFixed(1)}</span>
                        <span className="font-normal text-neutral-400">({reviewCount} reviews)</span>
                      </div>
                    )}
                    {profile?.yearsExperience != null && (
                      <div className="text-neutral-500">{profile.yearsExperience}+ years experience</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0 pt-1 md:pt-0">
                {telUrl && (
                  <a
                    href={telUrl}
                    onClick={handleHeroTelClick}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    Call
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleOpenAvailability}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-neutral-800 hover:bg-neutral-50 shadow-xs transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Check Availability
                </button>

                <button
                  type="button"
                  onClick={handleOpenEnquiry}
                  className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-neutral-800 transition-all"
                >
                  Send Enquiry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section nav — scroll-spy pills, sticky under top bar */}
      <div className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl space-x-1 overflow-x-auto no-scrollbar px-4 sm:px-6 lg:px-8" aria-label="Sections">
          {visibleSections.map(({ id, label }) => {
            const count =
              id === "portfolio" ? totalPhotosCount :
              id === "packages" ? activePackagesCount :
              id === "catalog" ? activeCatalogItems.length :
              id === "reviews" ? reviewCount :
              null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className={`flex items-center gap-2 border-b-2 py-3.5 px-3 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                  activeSection === id
                    ? "border-brand-primary text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <span>{label}</span>
                {count !== null && count > 0 && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {hasStoreEligibleCategory && (
            <Link
              href={`/store/${vendor.slug}`}
              className="flex items-center gap-1.5 border-b-2 border-transparent py-3.5 px-3 text-xs sm:text-sm font-bold text-brand-primary hover:text-brand-primary-hover whitespace-nowrap transition-colors ml-auto"
            >
              <StoreIcon className="h-4 w-4" />
              <span>Online Store</span>
            </Link>
          )}
        </nav>
      </div>

      {/* Main Content Area — single flowing page */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
        {/* Portfolio Gallery */}
        {!hiddenSections.has("portfolio") && (
        <section
          id="portfolio"
          ref={(el) => { sectionRefs.current.portfolio = el; }}
          className="scroll-mt-36 pt-10"
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Work &amp; Moments</h2>
              <p className="text-xs text-neutral-500">
                A glimpse of {businessName}&apos;s recent work and wedding moments
              </p>
            </div>
            {portfolioPageCount > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPortfolioPage((p) => Math.max(0, p - 1))}
                  disabled={portfolioPage === 0}
                  aria-label="Previous photos"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPortfolioPage((p) => Math.min(portfolioPageCount - 1, p + 1))}
                  disabled={portfolioPage >= portfolioPageCount - 1}
                  aria-label="Next photos"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <VendorPortfolioGallery albums={albums} businessName={businessName} page={portfolioPage} onPageChange={setPortfolioPage} />
        </section>
        )}

        {/* About + Featured Packages preview, two-column like the reference — packages surfaced
            here (right sidebar) since pricing is a top decision factor, with the full detailed
            grid further down under its own anchor. */}
        {!hiddenSections.has("about") && (
        <section
          id="about"
          ref={(el) => { sectionRefs.current.about = el; }}
          className="scroll-mt-36 pt-14"
        >
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900">About {businessName}</h2>
            <p className="text-xs text-neutral-500">
              Background, studio details, and everything you need to know
            </p>
          </div>
          <VendorPortfolioAbout
            description={profile?.description}
            yearsExperience={profile?.yearsExperience}
            teamSize={profile?.teamSize}
            travelPolicy={profile?.travelPolicy}
            languages={profile?.languages}
            businessHours={profile?.businessHours}
            address={profile?.address}
            cityName={vendor.city?.name}
            website={profile?.website}
            socialLinks={profile?.socialLinks}
            attributeValues={vendor.attributeValues ?? []}
            customQuoteAvailable={profile?.customQuoteAvailable}
            serviceAreaCount={vendor.serviceAreas?.length ?? 0}
            sidebarTop={
              <VendorPortfolioFeaturedPackages
                packages={vendor.packages ?? []}
                onScrollToPackages={() => scrollToSection("packages")}
              />
            }
          />
        </section>
        )}

        {/* Packages — full detailed grid */}
        {!hiddenSections.has("packages") && (
        <section
          id="packages"
          ref={(el) => { sectionRefs.current.packages = el; }}
          className="scroll-mt-36 pt-14"
        >
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Packages &amp; Service Offerings</h2>
            <p className="text-xs text-neutral-500">
              Transparent package pricing and bespoke coverage options
            </p>
          </div>
          <VendorPortfolioPackages
            vendorId={vendor.id}
            packages={vendor.packages ?? []}
            customQuoteAvailable={profile?.customQuoteAvailable}
            phone={phone}
            businessName={businessName}
            onEnquireClick={handleOpenEnquiry}
          />
        </section>
        )}

        {/* Catalog — individual items with pricing, variants, and availability */}
        {!hiddenSections.has("catalog") && (
        <section
          id="catalog"
          ref={(el) => { sectionRefs.current.catalog = el; }}
          className="scroll-mt-36 pt-14"
        >
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Catalog</h2>
            <p className="text-xs text-neutral-500">Individual items with pricing and availability</p>
          </div>
          <VendorPortfolioCatalog vendorId={vendor.id} items={activeCatalogItems} onEnquireClick={handleOpenEnquiry} />
        </section>
        )}

        {/* Client Reviews */}
        {!hiddenSections.has("reviews") && (
        <section
          id="reviews"
          ref={(el) => { sectionRefs.current.reviews = el; }}
          className="scroll-mt-36 pt-14"
        >
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Client Reviews</h2>
            <p className="text-xs text-neutral-500">
              Hear what real brides and grooms have to say about working with {businessName}
            </p>
          </div>
          <VendorPortfolioReviews
            reviews={reviews}
            averageRating={vendor.averageRating}
            reviewCount={reviewCount}
            businessName={businessName}
          />
        </section>
        )}

        {/* Service Areas — only if the vendor has any configured and hasn't hidden this section */}
        {!hiddenSections.has("serviceAreas") && (
          <VendorPortfolioServiceAreas
            serviceAreas={vendor.serviceAreas}
            baseCityName={vendor.city?.name}
            onCheckAvailability={handleOpenAvailability}
          />
        )}

        {/* Instagram — only if a handle/link exists and hasn't been hidden */}
        {!hiddenSections.has("instagram") && (
          <VendorPortfolioInstagram instagram={profile?.socialLinks?.instagram} />
        )}
      </main>

      {/* Floating Sticky WhatsApp Button for mobile */}
      <FloatingWhatsAppButton
        vendorId={vendor.id}
        phone={phone}
        businessName={businessName}
      />

      {/* Minimal platform attribution */}
      <PortfolioAttribution />

      {/* Check Date Availability Modal (Logged-In Couples) */}
      <CheckAvailabilityModal
        open={availabilityModalOpen}
        onClose={() => setAvailabilityModalOpen(false)}
        vendorSlug={vendor.slug}
        vendorName={businessName}
        onProceedToEnquire={() => {
          setAvailabilityModalOpen(false);
          setEnquiryModalOpen(true);
        }}
      />

      {/* Enquiry Modal */}
      <EnquiryModal
        vendorId={vendor.id}
        vendorName={businessName}
        open={enquiryModalOpen}
        onClose={() => setEnquiryModalOpen(false)}
      />
    </div>
  );
}
