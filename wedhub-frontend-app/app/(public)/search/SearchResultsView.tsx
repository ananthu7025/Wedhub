"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchControlsHeader } from "./SearchControlsHeader";
import { SearchCard } from "./SearchCard";
import { trackEvent } from "@/lib/analytics/track";
import type { Category, Location, VendorSearchResult } from "@/lib/api/vendors.types";

const MAX_COMPARE = 5;

interface SearchResultsViewProps {
  vendors: VendorSearchResult[];
  total: number;
  categories: Category[];
  cities: Location[];
  selectedCategory?: Category;
  selectedCity?: Location;
  keyword?: string;
  priceMin?: number;
  priceMax?: number;
  verified?: boolean;
  page: number;
  totalPages: number;
  isAuthenticated: boolean;
  /** Vendor ids already in the caller's shortlist — seeds each card's heart button so it reflects real state on load. */
  favoritedVendorIds?: string[];
}

export function SearchResultsView({
  vendors,
  total,
  categories,
  cities,
  selectedCategory,
  selectedCity,
  keyword,
  priceMin,
  priceMax,
  verified,
  page,
  totalPages,
  isAuthenticated,
  favoritedVendorIds = [],
}: SearchResultsViewProps) {
  const favoritedSet = new Set(favoritedVendorIds);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const searchParams = useSearchParams();
  const router = useRouter();

  // Item 16: compare-from-search-results — not restricted to the
  // shortlist. Category matching isn't checked here (VendorSearchResult
  // carries no categoryId — see vendors.types.ts) since the backend already
  // enforces "same primary category" and returns a clear error; selecting
  // across categories surfaces that error as a popup instead of a page
  // navigation, same principle ShortlistGrid.tsx already follows (trust the
  // backend's rejection message rather than re-implementing the check).
  const [compareSelected, setCompareSelected] = useState<Set<string>>(new Set());

  function toggleCompare(vendorId: string) {
    setCompareSelected((prev) => {
      const next = new Set(prev);
      if (next.has(vendorId)) {
        next.delete(vendorId);
      } else if (next.size < MAX_COMPARE) {
        next.add(vendorId);
      }
      return next;
    });
  }

  function goToCompare() {
    router.push(`/compare?vendorIds=${Array.from(compareSelected).join(",")}&from=search`);
  }

  // GA4 "search" event (Google's recommended-event name) — fires once per
  // rendered result set, i.e. once per real filter/keyword change, since
  // this whole page is server-rendered per navigation (see app/(public)/
  // search/page.tsx) and this component remounts with fresh props each
  // time. No PII: only the search term and resolved category/city/result
  // count, never any user identity.
  useEffect(() => {
    trackEvent({
      eventType: "search",
      metadata: {
        search_term: keyword,
        vendor_category: selectedCategory?.name,
        location: selectedCity?.name,
        results_count: total,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, selectedCategory?.id, selectedCity?.id, total]);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    return `/search?${next.toString()}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <nav className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            Home
          </Link>
          <span>›</span>
          <Link href="/vendors" className="hover:text-gray-900 transition-colors">
            Vendors
          </Link>
          {selectedCategory && (
            <>
              <span>›</span>
              <span className="text-gray-900 font-semibold">{selectedCategory.name}</span>
            </>
          )}
          {selectedCity && (
            <>
              <span>›</span>
              <span className="text-gray-600">{selectedCity.name}</span>
            </>
          )}
        </nav>
      </div>

      {/* Header controls: Title, results counter, keyword search, list/grid toggle, active chips */}
      <SearchControlsHeader
        totalCount={total}
        selectedCategory={selectedCategory}
        selectedCity={selectedCity}
        keyword={keyword}
        priceMin={priceMin}
        priceMax={priceMax}
        verified={verified}
        viewMode={viewMode}
        onToggleView={setViewMode}
      />

      {/* Compare bar (item 16) */}
      {vendors.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3">
          <span className="text-xs sm:text-sm text-gray-600">
            <strong className="text-gray-900">{compareSelected.size}</strong> selected for comparison (2–5, same
            category)
          </span>
          <button
            type="button"
            disabled={compareSelected.size < 2}
            onClick={goToCompare}
            className="rounded-full bg-[#e00b41] px-4 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-40 hover:bg-[#c2185b]"
          >
            Compare selected
          </button>
        </div>
      )}

      {/* Vendors List / Grid */}
      {vendors.length === 0 ? (
        <NoResultsEmptyState
          keyword={keyword}
          categories={categories}
          cities={cities}
          hasActiveFilters={Boolean(keyword || selectedCategory || selectedCity || priceMin !== undefined || priceMax !== undefined || verified)}
        />
      ) : viewMode === "list" ? (
        <div className="flex flex-col gap-5">
          {vendors.map((vendor) => (
            <SearchCard
              key={vendor.id}
              vendorId={vendor.id}
              slug={vendor.slug}
              businessName={vendor.businessName}
              logoUrl={vendor.logoUrl}
              logoBlurDataUrl={vendor.logoBlurDataUrl}
              shortDescription={vendor.shortDescription}
              startingPrice={vendor.startingPrice}
              currency={vendor.currency}
              verificationLevel={vendor.verificationLevel}
              isPremiumEligible={vendor.isPremiumEligible}
              isAuthenticated={isAuthenticated}
              viewMode="list"
              cityName={selectedCity?.name}
              initialFavorited={favoritedSet.has(vendor.id)}
              compareSelected={compareSelected.has(vendor.id)}
              onToggleCompare={() => toggleCompare(vendor.id)}
              avgResponseTimeMs={vendor.avgResponseTimeMs}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <SearchCard
              key={vendor.id}
              vendorId={vendor.id}
              slug={vendor.slug}
              businessName={vendor.businessName}
              logoUrl={vendor.logoUrl}
              logoBlurDataUrl={vendor.logoBlurDataUrl}
              shortDescription={vendor.shortDescription}
              startingPrice={vendor.startingPrice}
              currency={vendor.currency}
              verificationLevel={vendor.verificationLevel}
              isPremiumEligible={vendor.isPremiumEligible}
              isAuthenticated={isAuthenticated}
              viewMode="grid"
              cityName={selectedCity?.name}
              initialFavorited={favoritedSet.has(vendor.id)}
              compareSelected={compareSelected.has(vendor.id)}
              onToggleCompare={() => toggleCompare(vendor.id)}
              avgResponseTimeMs={vendor.avgResponseTimeMs}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={buildUrl({ page: String(page - 1) })}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
            >
              ← Previous
            </Link>
          )}
          <span className="px-3 text-xs text-gray-500 font-medium">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildUrl({ page: String(page + 1) })}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// A dead-end "no results" state loses a visitor who might just have typed
// a slightly-off term or a city with no vendors YET — this gives them
// somewhere to go next instead of a wall. Picks up to 6 categories and 6
// cities to show as quick links (every category/city this page already
// fetched, not a separate request) rather than hardcoding a "popular"
// subset that could drift from what's actually in the catalog.
function NoResultsEmptyState({
  keyword,
  categories,
  cities,
  hasActiveFilters,
}: {
  keyword?: string;
  categories: Category[];
  cities: Location[];
  hasActiveFilters: boolean;
}) {
  const suggestedCategories = categories.slice(0, 6);
  const suggestedCities = cities.slice(0, 6);

  return (
    <div className="my-12 flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-xs">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1f2] text-[#e00b41]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </div>
      <h2 className="mb-1.5 text-lg font-bold text-gray-900">
        {keyword ? <>No vendors found for &ldquo;{keyword}&rdquo;</> : "No vendors found"}
      </h2>
      <p className="max-w-md text-xs sm:text-sm text-gray-500 mb-6">
        {keyword
          ? "Try another spelling, a shorter search term, or use the suggestions below."
          : "Try broadening your budget, selecting another city, or exploring all categories."}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <Link
          href="/vendors"
          className="rounded-full bg-[#e00b41] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#c2185b] transition-colors"
        >
          Browse all vendors
        </Link>
        {hasActiveFilters && (
          <Link
            href="/search"
            className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Clear filters
          </Link>
        )}
      </div>

      {suggestedCategories.length > 0 && (
        <div className="mb-6 w-full max-w-2xl">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">Popular categories</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {suggestedCategories.map((category) => (
              <Link
                key={category.id}
                href={`/search?categoryId=${category.id}`}
                className="rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#e00b41] hover:text-[#e00b41] transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {suggestedCities.length > 0 && (
        <div className="w-full max-w-2xl">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">Nearby districts</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {suggestedCities.map((city) => (
              <Link
                key={city.id}
                href={`/search?cityId=${city.id}`}
                className="rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#e00b41] hover:text-[#e00b41] transition-colors"
              >
                {city.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
