"use client";

import { useMemo, useState } from "react";
import type { VendorAlbum } from "@/lib/api/vendors.types";
import { VendorPortfolioGallery } from "./VendorPortfolioGallery";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

/**
 * Photos/Videos split above the portfolio grid — real data-backed (every
 * AlbumMedia row's mediaType is "PORTFOLIO" (a photo) or "VIDEO", the only
 * two values album.repository.ts's queries ever return into an album's
 * media list), not a cosmetic tab bar over one undifferentiated grid.
 * Reuses VendorPortfolioGallery as-is for the actual grid+lightbox instead
 * of duplicating that logic — this component only filters albums down to
 * the active media type before handing them off, and owns the page index
 * so the header's prev/next controls (rendered here, next to the "Portfolio"
 * heading, matching the reference design) and the grid itself stay in sync.
 *
 * Correctness note: a previous version of this file (and of AlbumMedia's
 * own type declaration) filtered on `mediaType === "IMAGE"` — a value that
 * doesn't exist anywhere in the real MediaType enum, so every photo was
 * silently filtered out and the portfolio section rendered as if the
 * vendor had never uploaded anything. Fixed by checking for "VIDEO" and
 * treating everything else (i.e. "PORTFOLIO") as a photo, rather than
 * positively matching a literal that was never real.
 *
 * The Videos tab is only rendered when at least one VIDEO item actually
 * exists — most vendors on this marketplace only ever upload photos, and a
 * permanently-visible empty "Videos" tab would violate the
 * hide-not-empty-state rule this whole redesign follows.
 */
export function VendorPortfolioTabs({
  albums,
  businessName,
  quoteTile,
}: {
  albums: VendorAlbum[];
  businessName: string;
  quoteTile?: { label: string };
}) {
  const hasVideos = useMemo(() => albums.some((album) => album.media.some((m) => m.mediaType === "VIDEO")), [albums]);
  const [tab, setTab] = useState<"photos" | "videos">("photos");
  const [page, setPage] = useState(0);

  const filteredAlbums = useMemo(() => {
    if (!hasVideos) return albums; // no filtering needed — every album is already photos-only
    return albums
      .map((album) => ({
        ...album,
        media: album.media.filter((m) => (tab === "videos" ? m.mediaType === "VIDEO" : m.mediaType !== "VIDEO")),
      }))
      .filter((album) => album.media.length > 0);
  }, [albums, hasVideos, tab]);

  const totalMediaCount = filteredAlbums.reduce((sum, album) => sum + album.media.length, 0);
  const pageCount = Math.max(1, Math.ceil(totalMediaCount / 7));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Portfolio</h2>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous photos"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-grey transition-colors hover:bg-surface-input disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              aria-label="Next photos"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {hasVideos && (
        <div className="mb-5 flex gap-1 border-b border-border">
          <button
            type="button"
            onClick={() => {
              setTab("photos");
              setPage(0);
            }}
            className={`px-4 py-2.5 text-sm font-bold transition-colors ${
              tab === "photos" ? "border-b-2 border-brand-primary text-brand-primary" : "text-text-grey hover:text-text-dark"
            }`}
          >
            Photos
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("videos");
              setPage(0);
            }}
            className={`px-4 py-2.5 text-sm font-bold transition-colors ${
              tab === "videos" ? "border-b-2 border-brand-primary text-brand-primary" : "text-text-grey hover:text-text-dark"
            }`}
          >
            Videos
          </button>
        </div>
      )}

      <VendorPortfolioGallery
        albums={filteredAlbums}
        businessName={businessName}
        quoteTile={tab === "photos" ? quoteTile : undefined}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}
