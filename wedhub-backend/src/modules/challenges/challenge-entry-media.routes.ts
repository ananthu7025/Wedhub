import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import * as challengeEntryController from "./challenge-entry.controller";
import { createEntryPhotoUploadRequestSchema } from "./challenge.schema";

export const challengeEntryMediaRouter = Router();

challengeEntryMediaRouter.use(authenticateMiddleware);

challengeEntryMediaRouter.post(
  "/upload-requests",
  validateBody(createEntryPhotoUploadRequestSchema),
  asyncHandler(challengeEntryController.createUploadRequest),
);
challengeEntryMediaRouter.post("/:id/confirm", asyncHandler(challengeEntryController.confirmUpload));
