"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";

/**
 * Arch Phase 18 Stage A — "Filter" (product.md §46). Every OTHER filter
 * control on the search page (category, city, price range, verified-only)
 * is a plain <form>/<Link> full navigation that re-runs SearchPage as a
 * Server Component, which already fires search_performed server-side (see
 * search.service.ts) — so those don't need a separate client event; the
 * resulting page load's search_performed IS the filter-change signal.
 * Sort is the one control that changes results via client-side
 * router.push instead of a form submit, so it's the only place worth a
 * dedicated filter_changed client event distinguishing "changed a filter"
 * from "typed a new search" — piggybacking on search_performed's metadata
 * isn't possible here since this never re-triggers the server call
 * (the results were already fetched for the previous sort).
 */
export function SortSelect({ currentSort }: { currentSort: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("sort", event.target.value);
    next.delete("page");
    trackEvent({ eventType: "filter_changed", metadata: { filter: "sort", value: event.target.value } });
    router.push(`/search?${next.toString()}`);
  }

  return (
    <select
      value={currentSort}
      onChange={handleChange}
      className="rounded-md border border-border px-3 py-2 text-[13px]"
    >
      <option value="relevance">Sort: Recommended</option>
      <option value="price_low">Price: Low to High</option>
      <option value="price_high">Price: High to Low</option>
      <option value="newest">Newest</option>
    </select>
  );
}
