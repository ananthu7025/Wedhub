"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category } from "@/lib/api/vendors.types";
import type { OfferSort } from "@/lib/api/vendor-offers.types";

interface OfferFilterBarProps {
  categories: Category[];
  currentCategory?: Category;
  priceMin?: number;
  priceMax?: number;
  sort?: OfferSort;
}

const SORT_LABELS: Record<OfferSort, string> = {
  newest: "Newest",
  price_low: "Price: Low to High",
  price_high: "Price: High to Low",
  discount_high: "Biggest Discount",
};

export function OfferFilterBar({
  categories,
  currentCategory,
  priceMin,
  priceMax,
  sort = "newest",
}: OfferFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [tempMin, setTempMin] = useState<string>(priceMin !== undefined ? String(priceMin) : "");
  const [tempMax, setTempMax] = useState<string>(priceMax !== undefined ? String(priceMax) : "");
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempMin(priceMin !== undefined ? String(priceMin) : "");
    setTempMax(priceMax !== undefined ? String(priceMax) : "");
  }, [priceMin, priceMax]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function updateQuery(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "") {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    }
    next.delete("page");
    router.push(`/offers?${next.toString()}`);
    setOpenDropdown(null);
  }

  function toggleDropdown(name: string) {
    setOpenDropdown((prev) => (prev === name ? null : name));
  }

  const hasPriceFilter = priceMin !== undefined || priceMax !== undefined;

  const panelClass =
    "fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-gray-200 bg-white p-4 shadow-2xl " +
    "sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:max-h-80 sm:rounded-xl sm:border sm:p-2";
  const backdropClass = "sm:hidden fixed inset-0 z-[45] bg-black/40";

  return (
    <div ref={barRef} className="sticky top-[66px] z-40 w-full border-b border-gray-200 bg-white shadow-xs overflow-visible">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 sm:justify-between sm:gap-3 sm:overflow-visible sm:px-6 sm:py-2.5 lg:px-8 text-xs sm:text-sm">
        <div className="flex flex-none items-center gap-2 sm:flex-wrap sm:gap-3 overflow-visible">
          {/* "All Offers" + per-category chips */}
          <button
            type="button"
            onClick={() => updateQuery({ categoryId: undefined })}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 transition-all whitespace-nowrap cursor-pointer ${
              !currentCategory
                ? "border-[#e00b41] bg-[#fff1f2] font-semibold text-[#e00b41]"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            All Offers
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateQuery({ categoryId: cat.id })}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 transition-all whitespace-nowrap cursor-pointer ${
                currentCategory?.id === cat.id
                  ? "border-[#e00b41] bg-[#fff1f2] font-semibold text-[#e00b41]"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {cat.name}
            </button>
          ))}

          {/* Price Popover */}
          <div className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => toggleDropdown("price")}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 transition-all whitespace-nowrap cursor-pointer ${
                hasPriceFilter
                  ? "border-[#e00b41] bg-[#fff1f2] font-semibold text-[#e00b41]"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span>
                {hasPriceFilter
                  ? `₹${priceMin ? priceMin.toLocaleString("en-IN") : "0"} - ₹${priceMax ? priceMax.toLocaleString("en-IN") : "Any"}`
                  : "Price"}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`transition-transform duration-200 ${openDropdown === "price" ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {openDropdown === "price" && (
              <>
                <div className={backdropClass} onClick={() => setOpenDropdown(null)} />
                <div className={`${panelClass} sm:w-72`}>
                  <div className="mb-2 text-xs font-bold text-gray-700">Offer Price Range</div>
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="number"
                      placeholder="Min (₹)"
                      value={tempMin}
                      onChange={(e) => setTempMin(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-[#e00b41]"
                    />
                    <span className="text-gray-400">–</span>
                    <input
                      type="number"
                      placeholder="Max (₹)"
                      value={tempMax}
                      onChange={(e) => setTempMax(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-[#e00b41]"
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTempMin("");
                        setTempMax("");
                        updateQuery({ priceMin: undefined, priceMax: undefined });
                      }}
                      className="text-xs font-medium text-gray-500 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuery({ priceMin: tempMin.trim() || undefined, priceMax: tempMax.trim() || undefined })
                      }
                      className="rounded-full bg-[#e00b41] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#c2185b] cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-none items-center gap-2 sm:gap-3">
          {/* Sort Dropdown */}
          <div className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => toggleDropdown("sort")}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer"
            >
              <span className="text-gray-500">Sort:</span>
              <span className="font-semibold text-gray-900">{SORT_LABELS[sort]}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`transition-transform duration-200 ${openDropdown === "sort" ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {openDropdown === "sort" && (
              <>
                <div className={backdropClass} onClick={() => setOpenDropdown(null)} />
                <div className={`${panelClass} sm:left-auto sm:right-0 sm:w-48`}>
                  {(Object.entries(SORT_LABELS) as [OfferSort, string][]).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => updateQuery({ sort: id })}
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs sm:text-sm transition-colors cursor-pointer ${
                        sort === id ? "bg-[#fff1f2] font-bold text-[#e00b41]" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
