import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import * as shortlistController from "./shortlist.controller";
import { addItemSchema, createShortlistSchema, updateShortlistSchema } from "./shortlist.schema";

export const shortlistRouter = Router();

shortlistRouter.use(authenticateMiddleware);

// One-click favorite toggle — resolves to the caller's default shortlist.
shortlistRouter.post("/favorites/items", validateBody(addItemSchema), asyncHandler(shortlistController.addFavorite));
shortlistRouter.delete("/favorites/items/:vendorId", asyncHandler(shortlistController.removeFavorite));

shortlistRouter.get("/", asyncHandler(shortlistController.listShortlists));
shortlistRouter.post("/", validateBody(createShortlistSchema), asyncHandler(shortlistController.createShortlist));
shortlistRouter.patch(
  "/:id",
  validateBody(updateShortlistSchema),
  asyncHandler(shortlistController.renameShortlist),
);
shortlistRouter.delete("/:id", asyncHandler(shortlistController.deleteShortlist));

shortlistRouter.post("/:id/items", validateBody(addItemSchema), asyncHandler(shortlistController.addItem));
shortlistRouter.delete("/:id/items/:vendorId", asyncHandler(shortlistController.removeItem));

shortlistRouter.post("/:id/share", asyncHandler(shortlistController.enableSharing));
shortlistRouter.delete("/:id/share", asyncHandler(shortlistController.disableSharing));
