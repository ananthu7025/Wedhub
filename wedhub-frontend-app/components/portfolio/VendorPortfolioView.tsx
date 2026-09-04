"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { VendorDetail, VendorAlbum, VendorReview } from "@/lib/api/vendors.types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { formatWhatsAppUrl, formatTelUrl } from "@/lib/utils/whatsapp";
import { trackEvent } from "@/lib/analytics/track";
import { VendorPortfolioHeader } from "./VendorPortfolioHeader";
import { VendorPortfolioGallery } from "./VendorPortfolioGallery";
import { VendorPortfolioPackages } from "./VendorPortfolioPackages";
import { VendorPortfolioAbout } from "./VendorPortfolioAbout";
import { VendorPortfolioReviews } from "./VendorPortfolioReviews";
import { FloatingWhatsAppButton } from "./FloatingWhatsAppButton";
import { PortfolioAttribution } from "./PortfolioAttribution";
import { EnquiryModal } from "@/components/shared/EnquiryModal";

interface VendorPortfolioViewProps {
  vendor: VendorDetail;
  albums: VendorAlbum[];
  reviews: VendorReview[];
}

export function VendorPortfolioView({ vendor, albums, reviews }: VendorPortfolioViewProps) {
  const [activeTab, setActiveTab] = useState<"portfolio" | "packages" | "about" | "reviews">("portfolio");
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  const profile = vendor.profile;
  const phone = profile?.phone;
  const businessName = vendor.businessName;

  // Track page view on direct portfolio visit
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

  const whatsappUrl = formatWhatsAppUrl(phone, businessName);
  const telUrl = formatTelUrl(phone);

  const totalPhotosCount = albums.reduce((acc, alb) => acc + (alb.media?.length || 0), 0);
  const activePackagesCount = vendor.packages?.filter((p) => p.isActive).length ?? 0;
  const reviewCount = vendor.reviewCount ?? reviews.length;
  const ratingNumber = Number(vendor.averageRating);
  const primaryCategory =
    vendor.categories?.find((c) => c.isPrimary)?.category?.name ??
    vendor.categories?.[0]?.category?.name ??
    "Wedding Professional";

  const handleHeroWhatsAppClick = () => {
    trackEvent({
      eventType: "portfolio_whatsapp_click",
      vendorId: vendor.id,
      metadata: { source: "hero", businessName },
    });
  };

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
    <div className="min-h-screen bg-neutral-50/60 font-sans text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Sticky Topbar */}
      <VendorPortfolioHeader
        vendorId={vendor.id}
        businessName={businessName}
        logoUrl={logoUrl}
        phone={phone}
        categoryName={primaryCategory}
        cityName={vendor.city?.name}
        onEnquireClick={handleOpenEnquiry}
      />

      {/* Hero Banner with Cover Photo */}
      <div className="relative w-full">
        <div className="relative h-56 sm:h-72 md:h-96 w-full overflow-hidden bg-gradient-to-r from-neutral-800 to-neutral-950">
          {coverUrl ? (
            <>
              <Image
                src={coverUrl}
                alt={`${businessName} Cover`}
                fill
                priority
                className="object-cover object-center opacity-90 transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950 opacity-95">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
            </div>
          )}
        </div>

        {/* Hero Vendor Information Overlap Card */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-20 sm:-mt-24 mb-6 rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Left Identity Details */}
              <div className="flex items-start sm:items-center gap-4 sm:gap-6">
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-gradient-to-tr from-neutral-100 to-neutral-200 shadow-md">
                  {logoUrl ? (
                    <Image src={logoUrl} alt={businessName} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-black text-neutral-800">
                      {businessName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-neutral-900">
                      {businessName}
                    </h1>
                    {vendor.verificationLevel && vendor.verificationLevel !== "UNVERIFIED" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs sm:text-sm font-medium text-neutral-500">
                    {primaryCategory}
                    {vendor.city?.name && ` · Based in ${vendor.city.name}`}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
                    {ratingNumber > 0 && (
                      <div className="flex items-center gap-1.5 font-bold text-neutral-800">
                        <span className="flex items-center text-amber-500">★</span>
                        <span>{ratingNumber.toFixed(1)}</span>
                        <span className="font-normal text-neutral-400">({reviewCount})</span>
                      </div>
                    )}

                    {profile?.startingPrice && (
                      <div className="flex items-center gap-1 font-semibold text-neutral-700">
                        <span className="text-neutral-400 font-normal">Starting at</span>
                        <span>₹{Number(profile.startingPrice).toLocaleString("en-IN")}</span>
                      </div>
                    )}

                    {profile?.yearsExperience && (
                      <div className="text-neutral-500">
                        {profile.yearsExperience}+ years experience
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleHeroWhatsAppClick}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-xs transition-all hover:bg-[#20ba5a] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                    </svg>
                    WhatsApp Vendor
                  </a>
                )}

                {telUrl && (
                  <a
                    href={telUrl}
                    onClick={handleHeroTelClick}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    Call
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleOpenEnquiry}
                  className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-neutral-800 transition-all"
                >
                  Send Enquiry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area with Segmented Tabs */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20">
        {/* Navigation Tabs */}
        <div className="mb-8 border-b border-neutral-200">
          <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto no-scrollbar" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab("portfolio")}
              className={`flex items-center gap-2 border-b-2 py-4 px-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === "portfolio"
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span>Portfolio Gallery</span>
              {totalPhotosCount > 0 && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                  {totalPhotosCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("packages")}
              className={`flex items-center gap-2 border-b-2 py-4 px-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === "packages"
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span>Packages & Pricing</span>
              {activePackagesCount > 0 && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                  {activePackagesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("about")}
              className={`flex items-center gap-2 border-b-2 py-4 px-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === "about"
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span>About & Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className={`flex items-center gap-2 border-b-2 py-4 px-2 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === "reviews"
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span>Client Reviews</span>
              {reviewCount > 0 && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                  {reviewCount}
                </span>
              )}
            </button>

            <Link
              href={`/store/${vendor.slug}`}
              className="flex items-center gap-1.5 border-b-2 border-transparent py-4 px-2 text-xs sm:text-sm font-bold text-brand-primary hover:text-brand-primary-hover whitespace-nowrap transition-colors ml-auto sm:ml-0"
            >
              <span>🛍️ Online Store</span>
              <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                Direct Order
              </span>
            </Link>
          </nav>
        </div>

        {/* Tab Panels */}
        <div className="transition-all duration-300">
          {activeTab === "portfolio" && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Work & Moments</h2>
                  <p className="text-xs text-neutral-500">
                    High-resolution photographs and recent events captured by {businessName}
                  </p>
                </div>
              </div>
              <VendorPortfolioGallery albums={albums} businessName={businessName} />
            </div>
          )}

          {activeTab === "packages" && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Packages & Service Offerings</h2>
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
            </div>
          )}

          {activeTab === "about" && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900">About {businessName}</h2>
                <p className="text-xs text-neutral-500">
                  Background, team profile, dynamic category attributes, and studio details
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
              />
            </div>
          )}

          {activeTab === "reviews" && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Client Reviews & Testimonials</h2>
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
            </div>
          )}
        </div>
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
