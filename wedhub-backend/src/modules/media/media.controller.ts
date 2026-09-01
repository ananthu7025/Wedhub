import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError, NotFoundError } from "../../common/errors";
import { getOwnedVendorOrThrow } from "../vendors/vendor.policy";
import * as mediaRepository from "./media.repository";
import * as mediaService from "./media.service";
import type { CreateUploadRequestBody, ModerateMediaBody, UpdateMediaBody } from "./media.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function createUploadRequest(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const body = req.body as CreateUploadRequestBody;
  const result = await mediaService.createUploadRequest(vendor.id, {
    mediaType: body.mediaType,
    albumId: body.albumId,
    filename: body.filename,
    mimeType: body.mimeType,
    fileSize: body.fileSize,
  });
  res.status(201).json(successResponse(result));
}

export async function confirmUpload(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const media = await mediaService.confirmUpload(vendor.id, req.params.id as string);
  res.json(successResponse(media));
}

export async function listOwnMedia(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const media = await mediaService.listOwnMedia(vendor.id);
  res.json(successResponse(media));
}

export async function updateMedia(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const body = req.body as UpdateMediaBody;
  const media = await mediaService.updateMedia(vendor.id, req.params.id as string, {
    altText: body.altText,
    sortOrder: body.sortOrder,
    albumId: body.albumId,
  });
  res.json(successResponse(media));
}

export async function deleteMedia(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  await mediaService.deleteMedia(vendor.id, req.params.id as string);
  res.json(successResponse({ deleted: true }));
}

export async function adminGetMedia(req: Request, res: Response): Promise<void> {
  const media = await mediaRepository.findMediaById(req.params.id as string);
  if (!media) {
    throw new NotFoundError("Media not found");
  }
  res.json(successResponse(media));
}

export async function moderateMedia(req: Request, res: Response): Promise<void> {
  const body = req.body as ModerateMediaBody;
  const media = await mediaService.moderateMedia(req.params.id as string, body.moderationStatus);
  res.json(successResponse(media));
}
