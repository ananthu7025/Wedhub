import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as subscriptionController from "./subscription.controller";
import {
  cancelSubscriptionSchema,
  createCouponSchema,
  initiateUpgradeSchema,
  refundSchema,
} from "./subscription.schema";

export const subscriptionRouter = Router();
subscriptionRouter.use(authenticateMiddleware);

subscriptionRouter.get("/me", asyncHandler(subscriptionController.getMySubscription));
subscriptionRouter.post(
  "/me/upgrade",
  validateBody(initiateUpgradeSchema),
  asyncHandler(subscriptionController.initiateUpgrade),
);
subscriptionRouter.post(
  "/me/cancel",
  validateBody(cancelSubscriptionSchema),
  asyncHandler(subscriptionController.cancelSubscription),
);
subscriptionRouter.post("/me/undo-cancel", asyncHandler(subscriptionController.undoCancellation));
subscriptionRouter.get("/me/invoices", asyncHandler(subscriptionController.listInvoices));
subscriptionRouter.get("/me/payments", asyncHandler(subscriptionController.listPayments));

export const subscriptionAdminRouter = Router();
subscriptionAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

subscriptionAdminRouter.post(
  "/refunds",
  validateBody(refundSchema),
  asyncHandler(subscriptionController.refundPaymentAdmin),
);
subscriptionAdminRouter.post(
  "/coupons",
  validateBody(createCouponSchema),
  asyncHandler(subscriptionController.createCouponAdmin),
);
