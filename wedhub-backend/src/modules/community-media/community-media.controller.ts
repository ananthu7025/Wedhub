import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as communityMediaService from "./community-media.service";
import type { CreateCommunityPhotoUploadRequestBody } from "./community-media.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function createUploadRequest(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreateCommunityPhotoUploadRequestBody;
  const result = await communityMediaService.createUploadRequest(userId, body);
  res.status(201).json(successResponse(result));
}

export async function confirmUpload(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const media = await communityMediaService.confirmUpload(userId, req.params.id as string);
  res.json(successResponse(media));
}
