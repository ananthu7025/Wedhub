"use client";

import { useState } from "react";
import type { AdminApprovedMedia, AdminFeaturedMedia, AdminVendorListItem } from "@/lib/api/admin.types";
import type { GalleryCategory } from "@/lib/api/vendors.types";
import { FeaturedMediaBoard } from "./FeaturedMediaBoard";
import { GalleryCategoriesPanel } from "./GalleryCategoriesPanel";

/**
 * Owns the gallery-categories list as shared client state so a category
 * added/edited/deactivated in GalleryCategoriesPanel is reflected
 * immediately in FeaturedMediaBoard's category picker, without a full
 * page reload of the server-rendered initial props.
 */
export function GalleryInspirationSection({
  initialGalleryCategories,
  initialFeatured,
  approvedMedia,
  vendors,
}: {
  initialGalleryCategories: GalleryCategory[];
  initialFeatured: AdminFeaturedMedia[];
  approvedMedia: AdminApprovedMedia[];
  vendors: AdminVendorListItem[];
}) {
  const [galleryCategories, setGalleryCategories] = useState(initialGalleryCategories);

  return (
    <>
      <GalleryCategoriesPanel categories={galleryCategories} onCategoriesChange={setGalleryCategories} />

      <div className="mb-6 rounded-xl border border-border bg-white p-6">
        <h3 className="mb-1 text-base font-bold">Gallery Inspiration</h3>
        <p className="mb-4 text-[13px] text-text-grey">
          Real, approved vendor portfolio photos featured on the homepage gallery.
        </p>
        <FeaturedMediaBoard
          initialFeatured={initialFeatured}
          approvedMedia={approvedMedia}
          vendors={vendors}
          galleryCategories={galleryCategories}
        />
      </div>
    </>
  );
}
