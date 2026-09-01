import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import * as albumController from "./album.controller";
import { createAlbumSchema, updateAlbumSchema } from "./album.schema";

// Mounted at /api/v1/vendors/me/albums
export const albumSelfRouter = Router();

albumSelfRouter.use(authenticateMiddleware);

albumSelfRouter.post("/", validateBody(createAlbumSchema), asyncHandler(albumController.createAlbum));
albumSelfRouter.get("/", asyncHandler(albumController.listOwnAlbums));
albumSelfRouter.patch("/:id", validateBody(updateAlbumSchema), asyncHandler(albumController.updateAlbum));
albumSelfRouter.delete("/:id", asyncHandler(albumController.deleteAlbum));

// Mounted at /api/v1/vendors/:slug/albums (public)
export const albumPublicRouter = Router({ mergeParams: true });

albumPublicRouter.get("/", asyncHandler(albumController.listPublicAlbums));
