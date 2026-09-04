"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SearchControlsHeader } from "./SearchControlsHeader";
import { SearchCard } from "./SearchCard";
import type { Category, Location, VendorSearchResult } from "@/lib/api/vendors.types";

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
}

export function SearchResultsView({
  vendors,
  total,
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
}: SearchResultsViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const searchParams = useSearchParams();

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

      {/* Vendors List / Grid */}
      {vendors.length === 0 ? (
        <div className="my-12 flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-xs">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fff1f2] text-[#e00b41]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </div>
          <h2 className="mb-1.5 text-lg font-bold text-gray-900">No vendors found</h2>
          <p className="max-w-md text-xs sm:text-sm text-gray-500 mb-6">
            We couldn&apos;t find any vendors matching your exact criteria. Try broadening your budget, selecting another city, or exploring all categories.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/vendors"
              className="rounded-full bg-[#e00b41] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#c2185b] transition-colors"
            >
              Browse All Categories
            </Link>
          </div>
        </div>
      ) : viewMode === "list" ? (
        <div className="flex flex-col gap-5">
          {vendors.map((vendor) => (
            <SearchCard
              key={vendor.id}
              vendorId={vendor.id}
              slug={vendor.slug}
              businessName={vendor.businessName}
              logoUrl={vendor.logoUrl}
              shortDescription={vendor.shortDescription}
              startingPrice={vendor.startingPrice}
              currency={vendor.currency}
              verificationLevel={vendor.verificationLevel}
              isAuthenticated={isAuthenticated}
              viewMode="list"
              cityName={selectedCity?.name}
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
              shortDescription={vendor.shortDescription}
              startingPrice={vendor.startingPrice}
              currency={vendor.currency}
              verificationLevel={vendor.verificationLevel}
              isAuthenticated={isAuthenticated}
              viewMode="grid"
              cityName={selectedCity?.name}
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
