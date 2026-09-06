"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { VendorCard } from "@/components/shared/VendorCard";
import type { ShortlistItem } from "@/lib/api/shortlists.types";

const MAX_COMPARE = 5;

/**
 * Client Component for the interactive parts of /shortlist — checkbox
 * selection feeding "Compare selected", and the heart un-favorite action
 * (delegated to VendorCard's own VendorHeartButton via onFavoriteToggle,
 * rather than a separate remove button, so shortlisting/un-shortlisting
 * looks and behaves identically here and in search results).
 * Comparison requires 2-5 vendors of the same primary category (backend
 * validates this — see frontenddocs/10-risks-and-open-questions.md); we
 * surface the backend's rejection message rather than re-implementing the
 * category-match check client-side.
 */
export function ShortlistGrid({ items }: { items: ShortlistItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("compareVendorId");

  const [visibleItems, setVisibleItems] = useState(items);
  const [selected, setSelected] = useState<Set<string>>(new Set(preselect ? [preselect] : []));

  function toggleSelected(vendorId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(vendorId)) {
        next.delete(vendorId);
      } else if (next.size < MAX_COMPARE) {
        next.add(vendorId);
      }
      return next;
    });
  }

  function handleUnfavorite(vendorId: string) {
    setVisibleItems((prev) => prev.filter((item) => item.vendorId !== vendorId));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(vendorId);
      return next;
    });
  }

  function goToCompare() {
    router.push(`/compare?vendorIds=${Array.from(selected).join(",")}`);
  }

  if (visibleItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
        <h3 className="mb-1.5 text-[15px] font-bold">No vendors saved yet</h3>
        <p className="mb-4 max-w-[320px] text-[13px] text-text-grey">
          Browse vendors and tap the heart icon to save them here.
        </p>
        <Link href="/search" className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white no-underline">
          Find vendors
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between rounded-xl border border-border bg-white px-5 py-3.5">
        <span className="text-sm text-text-grey">
          <strong className="text-text-dark">{selected.size}</strong> selected for comparison (2–5, same category)
        </span>
        <button
          type="button"
          disabled={selected.size < 2}
          onClick={goToCompare}
          className="rounded-md bg-brand-primary px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40"
        >
          Compare selected
        </button>
      </div>

      <div className="grid grid-cols-4 gap-5 max-[900px]:grid-cols-2">
        {visibleItems.map((item) => (
          <div key={item.vendorId} className="relative">
            <VendorCard
              vendorId={item.vendorId}
              slug={item.vendor.slug}
              businessName={item.vendor.businessName}
              logoUrl={null}
              shortDescription={item.vendor.profile?.shortDescription ?? null}
              startingPrice={item.vendor.profile?.startingPrice ?? null}
              currency={item.vendor.profile?.currency ?? null}
              isAuthenticated
              listContext="shortlist"
              onFavoriteToggle={(favorited) => {
                if (!favorited) handleUnfavorite(item.vendorId);
              }}
            />
            <label className="absolute bottom-3 left-3.5 z-10 flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-[13px] shadow-sm">
              <input
                type="checkbox"
                checked={selected.has(item.vendorId)}
                onChange={() => toggleSelected(item.vendorId)}
                className="accent-brand-primary"
              />
              Compare
            </label>
          </div>
        ))}
      </div>
    </>
  );
}
