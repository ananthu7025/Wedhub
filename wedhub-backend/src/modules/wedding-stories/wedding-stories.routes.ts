import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as weddingStoriesController from "./wedding-stories.controller";
import {
  createWeddingStorySchema,
  respondToCollaborationSchema,
  submitWeddingStorySchema,
  updateWeddingStorySchema,
  updateWeddingStoryStatusSchema,
} from "./wedding-stories.schema";

export const weddingStoriesRouter = Router();

weddingStoriesRouter.get("/", asyncHandler(weddingStoriesController.listPublicStories));
weddingStoriesRouter.get("/featured/homepage", asyncHandler(weddingStoriesController.listFeaturedStories));
weddingStoriesRouter.get("/:id", asyncHandler(weddingStoriesController.getPublicStory));

// Item 10/11 — mounted at /api/v1/vendors/me/wedding-stories.
export const weddingStorySelfRouter = Router();
weddingStorySelfRouter.use(authenticateMiddleware);

weddingStorySelfRouter.get("/", asyncHandler(weddingStoriesController.listMySubmittedStories));
weddingStorySelfRouter.post(
  "/",
  validateBody(submitWeddingStorySchema),
  asyncHandler(weddingStoriesController.submitStory),
);
weddingStorySelfRouter.get(
  "/awaiting-my-confirmation",
  asyncHandler(weddingStoriesController.listStoriesAwaitingMyConfirmation),
);
weddingStorySelfRouter.post(
  "/:id/respond",
  validateBody(respondToCollaborationSchema),
  asyncHandler(weddingStoriesController.respondToCollaboration),
);

export const weddingStoriesAdminRouter = Router();
weddingStoriesAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

weddingStoriesAdminRouter.get("/", asyncHandler(weddingStoriesController.listAllStories));
weddingStoriesAdminRouter.get("/pending", asyncHandler(weddingStoriesController.listPendingStories));
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
weddingStoriesAdminRouter.patch(
  "/:id/status",
  validateBody(updateWeddingStoryStatusSchema),
  asyncHandler(weddingStoriesController.updateStoryStatus),
);
weddingStoriesAdminRouter.delete("/:id", asyncHandler(weddingStoriesController.deleteStory));
