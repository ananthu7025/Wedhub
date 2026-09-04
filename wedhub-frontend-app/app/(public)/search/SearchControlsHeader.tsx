"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category, Location } from "@/lib/api/vendors.types";

interface SearchControlsHeaderProps {
  totalCount: number;
  selectedCategory?: Category;
  selectedCity?: Location;
  keyword?: string;
  priceMin?: number;
  priceMax?: number;
  verified?: boolean;
  viewMode: "grid" | "list";
  onToggleView: (mode: "grid" | "list") => void;
}

export function SearchControlsHeader({
  totalCount,
  selectedCategory,
  selectedCity,
  keyword,
  priceMin,
  priceMax,
  verified,
  viewMode,
  onToggleView,
}: SearchControlsHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(keyword ?? "");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep input synchronized if keyword in URL changes (e.g. back/forward, chip dismissal)
  useEffect(() => {
    setSearchTerm(keyword ?? "");
  }, [keyword]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  function executeSearch(query: string) {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const next = new URLSearchParams(searchParams.toString());
    const trimmed = query.trim();

    if (trimmed) {
      next.set("keyword", trimmed);
    } else {
      next.delete("keyword");
    }

    // Always preserve categoryId if currently in a category
    if (selectedCategory) {
      next.set("categoryId", selectedCategory.id);
    }
    // Always preserve cityId if currently in a city
    if (selectedCity) {
      next.set("cityId", selectedCity.id);
    }

    next.delete("page");
    router.push(`/search?${next.toString()}`);
  }

  // Live debounced search as user types (like Google & Flipkart)
  function handleInputChange(value: string) {
    setSearchTerm(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(value);
    }, 350);
  }

  // Immediate execution on form submit / Enter key
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    executeSearch(searchTerm);
  }

  // Clear search input directly
  function handleClearSearch() {
    setSearchTerm("");
    executeSearch("");
  }

  // Dynamic heading
  let title = "Wedding Vendors";
  if (selectedCategory && selectedCity) {
    title = `${selectedCategory.name} in ${selectedCity.name}`;
  } else if (selectedCategory) {
    title = selectedCategory.name;
  } else if (selectedCity) {
    title = `Wedding Vendors in ${selectedCity.name}`;
  } else if (keyword) {
    title = `Results for "${keyword}"`;
  }

  return (
    <div className="mb-6">
      {/* Top Title & Right Search / View Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            {title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Showing <strong className="text-gray-900 font-bold">{totalCount}</strong> results as per your search criteria
          </p>
        </div>

        {/* Search Box & View Mode Toggle */}
        <div className="flex items-center gap-3">
          {/* Keyword Search Input with Live Instant Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            {/* Hidden inputs to preserve context in native submission */}
            {selectedCategory && <input type="hidden" name="categoryId" value={selectedCategory.id} />}
            {selectedCity && <input type="hidden" name="cityId" value={selectedCity.id} />}

            <input
              name="keyword"
              type="text"
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={`Search ${selectedCategory ? selectedCategory.name : "vendors"}...`}
              className="w-48 sm:w-64 rounded-full border border-gray-300 bg-white py-2 pl-9 pr-8 text-xs outline-none transition-all focus:border-[#e00b41] focus:ring-1 focus:ring-[#e00b41]"
              autoComplete="off"
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="absolute left-3 text-gray-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 flex h-4 w-4 items-center justify-center rounded-full text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Clear search"
              >
                ✕
              </button>
            )}
            <button type="submit" className="sr-only">Search</button>
          </form>

          {/* List / Grid Toggle Switcher */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs">
            <button
              type="button"
              onClick={() => onToggleView("list")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-all ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow-xs font-bold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              title="List view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleView("grid")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-white text-[#e00b41] shadow-xs font-bold"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              title="Grid view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Grid</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
