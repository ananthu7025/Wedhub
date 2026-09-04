import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as popularSearchCardsService from "./popular-search-cards.service";
import type { CreatePopularSearchCardBody, UpdatePopularSearchCardBody } from "./popular-search-cards.schema";

// Public — backs the homepage's "Popular Searches" section with real,
// admin-curated cards.
export async function listFeatured(_req: Request, res: Response): Promise<void> {
  const cards = await popularSearchCardsService.listFeatured();
  res.json(successResponse(cards));
}

export async function listAll(_req: Request, res: Response): Promise<void> {
  const cards = await popularSearchCardsService.listAllForAdmin();
  res.json(successResponse(cards));
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = req.body as CreatePopularSearchCardBody;
  const card = await popularSearchCardsService.createCard(body);
  res.status(201).json(successResponse(card));
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdatePopularSearchCardBody;
  const card = await popularSearchCardsService.updateCard(req.params.id as string, body);
  res.json(successResponse(card));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await popularSearchCardsService.deleteCard(req.params.id as string);
  res.json(successResponse({ deleted: true }));
}
