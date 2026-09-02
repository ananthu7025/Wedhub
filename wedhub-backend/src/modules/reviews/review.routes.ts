import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { reviewRateLimiter } from "../../common/middleware/rate-limit.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as reviewController from "./review.controller";
import {
  createReviewSchema,
  listReviewsAdminQuerySchema,
  listVendorReviewsQuerySchema,
  moderateReviewSchema,
  reportReviewSchema,
  respondToReviewSchema,
} from "./review.schema";

export const reviewRouter = Router();

reviewRouter.post(
  "/",
  authenticateMiddleware,
  reviewRateLimiter,
  validateBody(createReviewSchema),
  asyncHandler(reviewController.createReview),
);

reviewRouter.post(
  "/:id/respond",
  authenticateMiddleware,
  validateBody(respondToReviewSchema),
  asyncHandler(reviewController.respondToReview),
);

reviewRouter.post(
  "/:id/report",
  authenticateMiddleware,
  validateBody(reportReviewSchema),
  asyncHandler(reviewController.reportReview),
);

// Public — mounted at /api/v1/vendors/:vendorId/reviews
export const vendorReviewsPublicRouter = Router({ mergeParams: true });

vendorReviewsPublicRouter.get(
  "/",
  validateQuery(listVendorReviewsQuerySchema),
  asyncHandler(reviewController.listVendorReviews),
);

export const reviewAdminRouter = Router();

reviewAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

reviewAdminRouter.get(
  "/",
  validateQuery(listReviewsAdminQuerySchema),
  asyncHandler(reviewController.listReviewsAdmin),
);
reviewAdminRouter.get("/:id", asyncHandler(reviewController.getReviewAdmin));
reviewAdminRouter.patch(
  "/:id/status",
  validateBody(moderateReviewSchema),
  asyncHandler(reviewController.moderateReview),
);
