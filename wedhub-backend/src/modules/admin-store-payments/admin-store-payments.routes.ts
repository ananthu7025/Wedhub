import { Router } from "express";
import { Role } from "../../common/enums/roles.enum";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { asyncHandler } from "../../common/utils/async-handler.util";

import * as controller from "./admin-store-payments.controller";

export const adminStorePaymentsRouter = Router();

adminStorePaymentsRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

adminStorePaymentsRouter.get("/overview", asyncHandler(controller.getOverview));
adminStorePaymentsRouter.get("/accounts", asyncHandler(controller.listVendorAccounts));
adminStorePaymentsRouter.get("/orders", asyncHandler(controller.listOrders));
adminStorePaymentsRouter.post("/orders/:id/reconcile", asyncHandler(controller.reconcileOrder));
adminStorePaymentsRouter.post("/cleanup", asyncHandler(controller.triggerCleanup));

