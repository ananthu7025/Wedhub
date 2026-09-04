import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as popularSearchCardsController from "./popular-search-cards.controller";
import { createPopularSearchCardSchema, updatePopularSearchCardSchema } from "./popular-search-cards.schema";

export const popularSearchCardsRouter = Router();

popularSearchCardsRouter.get("/featured/homepage", asyncHandler(popularSearchCardsController.listFeatured));

export const popularSearchCardsAdminRouter = Router();
popularSearchCardsAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

popularSearchCardsAdminRouter.get("/", asyncHandler(popularSearchCardsController.listAll));
popularSearchCardsAdminRouter.post(
  "/",
  validateBody(createPopularSearchCardSchema),
  asyncHandler(popularSearchCardsController.create),
);
popularSearchCardsAdminRouter.patch(
  "/:id",
  validateBody(updatePopularSearchCardSchema),
  asyncHandler(popularSearchCardsController.update),
);
popularSearchCardsAdminRouter.delete("/:id", asyncHandler(popularSearchCardsController.remove));
