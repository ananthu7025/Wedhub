"use client";

import { confirmReviewPhotoUpload, createReviewPhotoUploadRequest } from "@/lib/api/account-client";
import { formatApiError } from "@/lib/utils/error";

/** Uploads a single File directly to R2 via a presigned URL, then confirms it. Returns the resulting mediaId. */
export async function uploadReviewPhoto(file: File): Promise<string> {
  const requestResult = await createReviewPhotoUploadRequest(file.name, file.type, file.size);
  if (!requestResult.success) {
    throw new Error(formatApiError(requestResult.error));
  }
  const { mediaId, uploadUrl } = requestResult.data;

  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
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
