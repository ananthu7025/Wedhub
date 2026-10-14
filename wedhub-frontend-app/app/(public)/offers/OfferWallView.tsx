"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OfferCard } from "./OfferCard";
import type { PublicOffer } from "@/lib/api/vendor-offers.types";

interface OfferWallViewProps {
  offers: PublicOffer[];
  total: number;
  page: number;
  totalPages: number;
  isAuthenticated: boolean;
  favoritedVendorIds?: string[];
}

export function OfferWallView({ offers, total, page, totalPages, isAuthenticated, favoritedVendorIds = [] }: OfferWallViewProps) {
  const favoritedSet = new Set(favoritedVendorIds);
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
    return `/offers?${next.toString()}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Offer Wall</h1>
          <p className="text-xs text-gray-500">{total} offer{total === 1 ? "" : "s"} available</p>
        </div>

        <div className="flex items-center rounded-full border border-gray-200 bg-white p-0.5">
          <button
            type="button"
            aria-label="Grid view"
            onClick={() => setViewMode("grid")}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              viewMode === "grid" ? "bg-[#e00b41] text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="List view"
            onClick={() => setViewMode("list")}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
              viewMode === "list" ? "bg-[#e00b41] text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {offers.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm font-bold text-gray-900">No offers match your filters right now</p>
          <p className="mt-1 text-xs text-gray-500">Try a different category or widen your price range.</p>
        </div>
      ) : viewMode === "list" ? (
        <div className="flex flex-col gap-4">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              viewMode="list"
              isAuthenticated={isAuthenticated}
              initialFavorited={favoritedSet.has(offer.vendorId)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              viewMode="grid"
              isAuthenticated={isAuthenticated}
              initialFavorited={favoritedSet.has(offer.vendorId)}
            />
          ))}
        </div>
      )}

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
          <span className="px-3 text-xs font-semibold text-gray-500">
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
