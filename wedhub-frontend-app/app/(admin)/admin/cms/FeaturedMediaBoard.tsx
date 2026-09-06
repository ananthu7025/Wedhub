"use client";

import { useState } from "react";
import Image from "next/image";
import {
  createAdminFeaturedMedia,
  deleteAdminFeaturedMedia,
  updateAdminFeaturedMedia,
} from "@/lib/api/admin-client";
import type { AdminApprovedMedia, AdminFeaturedMedia, AdminVendorListItem } from "@/lib/api/admin.types";
import type { GalleryCategory } from "@/lib/api/vendors.types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { formatApiError } from "@/lib/utils/error";
import { InspirationPhotoUploader } from "./InspirationPhotoUploader";
import { VendorPhotoUploader } from "./VendorPhotoUploader";

function mediaThumbUrl(media: { optimizedObjectKey: string | null; thumbnailObjectKey: string | null; originalObjectKey: string }): string {
  return getPublicMediaUrl(media.thumbnailObjectKey ?? media.optimizedObjectKey ?? media.originalObjectKey);
}

export function FeaturedMediaBoard({
  initialFeatured,
  approvedMedia,
  vendors,
  galleryCategories,
}: {
  initialFeatured: AdminFeaturedMedia[];
  approvedMedia: AdminApprovedMedia[];
  vendors: AdminVendorListItem[];
  galleryCategories: GalleryCategory[];
}) {
  const [featured, setFeatured] = useState(initialFeatured);
  const [picking, setPicking] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const featuredMediaIds = new Set(featured.map((f) => f.mediaId));
  const pickableMedia = approvedMedia.filter((m) => !featuredMediaIds.has(m.id));

  async function handleFeature(mediaId: string, galleryCategoryId?: string) {
    setPendingId(mediaId);
    setError(null);
    const result = await createAdminFeaturedMedia({ mediaId, galleryCategoryId });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setFeatured((prev) => [...prev, result.data]);
  }

  async function handleTitleChange(item: AdminFeaturedMedia, titleOverride: string) {
    setPendingId(item.id);
    setError(null);
    const result = await updateAdminFeaturedMedia(item.id, { titleOverride: titleOverride.trim() || null });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setFeatured((prev) => prev.map((f) => (f.id === item.id ? result.data : f)));
  }

  async function handleCategoryChange(item: AdminFeaturedMedia, galleryCategoryId: string) {
    setPendingId(item.id);
    setError(null);
    const result = await updateAdminFeaturedMedia(item.id, { galleryCategoryId: galleryCategoryId || null });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setFeatured((prev) => prev.map((f) => (f.id === item.id ? result.data : f)));
  }

  async function handleRemove(item: AdminFeaturedMedia) {
    setPendingId(item.id);
    setError(null);
    const result = await deleteAdminFeaturedMedia(item.id);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setFeatured((prev) => prev.filter((f) => f.id !== item.id));
  }

  return (
    <div>
      {error && <div className="mb-3 rounded-md bg-red-10 p-2.5 text-[13px] text-red-70">{error}</div>}

      {featured.length === 0 && <p className="mb-3 text-sm text-text-grey">No gallery items featured yet.</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {featured.map((item) => (
          <div key={item.id} className="flex flex-col gap-1.5">
            <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-surface-input">
              <Image src={mediaThumbUrl(item.media)} alt={item.titleOverride ?? ""} fill className="object-cover" sizes="150px" />
              <button
                type="button"
                disabled={pendingId === item.id}
                onClick={() => handleRemove(item)}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white hover:bg-red disabled:opacity-60"
                aria-label="Remove from gallery"
              >
                ×
              </button>
            </div>
            <input
              defaultValue={item.titleOverride ?? ""}
              onBlur={(e) => {
                if (e.target.value !== (item.titleOverride ?? "")) handleTitleChange(item, e.target.value);
              }}
              maxLength={200}
              placeholder={item.media.vendor?.businessName ?? "Standalone photo"}
              disabled={pendingId === item.id}
              className="w-full rounded-md border border-border px-1.5 py-1 text-[11px] disabled:opacity-60"
            />
            <select
              value={item.galleryCategory?.id ?? ""}
              onChange={(e) => handleCategoryChange(item, e.target.value)}
              disabled={pendingId === item.id}
              className="w-full rounded-md border border-border px-1.5 py-1 text-[10px] disabled:opacity-60"
            >
              <option value="">
                {item.media.vendor
                  ? (item.media.vendor.categories.find((c) => c.isPrimary)?.category.name ?? item.media.vendor.businessName)
                  : "No category"}
              </option>
              {galleryCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {picking ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-text-dark">Pick a vendor photo, or upload a standalone one below</span>
            <button type="button" onClick={() => setPicking(false)} className="text-[11px] font-bold text-text-grey hover:underline">
              Close
            </button>
          </div>
          {pickableMedia.length === 0 ? (
            <p className="mb-3 text-xs text-text-grey">No unfeatured approved media available right now.</p>
          ) : (
            <div className="mb-3 grid max-h-[360px] grid-cols-3 gap-2 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-5 md:grid-cols-8">
              {pickableMedia.map((media) => (
                <button
                  key={media.id}
                  type="button"
                  disabled={pendingId === media.id}
                  onClick={() => handleFeature(media.id)}
                  className="group relative aspect-[3/4] overflow-hidden rounded-md bg-surface-input disabled:opacity-60"
                  title={media.vendor.businessName}
                >
                  <Image src={mediaThumbUrl(media)} alt={media.vendor.businessName} fill className="object-cover" sizes="100px" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:bg-black/50 group-hover:opacity-100">
                    {pendingId === media.id ? "…" : "+ Feature"}
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="mb-3 rounded-md border border-dashed border-border p-3">
            <p className="mb-2 text-[11px] font-semibold text-text-grey">
              No usable photo? Upload one directly for a vendor — it&apos;ll be auto-approved and featured immediately.
            </p>
            <VendorPhotoUploader vendors={vendors} onUploaded={(media) => handleFeature(media.id)} />
          </div>
          <div className="rounded-md border border-dashed border-border p-3">
            <p className="mb-2 text-[11px] font-semibold text-text-grey">
              Or upload a standalone inspiration photo with no vendor — tag it with a category instead.
            </p>
            <InspirationPhotoUploader
              categories={galleryCategories}
              onUploaded={(media) => handleFeature(media.id, media.galleryCategoryId)}
            />
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setPicking(true)} className="text-xs font-bold text-brand-primary hover:underline">
          + Feature a photo
        </button>
      )}
    </div>
  );
}
