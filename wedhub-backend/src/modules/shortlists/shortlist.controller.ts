import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as shortlistService from "./shortlist.service";
import type { AddItemBody, CreateShortlistBody, UpdateShortlistBody } from "./shortlist.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function listShortlists(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  // Ensures the default Favorites shortlist exists before listing, so a
  // brand-new user sees it immediately rather than only after their first add.
  await shortlistService.getOrCreateDefaultShortlist(userId);
  const shortlists = await shortlistService.listOwnShortlists(userId);
  res.json(successResponse(shortlists));
}

export async function createShortlist(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreateShortlistBody;
  const shortlist = await shortlistService.createShortlist(userId, body.name);
  res.status(201).json(successResponse(shortlist));
}

export async function renameShortlist(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as UpdateShortlistBody;
  const shortlist = await shortlistService.renameShortlist(userId, req.params.id as string, body.name);
  res.json(successResponse(shortlist));
}

export async function deleteShortlist(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  await shortlistService.deleteShortlist(userId, req.params.id as string);
  res.json(successResponse({ deleted: true }));
}

export async function addItem(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as AddItemBody;
  await shortlistService.addItem(userId, req.params.id as string, body.vendorId, body.note);
  res.status(201).json(successResponse({ added: true }));
}

export async function removeItem(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  await shortlistService.removeItem(userId, req.params.id as string, req.params.vendorId as string);
  res.json(successResponse({ removed: true }));
}

export async function enableSharing(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const shortlist = await shortlistService.enableSharing(userId, req.params.id as string);
  res.json(successResponse({ shareToken: shortlist.shareToken, shareEnabled: shortlist.shareEnabled }));
}

export async function disableSharing(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  await shortlistService.disableSharing(userId, req.params.id as string);
  res.json(successResponse({ shareEnabled: false }));
}

// Convenience one-click favorite toggle: resolves to the caller's default
// Favorites shortlist so the frontend never needs to know its ID.
export async function addFavorite(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as AddItemBody;
  const favorites = await shortlistService.getOrCreateDefaultShortlist(userId);
  await shortlistService.addItem(userId, favorites.id, body.vendorId, body.note);
  res.status(201).json(successResponse({ added: true }));
}

export async function removeFavorite(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const favorites = await shortlistService.getOrCreateDefaultShortlist(userId);
  await shortlistService.removeItem(userId, favorites.id, req.params.vendorId as string);
  res.json(successResponse({ removed: true }));
}
