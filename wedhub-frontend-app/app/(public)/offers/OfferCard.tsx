"use client";

import Link from "next/link";
import Image from "next/image";
import { VendorHeartButton } from "@/components/shared/VendorHeartButton";
import { OfferBadge } from "@/components/shared/OfferBadge";
import { isPreOptimizedMediaUrl } from "@/lib/media/url";
import type { PublicOffer } from "@/lib/api/vendor-offers.types";

function formatPrice(amount: number, currency: string): string {
  const symbol = currency === "INR" ? "₹" : currency;
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

export function OfferCard({
  offer,
  isAuthenticated,
  viewMode = "grid",
  initialFavorited,
}: {
  offer: PublicOffer;
  isAuthenticated: boolean;
  viewMode?: "grid" | "list";
  initialFavorited?: boolean;
}) {
  const cover = offer.media[0];
  const imageUrl = cover?.url ?? cover?.thumbnailUrl ?? null;
  const cityName = offer.vendor.city?.name;

  const vendorSummary = {
    id: offer.vendor.id,
    businessName: offer.vendor.businessName,
    slug: offer.vendor.slug,
    status: "APPROVED",
    verificationLevel: "UNVERIFIED",
    profile: {
      shortDescription: null,
      startingPrice: null,
      currency: offer.currency,
      logoUrl: offer.vendor.logoUrl,
      logoBlurDataUrl: offer.vendor.logoBlurDataUrl,
    },
  };

  const image = (
    <div
      className={
        viewMode === "list"
          ? "relative w-28 sm:w-[280px] md:w-[320px] aspect-square sm:aspect-4/3 min-h-[110px] sm:min-h-[200px] flex-shrink-0 bg-gray-100 overflow-hidden"
          : "relative aspect-4/3 w-full bg-gray-100 overflow-hidden"
      }
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={offer.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes={viewMode === "list" ? "(max-width: 640px) 112px, 320px" : "(max-width: 900px) 50vw, 33vw"}
          unoptimized={isPreOptimizedMediaUrl(imageUrl)}
          {...(cover?.blurDataUrl ? { placeholder: "blur" as const, blurDataURL: cover.blurDataUrl } : {})}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400 font-medium">
          No photo yet
        </div>
      )}

      <OfferBadge badgeType={offer.badgeType} discountPercent={offer.discountPercent} />

      <VendorHeartButton
        vendorId={offer.vendorId}
        vendorSummary={vendorSummary}
        isAuthenticated={isAuthenticated}
        initialFavorited={initialFavorited}
        className={
          viewMode === "list"
            ? "absolute top-2 right-2 sm:top-3 sm:right-3 z-10 scale-90 sm:scale-100"
            : "absolute top-3 right-3 z-10"
        }
      />
    </div>
  );

  const priceRow = (
    <div className="mt-2 flex items-baseline gap-2">
      <span className="text-sm sm:text-base font-bold text-gray-900">{formatPrice(offer.offerPrice, offer.currency)}</span>
      {offer.offerPrice < offer.originalPrice && (
        <span className="text-xs text-gray-400 line-through">{formatPrice(offer.originalPrice, offer.currency)}</span>
      )}
    </div>
  );

  const vendorRow = (
    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-600">
      <span className="truncate font-medium">{offer.vendor.businessName}</span>
      {offer.vendor.reviewCount > 0 && (
        <span className="flex items-center gap-0.5 text-amber-600 shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 16.9l-6.2 3.4 1.6-6.8L2.2 8.9l6.9-.6L12 2z" />
          </svg>
          {offer.vendor.averageRating.toFixed(1)}
        </span>
      )}
      {cityName && (
        <>
          <span className="text-gray-300">·</span>
          <span className="truncate text-gray-500">{cityName}</span>
        </>
      )}
    </div>
  );

  if (viewMode === "list") {
    return (
      <Link
        href={`/vendors/${offer.vendor.slug}`}
        className="group flex flex-row overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white no-underline text-inherit shadow-xs transition-all duration-300 hover:shadow-md hover:border-gray-300"
      >
        {image}
        <div className="flex flex-1 flex-col justify-between p-3 sm:p-5 min-w-0">
          <div>
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 group-hover:text-[#e00b41] transition-colors truncate">
              {offer.title}
            </h3>
            {offer.description && (
              <p className="mt-1 text-xs sm:text-sm text-gray-600 line-clamp-1 sm:line-clamp-2 leading-relaxed">
                {offer.description}
              </p>
            )}
            {vendorRow}
          </div>
          <div className="mt-2 sm:mt-4 flex items-center justify-between border-t border-gray-100 pt-2 sm:pt-3">
            {priceRow}
            <span className="rounded-full bg-[#e00b41] px-3 py-1 sm:px-5 sm:py-2 text-[11px] sm:text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#c2185b] shrink-0">
              View Offer
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/vendors/${offer.vendor.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white no-underline text-inherit shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-gray-300"
    >
      {image}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h3 className="line-clamp-1 text-sm sm:text-base font-bold text-gray-900 group-hover:text-[#e00b41] transition-colors">
            {offer.title}
          </h3>
          {vendorRow}
        </div>
        <div className="mt-3 border-t border-gray-100 pt-2">{priceRow}</div>
      </div>
    </Link>
  );
}
