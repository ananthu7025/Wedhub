import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as seoService from "./seo.service";
import type { CreateSeoOverrideBody, GetSeoPageQuery, ListSeoOverridesQuery, UpdateSeoOverrideBody } from "./seo.schema";

export async function getSeoPage(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as GetSeoPageQuery;
  const page = await seoService.getSeoPage(query.categoryId, query.cityId);
  res.json(successResponse(page));
}

// Backs the frontend's sitemap.ts — the full list of indexable
// Category/City/Category+City combinations, so the sitemap only ever
// advertises real, non-thin pages.
export async function listCombinations(_req: Request, res: Response): Promise<void> {
  const combinations = await seoService.listIndexableCombinations();
  res.json(successResponse(combinations));
}

export async function listOverrides(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListSeoOverridesQuery;
  const overrides = await seoService.listOverrides(query.pageType);
  res.json(successResponse(overrides));
}

export async function createOverride(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateSeoOverrideBody;
  const override = await seoService.createOverride(body);
  res.status(201).json(successResponse(override));
}

export async function updateOverride(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateSeoOverrideBody;
  const override = await seoService.updateOverride(req.params.id as string, body);
  res.json(successResponse(override));
}

export async function deleteOverride(req: Request, res: Response): Promise<void> {
  await seoService.deleteOverride(req.params.id as string);
  res.json(successResponse({ deleted: true }));
}
