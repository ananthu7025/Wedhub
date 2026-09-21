"use client";

import { useMemo, useState } from "react";
import type { VendorAlbum } from "@/lib/api/vendors.types";
import { VendorPortfolioGallery } from "./VendorPortfolioGallery";

/**
 * Photos/Videos split above the portfolio grid — real data-backed (every
 * AlbumMedia row's mediaType is "PORTFOLIO" (a photo) or "VIDEO", the only
 * two values album.repository.ts's queries ever return into an album's
 * media list), not a cosmetic tab bar over one undifferentiated grid.
 * Reuses VendorPortfolioGallery as-is for the actual grid+lightbox instead
 * of duplicating that logic — this component only filters albums down to
 * the active media type before handing them off.
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
export function VendorPortfolioTabs({ albums, businessName }: { albums: VendorAlbum[]; businessName: string }) {
  const hasVideos = useMemo(() => albums.some((album) => album.media.some((m) => m.mediaType === "VIDEO")), [albums]);
  const [tab, setTab] = useState<"photos" | "videos">("photos");

  const filteredAlbums = useMemo(() => {
    return albums
      .map((album) => ({
        ...album,
        media: album.media.filter((m) => (tab === "videos" ? m.mediaType === "VIDEO" : m.mediaType !== "VIDEO")),
      }))
      .filter((album) => album.media.length > 0);
  }, [albums, tab]);

  if (!hasVideos) {
    // Only one real tab worth of content — skip the tab bar entirely rather
    // than showing a single-option toggle that does nothing. No filtering
    // needed here: hasVideos is already false, so every album's media is
    // already photos-only.
    return <VendorPortfolioGallery albums={albums} businessName={businessName} />;
  }

  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("photos")}
          className={`px-4 py-2.5 text-sm font-bold transition-colors ${
            tab === "photos" ? "border-b-2 border-brand-primary text-brand-primary" : "text-text-grey hover:text-text-dark"
          }`}
        >
          Photos
        </button>
        <button
          type="button"
          onClick={() => setTab("videos")}
          className={`px-4 py-2.5 text-sm font-bold transition-colors ${
            tab === "videos" ? "border-b-2 border-brand-primary text-brand-primary" : "text-text-grey hover:text-text-dark"
          }`}
        >
          Videos
        </button>
      </div>
      <VendorPortfolioGallery albums={filteredAlbums} businessName={businessName} />
    </div>
  );
}
