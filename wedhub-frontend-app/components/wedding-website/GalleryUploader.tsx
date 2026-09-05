"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { confirmWeddingWebsiteUpload, createWeddingWebsiteUploadRequest, deleteWeddingWebsiteMedia } from "@/lib/api/wedding-website-media-client";
import type { WeddingWebsiteMedia } from "@/lib/api/wedding-website.types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { compressImageIfPossible } from "@/lib/media/compress-image";
import { formatApiError } from "@/lib/utils/error";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_GALLERY_PHOTOS = 30;

function objectKeyFor(media: WeddingWebsiteMedia): string {
  return media.thumbnailObjectKey ?? media.optimizedObjectKey ?? media.originalObjectKey;
}

export function GalleryUploader({
  weddingWebsiteId,
  initialGallery,
}: {
  weddingWebsiteId: string;
  initialGallery: WeddingWebsiteMedia[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gallery, setGallery] = useState(initialGallery);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    if (gallery.length >= MAX_GALLERY_PHOTOS) {
      setError(`You can upload up to ${MAX_GALLERY_PHOTOS} photos to a wedding website.`);
      return;
    }

    setError("");
    setUploading(true);

    for (const selectedFile of files) {
      if (!ACCEPTED_MIME_TYPES.includes(selectedFile.type)) {
        setError("Only JPG, PNG, and WebP images are supported.");
        continue;
      }

      const file = await compressImageIfPossible(selectedFile);
      const requestResult = await createWeddingWebsiteUploadRequest({
        weddingWebsiteId,
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
      if (!requestResult.success) {
        setError(formatApiError(requestResult.error));
        continue;
      }

      const { mediaId, uploadUrl } = requestResult.data;
      const putResponse = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!putResponse.ok) {
        setError("Upload to storage failed for one of your photos");
        continue;
      }

      let confirmed = await confirmWeddingWebsiteUpload(mediaId);
      for (let attempt = 0; attempt < 10 && confirmed.success && confirmed.data.status !== "READY"; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        confirmed = await confirmWeddingWebsiteUpload(mediaId);
      }
      if (confirmed.success && confirmed.data.status === "READY") {
        setGallery((prev) => [...prev, confirmed.data]);
      }
    }

    setUploading(false);
  }

  async function handleRemove(mediaId: string) {
    setGallery((prev) => prev.filter((m) => m.id !== mediaId));
    await deleteWeddingWebsiteMedia(mediaId);
  }

  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-bold">Gallery photos</span>
      <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {gallery.map((item) => (
          <div key={item.id} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-surface-input">
            <Image src={getPublicMediaUrl(objectKeyFor(item))} alt="" fill className="object-cover" sizes="120px" />
            <button
              type="button"
              onClick={() => handleRemove(item.id)}
              className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="rounded-md border border-border bg-white px-3.5 py-2 text-xs font-bold hover:bg-surface-input disabled:opacity-60"
      >
        {uploading ? "Uploading…" : "+ Add photos"}
      </button>
      {error && <p className="mt-1.5 text-xs text-red">{error}</p>}
      <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME_TYPES.join(",")} multiple hidden onChange={handleFileSelect} />
    </div>
  );
}
