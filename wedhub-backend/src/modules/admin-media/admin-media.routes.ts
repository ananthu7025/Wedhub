import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as adminMediaController from "./admin-media.controller";
import { createAdminImageUploadRequestSchema } from "./admin-media.schema";

export const adminMediaRouter = Router();

adminMediaRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

adminMediaRouter.post(
  "/upload-requests",
  validateBody(createAdminImageUploadRequestSchema),
  asyncHandler(adminMediaController.createUploadRequest),
);

adminMediaRouter.post("/:id/confirm", asyncHandler(adminMediaController.confirmUpload));
