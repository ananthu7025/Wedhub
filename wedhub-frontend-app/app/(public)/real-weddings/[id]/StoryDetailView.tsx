"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export interface StoryDetailPhoto {
  id: string;
  url: string;
  caption?: string;
  aspectRatioClass?: string; // e.g. "aspect-[3/4]", "aspect-[4/3]", "aspect-[1/1]", "aspect-[2/3]"
  category?: string;
}

export interface StoryDetailData {
  id: string;
  coupleName: string;
  location: string;
  tag: string;
  snippet: string;
  narrativeStory: string[];
  vendorName: string;
  vendorSlug: string;
  vendorCity?: string;
  coverImageUrl: string;
  photos: StoryDetailPhoto[];
  relatedStories: {
    id: string;
    coupleName: string;
    location: string;
    coverImageUrl: string;
    tag: string;
  }[];
}

export function StoryDetailView({ story }: { story: StoryDetailData }) {
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [savedPhotos, setSavedPhotos] = useState<Record<string, boolean>>({});
  const [isStorySaved, setIsStorySaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle keyboard events in Lightbox
  useEffect(() => {
    if (activeLightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveLightboxIndex(null);
      } else if (e.key === "ArrowRight") {
        setActiveLightboxIndex((prev) => (prev !== null && prev < story.photos.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowLeft") {
        setActiveLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : story.photos.length - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLightboxIndex, story.photos.length]);

  const toggleSavePhoto = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedPhotos((prev) => ({ ...prev, [photoId]: !prev[photoId] }));
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const activePhoto = activeLightboxIndex !== null ? story.photos[activeLightboxIndex] : null;

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Top Breadcrumbs & Header Bar */}
      <div className="border-b border-border/80 bg-white sticky top-0 z-30 shadow-xs">
        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-text-grey font-medium">
            <Link href="/" className="hover:text-crimson transition-colors no-underline">
              Home
            </Link>
            <span>/</span>
            <Link href="/real-weddings" className="hover:text-crimson transition-colors no-underline">
              Real Weddings
            </Link>
            <span>/</span>
            <span className="font-bold text-jet-black truncate max-w-[200px] sm:max-w-none">
              {story.coupleName}
            </span>
          </nav>

          {/* Floating Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-jet-black shadow-xs transition-all hover:bg-surface-input active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span>{copied ? "Link Copied!" : "Share"}</span>
            </button>

            {/* Save Entire Story Pin Button */}
            <button
              type="button"
              onClick={() => setIsStorySaved(!isStorySaved)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold shadow-xs transition-all active:scale-95 ${
                isStorySaved
                  ? "bg-crimson text-white hover:bg-crimson-60"
                  : "border border-border bg-white text-jet-black hover:border-crimson hover:text-crimson"
              }`}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill={isStorySaved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              <span>{isStorySaved ? "Saved" : "Save Story"}</span>
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Story Intro & Title Section */}
        <div className="mb-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-crimson/10 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-crimson mb-3">
            <span>{story.tag}</span>
            <span>•</span>
            <span>{story.photos.length} Photos</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-jet-black leading-tight">
            {story.coupleName}
          </h1>

          <div className="mt-2.5 flex items-center justify-center gap-2 text-xs sm:text-sm text-text-grey font-medium">
            <span className="flex items-center gap-1 font-semibold text-jet-black/80">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {story.location}
            </span>
          </div>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-text-grey">
            {story.snippet}
          </p>
        </div>

        {/* Vendor Credit Bar */}
        <div className="mb-10 rounded-2xl border border-border/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-crimson text-white font-extrabold text-base shadow-sm">
              {story.vendorName.charAt(0)}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-grey">
                Captured &amp; Curated By
              </span>
              <h3 className="text-base font-extrabold text-jet-black leading-tight">
                {story.vendorName}
              </h3>
              {story.vendorCity && (
                <span className="text-xs text-text-grey">{story.vendorCity}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Link
              href={`/vendors/${story.vendorSlug}`}
              className="w-full sm:w-auto text-center rounded-xl bg-crimson px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-crimson-60 hover:scale-105 active:scale-95 no-underline"
            >
              View Vendor Profile &amp; Pricing ↗
            </Link>
          </div>
        </div>

        {/* Pinterest-Style Masonry Photo Waterfall */}
        <section aria-label="Photo Gallery" className="mb-16">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-jet-black tracking-tight">
              Wedding Photo Gallery
            </h2>
            <span className="text-xs font-semibold text-text-grey">
              Click any photo to view full size
            </span>
          </div>

          {/* Pinterest Multi-Column Masonry Grid */}
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {story.photos.map((photo, idx) => {
              const isSaved = Boolean(savedPhotos[photo.id]);
              return (
                <div
                  key={photo.id}
                  onClick={() => setActiveLightboxIndex(idx)}
                  className="group relative cursor-pointer break-inside-avoid overflow-hidden rounded-2xl border border-border/70 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className={`relative w-full ${photo.aspectRatioClass ?? "aspect-[3/4]"} overflow-hidden bg-neutral-grey-20`}>
                    <Image
                      src={photo.url}
                      alt={photo.caption ?? `${story.coupleName} photo ${idx + 1}`}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    />

                    {/* Pinterest Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    {/* Pinterest Red Save Button (Top Right) */}
                    <button
                      type="button"
                      onClick={(e) => toggleSavePhoto(photo.id, e)}
                      aria-label="Save photo"
                      className={`absolute right-3 top-3 z-10 flex h-8 items-center gap-1 rounded-full px-3 text-xs font-extrabold shadow-md transition-all duration-200 pointer-events-auto ${
                        isSaved
                          ? "bg-crimson text-white scale-105"
                          : "bg-crimson/95 text-white hover:bg-crimson hover:scale-105 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                      </svg>
                      <span>{isSaved ? "Saved" : "Save"}</span>
                    </button>

                    {/* Bottom Details Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-3.5 flex items-end justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="min-w-0">
                        {photo.category && (
                          <span className="inline-block rounded-md bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-xs mb-1">
                            {photo.category}
                          </span>
                        )}
                        {photo.caption && (
                          <p className="text-xs font-semibold text-white drop-shadow-sm line-clamp-1">
                            {photo.caption}
                          </p>
                        )}
                      </div>

                      {/* Expand Icon */}
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="15 3 21 3 21 9" />
                          <polyline points="9 21 3 21 3 15" />
                          <line x1="21" y1="3" x2="14" y2="10" />
                          <line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Narrative Celebration Story */}
        {story.narrativeStory && story.narrativeStory.length > 0 && (
          <section className="mb-16 max-w-3xl mx-auto rounded-3xl border border-border/80 bg-white p-6 sm:p-10 shadow-xs">
            <h2 className="text-xl sm:text-2xl font-extrabold text-jet-black tracking-tight mb-4">
              The Celebration &amp; Details
            </h2>
            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-text-grey font-normal">
              {story.narrativeStory.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        )}

        {/* Related Real Weddings Recommendations */}
        {story.relatedStories && story.relatedStories.length > 0 && (
          <section className="mt-16 border-t border-border/70 pt-12">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-jet-black tracking-tight">
                  More Real Weddings to Inspire You
                </h2>
                <p className="text-xs text-text-grey mt-0.5">Explore more authentic celebrations</p>
              </div>
              <Link href="/real-weddings" className="text-xs font-bold text-crimson hover:underline no-underline">
                View All Stories →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {story.relatedStories.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/real-weddings/${rel.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg no-underline"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-grey-20">
                    <Image
                      src={rel.coverImageUrl}
                      alt={rel.coupleName}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-extrabold text-jet-black group-hover:text-crimson transition-colors">
                      {rel.coupleName}
                    </h3>
                    <p className="text-xs text-text-grey mt-1">{rel.location} • {rel.tag}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Interactive Lightbox / Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setActiveLightboxIndex(null)}
        >
          {/* Top Bar Controls */}
          <div className="absolute top-4 inset-x-4 flex items-center justify-between z-20 text-white">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold tracking-wider text-white/80 bg-white/15 px-3 py-1 rounded-full">
                {(activeLightboxIndex ?? 0) + 1} / {story.photos.length}
              </span>
              {activePhoto.category && (
                <span className="text-xs font-semibold text-white/90">
                  {activePhoto.category}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Save inside Lightbox */}
              <button
                type="button"
                onClick={(e) => toggleSavePhoto(activePhoto.id, e)}
                className={`inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  savedPhotos[activePhoto.id]
                    ? "bg-crimson text-white"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                <span>{savedPhotos[activePhoto.id] ? "Saved" : "Save Pin"}</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActiveLightboxIndex(null)}
                aria-label="Close photo view"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Left Arrow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : story.photos.length - 1));
            }}
            aria-label="Previous photo"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 transition-all hover:scale-105 active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Right Arrow */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveLightboxIndex((prev) => (prev !== null && prev < story.photos.length - 1 ? prev + 1 : 0));
            }}
            aria-label="Next photo"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 transition-all hover:scale-105 active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Center Main Photo Container */}
          <div
            className="relative max-h-[82vh] max-w-[90vw] aspect-[4/3] sm:aspect-[16/10] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activePhoto.url}
              alt={activePhoto.caption ?? story.coupleName}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          {/* Bottom Caption Bar */}
          {activePhoto.caption && (
            <div className="absolute bottom-4 inset-x-4 text-center z-20">
              <p className="text-sm font-semibold text-white/90 drop-shadow-md max-w-lg mx-auto bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-xs">
                {activePhoto.caption}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
