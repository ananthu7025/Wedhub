"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getPublicMediaUrl } from "@/lib/media/url";

export interface DisplayRealWeddingStory {
  id: string;
  coupleName: string;
  location: string;
  tag: string;
  snippet: string;
  vendorName: string;
  vendorSlug: string;
  coverImageUrl: string;
  galleryPhotos?: string[];
  photoCountLabel?: string;
}

export function RealWeddingCollageCard({ story }: { story: DisplayRealWeddingStory }) {
  const [isSaved, setIsSaved] = useState(false);

  const gallery = story.galleryPhotos && story.galleryPhotos.length > 0 ? story.galleryPhotos : [];
  const hasMultiplePhotos = gallery.length >= 2;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Photo Collage Section */}
      <div className="relative overflow-hidden bg-surface-input">
        {/* Save / Favorite Heart Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsSaved(!isSaved);
          }}
          aria-label={isSaved ? "Remove from favorites" : "Save to favorites"}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-black/60 active:scale-95"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={isSaved ? "#e00b41" : "none"}
            stroke={isSaved ? "#e00b41" : "currentColor"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>

        <Link
          href={`/real-weddings/${story.id}`}
          className="block no-underline"
          title={`View ${story.coupleName} wedding story`}
        >
          {hasMultiplePhotos ? (
            /* 3-Photo Collage (1 main landscape + 2 thumbnails underneath) */
            <div className="flex flex-col gap-1 p-1 bg-surface-input">
              {/* Primary Top Landscape Photo */}
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-xl">
                <Image
                  src={story.coverImageUrl}
                  alt={`${story.coupleName} wedding cover`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>

              {/* Two Bottom Thumbnails */}
              <div className="grid grid-cols-2 gap-1">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-bl-xl bg-neutral-grey-20">
                  <Image
                    src={gallery[0]}
                    alt={`${story.coupleName} photo 2`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, 20vw"
                  />
                </div>

                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-br-xl bg-neutral-grey-20">
                  <Image
                    src={gallery[1]}
                    alt={`${story.coupleName} photo 3`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, 20vw"
                  />
                  {/* Photo count overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] transition-opacity group-hover:bg-black/60">
                    <span className="text-xs font-extrabold text-white tracking-wider drop-shadow-sm">
                      {story.photoCountLabel ?? "+ Photos"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Single Hero Photo with Badge */
            <div className="relative aspect-[16/11] w-full overflow-hidden">
              <Image
                src={story.coverImageUrl}
                alt={`${story.coupleName} wedding`}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
              {story.photoCountLabel && (
                <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
                  {story.photoCountLabel}
                </span>
              )}
            </div>
          )}
        </Link>
      </div>

      {/* Card Content & Details */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          {/* Couple Name */}
          <Link
            href={`/real-weddings/${story.id}`}
            className="group/title block text-base sm:text-lg font-extrabold tracking-tight text-jet-black transition-colors hover:text-crimson no-underline"
          >
            {story.coupleName}
          </Link>

          {/* Location & Tag Pill */}
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-grey">
            <span className="font-semibold text-jet-black/80 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {story.location}
            </span>
            <span className="text-border">•</span>
            <span className="inline-block rounded-full bg-surface-input px-2 py-0.5 text-[10px] font-medium text-text-grey">
              {story.tag}
            </span>
          </div>

          {/* Narrative Snippet */}
          <p className="mt-2.5 text-xs leading-relaxed text-text-grey line-clamp-2">
            {story.snippet}
          </p>
        </div>

        {/* Vendor Attribution Bar */}
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] text-text-grey shrink-0">Vendor:</span>
            <Link
              href={`/vendors/${story.vendorSlug}`}
              className="text-xs font-bold text-crimson hover:underline truncate no-underline"
            >
              {story.vendorName}
            </Link>
          </div>

          <Link
            href={`/real-weddings/${story.id}`}
            className="inline-flex items-center gap-0.5 text-[11px] font-bold text-jet-black hover:text-crimson transition-colors shrink-0 no-underline"
          >
            <span>View Story</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
