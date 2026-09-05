"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createReview } from "@/lib/api/account-client";
import { uploadReviewPhoto } from "@/lib/media/upload";
import { runWithConcurrencyLimit } from "@/lib/utils/concurrency";
import { formatApiError } from "@/lib/utils/error";

const MAX_PHOTOS = 6;
const MAX_CONCURRENT_UPLOADS = 3;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type PhotoUploadState = "pending" | "done" | "error";

export function ReviewForm({
  vendorId,
  services,
}: {
  vendorId: string;
  services: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<
    Array<{ id: string; file: File; state: PhotoUploadState; mediaId?: string }>
  >([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const invalid = selected.find((f) => !ALLOWED_PHOTO_TYPES.has(f.type));
    if (invalid) {
      setErrorMessage("Only JPEG, PNG and WebP images are allowed.");
      setStatus("error");
      event.target.value = "";
      return;
    }
    setPhotos((prev) =>
      [
        ...prev,
        ...selected.map((file) => ({ id: `${file.name}-${Date.now()}-${Math.random()}`, file, state: "pending" as const })),
      ].slice(0, MAX_PHOTOS),
    );
    event.target.value = "";
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  async function uploadPhoto(photoId: string, file: File): Promise<{ id: string; mediaId?: string; failed: boolean }> {
    try {
      const mediaId = await uploadReviewPhoto(file);
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, state: "done", mediaId } : p)));
      return { id: photoId, mediaId, failed: false };
    } catch {
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, state: "error" } : p)));
      return { id: photoId, failed: true };
    }
  }

  function retryPhoto(photoId: string) {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, state: "pending" } : p)));
    void uploadPhoto(photoId, photo.file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (rating === 0) {
      setErrorMessage("Please select a star rating");
      setStatus("error");
      return;
    }

    setErrorMessage("");
    setStatus("uploading");

    const alreadyDone = photos.filter((p) => p.state === "done" && p.mediaId);
    const toUpload = photos.filter((p) => p.state !== "done");

    const freshResults: Array<{ id: string; mediaId?: string; failed: boolean }> = [];
    if (toUpload.length > 0) {
      await runWithConcurrencyLimit(
        toUpload.map(
          ({ id, file }) =>
            () =>
              uploadPhoto(id, file).then((result) => {
                freshResults.push(result);
              }),
        ),
        MAX_CONCURRENT_UPLOADS,
      );
    }

    const failedCount = freshResults.filter((r) => r.failed).length;
    if (failedCount > 0) {
      setStatus("error");
      setErrorMessage(
        `${failedCount} of ${photos.length} photo${photos.length === 1 ? "" : "s"} failed to upload. Retry or remove ${failedCount === 1 ? "it" : "them"} below, or submit without ${failedCount === 1 ? "it" : "them"}.`,
      );
      return;
    }

    const mediaIds = [
      ...alreadyDone.map((p) => p.mediaId as string),
      ...freshResults.map((r) => r.mediaId).filter((id): id is string => Boolean(id)),
    ];

    setStatus("submitting");
    const result = await createReview({
      vendorId,
      serviceId: serviceId || undefined,
      rating,
      content: content || undefined,
      mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
    });

    if (result.success) {
      setStatus("success");
      router.push("/enquiries");
      router.refresh();
    } else {
      setStatus("error");
      setErrorMessage(formatApiError(result.error));
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <span className="mb-2 block text-[13px] font-bold">Overall rating</span>
      <div className="mb-5 flex flex-row-reverse justify-end gap-2 text-[34px]">
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className="cursor-pointer border-none bg-transparent p-0 leading-none"
            style={{ color: star <= (hoverRating || rating) ? "#f0a202" : "var(--color-border)" }}
          >
            ★
          </button>
        ))}
      </div>

      {services.length > 0 && (
        <label className="mb-4 block text-sm">
          <span className="mb-1.5 block font-bold text-[13px]">Which service?</span>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="mb-4 block text-sm">
        <span className="mb-1.5 block font-bold text-[13px]">Your review</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Tell other couples about your experience — quality, punctuality, communication..."
          maxLength={3000}
          className="min-h-[140px] w-full rounded-md border border-border px-3 py-2.5 text-sm"
        />
      </label>

      <div className="mb-1">
        <span className="mb-1.5 block text-[13px] font-bold">
          Add photos <span className="font-normal text-text-grey">(optional)</span>
        </span>
        <div className="mb-2 flex flex-wrap gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative h-16 w-16 overflow-hidden rounded-md bg-surface-input">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(photo.file)}
                alt=""
                className={`h-full w-full object-cover ${photo.state === "error" ? "opacity-50" : ""}`}
              />
              {photo.state === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/50">
                  <button
                    type="button"
                    onClick={() => retryPhoto(photo.id)}
                    className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-text-dark"
                  >
                    Retry
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                aria-label="Remove photo"
                className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[9px] text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full cursor-pointer rounded-md border-[1.5px] border-dashed border-border px-6 py-6 text-center text-[13px] text-text-grey"
          >
            + Upload photos
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={handlePhotoSelect}
        />
      </div>

      {status === "error" && <p className="mt-3.5 text-[13px] text-red">{errorMessage}</p>}

      <button
        type="submit"
        disabled={status === "uploading" || status === "submitting"}
        className="mt-5 block w-full rounded-md bg-brand-primary py-3 text-center text-sm font-bold text-white disabled:opacity-60"
      >
        {status === "uploading" ? "Uploading photos…" : status === "submitting" ? "Submitting…" : "Submit review"}
      </button>
      <p className="mt-2.5 text-center text-[11px] text-text-grey">Reviews are moderated before appearing publicly.</p>
    </form>
  );
}
