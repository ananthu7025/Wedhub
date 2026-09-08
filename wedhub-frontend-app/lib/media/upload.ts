"use client";

import { confirmReviewPhotoUpload, createReviewPhotoUploadRequest } from "@/lib/api/account-client";
import { confirmChallengeEntryPhotoUpload, createChallengeEntryPhotoUploadRequest } from "@/lib/api/challenges-client";
import { compressImageIfPossible } from "@/lib/media/compress-image";
import { formatApiError } from "@/lib/utils/error";

/** Uploads a single File directly to R2 via a presigned URL, then confirms it. Returns the resulting mediaId. */
export async function uploadReviewPhoto(file: File): Promise<string> {
  const compressed = await compressImageIfPossible(file);

  const requestResult = await createReviewPhotoUploadRequest(compressed.name, compressed.type, compressed.size);
  if (!requestResult.success) {
    throw new Error(formatApiError(requestResult.error));
  }
  const { mediaId, uploadUrl } = requestResult.data;

  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": compressed.type },
    body: compressed,
  });
  if (!putResponse.ok) {
    throw new Error("Photo upload to storage failed");
  }

  const confirmResult = await confirmReviewPhotoUpload(mediaId);
  if (!confirmResult.success) {
    throw new Error(formatApiError(confirmResult.error));
  }

  return mediaId;
}

/** Uploads a single File directly to R2 via a presigned URL, then confirms it, producing a CHALLENGE_ENTRY_PHOTO Media row. Returns the resulting mediaId. */
export async function uploadChallengeEntryPhoto(file: File): Promise<string> {
  const compressed = await compressImageIfPossible(file);

  const requestResult = await createChallengeEntryPhotoUploadRequest(compressed.name, compressed.type, compressed.size);
  if (!requestResult.success) {
    throw new Error(formatApiError(requestResult.error));
  }
  const { mediaId, uploadUrl } = requestResult.data;

  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": compressed.type },
    body: compressed,
  });
  if (!putResponse.ok) {
    throw new Error("Photo upload to storage failed");
  }

  // Processing (resize/optimize) happens async on a worker — status starts
  // PROCESSING, not READY, the instant confirm returns, and the backend's
  // findOwnUnattachedPhoto check on submit requires READY. Poll briefly
  // (confirm is idempotent past PENDING) same pattern as
  // InspirationPhotoUploader.tsx, rather than racing straight into submit.
  let confirmResult = await confirmChallengeEntryPhotoUpload(mediaId);
  for (let attempt = 0; attempt < 10 && confirmResult.success && confirmResult.data.status !== "READY"; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    confirmResult = await confirmChallengeEntryPhotoUpload(mediaId);
  }

  if (!confirmResult.success) {
    throw new Error(formatApiError(confirmResult.error));
  }
  if (confirmResult.data.status !== "READY") {
    throw new Error("Your photo is still processing — please wait a moment and try submitting again.");
  }

  return mediaId;
}
