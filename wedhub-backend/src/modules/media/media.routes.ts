import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as mediaController from "./media.controller";
import { createUploadRequestSchema, moderateMediaSchema, updateMediaSchema } from "./media.schema";

export const mediaRouter = Router();

mediaRouter.use(authenticateMiddleware);

mediaRouter.post(
  "/upload-requests",
  validateBody(createUploadRequestSchema),
  asyncHandler(mediaController.createUploadRequest),
);

mediaRouter.post("/:id/confirm", asyncHandler(mediaController.confirmUpload));

mediaRouter.get("/me", asyncHandler(mediaController.listOwnMedia));

mediaRouter.patch("/:id", validateBody(updateMediaSchema), asyncHandler(mediaController.updateMedia));

mediaRouter.delete("/:id", asyncHandler(mediaController.deleteMedia));

export const mediaAdminRouter = Router();

mediaAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

mediaAdminRouter.get("/:id", asyncHandler(mediaController.adminGetMedia));

mediaAdminRouter.post(
  "/:id/moderate",
  validateBody(moderateMediaSchema),
  asyncHandler(mediaController.moderateMedia),
);
