"use client";

import { confirmReviewPhotoUpload, createReviewPhotoUploadRequest } from "@/lib/api/account-client";
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
