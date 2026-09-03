import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { NotFoundError, ValidationError } from "../../common/errors";
import { getSignedUploadUrl, objectExists } from "../../integrations/storage/r2.client";
import { enqueueMediaProcessing } from "../../jobs/queues/media-processing.queue";
import * as weddingWebsiteMediaRepository from "./wedding-website-media.repository";
import { MAX_GALLERY_PHOTOS } from "./wedding-website-media.schema";

function extensionFor(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot);
}

/**
 * Wedding-website photos (cover, couple photo, gallery) are a small,
 * unmoderated, no-entitlement-check parallel to the vendor media pipeline
 * (media.service.ts) — deliberately not routed through that module, since
 * it's built around getOwnedVendorOrThrow(userId) and a required
 * Media.vendorId, neither of which applies here (a WeddingWebsite owner
 * may have no Vendor at all — see docs/12-stage-wedding-website.md's
 * "Photo ownership" decision). Exact same shape as review-media.service.ts.
 * Reuses the same R2 client and media-processing queue/worker (both keyed
 * generically by mediaId, no vendor assumption).
 */
export async function createUploadRequest(
  ownerUserId: string,
  input: { weddingWebsiteId: string; filename: string; mimeType: string; fileSize: number },
) {
  const draft = await weddingWebsiteMediaRepository.findOwnedDraft(input.weddingWebsiteId, ownerUserId);
  if (!draft) {
    throw new NotFoundError("Wedding website not found");
  }

  const maxSize = env.MEDIA_MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (input.fileSize > maxSize) {
    throw new ValidationError(`File exceeds the maximum allowed size of ${env.MEDIA_MAX_IMAGE_SIZE_MB}MB`);
  }

  const existingCount = await weddingWebsiteMediaRepository.countPhotosForWebsite(input.weddingWebsiteId);
  if (existingCount >= MAX_GALLERY_PHOTOS) {
    throw new ValidationError(`You can upload up to ${MAX_GALLERY_PHOTOS} photos to a wedding website`);
  }

  const objectKey = `wedding-websites/${input.weddingWebsiteId}/${randomUUID()}${extensionFor(input.filename)}`;
  const uploadUrl = await getSignedUploadUrl(objectKey, input.mimeType);

  const media = await weddingWebsiteMediaRepository.createUnattachedPhoto({
    weddingWebsiteId: input.weddingWebsiteId,
    originalObjectKey: objectKey,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
  });

  return { mediaId: media.id, uploadUrl, objectKey };
}

export async function confirmUpload(ownerUserId: string, mediaId: string) {
  const media = await weddingWebsiteMediaRepository.findPhotoById(mediaId);
  if (!media || media.mediaType !== "WEDDING_WEBSITE_PHOTO" || !media.weddingWebsiteId) {
    throw new NotFoundError("Media not found");
  }
  const draft = await weddingWebsiteMediaRepository.findOwnedDraft(media.weddingWebsiteId, ownerUserId);
  if (!draft) {
    throw new NotFoundError("Media not found");
  }
  if (media.status !== "PENDING") {
    return media; // already confirmed — idempotent from the caller's point of view
  }

  const exists = await objectExists(media.originalObjectKey);
  if (!exists) {
    throw new ValidationError("Upload not found in storage yet — has the browser upload completed?");
  }

  await weddingWebsiteMediaRepository.markProcessing(mediaId);
  await enqueueMediaProcessing(mediaId);
  return weddingWebsiteMediaRepository.findPhotoById(mediaId);
}

export async function deletePhoto(ownerUserId: string, mediaId: string): Promise<void> {
  const media = await weddingWebsiteMediaRepository.findPhotoById(mediaId);
  if (!media || media.mediaType !== "WEDDING_WEBSITE_PHOTO" || !media.weddingWebsiteId) {
    throw new NotFoundError("Media not found");
  }
  const draft = await weddingWebsiteMediaRepository.findOwnedDraft(media.weddingWebsiteId, ownerUserId);
  if (!draft) {
    throw new NotFoundError("Media not found");
  }
  await weddingWebsiteMediaRepository.deletePhoto(mediaId);
}
