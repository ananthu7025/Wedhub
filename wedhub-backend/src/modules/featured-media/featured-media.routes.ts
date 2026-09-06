import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as featuredMediaController from "./featured-media.controller";
import {
  createFeaturedMediaSchema,
  createGalleryCategorySchema,
  listFeaturedQuerySchema,
  updateFeaturedMediaSchema,
  updateGalleryCategorySchema,
} from "./featured-media.schema";

export const featuredMediaRouter = Router();

featuredMediaRouter.get(
  "/featured/homepage",
  validateQuery(listFeaturedQuerySchema),
  asyncHandler(featuredMediaController.listFeatured),
);
featuredMediaRouter.get("/categories", asyncHandler(featuredMediaController.listGalleryCategories));

export const featuredMediaAdminRouter = Router();
featuredMediaAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

featuredMediaAdminRouter.get("/", asyncHandler(featuredMediaController.listAll));
featuredMediaAdminRouter.post("/", validateBody(createFeaturedMediaSchema), asyncHandler(featuredMediaController.create));
featuredMediaAdminRouter.patch("/:id", validateBody(updateFeaturedMediaSchema), asyncHandler(featuredMediaController.update));
featuredMediaAdminRouter.delete("/:id", asyncHandler(featuredMediaController.remove));

// Separate router (mounted at /admin/gallery-categories in routes/index.ts)
// rather than nested under featuredMediaAdminRouter's /admin/featured-media
// path, since GalleryCategory is its own resource, not a FeaturedMedia sub-route.
export const galleryCategoriesAdminRouter = Router();
galleryCategoriesAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

galleryCategoriesAdminRouter.get("/", asyncHandler(featuredMediaController.listAllGalleryCategories));
galleryCategoriesAdminRouter.post(
  "/",
  validateBody(createGalleryCategorySchema),
  asyncHandler(featuredMediaController.createGalleryCategory),
);
galleryCategoriesAdminRouter.patch(
  "/:id",
  validateBody(updateGalleryCategorySchema),
  asyncHandler(featuredMediaController.updateGalleryCategory),
);
galleryCategoriesAdminRouter.delete("/:id", asyncHandler(featuredMediaController.deleteGalleryCategory));
