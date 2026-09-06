"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category, Location, SearchSort } from "@/lib/api/vendors.types";

interface SearchFilterBarProps {
  categories: Category[];
  cities: Location[];
  currentCategory?: Category;
  currentCity?: Location;
  priceMin?: number;
  priceMax?: number;
  verified?: boolean;
  sort?: SearchSort;
}

export function SearchFilterBar({
  categories,
  cities,
  currentCategory,
  currentCity,
  priceMin,
  priceMax,
  verified,
  sort = "relevance",
}: SearchFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Budget local state for the popover
  const [tempMin, setTempMin] = useState<string>(priceMin ? String(priceMin) : "");
  const [tempMax, setTempMax] = useState<string>(priceMax ? String(priceMax) : "");

  const barRef = useRef<HTMLDivElement>(null);

  // Sync temp budget state with incoming props
  useEffect(() => {
    setTempMin(priceMin ? String(priceMin) : "");
    setTempMax(priceMax ? String(priceMax) : "");
  }, [priceMin, priceMax]);

  // Close dropdown on click outside
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
    router.push(`/search?${next.toString()}`);
    setOpenDropdown(null);
  }

  function toggleDropdown(name: string) {
    setOpenDropdown((prev) => (prev === name ? null : name));
  }

  const hasBudgetFilter = priceMin !== undefined || priceMax !== undefined;

  return (
    <div
      ref={barRef}
      className="sticky top-[66px] z-40 w-full border-b border-gray-200 bg-white shadow-xs overflow-visible"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 sm:justify-between sm:gap-3 sm:overflow-visible sm:px-6 sm:py-2.5 lg:px-8 text-xs sm:text-sm">
        {/* Left Filters Group */}
        <div className="flex flex-none items-center gap-2 sm:flex-wrap sm:gap-3 overflow-visible">
          {/* Category Dropdown */}
          <div className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => toggleDropdown("category")}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 transition-all whitespace-nowrap cursor-pointer ${
                currentCategory
                  ? "border-[#e00b41] bg-[#fff1f2] font-semibold text-[#e00b41]"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span>{currentCategory ? currentCategory.name : "Category / Type"}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`transition-transform duration-200 ${openDropdown === "category" ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {openDropdown === "category" && (
              <div className="absolute left-0 top-full mt-2 w-64 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-2xl z-50">
                <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Select Category
                </div>
                <button
                  type="button"
                  onClick={() => updateQuery({ categoryId: undefined })}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs sm:text-sm transition-colors cursor-pointer ${
                    !currentCategory ? "bg-gray-100 font-bold text-gray-900" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => updateQuery({ categoryId: cat.id })}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs sm:text-sm transition-colors cursor-pointer ${
                      currentCategory?.id === cat.id
                        ? "bg-[#fff1f2] font-bold text-[#e00b41]"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* City Dropdown */}
          <div className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => toggleDropdown("city")}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 transition-all whitespace-nowrap cursor-pointer ${
                currentCity
                  ? "border-[#e00b41] bg-[#fff1f2] font-semibold text-[#e00b41]"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span>{currentCity ? currentCity.name : "Location"}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`transition-transform duration-200 ${openDropdown === "city" ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {openDropdown === "city" && (
              <div className="absolute left-0 top-full mt-2 w-56 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-2xl z-50">
                <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Select City
                </div>
                <button
                  type="button"
                  onClick={() => updateQuery({ cityId: undefined })}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs sm:text-sm transition-colors cursor-pointer ${
                    !currentCity ? "bg-gray-100 font-bold text-gray-900" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  All Cities
                </button>
                {cities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => updateQuery({ cityId: city.id })}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs sm:text-sm transition-colors cursor-pointer ${
                      currentCity?.id === city.id
                        ? "bg-[#fff1f2] font-bold text-[#e00b41]"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Budget Popover */}
          <div className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => toggleDropdown("budget")}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 transition-all whitespace-nowrap cursor-pointer ${
                hasBudgetFilter
                  ? "border-[#e00b41] bg-[#fff1f2] font-semibold text-[#e00b41]"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span>
                {hasBudgetFilter
                  ? `₹${priceMin ? priceMin.toLocaleString("en-IN") : "0"} - ₹${
                      priceMax ? priceMax.toLocaleString("en-IN") : "Any"
                    }`
                  : "Budget"}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`transition-transform duration-200 ${openDropdown === "budget" ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {openDropdown === "budget" && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl z-50">
                <div className="mb-2 text-xs font-bold text-gray-700">Budget Range (Starting Price)</div>

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
                      updateQuery({
                        priceMin: tempMin.trim() || undefined,
                        priceMax: tempMax.trim() || undefined,
                      })
                    }
                    className="rounded-full bg-[#e00b41] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#c2185b] cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Verified Toggle Pill */}
          <button
            type="button"
            onClick={() => updateQuery({ verified: verified ? undefined : "true" })}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 transition-all whitespace-nowrap cursor-pointer ${
              verified
                ? "border-[#e00b41] bg-[#fff1f2] font-semibold text-[#e00b41]"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={verified ? "text-[#e00b41]" : "text-gray-400"}
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Verified Only</span>
          </button>
        </div>

        {/* Right Sort Dropdown */}
        <div className="relative inline-block text-left flex-shrink-0">
          <button
            type="button"
            onClick={() => toggleDropdown("sort")}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer"
          >
            <span className="text-gray-500">Sort:</span>
            <span className="font-semibold text-gray-900">
              {sort === "price_low"
                ? "Price: Low to High"
                : sort === "price_high"
                ? "Price: High to Low"
                : sort === "newest"
                ? "Newest"
                : "Recommended"}
            </span>
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
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-200 bg-white p-2 shadow-2xl z-50">
              {[
                { id: "relevance", label: "Recommended" },
                { id: "price_low", label: "Price: Low to High" },
                { id: "price_high", label: "Price: High to Low" },
                { id: "newest", label: "Newest" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateQuery({ sort: opt.id })}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs sm:text-sm transition-colors cursor-pointer ${
                    sort === opt.id
                      ? "bg-[#fff1f2] font-bold text-[#e00b41]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
