import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as categoriesController from "./categories.controller";
import {
  createAttributeSchema,
  createCategorySchema,
  updateAttributeSchema,
  updateCategorySchema,
} from "./categories.schema";

export const categoriesRouter = Router();

categoriesRouter.get("/", asyncHandler(categoriesController.listCategories));
categoriesRouter.get("/:slug", asyncHandler(categoriesController.getCategory));

categoriesRouter.post(
  "/",
  authenticateMiddleware,
  authorize(Role.ADMIN),
  validateBody(createCategorySchema),
  asyncHandler(categoriesController.createCategory),
);

categoriesRouter.patch(
  "/:id",
  authenticateMiddleware,
  authorize(Role.ADMIN),
  validateBody(updateCategorySchema),
  asyncHandler(categoriesController.updateCategory),
);

categoriesRouter.post(
  "/:id/attributes",
  authenticateMiddleware,
  authorize(Role.ADMIN),
  validateBody(createAttributeSchema),
  asyncHandler(categoriesController.createAttribute),
);

categoriesRouter.patch(
  "/:id/attributes/:attributeId",
  authenticateMiddleware,
  authorize(Role.ADMIN),
  validateBody(updateAttributeSchema),
  asyncHandler(categoriesController.updateAttribute),
);

categoriesRouter.delete(
  "/:id/attributes/:attributeId",
  authenticateMiddleware,
  authorize(Role.ADMIN),
  asyncHandler(categoriesController.deleteAttribute),
);
