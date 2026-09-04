"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Location } from "@/lib/api/vendors.types";

interface CityAvatarRowProps {
  cities: Location[];
  currentCityId?: string;
}

// Curated pastel themes for city avatar badges (cycles dynamically by index)
const CITY_AVATAR_THEMES = [
  { bg: "bg-rose-50 border-rose-200 text-rose-700", ring: "ring-[#e00b41]" },
  { bg: "bg-sky-50 border-sky-200 text-sky-700", ring: "ring-sky-500" },
  { bg: "bg-amber-50 border-amber-200 text-amber-700", ring: "ring-amber-500" },
  { bg: "bg-emerald-50 border-emerald-200 text-emerald-700", ring: "ring-emerald-500" },
  { bg: "bg-purple-50 border-purple-200 text-purple-700", ring: "ring-purple-500" },
  { bg: "bg-teal-50 border-teal-200 text-teal-700", ring: "ring-teal-500" },
  { bg: "bg-indigo-50 border-indigo-200 text-indigo-700", ring: "ring-indigo-500" },
  { bg: "bg-orange-50 border-orange-200 text-orange-700", ring: "ring-orange-500" },
];

export function CityAvatarRow({ cities, currentCityId }: CityAvatarRowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!cities || cities.length === 0) return null;

  function handleCityClick(cityId: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (next.get("cityId") === cityId) {
      next.delete("cityId");
    } else {
      next.set("cityId", cityId);
    }
    next.delete("page");
    router.push(`/search?${next.toString()}`);
  }

  // Generate 2-character monogram from real city name (e.g. "Delhi" -> "DL", "Bengaluru" -> "BL")
  function getMonogram(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  return (
    <div className="relative my-4 w-full">
      <div
        className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-2 pt-1 scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {cities.map((city, index) => {
          const isSelected = currentCityId === city.id;
          const theme = CITY_AVATAR_THEMES[index % CITY_AVATAR_THEMES.length];
          const monogram = getMonogram(city.name);

          return (
            <button
              key={city.id}
              type="button"
              onClick={() => handleCityClick(city.id)}
              className="group flex flex-col items-center flex-shrink-0 cursor-pointer text-center transition-transform hover:-translate-y-0.5 focus:outline-none"
            >
              <div
                className={`relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border shadow-xs transition-all duration-300 ${
                  theme.bg
                } ${
                  isSelected
                    ? "ring-3 ring-[#e00b41] ring-offset-2 scale-105 shadow-md border-transparent font-extrabold"
                    : "group-hover:scale-105"
                }`}
              >
                <div className="flex flex-col items-center justify-center">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="mb-0.5 opacity-60"
                  >
                    <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="text-xs sm:text-sm font-bold tracking-wider">
                    {monogram}
                  </span>
                </div>
              </div>
              <span
                className={`mt-1.5 text-xs transition-colors max-w-[80px] truncate ${
                  isSelected
                    ? "font-bold text-[#e00b41]"
                    : "font-medium text-gray-700 group-hover:text-gray-900"
                }`}
                title={city.name}
              >
                {city.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
