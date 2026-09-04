import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as blogController from "./blog.controller";
import { createBlogPostSchema, listBlogPostsQuerySchema, updateBlogPostSchema } from "./blog.schema";

export const blogRouter = Router();

// Mounted before "/:slug" so it isn't shadowed by the slug catch-all.
blogRouter.get("/featured/homepage", asyncHandler(blogController.listFeatured));
blogRouter.get("/", validateQuery(listBlogPostsQuerySchema), asyncHandler(blogController.listPublished));
blogRouter.get("/:slug", asyncHandler(blogController.getBySlug));

export const blogAdminRouter = Router();
blogAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

blogAdminRouter.get("/", asyncHandler(blogController.listAll));
blogAdminRouter.post("/", validateBody(createBlogPostSchema), asyncHandler(blogController.create));
blogAdminRouter.patch("/:id", validateBody(updateBlogPostSchema), asyncHandler(blogController.update));
blogAdminRouter.delete("/:id", asyncHandler(blogController.remove));
