"use client";

import { useRef, useState } from "react";
import { confirmAdminPopularSearchImageUpload, createAdminPopularSearchImageUploadRequest } from "@/lib/api/admin-client";
import { formatApiError } from "@/lib/utils/error";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Real file-picker upload for a PopularSearchCard's image — same R2
 * presign -> PUT -> confirm flow as CategoryImagePicker.tsx (which this
 * closely mirrors), through the admin-only, platform-owned
 * popular-search-image-upload-requests endpoints (Arch Phase 17, added
 * 2026-09-04) since a popular-search card, like a Category, has no
 * vendorId to own the upload. The confirm step already returns a
 * resolvable url — onUploaded is called with that real url immediately so
 * the parent form can hold it in local state until its own Save/Add
 * button submits.
 */
export function PopularSearchImagePicker({
  currentImageUrl,
  onUploaded,
}: {
  currentImageUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, and WebP images are supported.");
      return;
    }

    setError("");
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));

    const requestResult = await createAdminPopularSearchImageUploadRequest({
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

    // Processing (resize/optimize) happens async on the worker — poll the
    // confirm result briefly since the optimized url isn't ready the
    // instant confirm returns (status starts PROCESSING, not READY).
    let confirmed = await confirmAdminPopularSearchImageUpload(mediaId);
    for (let attempt = 0; attempt < 10 && confirmed.success && !confirmed.data.url; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      confirmed = await confirmAdminPopularSearchImageUpload(mediaId);
    }

    if (!confirmed.success) {
      setError(formatApiError(confirmed.error));
      setUploading(false);
      return;
    }
    if (!confirmed.data.url) {
      setError("Image is still processing — try saving again in a few seconds.");
      setUploading(false);
      return;
    }

    onUploaded(confirmed.data.url);
    setUploading(false);
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-md border border-border bg-surface-input">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-bold hover:bg-surface-input disabled:opacity-60"
        >
          {uploading ? "Uploading…" : currentImageUrl ? "Change image" : "Upload image"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
      <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME_TYPES.join(",")} hidden onChange={handleFileSelect} />
    </div>
  );
}
