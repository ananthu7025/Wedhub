"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmMediaUpload,
  createMediaUploadRequest,
  deleteMedia,
  listMyMediaClient,
  updateMedia,
  upsertMyProfile,
} from "@/lib/api/vendor-self-client";
import { getPublicMediaUrl } from "@/lib/media/url";
import { compressImageIfPossible } from "@/lib/media/compress-image";
import { runWithConcurrencyLimit } from "@/lib/utils/concurrency";
import type { MediaItem } from "@/lib/api/vendor-self.types";
import { formatApiError } from "@/lib/utils/error";

const POLL_INTERVAL_MS = 3000;
const SETTLED_STATUSES = new Set(["READY", "FAILED", "INACTIVE", "DELETED"]);

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
const MAX_FILE_SIZE_MB = 50;
const MAX_CONCURRENT_UPLOADS = 3;

interface UploadingItem {
  tempId: string;
  fileName: string;
  previewUrl: string;
  file: File;
  progress: "uploading" | "confirming" | "processing" | "error";
  error?: string;
}

function objectKeyFor(item: MediaItem): string {
  return item.thumbnailObjectKey ?? item.optimizedObjectKey ?? item.originalObjectKey;
}

export function PortfolioManager({
  initialMedia,
  currentLogoMediaId,
  currentCoverMediaId,
}: {
  initialMedia: MediaItem[];
  currentLogoMediaId: string | null;
  currentCoverMediaId: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState(initialMedia.filter((m) => m.status !== "DELETED"));
  const [uploads, setUploads] = useState<UploadingItem[]>([]);
  const [logoMediaId, setLogoMediaId] = useState(currentLogoMediaId);
  const [coverMediaId, setCoverMediaId] = useState(currentCoverMediaId);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);

  const hasUnsettledMedia = media.some((m) => !SETTLED_STATUSES.has(m.status));

  // Real async worker (sharp-based resize/thumbnail generation) settles a
  // PENDING/PROCESSING item to READY (or FAILED) some time after confirm —
  // poll rather than assuming confirm's response is the final state.
  useEffect(() => {
    if (!hasUnsettledMedia) return;

    const interval = setInterval(async () => {
      const result = await listMyMediaClient();
      if (result.success) {
        setMedia(result.data.filter((m) => m.status !== "DELETED"));
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [hasUnsettledMedia]);

  const photoCount = media.filter((m) => m.mediaType === "PORTFOLIO" && m.mimeType.startsWith("image/")).length;
  const videoCount = media.filter((m) => m.mediaType === "VIDEO" || m.mimeType.startsWith("video/")).length;

  async function uploadOneFile(file: File, tempId: string) {
    setUploads((prev) => prev.map((u) => (u.tempId === tempId ? { ...u, progress: "uploading", error: undefined } : u)));

    const compressed = await compressImageIfPossible(file);
    const mediaType = compressed.type.startsWith("video/") ? "VIDEO" : "PORTFOLIO";

    const requestResult = await createMediaUploadRequest({
      mediaType,
      filename: compressed.name,
      mimeType: compressed.type,
      fileSize: compressed.size,
    });
    if (!requestResult.success) {
      setUploads((prev) => prev.map((u) => (u.tempId === tempId ? { ...u, progress: "error", error: formatApiError(requestResult.error) } : u)));
      return;
    }

    const { mediaId, uploadUrl } = requestResult.data;
    const putResponse = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": compressed.type }, body: compressed });
    if (!putResponse.ok) {
      setUploads((prev) => prev.map((u) => (u.tempId === tempId ? { ...u, progress: "error", error: "Upload to storage failed" } : u)));
      return;
    }

    setUploads((prev) => prev.map((u) => (u.tempId === tempId ? { ...u, progress: "confirming" } : u)));

    const confirmResult = await confirmMediaUpload(mediaId);
    if (!confirmResult.success) {
      setUploads((prev) => prev.map((u) => (u.tempId === tempId ? { ...u, progress: "error", error: formatApiError(confirmResult.error) } : u)));
      return;
    }

    setUploads((prev) => prev.map((u) => (u.tempId === tempId ? { ...u, progress: "processing" } : u)));
    setMedia((prev) => [...prev, confirmResult.data]);
    setUploads((prev) => prev.filter((u) => u.tempId !== tempId));
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    const accepted: Array<{ file: File; tempId: string }> = [];

    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        const tempId = `${file.name}-${Date.now()}-${Math.random()}`;
        setUploads((prev) => [
          ...prev,
          {
            tempId,
            fileName: file.name,
            previewUrl: "",
            file,
            progress: "error",
            error: "Unsupported file type. Allowed: JPG, PNG, WebP, MP4, MOV.",
          },
        ]);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        const tempId = `${file.name}-${Date.now()}-${Math.random()}`;
        setUploads((prev) => [
          ...prev,
          {
            tempId,
            fileName: file.name,
            previewUrl: "",
            file,
            progress: "error",
            error: `File exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB.`,
          },
        ]);
        continue;
      }
      const tempId = `${file.name}-${Date.now()}-${Math.random()}`;
      const previewUrl = URL.createObjectURL(file);
      setUploads((prev) => [...prev, { tempId, fileName: file.name, previewUrl, file, progress: "uploading" }]);
      accepted.push({ file, tempId });
    }

    void runWithConcurrencyLimit(
      accepted.map(({ file, tempId }) => () => uploadOneFile(file, tempId)),
      MAX_CONCURRENT_UPLOADS,
    );
  }

  function handleRetryUpload(tempId: string) {
    const upload = uploads.find((u) => u.tempId === tempId);
    if (!upload) return;
    void uploadOneFile(upload.file, tempId);
  }

  function handleRemoveUpload(tempId: string) {
    setUploads((prev) => prev.filter((u) => u.tempId !== tempId));
  }

  async function handleDelete(mediaId: string) {
    if (!window.confirm("Delete this item? This can't be undone.")) return;
    setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    const result = await deleteMedia(mediaId);
    if (!result.success) {
      router.refresh();
    }
    if (logoMediaId === mediaId) setLogoMediaId(null);
    if (coverMediaId === mediaId) setCoverMediaId(null);
  }

  async function handleMove(mediaId: string, direction: "up" | "down") {
    const index = media.findIndex((m) => m.id === mediaId);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapIndex < 0 || swapIndex >= media.length) return;

    const reordered = [...media];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    setMedia(reordered);

    await Promise.all([
      updateMedia(reordered[index].id, { sortOrder: index }),
      updateMedia(reordered[swapIndex].id, { sortOrder: swapIndex }),
    ]);
  }

  async function handleSetAsLogo(mediaId: string) {
    const previous = logoMediaId;
    setLogoMediaId(mediaId);
    const result = await upsertMyProfile({ logoMediaId: mediaId });
    if (!result.success) setLogoMediaId(previous);
    router.refresh();
  }

  async function handleSetAsCover(mediaId: string) {
    const previous = coverMediaId;
    setCoverMediaId(mediaId);
    const result = await upsertMyProfile({ coverMediaId: mediaId });
    if (!result.success) setCoverMediaId(previous);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-text-grey">Manage the photos and videos couples see on your public profile.</p>
      </div>
      <p className="mb-5 text-[13px] text-text-grey">
        {photoCount} photo{photoCount === 1 ? "" : "s"} · {videoCount} video{videoCount === 1 ? "" : "s"}
      </p>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFilesSelected(e.dataTransfer.files);
        }}
        className="mb-5 sm:mb-7 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-white p-5 sm:p-10 text-center hover:border-brand-primary hover:bg-surface-input transition-colors"
      >
        <div className="mb-1 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
        </div>
        <p className="text-xs sm:text-sm font-bold">Drag and drop photos or videos here, or click to browse</p>
        <p className="text-[11px] sm:text-xs text-text-grey">JPG, PNG, MP4 up to {MAX_FILE_SIZE_MB}MB</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="mt-1 rounded-md bg-brand-primary px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-[13px] font-bold text-white shadow-xs"
        >
          Choose files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          hidden
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {uploads.map((upload) => (
          <div key={upload.tempId} className="relative aspect-square overflow-hidden rounded-xl bg-surface-input shadow-[var(--shadow-card)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={upload.previewUrl} alt="" className="h-full w-full object-cover opacity-60" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
              {upload.progress === "error" ? (
                <>
                  <span className="px-2 text-center text-xs font-bold">{upload.error ?? "Upload failed"}</span>
                  <div className="flex gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handleRetryUpload(upload.tempId)}
                      className="rounded-md bg-white/90 px-2 py-1 text-[11px] font-bold text-text-dark hover:bg-white"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveUpload(upload.tempId)}
                      className="rounded-md bg-white/90 px-2 py-1 text-[11px] font-bold text-text-dark hover:bg-white"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-7 w-7 sm:h-8 sm:w-8 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
                  <span className="text-xs font-bold capitalize">{upload.progress}…</span>
                </>
              )}
            </div>
          </div>
        ))}

        {media.map((item, index) => {
          const key = objectKeyFor(item);
          const isVideo = item.mediaType === "VIDEO" || item.mimeType.startsWith("video/");
          const isLogo = logoMediaId === item.id;
          const isCover = coverMediaId === item.id;
          const isSelected = activeMediaId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => setActiveMediaId(isSelected ? null : item.id)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-surface-input shadow-[var(--shadow-card)] cursor-pointer select-none"
            >
              {(isLogo || isCover) && (
                <span className="absolute top-2 left-2 z-10 rounded-full bg-brand-primary px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-white shadow-xs">
                  {isLogo && isCover ? "Logo · Cover" : isLogo ? "Logo" : "Cover"}
                </span>
              )}
              {item.status !== "READY" ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-text-grey">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-brand-primary" />
                  <span className="text-[11px] font-bold capitalize">{item.status.toLowerCase()}</span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getPublicMediaUrl(key)} alt={item.altText ?? ""} className="h-full w-full object-cover" />
              )}
              {isVideo && (
                <span className="absolute right-2 bottom-2 z-10 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-black/60 text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}

              {/* Action overlay (visible on hover for desktop, or on tap for mobile) */}
              <div
                className={`absolute inset-0 flex items-center justify-center gap-1.5 sm:gap-2 bg-black/60 transition-opacity ${
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  title="Move left/up"
                  disabled={index === 0}
                  onClick={() => handleMove(item.id, "up")}
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/90 text-text-dark disabled:opacity-40"
                >
                  ←
                </button>
                {!isVideo && item.status === "READY" && (
                  <button
                    type="button"
                    title="Set as logo"
                    onClick={() => handleSetAsLogo(item.id)}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/90 text-text-dark"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </button>
                )}
                {!isVideo && item.status === "READY" && (
                  <button
                    type="button"
                    title="Set as cover"
                    onClick={() => handleSetAsCover(item.id)}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/90 text-[9px] sm:text-[10px] font-bold text-text-dark"
                  >
                    COV
                  </button>
                )}
                <button
                  type="button"
                  title="Delete"
                  onClick={() => handleDelete(item.id)}
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/90 text-red hover:bg-red-10"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Move right/down"
                  disabled={index === media.length - 1}
                  onClick={() => handleMove(item.id, "down")}
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/90 text-text-dark disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {media.length === 0 && uploads.length === 0 && (
        <p className="mt-4 text-center text-sm text-text-grey">No photos or videos yet — upload your first one above.</p>
      )}
    </div>
  );
}
