import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as albumController from "./album.controller";
import { createAlbumForVendorSchema, createAlbumSchema, updateAlbumSchema } from "./album.schema";

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

// Mounted at /api/v1/admin/albums
export const albumAdminRouter = Router();
albumAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));
albumAdminRouter.get("/", asyncHandler(albumController.listAllPublicAlbumsAdmin));
albumAdminRouter.post("/", validateBody(createAlbumForVendorSchema), asyncHandler(albumController.createAlbumForVendor));
albumAdminRouter.patch("/:id", validateBody(updateAlbumSchema), asyncHandler(albumController.updateAlbumAsAdmin));
