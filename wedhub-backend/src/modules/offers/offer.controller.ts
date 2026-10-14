import type { Request, Response } from "express";
import { paginatedResponse, successResponse } from "../../common/utils/api-response.util";
import * as offerService from "./offer.service";
import type { CreateOfferBody, ListPublicOffersQuery, UpdateOfferBody } from "./offer.types";

export async function listMyOffers(req: Request, res: Response): Promise<void> {
  const offers = await offerService.listMyOffers(req.user!.id);
  res.json(successResponse(offers));
}

export async function getMyOffer(req: Request, res: Response): Promise<void> {
  const offer = await offerService.getMyOffer(req.user!.id, req.params.id as string);
  res.json(successResponse(offer));
}

export async function createOffer(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateOfferBody;
  const offer = await offerService.createOffer(req.user!.id, input);
  res.status(201).json(successResponse(offer));
}

export async function updateOffer(req: Request, res: Response): Promise<void> {
  const input = req.body as UpdateOfferBody;
  const offer = await offerService.updateOffer(req.user!.id, req.params.id as string, input);
  res.json(successResponse(offer));
}

export async function deleteOffer(req: Request, res: Response): Promise<void> {
  const result = await offerService.deleteOffer(req.user!.id, req.params.id as string);
  res.json(successResponse(result));
}

export async function listPublicOffers(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListPublicOffersQuery;
  const [offers, total] = await offerService.listPublicOffers({
    categoryId: query.categoryId,
    priceMin: query.priceMin,
    priceMax: query.priceMax,
    sort: query.sort,
    page: query.page,
    limit: query.limit,
  });
  res.json(
    paginatedResponse(offers, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}
