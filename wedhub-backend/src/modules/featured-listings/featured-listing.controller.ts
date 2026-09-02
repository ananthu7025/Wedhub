import type { Request, Response } from "express";
import { paginatedResponse, successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as featuredListingService from "./featured-listing.service";
import type {
  CreateFeaturedListingBody,
  ListFeaturedListingsAdminQuery,
  ListFeaturedListingsQuery,
  UpdateFeaturedListingBody,
} from "./featured-listing.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function createFeaturedListing(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreateFeaturedListingBody;
  const listing = await featuredListingService.createFeaturedListing(userId, {
    vendorId: body.vendorId,
    placementType: body.placementType,
    categoryId: body.categoryId,
    cityId: body.cityId,
    priority: body.priority,
    price: body.price,
    currency: body.currency,
    startDate: body.startDate,
    endDate: body.endDate,
    paymentId: body.paymentId,
  });
  res.status(201).json(successResponse(listing));
}

export async function updateFeaturedListing(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateFeaturedListingBody;
  const listing = await featuredListingService.updateFeaturedListing(req.params.id as string, {
    priority: body.priority,
    price: body.price,
    startDate: body.startDate,
    endDate: body.endDate,
    status: body.status,
    paymentId: body.paymentId,
  });
  res.json(successResponse(listing));
}

export async function cancelFeaturedListing(req: Request, res: Response): Promise<void> {
  const listing = await featuredListingService.cancelFeaturedListing(req.params.id as string);
  res.json(successResponse(listing));
}

export async function listFeaturedListingsAdmin(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListFeaturedListingsAdminQuery;
  const [listings, total] = await featuredListingService.listFeaturedListingsAdmin({
    status: query.status,
    vendorId: query.vendorId,
    page: query.page,
    limit: query.limit,
  });
  res.json(
    paginatedResponse(listings, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}

export async function listActiveFeaturedListings(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListFeaturedListingsQuery;
  const [listings, total] = await featuredListingService.listActiveFeaturedListings({
    placementType: query.placementType,
    categoryId: query.categoryId,
    cityId: query.cityId,
    page: query.page,
    limit: query.limit,
  });
  res.json(
    paginatedResponse(listings, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}
