"use client";

import { useState } from "react";
import Image from "next/image";
import { getPublicMediaUrl } from "@/lib/media/url";
import type { VendorAlbum, AlbumMedia } from "@/lib/api/vendors.types";
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";

interface VendorPortfolioGalleryProps {
  albums: VendorAlbum[];
  businessName: string;
}

const INITIAL_VISIBLE_COUNT = 7;

export function VendorPortfolioGallery({ albums, businessName }: VendorPortfolioGalleryProps) {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("all");
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Flatten or filter media
  const allMedia = albums.flatMap((album) =>
    album.media.map((item: AlbumMedia) => ({ ...item, albumName: album.name }))
  );

  const displayedMedia =
    selectedAlbumId === "all"
      ? allMedia
      : allMedia.filter((m) => m.albumId === selectedAlbumId);

  if (allMedia.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center text-sm text-neutral-400">
        Portfolio photos are being prepared. Inquire directly to view private galleries.
      </div>
    );
  }

  const activeMedia = activeMediaIndex !== null ? displayedMedia[activeMediaIndex] : null;
  const hasOverflow = !showAll && displayedMedia.length > INITIAL_VISIBLE_COUNT;
  const visibleMedia = hasOverflow ? displayedMedia.slice(0, INITIAL_VISIBLE_COUNT) : displayedMedia;
  const remainingCount = displayedMedia.length - INITIAL_VISIBLE_COUNT;

  return (
    <div>
      {/* Album Filter Tabs */}
      {albums.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSelectedAlbumId("all");
              setShowAll(false);
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
                setShowAll(false);
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
          const key =
            media.thumbnailObjectKey ??
            media.optimizedObjectKey ??
            media.originalObjectKey;
          const url = getPublicMediaUrl(key);
          const isFeature = index === 0;
          const isLastVisible = hasOverflow && index === visibleMedia.length - 1;

          return (
            <div
              key={media.id}
              onClick={() => (isLastVisible ? setShowAll(true) : setActiveMediaIndex(index))}
              className={`group relative cursor-pointer overflow-hidden rounded-xl bg-neutral-100 shadow-2xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                isFeature
                  ? "col-span-2 row-span-2 aspect-square sm:aspect-auto"
                  : "aspect-square"
              }`}
            >
              <Image
                src={url}
                alt={media.altText ?? `${businessName} portfolio`}
                fill
                sizes={isFeature ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {isLastVisible ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/60 text-white">
                  <span className="text-xl sm:text-2xl font-black">+{remainingCount}</span>
                  <span className="text-[11px] sm:text-xs font-semibold">More Photos</span>
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-4">
                  <div className="text-white text-xs font-semibold">
                    <span>{media.albumName}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
          {displayedMedia.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMediaIndex(
                  (activeMediaIndex! - 1 + displayedMedia.length) % displayedMedia.length
                );
              }}
              className="absolute left-4 sm:left-8 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
              aria-label="Previous photo"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
          )}

          {/* Next button */}
          {displayedMedia.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMediaIndex(
                  (activeMediaIndex! + 1) % displayedMedia.length
                );
              }}
              className="absolute right-4 sm:right-8 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
              aria-label="Next photo"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          )}

          {/* Large image */}
          <div
            className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getPublicMediaUrl(
                activeMedia.optimizedObjectKey ?? activeMedia.originalObjectKey
              )}
              alt={activeMedia.altText ?? businessName}
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />
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
