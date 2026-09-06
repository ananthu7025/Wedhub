import type { Request, Response } from "express";
import { paginatedResponse, successResponse } from "../../common/utils/api-response.util";
import * as featuredMediaService from "./featured-media.service";
import type {
  CreateFeaturedMediaBody,
  CreateGalleryCategoryBody,
  ListFeaturedQuery,
  UpdateFeaturedMediaBody,
  UpdateGalleryCategoryBody,
} from "./featured-media.schema";

// Public — backs both the homepage's "Gallery Inspiration" teaser and the
// standalone /gallery browse page with real, admin-curated media.
export async function listFeatured(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListFeaturedQuery;
  const { items, total } = await featuredMediaService.listFeatured(query);
  res.json(
    paginatedResponse(items, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}

export async function listAll(_req: Request, res: Response): Promise<void> {
  const items = await featuredMediaService.listAllForAdmin();
  res.json(successResponse(items));
}

// Public — lets the admin CMS's category picker and the Home page both
// read the same reference list.
export async function listGalleryCategories(_req: Request, res: Response): Promise<void> {
  const categories = await featuredMediaService.listGalleryCategories();
  res.json(successResponse(categories));
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

export async function listAllGalleryCategories(_req: Request, res: Response): Promise<void> {
  const categories = await featuredMediaService.listAllGalleryCategoriesForAdmin();
  res.json(successResponse(categories));
}

export async function createGalleryCategory(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateGalleryCategoryBody;
  const category = await featuredMediaService.createGalleryCategory(body);
  res.status(201).json(successResponse(category));
}

export async function updateGalleryCategory(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateGalleryCategoryBody;
  const category = await featuredMediaService.updateGalleryCategory(req.params.id as string, body);
  res.json(successResponse(category));
}

export async function deleteGalleryCategory(req: Request, res: Response): Promise<void> {
  await featuredMediaService.deleteGalleryCategory(req.params.id as string);
  res.json(successResponse({ deleted: true }));
}
