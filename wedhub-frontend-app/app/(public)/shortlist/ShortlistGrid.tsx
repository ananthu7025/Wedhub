"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { VendorCard } from "@/components/shared/VendorCard";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import type { ShortlistItem } from "@/lib/api/shortlists.types";

const MAX_COMPARE = 5;

/**
 * Client Component for the interactive parts of /shortlist — checkbox
 * selection feeding "Compare selected", and the heart un-favorite action
 * (delegated to VendorCard's own VendorHeartButton via onFavoriteToggle,
 * rather than a separate remove button, so shortlisting/un-shortlisting
 * looks and behaves identically here and in search results).
 * Comparison requires 2-5 vendors of the same primary category.
 */
export function ShortlistGrid({ items }: { items: ShortlistItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("compareVendorId");
  const { showToast } = useToast();

  const [visibleItems, setVisibleItems] = useState(items);
  const [selected, setSelected] = useState<Set<string>>(new Set(preselect ? [preselect] : []));

  const activeCategoryId =
    selected.size > 0
      ? visibleItems.find((i) => selected.has(i.vendorId))?.vendor.categoryId ?? null
      : null;

  function toggleSelected(vendorId: string, vendorCategoryId?: string | null) {
    if (selected.has(vendorId)) {
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(vendorId);
        return next;
      });
      return;
    }

    if (activeCategoryId && vendorCategoryId && vendorCategoryId !== activeCategoryId) {
      showToast("You can only compare vendors from the same category", "error");
      return;
    }

    if (selected.size >= MAX_COMPARE) {
      showToast(`You can compare up to ${MAX_COMPARE} vendors at a time`, "error");
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);
      next.add(vendorId);
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
    if (selected.size < 2) {
      showToast("Select at least 2 vendors to compare", "error");
      return;
    }
    const selectedItems = visibleItems.filter((i) => selected.has(i.vendorId));
    const catIds = new Set(selectedItems.map((i) => i.vendor.categoryId).filter(Boolean));
    if (catIds.size > 1) {
      showToast("All vendors being compared must share the same primary category", "error");
      return;
    }
    router.push(`/compare?vendorIds=${Array.from(selected).join(",")}&from=shortlist`);
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
          const isSelected = selected.has(item.vendorId);
          const isMismatched = Boolean(
            activeCategoryId &&
            item.vendor.categoryId &&
            item.vendor.categoryId !== activeCategoryId
          );
          const isMaxReached = selected.size >= MAX_COMPARE && !isSelected;
          const isDisabled = isMismatched || isMaxReached;
          const disabledReason = isMismatched
            ? "Can only compare vendors in the same category"
            : isMaxReached
            ? `You can compare up to ${MAX_COMPARE} vendors at a time`
            : undefined;

          return (
            <div key={item.vendorId} className="relative">
              <VendorCard
                vendorId={item.vendorId}
                slug={item.vendor.slug}
                businessName={item.vendor.businessName}
                logoUrl={item.vendor.profile?.logoUrl ?? null}
                logoBlurDataUrl={item.vendor.profile?.logoBlurDataUrl ?? null}
                shortDescription={item.vendor.profile?.shortDescription ?? null}
                startingPrice={item.vendor.profile?.startingPrice ?? null}
                currency={item.vendor.profile?.currency ?? null}
                categoryId={item.vendor.categoryId}
                isAuthenticated
                listContext="shortlist"
                onFavoriteToggle={(favorited) => {
                  if (!favorited) handleUnfavorite(item.vendorId);
                }}
              />
              <label
                className={cn(
                  "absolute bottom-3 left-3.5 z-10 flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] shadow-sm transition-opacity",
                  isDisabled
                    ? "bg-gray-100/90 text-gray-400 cursor-not-allowed opacity-60"
                    : "bg-white/90 text-text-dark cursor-pointer hover:bg-white"
                )}
                title={isDisabled ? disabledReason : undefined}
                onClick={(e) => {
                  if (isDisabled) {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleSelected(item.vendorId, item.vendor.categoryId);
                  }
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => toggleSelected(item.vendorId, item.vendor.categoryId)}
                  onClick={(e) => {
                    if (isDisabled) {
                      e.stopPropagation();
                      e.preventDefault();
                      toggleSelected(item.vendorId, item.vendor.categoryId);
                    }
                  }}
                  className={cn("accent-brand-primary", isDisabled && "cursor-not-allowed")}
                />
                Compare
              </label>
            </div>
          );
        })}
      </div>
    </>
  );
}
