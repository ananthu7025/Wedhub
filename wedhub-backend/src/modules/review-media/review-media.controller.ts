import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as reviewMediaService from "./review-media.service";
import type { CreateReviewPhotoUploadRequestBody } from "./review-media.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function createUploadRequest(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreateReviewPhotoUploadRequestBody;
  const result = await reviewMediaService.createUploadRequest(userId, body);
  res.status(201).json(successResponse(result));
}

export async function confirmUpload(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const media = await reviewMediaService.confirmUpload(userId, req.params.id as string);
  res.json(successResponse(media));
}
