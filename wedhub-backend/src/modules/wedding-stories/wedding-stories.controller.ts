import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import { getOwnedVendorOrThrow } from "../vendors/vendor.policy";
import * as weddingStoriesService from "./wedding-stories.service";
import type {
  CreateWeddingStoryBody,
  RespondToCollaborationBody,
  SubmitWeddingStoryBody,
  UpdateWeddingStoryBody,
  UpdateWeddingStoryStatusBody,
} from "./wedding-stories.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

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

// Item 10/11 — vendor-facing endpoints below.
export async function submitStory(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const body = req.body as SubmitWeddingStoryBody;
  const story = await weddingStoriesService.submitStoryForVendor(vendor.id, body);
  res.status(201).json(successResponse(story));
}

export async function listMySubmittedStories(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const stories = await weddingStoriesService.listOwnSubmittedStories(vendor.id);
  res.json(successResponse(stories));
}

export async function listStoriesAwaitingMyConfirmation(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const stories = await weddingStoriesService.listStoriesAwaitingMyConfirmation(vendor.id);
  res.json(successResponse(stories));
}

export async function respondToCollaboration(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const body = req.body as RespondToCollaborationBody;
  const row = await weddingStoriesService.respondToCollaboration(vendor.id, req.params.id as string, body.decision);
  res.json(successResponse(row));
}

// Admin moderation queue.
export async function listPendingStories(_req: Request, res: Response): Promise<void> {
  const stories = await weddingStoriesService.listPendingStoriesForAdmin();
  res.json(successResponse(stories));
}

export async function updateStoryStatus(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateWeddingStoryStatusBody;
  const story = await weddingStoriesService.updateStoryStatus(req.params.id as string, body);
  res.json(successResponse(story));
}
