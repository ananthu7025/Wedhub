import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { NotFoundError, ConflictError, ValidationError } from "../../common/errors";
import { getPublicUrl, getSignedUploadUrl, objectExists, deleteObject } from "../../integrations/storage/r2.client";
import { enqueueMediaProcessing } from "../../jobs/queues/media-processing.queue";
import * as entitlementService from "../entitlements/entitlement.service";
import * as mediaRepository from "./media.repository";
import { IMAGE_MIME_TYPES, VIDEO_MIME_TYPES } from "./media.schema";
import type { CreateUploadRequestInput, UpdateMediaInput } from "./media.types";

function maxSizeBytesFor(mimeType: string): number {
  if (VIDEO_MIME_TYPES.includes(mimeType)) {
    return env.MEDIA_MAX_VIDEO_SIZE_MB * 1024 * 1024;
  }
  return env.MEDIA_MAX_IMAGE_SIZE_MB * 1024 * 1024;
}

function extensionFor(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot);
}

export async function createUploadRequest(vendorId: string, input: CreateUploadRequestInput) {
  const isImage = IMAGE_MIME_TYPES.includes(input.mimeType);
  const isVideo = VIDEO_MIME_TYPES.includes(input.mimeType);

  if (!isImage && !isVideo) {
    throw new ValidationError(`Unsupported file type: ${input.mimeType}`);
  }

  if (input.mediaType === "VIDEO" && !isVideo) {
    throw new ValidationError("mediaType VIDEO requires a video mimeType");
  }
  if (input.mediaType !== "VIDEO" && !isImage) {
    throw new ValidationError(`mediaType ${input.mediaType} requires an image mimeType`);
  }

  const maxSize = maxSizeBytesFor(input.mimeType);
  if (input.fileSize > maxSize) {
    throw new ValidationError(
      `File exceeds the maximum allowed size of ${Math.round(maxSize / (1024 * 1024))}MB`,
    );
  }

  // Portfolio/video capacity is plan-derived, not a global env constant —
  // architecture.md §26 (Coding Rule 8): entitlements over hardcoded checks.
  // canVendorUpload throws (403) if the vendor is already at their current
  // plan's limit for this media type.
  await entitlementService.canVendorUpload(vendorId, input.mediaType);

  const objectKey = `vendors/${vendorId}/${randomUUID()}${extensionFor(input.filename)}`;

  // Get the signed URL before creating the DB row — if storage isn't configured
  // or the signing call fails, we must not leave an orphaned PENDING media row
  // with no way to ever receive an upload URL.
  const uploadUrl = await getSignedUploadUrl(objectKey, input.mimeType);

  const media = await mediaRepository.createMedia({
    vendorId,
    albumId: input.albumId,
    mediaType: input.mediaType,
    originalObjectKey: objectKey,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
  });

  return { mediaId: media.id, uploadUrl, objectKey };
}

export async function confirmUpload(vendorId: string, mediaId: string) {
  const media = await mediaRepository.findMediaById(mediaId);
  if (!media || media.vendorId !== vendorId) {
    throw new NotFoundError("Media not found");
  }
  if (media.status !== "PENDING") {
    throw new ConflictError(`Cannot confirm media with status ${media.status}`);
  }

  const exists = await objectExists(media.originalObjectKey);
  if (!exists) {
    throw new ValidationError("Upload not found in storage yet — has the browser upload completed?");
  }

  await mediaRepository.updateMediaStatus(mediaId, "PROCESSING");
  await enqueueMediaProcessing(mediaId);

  return mediaRepository.findMediaById(mediaId);
}

export function listOwnMedia(vendorId: string) {
  return mediaRepository.listVendorMedia(vendorId);
}

export async function updateMedia(vendorId: string, mediaId: string, input: UpdateMediaInput) {
  const media = await mediaRepository.findMediaById(mediaId);
  if (!media || media.vendorId !== vendorId) {
    throw new NotFoundError("Media not found");
  }
  return mediaRepository.updateMedia(mediaId, input);
}

export async function deleteMedia(vendorId: string, mediaId: string): Promise<void> {
  const media = await mediaRepository.findMediaById(mediaId);
  if (!media || media.vendorId !== vendorId) {
    throw new NotFoundError("Media not found");
  }

  await Promise.all(
    [media.originalObjectKey, media.optimizedObjectKey, media.thumbnailObjectKey]
      .filter((key): key is string => !!key)
      .map((key) => deleteObject(key).catch(() => undefined)),
  );

  await mediaRepository.markDeleted(mediaId);
}

export async function moderateMedia(mediaId: string, moderationStatus: string) {
  const media = await mediaRepository.findMediaById(mediaId);
  if (!media) {
    throw new NotFoundError("Media not found");
  }
  return mediaRepository.setModerationStatus(mediaId, moderationStatus);
}

export function toPublicView(media: {
  id: string;
  mediaType: string;
  status: string;
  optimizedObjectKey: string | null;
  thumbnailObjectKey: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
}) {
  return {
    id: media.id,
    mediaType: media.mediaType,
    status: media.status,
    url: media.optimizedObjectKey ? getPublicUrl(media.optimizedObjectKey) : null,
    thumbnailUrl: media.thumbnailObjectKey ? getPublicUrl(media.thumbnailObjectKey) : null,
    altText: media.altText,
    width: media.width,
    height: media.height,
  };
}
