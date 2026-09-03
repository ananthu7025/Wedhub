import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as weddingWebsiteMediaService from "./wedding-website-media.service";
import type { CreateWeddingWebsiteUploadRequestBody } from "./wedding-website-media.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function createUploadRequest(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreateWeddingWebsiteUploadRequestBody;
  const result = await weddingWebsiteMediaService.createUploadRequest(userId, body);
  res.status(201).json(successResponse(result));
}

export async function confirmUpload(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const media = await weddingWebsiteMediaService.confirmUpload(userId, req.params.id as string);
  res.json(successResponse(media));
}

export async function deletePhoto(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  await weddingWebsiteMediaService.deletePhoto(userId, req.params.id as string);
  res.json(successResponse({ deleted: true }));
}
