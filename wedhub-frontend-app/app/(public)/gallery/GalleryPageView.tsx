"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { FeaturedMediaItem, GalleryCategory } from "@/lib/api/vendors.types";
import { listFeaturedGalleryMediaClient } from "@/lib/api/catalog-client";
import { getPublicMediaUrl } from "@/lib/media/url";
import { GalleryPhotoModal } from "./GalleryPhotoModal";

// Cycled by index so the masonry grid actually staggers like Pinterest —
// FeaturedMediaItem carries no stored aspect ratio to key off of instead.
const ASPECT_RATIOS = ["aspect-[3/4]", "aspect-[1/1]", "aspect-[4/5]", "aspect-[4/3]"];

export interface GalleryDisplayItem {
  key: string;
  category: string;
  title: string;
  imageUrl: string;
  aspectRatioClass: string;
  vendor: { slug: string; businessName: string } | null;
}

function itemCategory(item: FeaturedMediaItem): string {
  if (item.galleryCategory) return item.galleryCategory.name;
  const vendor = item.media.vendor;
  return vendor ? (vendor.categories.find((c) => c.isPrimary)?.category.name ?? vendor.businessName) : "Inspiration";
}

function itemTitle(item: FeaturedMediaItem): string {
  return item.titleOverride ?? item.media.altText ?? item.media.vendor?.businessName ?? "Wedding inspiration";
}

function toDisplayItems(items: FeaturedMediaItem[], startIndex: number): GalleryDisplayItem[] {
  return items.map((item, i) => ({
    key: item.id,
    category: itemCategory(item),
    title: itemTitle(item),
    imageUrl: getPublicMediaUrl(item.media.optimizedObjectKey ?? item.media.originalObjectKey),
    aspectRatioClass: ASPECT_RATIOS[(startIndex + i) % ASPECT_RATIOS.length] as string,
    vendor: item.media.vendor ? { slug: item.media.vendor.slug, businessName: item.media.vendor.businessName } : null,
  }));
}

export function GalleryPageView({
  initialItems,
  initialTotalPages,
  categories,
  activeCategory,
  pageSize,
}: {
  initialItems: FeaturedMediaItem[];
  initialTotalPages: number;
  categories: GalleryCategory[];
  activeCategory: string | null;
  pageSize: number;
}) {
  const router = useRouter();
  const [displayItems, setDisplayItems] = useState<GalleryDisplayItem[]>(() => toDisplayItems(initialItems, 0));
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || page >= totalPages) return;
    setLoading(true);
    const nextPage = page + 1;
    const result = await listFeaturedGalleryMediaClient({
      page: nextPage,
      limit: pageSize,
      category: activeCategory ?? undefined,
    });
    setLoading(false);
    if (!result.success) return;

    setDisplayItems((prev) => [...prev, ...toDisplayItems(result.data, prev.length)]);
    setPage(nextPage);
    if (result.meta) setTotalPages(result.meta.totalPages);
  }, [loading, page, totalPages, pageSize, activeCategory]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Real navigation, not local filtering — pagination must stay correct
  // per category, which only the server (page.tsx re-fetching page 1 for
  // the new category) can guarantee. page.tsx keys this component on the
  // category param, so the state reset on filter change is a full
  // component remount rather than an effect-driven setState.
  function selectCategory(slug: string | null) {
    const params = new URLSearchParams();
    if (slug) params.set("category", slug);
    const qs = params.toString();
    router.push(`/gallery${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 max-[900px]:px-4">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-jet-black">Gallery Inspiration</h1>
        <p className="text-xs sm:text-sm text-text-grey mt-0.5">
          Discover real wedding decor, bridal outfits, jewelry, and creative ideas
        </p>
      </div>

      {/* Category Pills — real navigation, not local filtering, so pagination stays correct per category */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectCategory(null)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
            activeCategory === null
              ? "bg-brand-primary text-white shadow-sm"
              : "bg-surface-input text-text-grey hover:bg-neutral-grey-30 hover:text-text-dark"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => selectCategory(cat.slug)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeCategory === cat.slug
                ? "bg-brand-primary text-white shadow-sm"
                : "bg-surface-input text-text-grey hover:bg-neutral-grey-30 hover:text-text-dark"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {displayItems.length === 0 ? (
        <div className="rounded-xl border border-border bg-white px-6 py-16 text-center">
          <p className="text-sm text-text-grey">No photos in this category yet.</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {displayItems.map((item, idx) => (
            <div
              key={item.key}
              onClick={() => setActiveIndex(idx)}
              className="group relative cursor-pointer break-inside-avoid overflow-hidden rounded-2xl border border-border bg-surface-input shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className={`relative w-full ${item.aspectRatioClass}`}>
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-95" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <span className="inline-block rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm mb-1">
                    {item.category}
                  </span>
                  <p className="text-xs font-bold leading-snug line-clamp-2">{item.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-10" />
      {loading && <p className="py-4 text-center text-xs text-text-grey">Loading more…</p>}

      {activeIndex !== null && (
        <GalleryPhotoModal
          items={displayItems}
          activeIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
          onNavigate={setActiveIndex}
        />
      )}
    </div>
  );
}
