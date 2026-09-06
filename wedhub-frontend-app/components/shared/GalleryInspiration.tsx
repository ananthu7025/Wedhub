"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FeaturedMediaItem } from "@/lib/api/vendors.types";
import { getPublicMediaUrl } from "@/lib/media/url";

// Backs the public homepage's "Gallery Inspiration" section — real,
// admin-curated selections of real vendor portfolio media (Arch Phase 17,
// 2026-09-04). Below a fixed number of real items, sample content fills
// the remaining slots (see fillGallerySlots) so the section always shows
// a full grid even on a fresh platform with few/no vendor photos yet —
// each real item added removes one sample; once GALLERY_SLOTS real items
// exist, zero samples render.

const GALLERY_SLOTS = 6;

// Normalized shape the grid renders — both a real FeaturedMediaItem and a
// sample map into this, so the card itself never branches on "real or
// placeholder."
interface DisplayGalleryItem {
  key: string;
  category: string;
  title: string;
  imageUrl: string;
}

// Sample content only, not sourced from any vendor — fills empty slots
// until enough real, admin-curated gallery items exist. Categories match
// the real GalleryCategory taxonomy (see prisma/seed.ts's
// GALLERY_CATEGORIES) so placeholders and real content share one
// vocabulary immediately, with no re-labeling once real photos arrive.
const SAMPLE_GALLERY_ITEMS: DisplayGalleryItem[] = [
  {
    key: "sample-1",
    category: "Outfit",
    title: "Handcrafted Crimson Velvet Bridal Lehenga",
    imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80",
  },
  {
    key: "sample-2",
    category: "Decor & Ideas",
    title: "Floral Royal Canopy & Golden Fairy Lights Mandap",
    imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80",
  },
  {
    key: "sample-3",
    category: "Mehndi",
    title: "Intricate Rajasthani Bridal Henna Art",
    imageUrl: "https://images.unsplash.com/photo-1584282479904-4c4f9f6d6332?w=600&q=80",
  },
  {
    key: "sample-4",
    category: "Wedding Photography",
    title: "Sunset Golden Hour Silhouette Couple Shoot",
    imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
  },
  {
    key: "sample-5",
    category: "Jewellery & Accessories",
    title: "Traditional Polki & Kundan Wedding Choker Set",
    imageUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80",
  },
  {
    key: "sample-6",
    category: "Decor & Ideas",
    title: "Pastel Marigold & Lotus Haldi Ceremony Decor",
    imageUrl: "https://images.unsplash.com/photo-1478146059778-26028b07395a?w=600&q=80",
  },
];

// Standalone INSPIRATION_PHOTO items (no owning vendor) carry a real
// galleryCategory — preferred when set. Older vendor-featured rows that
// predate this field fall back to the vendor's primary category, same as
// before this field existed.
function itemCategory(item: FeaturedMediaItem): string {
  if (item.galleryCategory) return item.galleryCategory.name;
  const vendor = item.media.vendor;
  return vendor ? (vendor.categories.find((c) => c.isPrimary)?.category.name ?? vendor.businessName) : "Inspiration";
}

function itemTitle(item: FeaturedMediaItem): string {
  return item.titleOverride ?? item.media.altText ?? item.media.vendor?.businessName ?? "Wedding inspiration";
}

// Real items fill first, samples fill any remaining slots up to
// GALLERY_SLOTS — see the "fixed display count" decision this implements.
function fillGallerySlots(realItems: FeaturedMediaItem[]): DisplayGalleryItem[] {
  const real: DisplayGalleryItem[] = realItems.slice(0, GALLERY_SLOTS).map((item) => ({
    key: item.id,
    category: itemCategory(item),
    title: itemTitle(item),
    imageUrl: getPublicMediaUrl(item.media.optimizedObjectKey ?? item.media.originalObjectKey),
  }));
  const remaining = GALLERY_SLOTS - real.length;
  return remaining > 0 ? [...real, ...SAMPLE_GALLERY_ITEMS.slice(0, remaining)] : real;
}

function GalleryCard({ item }: { item: DisplayGalleryItem }) {
  return (
    <div className="group relative aspect-[3/4] w-[42%] flex-none snap-start overflow-hidden rounded-2xl border border-border bg-surface-input shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:w-48">
      <Image
        src={item.imageUrl}
        alt={item.title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 640px) 160px, 192px"
      />
      {/* Subtle Gradient Overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-95" />
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <span className="inline-block rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm mb-1">
          {item.category}
        </span>
        <p className="text-xs font-bold leading-snug line-clamp-2">{item.title}</p>
      </div>
    </div>
  );
}

export function GalleryInspiration({ items }: { items: FeaturedMediaItem[] }) {
  const displayItems = fillGallerySlots(items);
  const categories = Array.from(new Set(displayItems.map((item) => item.category)));
  const [activeCategory, setActiveCategory] = useState("All");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredItems = activeCategory === "All" ? displayItems : displayItems.filter((item) => item.category === activeCategory);

  function scroll(direction: "left" | "right") {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -220 : 220;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  }

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

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {["All", ...categories].map((cat) => (
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

      {/* Single arrowed slider (same mechanism as CategoryCapsuleCarousel's
          "Wedding Categories" row) — the active pill filters which cards
          appear, but there is only ever one scrollable row, never a stacked
          grid or per-category sub-sections. */}
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
          {filteredItems.map((item) => (
            <GalleryCard key={item.key} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
