import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as weddingStoriesController from "./wedding-stories.controller";
import { createWeddingStorySchema, updateWeddingStorySchema } from "./wedding-stories.schema";

export const weddingStoriesRouter = Router();

weddingStoriesRouter.get("/featured/homepage", asyncHandler(weddingStoriesController.listFeaturedStories));

export const weddingStoriesAdminRouter = Router();
weddingStoriesAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

weddingStoriesAdminRouter.get("/", asyncHandler(weddingStoriesController.listAllStories));
weddingStoriesAdminRouter.post(
  "/",
  validateBody(createWeddingStorySchema),
  asyncHandler(weddingStoriesController.createStory),
);
weddingStoriesAdminRouter.patch(
  "/:id",
  validateBody(updateWeddingStorySchema),
  asyncHandler(weddingStoriesController.updateStory),
);
weddingStoriesAdminRouter.delete("/:id", asyncHandler(weddingStoriesController.deleteStory));
