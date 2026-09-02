import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as planController from "./plan.controller";
import { createPlanSchema, updatePlanSchema } from "./plan.schema";

// Public — a vendor must see plan pricing before upgrading, no auth required.
export const planRouter = Router();
planRouter.get("/", asyncHandler(planController.listPlans));

export const planAdminRouter = Router();
planAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));
planAdminRouter.get("/", asyncHandler(planController.listPlansAdmin));
planAdminRouter.post("/", validateBody(createPlanSchema), asyncHandler(planController.createPlan));
planAdminRouter.patch("/:id", validateBody(updatePlanSchema), asyncHandler(planController.updatePlan));
