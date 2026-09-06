"use client";

import { useRef, useState } from "react";
import { confirmAdminInspirationImageUpload, createAdminInspirationImageUploadRequest } from "@/lib/api/admin-client";
import type { GalleryCategory } from "@/lib/api/vendors.types";
import { compressImageIfPossible } from "@/lib/media/compress-image";
import { formatApiError } from "@/lib/utils/error";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Standalone Gallery Inspiration upload — no vendor picker, unlike
 * VendorPhotoUploader.tsx. Same real R2 presign -> PUT -> confirm flow,
 * through the admin-only, platform-owned inspiration-image-upload-requests
 * endpoints, producing an INSPIRATION_PHOTO Media row with vendorId: null.
 * A GalleryCategory must be picked since there's no vendor category to
 * derive one from — onUploaded reports both the real mediaId (needed to
 * create the FeaturedMedia row) and the chosen category id.
 */
export function InspirationPhotoUploader({
  categories,
  onUploaded,
}: {
  categories: GalleryCategory[];
  onUploaded: (result: { id: string; url: string; galleryCategoryId: string }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [galleryCategoryId, setGalleryCategoryId] = useState(categories[0]?.id ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile || !galleryCategoryId) return;

    if (!ACCEPTED_MIME_TYPES.includes(selectedFile.type)) {
      setError("Only JPG, PNG, and WebP images are supported.");
      return;
    }

    setError("");
    setUploading(true);

    const file = await compressImageIfPossible(selectedFile);
    const requestResult = await createAdminInspirationImageUploadRequest({
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });
    if (!requestResult.success) {
      setError(formatApiError(requestResult.error));
      setUploading(false);
      return;
    }

    const { mediaId, uploadUrl } = requestResult.data;
    const putResponse = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!putResponse.ok) {
      setError("Upload to storage failed");
      setUploading(false);
      return;
    }

    // Processing (resize/optimize) happens async on the worker — poll
    // briefly since the optimized url isn't ready the instant confirm
    // returns (status starts PROCESSING, not READY). Same pattern as
    // VendorPhotoUploader.tsx.
    let confirmed = await confirmAdminInspirationImageUpload(mediaId);
    for (let attempt = 0; attempt < 10 && confirmed.success && !confirmed.data.url; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      confirmed = await confirmAdminInspirationImageUpload(mediaId);
    }

    if (!confirmed.success) {
      setError(formatApiError(confirmed.error));
      setUploading(false);
      return;
    }
    if (!confirmed.data.url) {
      setError("Photo is still processing — try again in a few seconds.");
      setUploading(false);
      return;
    }

    onUploaded({ id: confirmed.data.id, url: confirmed.data.url, galleryCategoryId });
    setUploading(false);
  }

  if (categories.length === 0) {
    return <p className="text-xs text-text-grey">No gallery categories exist yet to tag a standalone photo with.</p>;
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <select
        value={galleryCategoryId}
        onChange={(e) => setGalleryCategoryId(e.target.value)}
        disabled={uploading}
        className="rounded-md border border-border px-2 py-1.5 text-xs disabled:opacity-60"
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || !galleryCategoryId}
        className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-bold hover:bg-surface-input disabled:opacity-60"
      >
        {uploading ? "Uploading…" : "Upload a standalone photo"}
      </button>
      {error && <p className="text-xs text-red">{error}</p>}
      <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME_TYPES.join(",")} hidden onChange={handleFileSelect} />
    </div>
  );
}
