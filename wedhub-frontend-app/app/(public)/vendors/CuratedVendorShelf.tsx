"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { VendorSearchResult } from "@/lib/api/vendors.types";

interface CuratedVendorShelfProps {
  title: string;
  subtitle?: string;
  categoryId?: string;
  vendors: VendorSearchResult[];
}

export function CuratedVendorShelf({
  title,
  subtitle,
  categoryId,
  vendors,
}: CuratedVendorShelfProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!vendors || vendors.length === 0) return null;

  const viewAllHref = categoryId ? `/search?categoryId=${categoryId}` : "/search?keyword=wedding";

  return (
    <section className="relative my-8">
      {/* Section Header */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        <Link
          href={viewAllHref}
          className="text-xs font-bold text-[#e00b41] hover:underline"
        >
          View all ›
        </Link>
      </div>

      {/* Horizontal Carousel Track */}
      <div className="relative group">
        {/* Left Scroll Button */}
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute -left-3 top-1/2 z-20 hidden -translate-y-1/2 sm:flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Right Scroll Button */}
        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute -right-3 top-1/2 z-20 hidden -translate-y-1/2 sm:flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-105"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {vendors.map((vendor) => {
            const isVerified = vendor.verificationLevel && vendor.verificationLevel !== "UNVERIFIED";

            return (
              <Link
                key={vendor.id}
                href={`/vendors/${vendor.slug}`}
                className="flex-shrink-0 w-[220px] sm:w-[250px] overflow-hidden rounded-xl border border-gray-200 bg-white no-underline text-inherit shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-1"
              >
                {/* Image Container */}
                <div className="relative aspect-4/3 w-full bg-gray-100 overflow-hidden">
                  {vendor.logoUrl ? (
                    <Image
                      src={vendor.logoUrl}
                      alt={vendor.businessName}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="250px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400 font-medium">
                      No photo yet
                    </div>
                  )}

                  {/* Real Verified Badge (only if verified) */}
                  {isVerified && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span>Verified</span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-3">
                  <h4 className="truncate text-sm font-bold text-gray-900">
                    {vendor.businessName}
                  </h4>
                  {vendor.shortDescription && (
                    <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                      {vendor.shortDescription}
                    </p>
                  )}
                  {vendor.startingPrice && (
                    <div className="mt-2 text-xs font-bold text-[#e00b41]">
                      {vendor.currency === "INR" ? "₹" : (vendor.currency ?? "₹")}
                      {Number(vendor.startingPrice).toLocaleString("en-IN")}{" "}
                      <span className="font-normal text-gray-500">onwards</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
