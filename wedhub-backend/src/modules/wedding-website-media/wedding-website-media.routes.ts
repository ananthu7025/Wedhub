import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import * as weddingWebsiteMediaController from "./wedding-website-media.controller";
import { createWeddingWebsiteUploadRequestSchema } from "./wedding-website-media.schema";

export const weddingWebsiteMediaRouter = Router();

weddingWebsiteMediaRouter.use(authenticateMiddleware);

weddingWebsiteMediaRouter.post(
  "/upload-requests",
  validateBody(createWeddingWebsiteUploadRequestSchema),
  asyncHandler(weddingWebsiteMediaController.createUploadRequest),
);

weddingWebsiteMediaRouter.post("/:id/confirm", asyncHandler(weddingWebsiteMediaController.confirmUpload));
weddingWebsiteMediaRouter.delete("/:id", asyncHandler(weddingWebsiteMediaController.deletePhoto));
