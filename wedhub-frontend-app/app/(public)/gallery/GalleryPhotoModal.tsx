"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { GalleryDisplayItem } from "./GalleryPageView";

/**
 * Pinterest-style lightbox — same shell/keyboard-nav pattern as
 * app/(public)/real-weddings/[id]/StoryDetailView.tsx's lightbox (fixed
 * overlay, backdrop-click-to-close, Escape/Arrow key nav, object-contain
 * image). Differs in the CTA: a vendor-owned photo links to that vendor's
 * profile; a standalone (no-vendor) photo links to a keyword search for its
 * gallery category instead, per the user's decision — there's no 1:1
 * mapping from GalleryCategory to the vendor Category model.
 */
export function GalleryPhotoModal({
  items,
  activeIndex,
  onClose,
  onNavigate,
}: {
  items: GalleryDisplayItem[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const activeItem = items[activeIndex];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNavigate(activeIndex < items.length - 1 ? activeIndex + 1 : 0);
      else if (e.key === "ArrowLeft") onNavigate(activeIndex > 0 ? activeIndex - 1 : items.length - 1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, items.length, onClose, onNavigate]);

  if (!activeItem) return null;

  const vendor = activeItem.vendor;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20 text-white">
        <span className="text-xs font-bold tracking-wider text-white/80 bg-white/15 px-3 py-1 rounded-full">
          {activeIndex + 1} / {items.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo view"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Left / Right Arrows */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(activeIndex > 0 ? activeIndex - 1 : items.length - 1);
        }}
        aria-label="Previous photo"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 transition-all hover:scale-105 active:scale-95"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(activeIndex < items.length - 1 ? activeIndex + 1 : 0);
        }}
        aria-label="Next photo"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 transition-all hover:scale-105 active:scale-95"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Photo */}
      <div
        className="relative max-h-[70vh] max-w-[90vw] aspect-[4/3] sm:aspect-[16/10] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <Image src={activeItem.imageUrl} alt={activeItem.title} fill className="object-contain" sizes="100vw" />
      </div>

      {/* Bottom Details + CTA */}
      <div
        className="absolute bottom-4 inset-x-4 flex flex-col items-center gap-2 text-center z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider backdrop-blur-xs">
          {activeItem.category}
        </span>
        <p className="text-sm font-semibold text-white/90 drop-shadow-md max-w-lg">{activeItem.title}</p>
        {vendor ? (
          <Link
            href={`/vendors/${vendor.slug}`}
            className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-crimson px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-crimson-60 no-underline"
          >
            View {vendor.businessName} →
          </Link>
        ) : (
          <Link
            href={`/search?keyword=${encodeURIComponent(activeItem.category)}`}
            className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-crimson px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-crimson-60 no-underline"
          >
            Explore {activeItem.category} vendors →
          </Link>
        )}
      </div>
    </div>
  );
}
