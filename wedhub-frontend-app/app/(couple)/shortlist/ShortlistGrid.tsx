"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { removeFavorite } from "@/lib/api/shortlists-client";
import type { ShortlistItem } from "@/lib/api/shortlists.types";

const MAX_COMPARE = 5;

/**
 * Client Component for the interactive parts of /shortlist — checkbox
 * selection feeding "Compare selected", and the heart un-favorite action.
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

  async function handleRemove(vendorId: string) {
    setVisibleItems((prev) => prev.filter((item) => item.vendorId !== vendorId));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(vendorId);
      return next;
    });
    const result = await removeFavorite(vendorId);
    if (!result.success) {
      router.refresh();
    }
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
        {visibleItems.map((item) => {
          const price = item.vendor.profile?.startingPrice;
          const currency = item.vendor.profile?.currency;
          return (
            <div key={item.vendorId} className="overflow-hidden rounded-xl border border-border bg-white">
              <div className="relative aspect-4/3 bg-surface-input">
                <button
                  type="button"
                  onClick={() => handleRemove(item.vendorId)}
                  aria-label="Remove from shortlist"
                  className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brand-primary"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.6 4.2 5a5 5 0 017.8 1.3A5 5 0 0119.8 5c2.8 1.6 3.4 5.1 1.5 7.9C18.7 16.65 12 21 12 21z" />
                  </svg>
                </button>
                {item.vendor.profile === null && (
                  <div className="flex h-full w-full items-center justify-center text-sm text-text-grey">No photo yet</div>
                )}
              </div>
              <div className="p-3.5">
                <label className="mb-2 flex items-center gap-1.5 text-[13px]">
                  <input
                    type="checkbox"
                    checked={selected.has(item.vendorId)}
                    onChange={() => toggleSelected(item.vendorId)}
                    className="accent-brand-primary"
                  />
                  Compare
                </label>
                <div className="mb-0.5 truncate text-sm font-bold">{item.vendor.businessName}</div>
                {price && (
                  <div className="mb-2.5 text-xs text-text-grey">
                    {currency === "INR" ? "₹" : (currency ?? "")}
                    {Number(price).toLocaleString("en-IN")} onwards
                  </div>
                )}
                <div className="flex gap-2">
                  <Link
                    href={`/vendors/${item.vendor.slug}`}
                    className="flex-1 rounded-md border border-border bg-white py-1.5 text-center text-[13px] font-bold no-underline text-text-dark"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
