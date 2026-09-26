"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { VendorCard } from "@/components/shared/VendorCard";
import { useGuestShortlist } from "@/lib/hooks/useGuestShortlist";

const MAX_COMPARE = 5;

/**
 * Guest-facing /shortlist — same layout/interactions as the authenticated
 * ShortlistGrid (checkbox selection feeding "Compare selected", un-save via
 * the card's own heart button), but reading from useGuestShortlist's
 * localStorage instead of a server-fetched Shortlist. High-priority fix:
 * previously a signed-out visitor couldn't reach /shortlist at all (hard
 * login redirect from the (couple) route group).
 */
export function GuestShortlistView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("compareVendorId");
  const guestShortlist = useGuestShortlist();

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

  function goToCompare() {
    router.push(`/compare?vendorIds=${Array.from(selected).join(",")}&from=shortlist`);
  }

  // Avoids a hydration mismatch (server has no localStorage to read) — the
  // real list swaps in right after mount, same guard useWizardDraft-style
  // hooks use elsewhere in this codebase.
  if (!guestShortlist.loaded) return null;

  if (guestShortlist.items.length === 0) {
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-brand-primary/5 px-5 py-3.5 text-[13px]">
        <span className="text-text-grey">
          Saved on this device only. <strong className="text-text-dark">Log in</strong> to keep this shortlist in your account and access it anywhere.
        </span>
        <Link
          href={`/login?next=${encodeURIComponent("/shortlist")}`}
          className="whitespace-nowrap rounded-md bg-brand-primary px-4 py-2 font-bold text-white no-underline"
        >
          Log in / Sign up
        </Link>
      </div>

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
        {guestShortlist.items.map((item) => (
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
              isAuthenticated={false}
              listContext="guest_shortlist"
              onFavoriteToggle={(favorited) => {
                // The card's own VendorHeartButton already wrote the removal
                // to localStorage via its own useGuestShortlist() instance —
                // this hook instance (this component's) hasn't re-read
                // storage, so its `items` won't drop the card on its own.
                // Mirror the removal into this instance's state directly
                // rather than re-reading storage, so the grid updates in
                // the same tick as the heart-button's own optimistic UI.
                if (!favorited) {
                  guestShortlist.remove(item.vendorId);
                  setSelected((prev) => {
                    const next = new Set(prev);
                    next.delete(item.vendorId);
                    return next;
                  });
                }
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
