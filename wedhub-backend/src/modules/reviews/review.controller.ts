import type { Request, Response } from "express";
import { paginatedResponse, successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as reviewService from "./review.service";
import type {
  CreateReviewBody,
  ListMyReviewsQuery,
  ListReviewsAdminQuery,
  ListVendorReviewsQuery,
  ModerateReviewBody,
  ReportReviewBody,
  RespondToReviewBody,
} from "./review.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function createReview(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreateReviewBody;
  const review = await reviewService.createReview(userId, {
    vendorId: body.vendorId,
    serviceId: body.serviceId,
    rating: body.rating,
    title: body.title,
    content: body.content,
    eventDate: body.eventDate,
    mediaIds: body.mediaIds,
  });
  res.status(201).json(successResponse(review));
}

export async function listVendorReviews(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListVendorReviewsQuery;
  const [reviews, total] = await reviewService.listVendorReviews(
    req.params.vendorId as string,
    query.page,
    query.limit,
  );
  res.json(
    paginatedResponse(reviews, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}

export async function listMyReviews(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const query = req.validatedQuery as ListMyReviewsQuery;
  const [reviews, total] = await reviewService.listMyReviews(userId, query.page, query.limit);
  res.json(
    paginatedResponse(reviews, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}

export async function respondToReview(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as RespondToReviewBody;
  const review = await reviewService.respondToReview(userId, req.params.id as string, body.vendorResponse);
  res.json(successResponse(review));
}

export async function reportReview(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as ReportReviewBody;
  const report = await reviewService.reportReview(userId, req.params.id as string, body.reason);
  res.status(201).json(successResponse(report));
}

export async function listReviewsAdmin(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListReviewsAdminQuery;
  const [reviews, total] = await reviewService.listReviewsAdmin({
    status: query.status,
    page: query.page,
    limit: query.limit,
  });
  res.json(
    paginatedResponse(reviews, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}

export async function getReviewAdmin(req: Request, res: Response): Promise<void> {
  const review = await reviewService.getReviewAdmin(req.params.id as string);
  res.json(successResponse(review));
}

export async function moderateReview(req: Request, res: Response): Promise<void> {
  const body = req.body as ModerateReviewBody;
  const review = await reviewService.moderateReview(req.params.id as string, body.status);
  res.json(successResponse(review));
}
