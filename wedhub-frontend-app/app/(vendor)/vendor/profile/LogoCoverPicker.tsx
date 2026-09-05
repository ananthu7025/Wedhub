"use client";

import { useRef, useState } from "react";
import { confirmMediaUpload, createMediaUploadRequest } from "@/lib/api/vendor-self-client";
import { getPublicMediaUrl } from "@/lib/media/url";
import { compressImageIfPossible } from "@/lib/media/compress-image";
import type { MediaType } from "@/lib/api/vendor-self.types";
import { formatApiError } from "@/lib/utils/error";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Uploads a LOGO/COVER media item directly (real R2 presigned flow, same
 * pattern as portfolio uploads) and reports the resulting mediaId back to
 * the parent form — the actual write to VendorProfile.logoMediaId/
 * coverMediaId happens on the form's "Save changes", not here, so a vendor
 * can change their mind before committing.
 */
export function LogoCoverPicker({
  label,
  mediaId,
  initialObjectKey,
  onChange,
  mediaType,
  shape,
}: {
  label: string;
  mediaId: string | null;
  /** The current media's resolvable object key, if one was already set — the id alone can't be rendered without a fetch, so the parent passes this from the initial VendorProfile.logoMedia/coverMedia join. */
  initialObjectKey: string | null;
  onChange: (mediaId: string | null) => void;
  mediaType: Extract<MediaType, "LOGO" | "COVER">;
  shape: "square" | "wide";
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialObjectKey ? getPublicMediaUrl(initialObjectKey) : null,
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;

    if (!ACCEPTED_MIME_TYPES.includes(selectedFile.type)) {
      setError("Only JPG, PNG, and WebP images are supported.");
      return;
    }

    setError("");
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(selectedFile));

    const file = await compressImageIfPossible(selectedFile);
    const requestResult = await createMediaUploadRequest({
      mediaType,
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });
    if (!requestResult.success) {
      setError(formatApiError(requestResult.error));
      setUploading(false);
      return;
    }

    const { mediaId: newMediaId, uploadUrl } = requestResult.data;
    const putResponse = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!putResponse.ok) {
      setError("Upload to storage failed");
      setUploading(false);
      return;
    }

    const confirmResult = await confirmMediaUpload(newMediaId);
    if (!confirmResult.success) {
      setError(formatApiError(confirmResult.error));
      setUploading(false);
      return;
    }

    onChange(newMediaId);
    setUploading(false);
  }

  const dimensionClass = shape === "square" ? "h-22 w-22 rounded-2xl" : "h-22 w-55 rounded-2xl";

  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-bold">{label}</span>
      <div className="flex items-center gap-4">
        <div className={`flex-shrink-0 overflow-hidden border border-border bg-surface-input ${dimensionClass}`}>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-bold hover:bg-surface-input disabled:opacity-60"
        >
          {uploading ? "Uploading…" : mediaId ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        </button>
        {mediaId && !uploading && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setPreviewUrl(null);
            }}
            className="text-[13px] font-semibold text-text-grey underline"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
      <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME_TYPES.join(",")} hidden onChange={handleFileSelect} />
    </div>
  );
}
