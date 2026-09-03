"use client";

import { useState } from "react";
import Image from "next/image";
import type { FeaturedMediaItem } from "@/lib/api/vendors.types";
import { getPublicMediaUrl } from "@/lib/media/url";

// Backs the public homepage's "Gallery Inspiration" section — real,
// admin-curated selections of real vendor portfolio media (Arch Phase 17,
// 2026-09-04), replacing what was previously a hardcoded GALLERY_ITEMS
// array. Category comes from each media item's vendor's real primary
// category (VendorCategory) — no separate category field on this model.

function itemCategory(item: FeaturedMediaItem): string {
  return item.media.vendor.categories.find((c) => c.isPrimary)?.category.name ?? item.media.vendor.businessName;
}

function itemTitle(item: FeaturedMediaItem): string {
  return item.titleOverride ?? item.media.altText ?? item.media.vendor.businessName;
}

export function GalleryInspiration({ items }: { items: FeaturedMediaItem[] }) {
  const categories = ["All", ...Array.from(new Set(items.map(itemCategory)))];
  const [activeCategory, setActiveCategory] = useState("All");

  if (items.length === 0) return null;

  const filteredItems = activeCategory === "All" ? items : items.filter((item) => itemCategory(item) === activeCategory);

  return (
    <section id="gallery-inspiration" className="px-6 py-10 max-[900px]:px-4">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-jet-black">
            Gallery Inspiration
          </h2>
          <p className="text-xs text-text-grey mt-0.5">
            Discover real wedding decor, bridal outfits, jewelry, and creative ideas
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeCategory === cat
                  ? "bg-brand-primary text-white shadow-sm"
                  : "bg-surface-input text-text-grey hover:bg-neutral-grey-30 hover:text-text-dark"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {filteredItems.map((item) => {
          const imageKey = item.media.optimizedObjectKey ?? item.media.originalObjectKey;
          const title = itemTitle(item);
          return (
            <div
              key={item.id}
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-surface-input shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <Image
                src={getPublicMediaUrl(imageKey)}
                alt={title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
              />
              {/* Subtle Gradient Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-95" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <span className="inline-block rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm mb-1">
                  {itemCategory(item)}
                </span>
                <p className="text-xs font-bold leading-snug line-clamp-2">{title}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
