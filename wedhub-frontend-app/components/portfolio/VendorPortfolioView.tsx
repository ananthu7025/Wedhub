"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { VendorDetail, VendorAlbum, VendorReview } from "@/lib/api/vendors.types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { formatTelUrl } from "@/lib/utils/whatsapp";
import { trackEvent } from "@/lib/analytics/track";
import { VendorPortfolioGallery } from "./VendorPortfolioGallery";
import { VendorPortfolioPackages } from "./VendorPortfolioPackages";
import { VendorPortfolioFeaturedPackages } from "./VendorPortfolioFeaturedPackages";
import { VendorPortfolioAbout } from "./VendorPortfolioAbout";
import { VendorPortfolioReviews } from "./VendorPortfolioReviews";
import { VendorPortfolioServiceAreas } from "./VendorPortfolioServiceAreas";
import { VendorPortfolioInstagram } from "./VendorPortfolioInstagram";
import { FloatingWhatsAppButton } from "./FloatingWhatsAppButton";
import { PortfolioAttribution } from "./PortfolioAttribution";
import { EnquiryModal } from "@/components/shared/EnquiryModal";
import { StarIcon, VerifiedBadgeIcon, StoreIcon } from "./icons";

interface VendorPortfolioViewProps {
  vendor: VendorDetail;
  albums: VendorAlbum[];
  reviews: VendorReview[];
}

const SECTIONS = [
  { id: "portfolio", label: "Portfolio Gallery" },
  { id: "about", label: "About & Details" },
  { id: "packages", label: "Packages & Pricing" },
  { id: "reviews", label: "Client Reviews" },
] as const;

export function VendorPortfolioView({ vendor, albums, reviews }: VendorPortfolioViewProps) {
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("portfolio");
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

    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
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
                className="object-cover object-center"
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
                    <Image src={logoUrl} alt={businessName} fill className="object-cover" />
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
          {SECTIONS.map(({ id, label }) => {
            const count =
              id === "portfolio" ? totalPhotosCount :
              id === "packages" ? activePackagesCount :
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
        <section
          id="portfolio"
          ref={(el) => { sectionRefs.current.portfolio = el; }}
          className="scroll-mt-36 pt-10"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Work &amp; Moments</h2>
              <p className="text-xs text-neutral-500">
                A glimpse of {businessName}&apos;s recent work and wedding moments
              </p>
            </div>
          </div>
          <VendorPortfolioGallery albums={albums} businessName={businessName} />
        </section>

        {/* About + Featured Packages preview, two-column like the reference — packages surfaced
            here (right sidebar) since pricing is a top decision factor, with the full detailed
            grid further down under its own anchor. */}
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

        {/* Packages — full detailed grid */}
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

        {/* Client Reviews */}
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

        {/* Service Areas — only if the vendor has any configured */}
        <VendorPortfolioServiceAreas
          serviceAreas={vendor.serviceAreas}
          baseCityName={vendor.city?.name}
          onCheckAvailability={handleOpenEnquiry}
        />

        {/* Instagram — only if a handle/link exists */}
        <VendorPortfolioInstagram instagram={profile?.socialLinks?.instagram} />
      </main>

      {/* Floating Sticky WhatsApp Button for mobile */}
      <FloatingWhatsAppButton
        vendorId={vendor.id}
        phone={phone}
        businessName={businessName}
      />

      {/* Minimal platform attribution */}
      <PortfolioAttribution />

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
