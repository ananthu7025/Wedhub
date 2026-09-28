"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addFavorite } from "@/lib/api/shortlists-client";
import { useGuestShortlist } from "@/lib/hooks/useGuestShortlist";
import { useToast } from "@/components/ui/Toast";
import type { ShortlistVendorSummary } from "@/lib/api/shortlists.types";

interface AddToCompareButtonProps {
  vendorId: string;
  vendorName: string;
  categoryName?: string;
  vendorSummary: ShortlistVendorSummary;
  isAuthenticated: boolean;
  initialFavorited?: boolean;
}

export function AddToCompareButton({
  vendorId,
  vendorName,
  categoryName,
  vendorSummary,
  isAuthenticated,
  initialFavorited = false,
}: AddToCompareButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const guestShortlist = useGuestShortlist();
  const [loading, setLoading] = useState(false);

  async function handleAddToCompare() {
    setLoading(true);
    const isSaved = isAuthenticated ? initialFavorited : guestShortlist.isSaved(vendorId);

    if (!isSaved) {
      if (isAuthenticated) {
        try {
          const res = await addFavorite(vendorId);
          if (res.success) {
            showToast(`${vendorName} added to shortlist for comparison`, "success");
          }
        } catch {
          // Proceed to shortlist anyway
        }
      } else {
        guestShortlist.save(vendorId, vendorSummary);
        showToast(`${vendorName} added to shortlist for comparison`, "success");
      }
    }

    router.push(`/shortlist?compareVendorId=${vendorId}`);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleAddToCompare}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-white py-2.5 text-center text-xs font-bold text-text-dark transition-colors hover:bg-surface-input disabled:opacity-60"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="18" rx="1.5" />
          <rect x="14" y="3" width="7" height="18" rx="1.5" />
        </svg>
        {loading ? "Adding to compare…" : "Add to compare"}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-text-grey">
        {categoryName
          ? `Compares with other shortlisted ${categoryName.toLowerCase()} vendors`
          : "Compares with other vendors saved in your shortlist"}
      </p>
    </div>
  );
}
