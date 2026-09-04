import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as weddingStoriesService from "./wedding-stories.service";
import type { CreateWeddingStoryBody, UpdateWeddingStoryBody } from "./wedding-stories.schema";

// Public — backs the homepage's "Real Wedding Stories" section with real,
// admin-curated stories over real vendor albums.
export async function listFeaturedStories(_req: Request, res: Response): Promise<void> {
  const stories = await weddingStoriesService.listFeaturedStories();
  res.json(successResponse(stories));
}

export async function listPublicStories(req: Request, res: Response): Promise<void> {
  const result = await weddingStoriesService.listPublicStories({
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    location: req.query.location as string | undefined,
    tag: req.query.tag as string | undefined,
    search: req.query.search as string | undefined,
    sort: req.query.sort as string | undefined,
  });
  res.json(successResponse(result));
}

export async function getPublicStory(req: Request, res: Response): Promise<void> {
  const story = await weddingStoriesService.getPublicStoryById(req.params.id as string);
  res.json(successResponse(story));
}

export async function listAllStories(_req: Request, res: Response): Promise<void> {
  const stories = await weddingStoriesService.listAllStoriesForAdmin();
  res.json(successResponse(stories));
}

export async function createStory(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateWeddingStoryBody;
  const story = await weddingStoriesService.createStory(body);
  res.status(201).json(successResponse(story));
}

export async function updateStory(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateWeddingStoryBody;
  const story = await weddingStoriesService.updateStory(req.params.id as string, body);
  res.json(successResponse(story));
}

export async function deleteStory(req: Request, res: Response): Promise<void> {
  await weddingStoriesService.deleteStory(req.params.id as string);
  res.json(successResponse({ deleted: true }));
}
