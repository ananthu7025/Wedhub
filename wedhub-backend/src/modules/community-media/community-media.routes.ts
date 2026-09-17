import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as communityMediaController from "./community-media.controller";
import { createCommunityPhotoUploadRequestSchema } from "./community-media.schema";

export const communityMediaRouter = Router();

communityMediaRouter.use(authenticateMiddleware, authorize(Role.END_USER));

communityMediaRouter.post(
  "/upload-requests",
  validateBody(createCommunityPhotoUploadRequestSchema),
  asyncHandler(communityMediaController.createUploadRequest),
);

communityMediaRouter.post("/:id/confirm", asyncHandler(communityMediaController.confirmUpload));
