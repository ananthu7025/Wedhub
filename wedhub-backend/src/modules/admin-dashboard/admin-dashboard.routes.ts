import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as adminDashboardController from "./admin-dashboard.controller";

export const adminDashboardRouter = Router();
adminDashboardRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

adminDashboardRouter.get("/", asyncHandler(adminDashboardController.getDashboard));
