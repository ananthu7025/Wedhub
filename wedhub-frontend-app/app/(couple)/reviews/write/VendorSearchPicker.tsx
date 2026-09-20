"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchVendorsClient } from "@/lib/api/catalog-client";
import { isPreOptimizedMediaUrl } from "@/lib/media/url";
import { formatApiError } from "@/lib/utils/error";
import type { VendorSearchResult } from "@/lib/api/vendors.types";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Item 10 fix: the "no vendor selected" branch of /reviews/write used to be
 * a dead end (just a link back to /enquiries). Per review.service.ts's
 * createReview() there is no booking/enquiry requirement to review a
 * vendor — any authenticated, verified user can review any APPROVED vendor
 * once — so gating this page behind "come from an enquiry" was an
 * unnecessary restriction, not a reflection of real eligibility rules.
 *
 * Reuses the same public vendor-search endpoint (GET /search/vendors via
 * searchVendorsClient, already used by StoriesBoard.tsx's collaborator
 * picker) instead of a new backend endpoint. Debounced text search; picking
 * a result navigates to ?vendor=<slug>, reusing the page's existing
 * param-driven server-rendered flow rather than duplicating ReviewForm
 * rendering here.
 */
export function VendorSearchPicker() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VendorSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const keyword = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Every branch's state updates run inside the timeout callback (even the
    // "too short to search" case) rather than synchronously in the effect
    // body, per react-hooks/set-state-in-effect — an effect should subscribe
    // to an external change and setState from a callback, not setState
    // directly on every run.
    debounceRef.current = setTimeout(async () => {
      if (keyword.length < 2) {
        setResults([]);
        setSearching(false);
        setError(null);
        return;
      }

      setSearching(true);
      const result = await searchVendorsClient({ keyword, limit: 8 });
      setSearching(false);
      if (!result.success) {
        setError(formatApiError(result.error));
        return;
      }
      setError(null);
      setResults(result.data);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function pickVendor(vendor: VendorSearchResult) {
    router.push(`/reviews/write?vendor=${vendor.slug}`);
  }

  return (
    <div className="text-left">
      <label className="mb-1.5 block text-[13px] font-bold" htmlFor="review-vendor-search">
        Search for a vendor to review
      </label>
      <input
        id="review-vendor-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Vendor or business name…"
        className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
        autoComplete="off"
      />

      {searching && <p className="mt-2 text-[13px] text-text-grey">Searching…</p>}
      {error && <p className="mt-2 text-[13px] text-red-70">{error}</p>}

      {!searching && !error && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-2 text-[13px] text-text-grey">No vendors found for &quot;{query.trim()}&quot;.</p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 overflow-hidden rounded-lg border border-border">
          {results.map((vendor) => (
            <li key={vendor.id} className="border-b border-neutral-grey-20 last:border-b-0">
              <button
                type="button"
                onClick={() => pickVendor(vendor)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-surface-input"
              >
                <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-input text-sm font-bold text-text-grey">
                  {vendor.logoUrl ? (
                    <Image
                      src={vendor.logoUrl}
                      alt={vendor.businessName}
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized={isPreOptimizedMediaUrl(vendor.logoUrl)}
                    />
                  ) : (
                    vendor.businessName.charAt(0)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold">{vendor.businessName}</div>
                  {vendor.shortDescription && (
                    <div className="truncate text-[12px] text-text-grey">{vendor.shortDescription}</div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
