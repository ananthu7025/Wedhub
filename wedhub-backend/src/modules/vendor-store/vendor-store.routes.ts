import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import { storeOrderRateLimiter, storePaymentVerifyRateLimiter } from "../../common/middleware/rate-limit.middleware";
import * as controller from "./vendor-store.controller";
import * as paymentController from "../vendor-payments/vendor-payment.controller";
import {
  createStoreItemSchema,
  publicCreateOrderSchema,
  updateOrderStatusSchema,
  updateStoreItemSchema,
  upsertStoreProfileSchema,
} from "./vendor-store.schema";
import {
  onboardPaymentAccountSchema,
  refundStoreOrderSchema,
  verifyStoreOrderPaymentSchema,
} from "../vendor-payments/vendor-payment.schema";

export const vendorStoreRouter = Router();
export const publicStoreRouter = Router();

// ---------------------------------------------------------------------------
// Vendor Authenticated Endpoints: /api/v1/vendor-store/me/*
// ---------------------------------------------------------------------------
vendorStoreRouter.use(authenticateMiddleware, authorize(Role.VENDOR));

vendorStoreRouter.get("/me", asyncHandler(controller.getStoreProfile));
vendorStoreRouter.post("/me", validateBody(upsertStoreProfileSchema), asyncHandler(controller.updateStoreProfile));

vendorStoreRouter.get("/me/items", asyncHandler(controller.listStoreItems));
vendorStoreRouter.post(
  "/me/items",
  validateBody(createStoreItemSchema),
  asyncHandler(controller.createStoreItem),
);
vendorStoreRouter.put(
  "/me/items/:id",
  validateBody(updateStoreItemSchema),
  asyncHandler(controller.updateStoreItem),
);
vendorStoreRouter.delete("/me/items/:id", asyncHandler(controller.deleteStoreItem));

vendorStoreRouter.get("/me/orders", asyncHandler(controller.listStoreOrders));
vendorStoreRouter.patch(
  "/me/orders/:id/status",
  validateBody(updateOrderStatusSchema),
  asyncHandler(controller.updateOrderStatus),
);
vendorStoreRouter.post("/me/orders/:id/create-invoice", asyncHandler(controller.createOrderInvoice));

// Vendor Payment & Settlement Management
vendorStoreRouter.get("/me/payment-account", asyncHandler(paymentController.getPaymentAccount));
vendorStoreRouter.post(
  "/me/payment-account/connect",
  validateBody(onboardPaymentAccountSchema),
  asyncHandler(paymentController.onboardPaymentAccount),
);
vendorStoreRouter.post(
  "/me/payment-account/kyc-link",
  asyncHandler(paymentController.createKycLink),
);
vendorStoreRouter.post(
  "/me/payment-account/sync",
  asyncHandler(paymentController.syncPaymentAccount),
);
vendorStoreRouter.get("/me/payments/summary", asyncHandler(paymentController.getPaymentSummary));
vendorStoreRouter.get("/me/payment-summary", asyncHandler(paymentController.getPaymentSummary));
vendorStoreRouter.post(
  "/me/orders/:id/refund",
  validateBody(refundStoreOrderSchema),
  asyncHandler(paymentController.refundOrder),
);

// ---------------------------------------------------------------------------
// Public Storefront Endpoints: /api/v1/stores/*
// ---------------------------------------------------------------------------
publicStoreRouter.get("/:slug", asyncHandler(controller.getPublicStore));
publicStoreRouter.get("/:slug/items", asyncHandler(controller.listPublicStoreItems));
publicStoreRouter.post(
  "/:slug/orders",
  storeOrderRateLimiter,
  validateBody(publicCreateOrderSchema),
  asyncHandler(controller.createPublicOrder),
);
publicStoreRouter.post(
  "/:slug/orders/:id/verify-payment",
  storePaymentVerifyRateLimiter,
  validateBody(verifyStoreOrderPaymentSchema),
  asyncHandler(paymentController.verifyStorePayment),
);

