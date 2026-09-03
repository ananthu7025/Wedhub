import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as featuredMediaService from "./featured-media.service";
import type { CreateFeaturedMediaBody, UpdateFeaturedMediaBody } from "./featured-media.schema";

// Public — backs the homepage's "Gallery Inspiration" section with real,
// admin-curated vendor media.
export async function listFeatured(_req: Request, res: Response): Promise<void> {
  const items = await featuredMediaService.listFeatured();
  res.json(successResponse(items));
}

export async function listAll(_req: Request, res: Response): Promise<void> {
  const items = await featuredMediaService.listAllForAdmin();
  res.json(successResponse(items));
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateFeaturedMediaBody;
  const item = await featuredMediaService.createFeaturedMedia(body);
  res.status(201).json(successResponse(item));
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateFeaturedMediaBody;
  const item = await featuredMediaService.updateFeaturedMedia(req.params.id as string, body);
  res.json(successResponse(item));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await featuredMediaService.deleteFeaturedMedia(req.params.id as string);
  res.json(successResponse({ deleted: true }));
}
