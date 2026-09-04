import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as adminMediaService from "./admin-media.service";
import type {
  CreateAdminImageUploadRequestBody,
  CreateAdminVendorUploadRequestBody,
  CreateBlogCoverImageUploadRequestBody,
  CreatePopularSearchImageUploadRequestBody,
} from "./admin-media.schema";

export async function createUploadRequest(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateAdminImageUploadRequestBody;
  const result = await adminMediaService.createUploadRequest(body);
  res.status(201).json(successResponse(result));
}

export async function confirmUpload(req: Request, res: Response): Promise<void> {
  const media = await adminMediaService.confirmUpload(req.params.id as string);
  res.json(successResponse(media));
}

export async function createVendorUploadRequest(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateAdminVendorUploadRequestBody;
  const result = await adminMediaService.createVendorUploadRequest(body);
  res.status(201).json(successResponse(result));
}

export async function confirmVendorUpload(req: Request, res: Response): Promise<void> {
  const media = await adminMediaService.confirmVendorUpload(req.params.id as string);
  res.json(successResponse(media));
}

export async function createPopularSearchImageUploadRequest(req: Request, res: Response): Promise<void> {
  const body = req.body as CreatePopularSearchImageUploadRequestBody;
  const result = await adminMediaService.createPopularSearchImageUploadRequest(body);
  res.status(201).json(successResponse(result));
}

export async function confirmPopularSearchImageUpload(req: Request, res: Response): Promise<void> {
  const media = await adminMediaService.confirmPopularSearchImageUpload(req.params.id as string);
  res.json(successResponse(media));
}

export async function createBlogCoverImageUploadRequest(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateBlogCoverImageUploadRequestBody;
  const result = await adminMediaService.createBlogCoverImageUploadRequest(body);
  res.status(201).json(successResponse(result));
}

export async function confirmBlogCoverImageUpload(req: Request, res: Response): Promise<void> {
  const media = await adminMediaService.confirmBlogCoverImageUpload(req.params.id as string);
  res.json(successResponse(media));
}
