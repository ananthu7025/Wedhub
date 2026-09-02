import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import * as reviewMediaController from "./review-media.controller";
import { createReviewPhotoUploadRequestSchema } from "./review-media.schema";

export const reviewMediaRouter = Router();

reviewMediaRouter.use(authenticateMiddleware);

reviewMediaRouter.post(
  "/upload-requests",
  validateBody(createReviewPhotoUploadRequestSchema),
  asyncHandler(reviewMediaController.createUploadRequest),
);

reviewMediaRouter.post("/:id/confirm", asyncHandler(reviewMediaController.confirmUpload));
