"use client";

import { useRef, useState } from "react";
import { confirmAdminImageUpload, createAdminImageUploadRequest } from "@/lib/api/admin-client";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Real file-picker upload for a Category's homepage image — same R2
 * presign -> PUT -> confirm flow as LogoCoverPicker.tsx (vendor logo/
 * cover), but through the admin-only, platform-owned media-uploads
 * endpoints (added 2026-09-03) since a category has no vendorId to own
 * the upload. Unlike LogoCoverPicker, which defers the DB write to the
 * parent form's "Save changes", the confirm step here already returns a
 * resolvable url — onUploaded is called with that real url immediately so
 * the parent can persist it via the normal PATCH /categories/:id save
 * button, same as the price field next to it.
 */
export function CategoryImagePicker({
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

    setError("");
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));

    const requestResult = await createAdminImageUploadRequest({
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });
    if (!requestResult.success) {
      setError(requestResult.error.message);
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
    let confirmed = await confirmAdminImageUpload(mediaId);
    for (let attempt = 0; attempt < 10 && confirmed.success && !confirmed.data.url; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      confirmed = await confirmAdminImageUpload(mediaId);
    }

    if (!confirmed.success) {
      setError(confirmed.error.message);
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
