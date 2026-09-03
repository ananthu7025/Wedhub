import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as seoController from "./seo.controller";
import { createSeoOverrideSchema, getSeoPageQuerySchema, listSeoOverridesQuerySchema, updateSeoOverrideSchema } from "./seo.schema";

export const seoRouter = Router();

seoRouter.get("/page", validateQuery(getSeoPageQuerySchema), asyncHandler(seoController.getSeoPage));
seoRouter.get("/combinations", asyncHandler(seoController.listCombinations));

export const seoAdminRouter = Router();
seoAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

seoAdminRouter.get("/", validateQuery(listSeoOverridesQuerySchema), asyncHandler(seoController.listOverrides));
seoAdminRouter.post("/", validateBody(createSeoOverrideSchema), asyncHandler(seoController.createOverride));
seoAdminRouter.patch("/:id", validateBody(updateSeoOverrideSchema), asyncHandler(seoController.updateOverride));
seoAdminRouter.delete("/:id", asyncHandler(seoController.deleteOverride));
