"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FeaturedCategory } from "@/lib/api/vendors.types";
import { resolveCategorySeoSlug } from "@/lib/seo/category-slug-map";
import { isPreOptimizedMediaUrl } from "@/lib/media/url";

/**
 * Wedding category carousel — real, admin-curated data from
 * GET /categories/featured/homepage (Category.isFeaturedOnHomepage,
 * added 2026-09-03; see frontenddocs/10-risks-and-open-questions.md Open
 * Question 21). Renders nothing if no category is currently featured,
 * rather than showing hardcoded placeholder categories.
 */
export function CategoryCapsuleCarousel({ categories }: { categories: FeaturedCategory[] }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -220 : 220;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (categories.length === 0) return null;

  return (
    <section className="relative px-4 sm:px-6 py-6 sm:py-8">
      {/* Section Header */}
      <div className="mb-4 sm:mb-6 flex items-center md:items-end justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-2xl font-extrabold tracking-tight text-jet-black">
            Wedding Categories
          </h2>
          <p className="hidden md:block text-xs text-text-grey mt-0.5">
            Explore curated vendor collections for every ceremony
          </p>
        </div>
        <Link
          href="/vendors"
          className="text-xs font-bold text-crimson hover:underline flex items-center gap-1 shrink-0"
        >
          <span>View all categories</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Mobile 4-Column Circular Category Grid (Mobile screens only: < md) */}
      <div className="grid grid-cols-4 gap-x-2 gap-y-4 md:hidden">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${resolveCategorySeoSlug(category.slug)}`}
            className="group flex flex-col items-center text-center no-underline"
          >
            {/* Circular Image Container */}
            <div className="relative aspect-square w-14 sm:w-16 min-[380px]:w-16 rounded-full overflow-hidden shadow-xs border border-neutral-grey-20/80 bg-surface-input transition-transform duration-200 group-hover:scale-105 active:scale-95">
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized={isPreOptimizedMediaUrl(category.imageUrl)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-anti-flash-white text-xs font-bold text-paynes-grey">
                  {category.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Category Name */}
            <span className="mt-1.5 w-full line-clamp-1 text-[11px] sm:text-xs font-bold text-jet-black group-hover:text-brand-primary">
              {category.name}
            </span>

            {/* Starting Price / Label if available */}
            {category.startingPriceLabel && (
              <span className="mt-0.5 w-full line-clamp-1 text-[10px] text-text-grey font-medium">
                {category.startingPriceLabel}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Capsule Carousel Container (Desktop / Tablet screens only: >= md) */}
      <div className="relative hidden md:block">
        {/* Left Scroll Arrow */}
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute -left-2 top-1/2 z-30 hidden -translate-y-1/2 sm:flex h-9 w-9 items-center justify-center rounded-full bg-white text-jet-black shadow-md border border-border transition-all hover:bg-neutral-grey-20 hover:scale-105 active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Right Scroll Arrow */}
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute -right-2 top-1/2 z-30 hidden -translate-y-1/2 sm:flex h-9 w-9 items-center justify-center rounded-full bg-crimson text-white shadow-md transition-all hover:bg-crimson-60 hover:scale-105 active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Scrollable Track */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto py-3 px-1 scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${resolveCategorySeoSlug(category.slug)}`}
              className="group flex-shrink-0 w-[145px] sm:w-[165px] no-underline"
            >
            <div
              className="relative w-full h-[245px] sm:h-[275px] rounded-[80px] overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1.5 text-white flex flex-col justify-between p-4"
            >
              {/* Full Background Image */}
              <div className="absolute inset-0 z-0 bg-surface-input">
                {category.imageUrl && (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 640px) 145px, 165px"
                    unoptimized={isPreOptimizedMediaUrl(category.imageUrl)}
                  />
                )}
              </div>

              {/* Top Subtle Shade — Revealed on HOVER */}
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 via-black/35 to-transparent z-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Category Title — Revealed on HOVER */}
              <div className="relative z-10 text-center pt-3 opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none">
                <h3 className="text-sm sm:text-base font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight tracking-tight">
                  {category.name}
                </h3>
              </div>

              {/* Bottom Dark Gradient — Appears on HOVER */}
              <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Bottom Details (Price + Action Arrow) — Revealed on HOVER */}
              <div className="relative z-10 text-center pb-1 flex flex-col items-center opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                {category.startingPriceLabel && (
                  <>
                    <span className="text-[9px] uppercase font-semibold text-white/90 tracking-wider">
                      Starting at
                    </span>
                    <div className="text-xs sm:text-sm font-extrabold text-white tracking-wide mb-1.5 drop-shadow">
                      {category.startingPriceLabel}
                    </div>
                  </>
                )}

                {/* Action Circle */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-crimson font-extrabold shadow-md transition-transform duration-200 group-hover:scale-105 active:scale-95">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Category name — always visible caption below the pill */}
            <p className="mt-2 text-center text-xs sm:text-sm font-bold text-jet-black line-clamp-1 group-hover:text-brand-primary">
              {category.name}
            </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Center "Explore Now ↗" Button (Desktop only) */}
      <div className="mt-6 hidden md:flex justify-center">
        <Link
          href="/vendors"
          className="inline-flex items-center gap-1.5 rounded-full bg-crimson px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-crimson-60 hover:shadow-lg hover:scale-105 active:scale-95 no-underline"
        >
          <span>Explore Now</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
