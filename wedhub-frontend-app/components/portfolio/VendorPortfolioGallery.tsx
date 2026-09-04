"use client";

import { useState } from "react";
import Image from "next/image";
import { getPublicMediaUrl } from "@/lib/media/url";
import type { VendorAlbum, AlbumMedia } from "@/lib/api/vendors.types";

interface VendorPortfolioGalleryProps {
  albums: VendorAlbum[];
  businessName: string;
}

export function VendorPortfolioGallery({ albums, businessName }: VendorPortfolioGalleryProps) {
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

  if (allMedia.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center text-sm text-neutral-400">
        Portfolio photos are being prepared. Inquire directly to view private galleries.
      </div>
    );
  }

  const activeMedia = activeMediaIndex !== null ? displayedMedia[activeMediaIndex] : null;

  return (
    <div>
      {/* Album Filter Tabs */}
      {albums.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedAlbumId("all")}
            className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
              selectedAlbumId === "all"
                ? "bg-neutral-900 text-white shadow-xs"
                : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            All Work ({allMedia.length})
          </button>
          {albums.map((album) => (
            <button
              key={album.id}
              onClick={() => setSelectedAlbumId(album.id)}
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

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {displayedMedia.map((media, index) => {
          const key =
            media.thumbnailObjectKey ??
            media.optimizedObjectKey ??
            media.originalObjectKey;
          const url = getPublicMediaUrl(key);

          return (
            <div
              key={media.id}
              onClick={() => setActiveMediaIndex(index)}
              className="group relative aspect-4/3 sm:aspect-square cursor-pointer overflow-hidden rounded-xl bg-neutral-100 shadow-2xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            >
              <Image
                src={url}
                alt={media.altText ?? `${businessName} portfolio`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-4">
                <div className="text-white text-xs font-semibold">
                  <span>{media.albumName}</span>
                </div>
              </div>
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
            className="absolute top-6 right-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white text-xl transition-colors hover:bg-white/20"
            aria-label="Close lightbox"
          >
            ✕
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
              className="absolute left-4 sm:left-8 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white text-2xl transition-colors hover:bg-white/25"
              aria-label="Previous photo"
            >
              ‹
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
              className="absolute right-4 sm:right-8 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white text-2xl transition-colors hover:bg-white/25"
              aria-label="Next photo"
            >
              ›
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
