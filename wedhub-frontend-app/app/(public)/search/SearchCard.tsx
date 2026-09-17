"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { VendorHeartButton } from "@/components/shared/VendorHeartButton";
import { trackEvent } from "@/lib/analytics/track";
import { formatResponseTimeBucket } from "@/lib/utils/response-time";
import type { VerificationLevel } from "@/lib/api/vendors.types";

interface SearchCardProps {
  vendorId: string;
  slug: string;
  businessName: string;
  logoUrl: string | null;
  logoBlurDataUrl?: string | null;
  shortDescription: string | null;
  startingPrice: string | null;
  currency: string | null;
  verificationLevel?: VerificationLevel;
  isAuthenticated: boolean;
  viewMode?: "grid" | "list";
  cityName?: string;
  /** Whether this vendor is already in the viewer's shortlist — seeds the heart button so it reflects real state instead of always starting unfavorited. */
  initialFavorited?: boolean;
  /** Item 16: compare-selection checkbox, rendered as a sibling overlay (same pattern as ShortlistGrid.tsx) since the whole card is a <Link>. Omitted entirely when not provided, e.g. on pages that don't offer comparison. */
  compareSelected?: boolean;
  onToggleCompare?: () => void;
  /** Item 4: null when the vendor has no responded leads yet — nothing rendered in that case. */
  avgResponseTimeMs?: number | null;
}

export function SearchCard({
  vendorId,
  slug,
  businessName,
  logoUrl,
  logoBlurDataUrl,
  shortDescription,
  startingPrice,
  currency,
  verificationLevel,
  isAuthenticated,
  viewMode = "grid",
  cityName,
  initialFavorited,
  compareSelected,
  onToggleCompare,
  avgResponseTimeMs,
}: SearchCardProps) {
  const responseTimeLabel = formatResponseTimeBucket(avgResponseTimeMs ?? null);
  const impressionFired = useRef(false);

  useEffect(() => {
    if (impressionFired.current || !vendorId) return;
    impressionFired.current = true;
    trackEvent({
      eventType: "vendor_impression",
      vendorId,
      metadata: { listContext: "search_results", viewMode },
    });
  }, [vendorId, viewMode]);

  function handleClick() {
    if (!vendorId) return;
    trackEvent({
      eventType: "vendor_click",
      vendorId,
      metadata: { listContext: "search_results", viewMode },
    });
  }

  const isVerified = verificationLevel && verificationLevel !== "UNVERIFIED";

  const compareCheckbox = onToggleCompare ? (
    <label
      className="absolute bottom-3 left-3.5 z-10 flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold shadow-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={!!compareSelected}
        onChange={(e) => {
          e.stopPropagation();
          onToggleCompare();
        }}
        onClick={(e) => e.stopPropagation()}
        className="accent-[#e00b41]"
      />
      Compare
    </label>
  ) : null;

  // List View Layout
  if (viewMode === "list") {
    return (
      <Link
        href={`/vendors/${slug}`}
        onClick={handleClick}
        className="group flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-gray-200 bg-white no-underline text-inherit shadow-xs transition-all duration-300 hover:shadow-md hover:border-gray-300"
      >
        {/* Photo Container */}
        <div className="relative w-full sm:w-[280px] md:w-[320px] aspect-4/3 sm:aspect-4/3 min-h-[200px] flex-shrink-0 bg-gray-100 overflow-hidden">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={businessName}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 320px"
              {...(logoBlurDataUrl ? { placeholder: "blur" as const, blurDataURL: logoBlurDataUrl } : {})}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400 font-medium">
              No photo yet
            </div>
          )}

          {/* Real Verified Badge (only if verified) */}
          {isVerified && (
            <div className="absolute top-3 left-0 bg-emerald-700 text-white px-2.5 py-0.5 text-[11px] font-bold tracking-wide rounded-r-md shadow-xs flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>Verified</span>
            </div>
          )}

          {/* Wishlist Heart Button */}
          <VendorHeartButton
            vendorId={vendorId}
            isAuthenticated={isAuthenticated}
            initialFavorited={initialFavorited}
            className="absolute top-3 right-3 z-10"
          />

          {compareCheckbox}
        </div>

        {/* Content Details */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#e00b41] transition-colors">
                  {businessName}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  {cityName && (
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {cityName}
                    </span>
                  )}
                  {isVerified && (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {shortDescription && (
              <p className="mt-3 text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                {shortDescription}
              </p>
            )}

            {responseTimeLabel && (
              <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {responseTimeLabel}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
            <div>
              {startingPrice ? (
                <div>
                  <span className="text-xs text-gray-500">Starting from</span>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {currency === "INR" ? "₹" : (currency ?? "₹")}
                    {Number(startingPrice).toLocaleString("en-IN")}{" "}
                    <span className="text-xs font-normal text-gray-500">onwards</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-semibold text-gray-600">Price on request</div>
              )}
            </div>

            <span className="rounded-full bg-[#e00b41] px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#c2185b]">
              View Profile
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Grid View Layout (WedMeGood 3-column card)
  return (
    <Link
      href={`/vendors/${slug}`}
      onClick={handleClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white no-underline text-inherit shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-gray-300"
    >
      {/* Card Image */}
      <div className="relative aspect-4/3 w-full bg-gray-100 overflow-hidden">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={businessName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 900px) 50vw, 33vw"
            {...(logoBlurDataUrl ? { placeholder: "blur" as const, blurDataURL: logoBlurDataUrl } : {})}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400 font-medium">
            No photo yet
          </div>
        )}

        {/* Real Verified Badge (only if verified) */}
        {isVerified && (
          <div className="absolute top-3 left-0 bg-emerald-700 text-white px-2.5 py-0.5 text-[11px] font-bold tracking-wide rounded-r-md shadow-xs flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>Verified</span>
          </div>
        )}

        {/* Heart wishlist button */}
        <VendorHeartButton
          vendorId={vendorId}
          isAuthenticated={isAuthenticated}
          initialFavorited={initialFavorited}
          className="absolute top-3 right-3 z-10"
        />

        {compareCheckbox}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex items-center justify-between gap-1">
            <h3 className="truncate text-sm sm:text-base font-bold text-gray-900 group-hover:text-[#e00b41] transition-colors">
              {businessName}
            </h3>
            {cityName && (
              <span className="text-[11px] text-gray-500 truncate max-w-[100px]">
                {cityName}
              </span>
            )}
          </div>

          {shortDescription && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-500 leading-relaxed">
              {shortDescription}
            </p>
          )}

          {responseTimeLabel && (
            <p className="mt-1.5 truncate text-[10px] font-medium text-emerald-700">{responseTimeLabel}</p>
          )}
        </div>

        {startingPrice ? (
          <div className="mt-3 border-t border-gray-100 pt-2 text-xs sm:text-sm font-bold text-gray-900">
            {currency === "INR" ? "₹" : (currency ?? "₹")}
            {Number(startingPrice).toLocaleString("en-IN")}{" "}
            <span className="text-xs font-normal text-gray-500">onwards</span>
          </div>
        ) : (
          <div className="mt-3 border-t border-gray-100 pt-2 text-xs font-medium text-gray-500">
            Price on request
          </div>
        )}
      </div>
    </Link>
  );
}
