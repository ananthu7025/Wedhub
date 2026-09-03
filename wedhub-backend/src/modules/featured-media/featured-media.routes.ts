import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as featuredMediaController from "./featured-media.controller";
import { createFeaturedMediaSchema, updateFeaturedMediaSchema } from "./featured-media.schema";

export const featuredMediaRouter = Router();

featuredMediaRouter.get("/featured/homepage", asyncHandler(featuredMediaController.listFeatured));

export const featuredMediaAdminRouter = Router();
featuredMediaAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

featuredMediaAdminRouter.get("/", asyncHandler(featuredMediaController.listAll));
featuredMediaAdminRouter.post("/", validateBody(createFeaturedMediaSchema), asyncHandler(featuredMediaController.create));
featuredMediaAdminRouter.patch("/:id", validateBody(updateFeaturedMediaSchema), asyncHandler(featuredMediaController.update));
featuredMediaAdminRouter.delete("/:id", asyncHandler(featuredMediaController.remove));
