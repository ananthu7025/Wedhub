"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function SortSelect({ currentSort }: { currentSort: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("sort", event.target.value);
    next.delete("page");
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
