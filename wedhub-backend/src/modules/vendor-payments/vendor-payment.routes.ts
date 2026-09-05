import { Router } from "express";
import { Role } from "../../common/enums/roles.enum";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { validateBody } from "../../common/middleware/validate.middleware";
import { asyncHandler } from "../../common/utils/async-handler.util";

import * as controller from "./vendor-payment.controller";
import { onboardPaymentAccountSchema, refundStoreOrderSchema } from "./vendor-payment.schema";

export const vendorPaymentRouter = Router();

vendorPaymentRouter.use(authenticateMiddleware, authorize(Role.VENDOR));

vendorPaymentRouter.get("/me/payment-account", asyncHandler(controller.getPaymentAccount));
vendorPaymentRouter.post(
  "/me/payment-account/connect",
  validateBody(onboardPaymentAccountSchema),
  asyncHandler(controller.onboardPaymentAccount),
);
vendorPaymentRouter.post(
  "/me/payment-account/kyc-link",
  asyncHandler(controller.createKycLink),
);
vendorPaymentRouter.post(
  "/me/payment-account/sync",
  asyncHandler(controller.syncPaymentAccount),
);
vendorPaymentRouter.get("/me/payments/summary", asyncHandler(controller.getPaymentSummary));
vendorPaymentRouter.post(
  "/me/orders/:id/refund",
  validateBody(refundStoreOrderSchema),
  asyncHandler(controller.refundOrder),
);
