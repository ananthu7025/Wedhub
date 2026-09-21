"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getPublicMediaUrl, isPreOptimizedMediaUrl } from "@/lib/media/url";
import type { VendorAlbum, AlbumMedia } from "@/lib/api/vendors.types";
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon, PlayIcon } from "./icons";

interface VendorPortfolioGalleryProps {
  albums: VendorAlbum[];
  businessName: string;
  /** Rendered as an extra, non-clickable tile filling a genuinely empty
   * slot at the end of the vendor's real photos — never displaces a real
   * photo, never shown mid-gallery. See PAGE_SIZE's own comment. */
  quoteTile?: { label: string };
  /** Controlled pagination state, lifted up so the "Portfolio" section
   * heading (rendered by a parent) can show its own prev/next controls in
   * the same header row as the reference design, rather than duplicating a
   * second pair of arrows inside this component's own box. */
  page: number;
  onPageChange: (page: number) => void;
}

// 7 real photo tiles per page (1 large "feature" tile spanning 2x2 + 6
// smaller ones) mirrors the reference layout's 2-row grid. An 8th slot is
// reserved for the decorative quote tile ONLY when it's genuinely empty
// (fewer than 7 photos remain on the last page) — see the quoteTile prop.
const PAGE_SIZE = 7;

export function VendorPortfolioGallery({ albums, businessName, quoteTile, page, onPageChange }: VendorPortfolioGalleryProps) {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("all");
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);

  // Flatten or filter media
  const allMedia = albums.flatMap((album) =>
    album.media.map((item: AlbumMedia) => ({ ...item, albumName: album.name }))
  );

  const displayedMedia =
    selectedAlbumId === "all"
      ? allMedia
      : allMedia.filter((m) => m.albumId === selectedAlbumId);

  const pageCount = Math.max(1, Math.ceil(displayedMedia.length / PAGE_SIZE));
  // Changing the album filter can leave `page` pointing past the new,
  // shorter list — snap back to the last valid page rather than rendering
  // an empty grid with working-looking (but dead) prev/next arrows.
  useEffect(() => {
    if (page > pageCount - 1) onPageChange(pageCount - 1);
  }, [page, pageCount, onPageChange]);

  if (allMedia.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center text-sm text-neutral-400">
        Portfolio photos are being prepared. Inquire directly to view private galleries.
      </div>
    );
  }

  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * PAGE_SIZE;
  const visibleMedia = displayedMedia.slice(pageStart, pageStart + PAGE_SIZE);
  const isLastPage = safePage === pageCount - 1;
  // Only ever fills a genuinely empty slot at the end of the real photos —
  // never appears if this page is already full of 7 real tiles, and never
  // appears on any page but the last.
  const showQuoteTile = Boolean(quoteTile) && isLastPage && visibleMedia.length < PAGE_SIZE;

  const activeMedia = activeMediaIndex !== null ? visibleMedia[activeMediaIndex] : null;

  return (
    <div>
      {/* Album Filter Tabs */}
      {albums.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSelectedAlbumId("all");
              onPageChange(0);
            }}
            className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
              selectedAlbumId === "all"
                ? "bg-neutral-900 text-white shadow-xs"
                : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            All ({allMedia.length})
          </button>
          {albums.map((album) => (
            <button
              key={album.id}
              onClick={() => {
                setSelectedAlbumId(album.id);
                onPageChange(0);
              }}
              className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                selectedAlbumId === album.id
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {album.name} ({album.media.length})
            </button>
          ))}
        </div>
      )}

      {/* Asymmetric grid — first tile spans two rows on larger screens, mirroring the reference layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 grid-flow-dense gap-3 sm:gap-4">
        {visibleMedia.map((media, index) => {
          const isVideo = media.mediaType === "VIDEO";
          // A VIDEO row is never processed through the image resize
          // pipeline (see media-processing.processor.ts) — it has no
          // thumbnailObjectKey/optimizedObjectKey/blurDataUrl to fall back
          // through, only its original upload, which isn't a valid
          // next/image source at all. The grid tile for a video shows a
          // plain dark tile with a play icon instead of attempting to
          // decode the video file as an image.
          const key = media.thumbnailObjectKey ?? media.optimizedObjectKey ?? media.originalObjectKey;
          const url = getPublicMediaUrl(key);
          const isFeature = safePage === 0 && index === 0;

          return (
            <div
              key={media.id}
              onClick={() => setActiveMediaIndex(index)}
              className={`group relative cursor-pointer overflow-hidden rounded-xl bg-neutral-100 shadow-2xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                isFeature
                  ? "col-span-2 row-span-2 aspect-square sm:aspect-auto"
                  : "aspect-square"
              }`}
            >
              {isVideo ? (
                <div className="flex h-full w-full items-center justify-center bg-neutral-800">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md transition-transform group-hover:scale-110">
                    <PlayIcon className="ml-0.5 h-5 w-5" />
                  </span>
                </div>
              ) : (
                <Image
                  src={url}
                  alt={media.altText ?? `${businessName} portfolio`}
                  fill
                  sizes={isFeature ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  unoptimized={isPreOptimizedMediaUrl(url)}
                  {...(media.blurDataUrl ? { placeholder: "blur" as const, blurDataURL: media.blurDataUrl } : {})}
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-4">
                <div className="text-white text-xs font-semibold">
                  <span>{media.albumName}</span>
                </div>
              </div>
            </div>
          );
        })}

        {showQuoteTile && quoteTile && (
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-crimson-10 bg-crimson-10/30 p-4 text-center">
            <p className="font-serif text-base italic text-crimson-70 sm:text-lg">{quoteTile.label}</p>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {activeMedia && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs"
          onClick={() => setActiveMediaIndex(null)}
        >
          <button
            onClick={() => setActiveMediaIndex(null)}
            className="absolute top-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Close lightbox"
          >
            <CloseIcon className="h-5 w-5" />
          </button>

          {/* Prev button */}
          {visibleMedia.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMediaIndex(
                  (activeMediaIndex! - 1 + visibleMedia.length) % visibleMedia.length
                );
              }}
              className="absolute left-4 sm:left-8 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
              aria-label="Previous photo"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
          )}

          {/* Next button */}
          {visibleMedia.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMediaIndex(
                  (activeMediaIndex! + 1) % visibleMedia.length
                );
              }}
              className="absolute right-4 sm:right-8 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
              aria-label="Next photo"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          )}

          {/* Large image / video */}
          <div
            className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {activeMedia.mediaType === "VIDEO" ? (
              // No optimizedObjectKey exists for video (never processed —
              // see the grid tile's comment above) — originalObjectKey is
              // the only playable source. autoPlay is intentionally
              // omitted: a visitor opening the lightbox to browse a photo
              // grid shouldn't have unrequested video/audio start playing;
              // controls lets them start it themselves.
              <video
                key={activeMedia.id}
                src={getPublicMediaUrl(activeMedia.originalObjectKey)}
                controls
                playsInline
                className="max-h-[85vh] max-w-[90vw]"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getPublicMediaUrl(activeMedia.optimizedObjectKey ?? activeMedia.originalObjectKey)}
                alt={activeMedia.altText ?? businessName}
                className="max-h-[85vh] max-w-[90vw] object-contain"
              />
            )}
            {activeMedia.altText && (
              <p className="mt-2 text-center text-xs text-white/80">
                {activeMedia.altText}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
