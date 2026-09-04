"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { confirmWeddingWebsiteUpload, createWeddingWebsiteUploadRequest } from "@/lib/api/wedding-website-media-client";
import type { WeddingWebsiteMedia } from "@/lib/api/wedding-website.types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { formatApiError } from "@/lib/utils/error";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function objectKeyFor(media: WeddingWebsiteMedia): string {
  return media.thumbnailObjectKey ?? media.optimizedObjectKey ?? media.originalObjectKey;
}

/**
 * Real file-picker upload for wedding-website photos (cover, couple
 * photo, gallery) — same R2 presign -> PUT -> confirm flow as every other
 * uploader in this app. Unlike the admin vendor-photo uploader,
 * confirmUpload here returns the RAW Media row (no precomputed `url`), so
 * the poll condition checks `status === "READY"` and the display URL is
 * resolved client-side via getPublicMediaUrl(objectKeyFor(media)).
 */
export function PhotoUploader({
  weddingWebsiteId,
  currentPreviewUrl,
  label,
  onUploaded,
}: {
  weddingWebsiteId: string;
  currentPreviewUrl: string | null;
  label: string;
  onUploaded: (media: WeddingWebsiteMedia) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPreviewUrl);
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

    const requestResult = await createWeddingWebsiteUploadRequest({
      weddingWebsiteId,
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
    // briefly since it isn't READY the instant confirm returns.
    let confirmed = await confirmWeddingWebsiteUpload(mediaId);
    for (let attempt = 0; attempt < 10 && confirmed.success && confirmed.data.status !== "READY"; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      confirmed = await confirmWeddingWebsiteUpload(mediaId);
    }

    if (!confirmed.success) {
      setError(formatApiError(confirmed.error));
      setUploading(false);
      return;
    }
    if (confirmed.data.status !== "READY") {
      setError("Photo is still processing — try again in a few seconds.");
      setUploading(false);
      return;
    }

    setPreviewUrl(getPublicMediaUrl(objectKeyFor(confirmed.data)));
    onUploaded(confirmed.data);
    setUploading(false);
  }

  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-bold">{label}</span>
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-md border border-border bg-surface-input">
          {previewUrl && <Image src={previewUrl} alt="" fill className="object-cover" sizes="112px" />}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-md border border-border bg-white px-3.5 py-2 text-xs font-bold hover:bg-surface-input disabled:opacity-60"
        >
          {uploading ? "Uploading…" : previewUrl ? "Change photo" : "Upload photo"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
      <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME_TYPES.join(",")} hidden onChange={handleFileSelect} />
    </div>
  );
}
