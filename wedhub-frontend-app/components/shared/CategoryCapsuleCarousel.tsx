"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";

interface CategoryCapsule {
  id: string;
  title: string;
  startingPrice: string;
  imageUrl: string;
  link: string;
}

const CAPSULE_CATEGORIES: CategoryCapsule[] = [
  {
    id: "venues",
    title: "Venues",
    startingPrice: "₹ 1,50,000",
    imageUrl: "/images/capsules/venue.jpg",
    link: "/search?categoryId=venue",
  },
  {
    id: "photographers",
    title: "Photography",
    startingPrice: "₹ 50,000",
    imageUrl: "/images/capsules/photo.jpg",
    link: "/search?categoryId=photographer",
  },
  {
    id: "makeup",
    title: "Bridal Makeup",
    startingPrice: "₹ 18,000",
    imageUrl: "/images/capsules/makeup.jpg",
    link: "/search?categoryId=makeup",
  },
  {
    id: "mehndi",
    title: "Mehndi",
    startingPrice: "₹ 8,000",
    imageUrl: "/images/capsules/mehndi.jpg",
    link: "/search?keyword=mehndi",
  },
  {
    id: "decor",
    title: "Decorators",
    startingPrice: "₹ 75,000",
    imageUrl: "/images/capsules/decor.jpg",
    link: "/search?categoryId=decorator",
  },
  {
    id: "wear",
    title: "Bridal Wear",
    startingPrice: "₹ 45,000",
    imageUrl: "/images/capsules/wear.jpg",
    link: "/search?keyword=wear",
  },
  {
    id: "caterers",
    title: "Catering",
    startingPrice: "₹ 800 / plate",
    imageUrl: "/images/capsules/catering.jpg",
    link: "/search?categoryId=caterer",
  },
];

export function CategoryCapsuleCarousel() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -220 : 220;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section className="relative px-6 py-8 max-[900px]:px-4">
      {/* Section Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-jet-black">
            Wedding Categories
          </h2>
          <p className="text-xs text-text-grey mt-0.5">
            Explore curated vendor collections for every ceremony
          </p>
        </div>
        <Link
          href="/search"
          className="text-xs font-bold text-brand-primary hover:underline"
        >
          View all categories →
        </Link>
      </div>

      {/* Capsule Carousel Container */}
      <div className="relative">
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
          className="absolute -right-2 top-1/2 z-30 hidden -translate-y-1/2 sm:flex h-9 w-9 items-center justify-center rounded-full bg-[#1e55e2] text-white shadow-md transition-all hover:bg-[#1542b8] hover:scale-105 active:scale-95"
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
          {CAPSULE_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={category.link}
              className="group relative flex-shrink-0 w-[145px] sm:w-[165px] h-[245px] sm:h-[275px] rounded-[80px] overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 no-underline text-white flex flex-col justify-between p-4"
            >
              {/* Full Background Image */}
              <div className="absolute inset-0 z-0">
                <Image
                  src={category.imageUrl}
                  alt={category.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 145px, 165px"
                />
              </div>

              {/* Top Subtle Shade — Revealed on HOVER */}
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/80 via-black/35 to-transparent z-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Category Title — Revealed on HOVER */}
              <div className="relative z-10 text-center pt-3 opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none">
                <h3 className="text-sm sm:text-base font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-tight tracking-tight">
                  {category.title}
                </h3>
              </div>

              {/* Bottom Dark Gradient — Appears on HOVER */}
              <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Bottom Details (Price + Yellow Arrow) — Revealed on HOVER */}
              <div className="relative z-10 text-center pb-1 flex flex-col items-center opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <span className="text-[9px] uppercase font-semibold text-white/90 tracking-wider">
                  Starting at
                </span>
                <div className="text-xs sm:text-sm font-extrabold text-white tracking-wide mb-1.5 drop-shadow">
                  {category.startingPrice}
                </div>

                {/* Yellow Action Circle */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fde047] text-jet-black font-extrabold shadow-md transition-transform duration-200 group-hover:scale-105 active:scale-95">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Center "Explore Now ↗" Button */}
      <div className="mt-6 flex justify-center">
        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1e55e2] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-[#1542b8] hover:shadow-lg hover:scale-105 active:scale-95 no-underline"
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
