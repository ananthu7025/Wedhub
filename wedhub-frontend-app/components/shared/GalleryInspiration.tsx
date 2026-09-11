"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FeaturedMediaItem, GalleryCategory } from "@/lib/api/vendors.types";
import { getPublicMediaUrl } from "@/lib/media/url";

// Backs the public homepage's "Gallery Inspiration" section — one tile per
// active GalleryCategory, each linking to /gallery?category=<slug> (real
// navigation into GalleryPageView's server-paginated, per-category feed).
// This replaced the earlier version that showed individual featured photos
// directly on the homepage; browsing individual photos now only happens
// after clicking into a category, matching the reference "Gallery to Look
// for" pattern of category tiles instead of a flat photo grid.

// Sample cover images only, not sourced from any vendor — used when a
// category has no real featured photo yet to derive a cover from. Keyed by
// category name so they line up with the real GalleryCategory taxonomy
// (see prisma/seed.ts's GALLERY_CATEGORIES).
const SAMPLE_COVER_IMAGES: Record<string, string> = {
  Outfit: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80",
  "Decor & Ideas": "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80",
  Mehndi: "https://images.unsplash.com/photo-1621184455862-c163dfb30e0f?w=600&q=80",
  "Wedding Photography": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
  "Jewellery & Accessories": "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80",
};
const FALLBACK_COVER_IMAGE = "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80";

interface DisplayCategoryTile {
  key: string;
  slug: string;
  name: string;
  imageUrl: string;
}

// One real featured photo per category (first match) becomes that
// category's cover image; categories with no featured photo yet fall back
// to a sample cover so the row never shows a blank tile.
function buildCategoryTiles(categories: GalleryCategory[], items: FeaturedMediaItem[]): DisplayCategoryTile[] {
  return categories.map((category) => {
    const coverItem = items.find((item) => item.galleryCategory?.id === category.id);
    const imageUrl = coverItem
      ? getPublicMediaUrl(coverItem.media.optimizedObjectKey ?? coverItem.media.originalObjectKey)
      : (SAMPLE_COVER_IMAGES[category.name] ?? FALLBACK_COVER_IMAGE);
    return { key: category.id, slug: category.slug, name: category.name, imageUrl };
  });
}

function CategoryTile({ tile }: { tile: DisplayCategoryTile }) {
  return (
    <Link
      href={`/gallery?category=${encodeURIComponent(tile.slug)}`}
      className="group relative aspect-[3/4] w-[42%] flex-none snap-start overflow-hidden rounded-2xl border border-border bg-surface-input shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:w-48 no-underline text-inherit"
    >
      <Image
        src={tile.imageUrl}
        alt={tile.name}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 640px) 160px, 192px"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-95" />
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <p className="text-sm font-bold leading-snug">{tile.name}</p>
      </div>
    </Link>
  );
}

export function GalleryInspiration({ categories, items }: { categories: GalleryCategory[]; items: FeaturedMediaItem[] }) {
  const tiles = buildCategoryTiles(categories, items);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  function scroll(direction: "left" | "right") {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -220 : 220;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  }

  if (tiles.length === 0) return null;

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
          <Link href="/gallery" className="mt-1 inline-block text-xs font-bold text-brand-primary hover:underline">
            See all →
          </Link>
        </div>
      </div>

      {/* Single arrowed slider of category tiles (same mechanism as
          CategoryCapsuleCarousel's "Wedding Categories" row) — clicking a
          tile navigates into /gallery filtered to that category, rather
          than filtering a photo grid in place. */}
      <div className="relative">
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

        <div
          ref={scrollContainerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto py-1 px-1 scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {tiles.map((tile) => (
            <CategoryTile key={tile.key} tile={tile} />
          ))}
        </div>
      </div>
    </section>
  );
}
