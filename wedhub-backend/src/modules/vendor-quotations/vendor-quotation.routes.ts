import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as quotationController from "./vendor-quotation.controller";
import {
  createVendorQuotationSchema,
  listQuotationsQuerySchema,
  markSentSchema,
  publicAcceptQuotationSchema,
  publicDeclineQuotationSchema,
  updateVendorQuotationSchema,
} from "./vendor-quotation.schema";

export const vendorQuotationRouter = Router();

// ---------------------------------------------------------------------------
// Public Couple Endpoints (No Vendor Authentication Required)
// ---------------------------------------------------------------------------
vendorQuotationRouter.get(
  "/public/:token",
  asyncHandler(quotationController.getPublicQuotation),
);

vendorQuotationRouter.post(
  "/public/:token/accept",
  validateBody(publicAcceptQuotationSchema),
  asyncHandler(quotationController.publicAcceptQuotation),
);

vendorQuotationRouter.post(
  "/public/:token/decline",
  validateBody(publicDeclineQuotationSchema),
  asyncHandler(quotationController.publicDeclineQuotation),
);

// ---------------------------------------------------------------------------
// Vendor Authenticated Routes (Requires VENDOR Role)
// ---------------------------------------------------------------------------
const vendorAuth = [authenticateMiddleware, authorize(Role.VENDOR)];

// Metrics summary
vendorQuotationRouter.get(
  "/metrics",
  ...vendorAuth,
  asyncHandler(quotationController.getMetrics),
);

// Lead prefill data
vendorQuotationRouter.get(
  "/prefill/lead/:leadId",
  ...vendorAuth,
  asyncHandler(quotationController.getLeadPrefill),
);

// Quotations CRUD & listing
vendorQuotationRouter.get(
  "/",
  ...vendorAuth,
  validateQuery(listQuotationsQuerySchema),
  asyncHandler(quotationController.listQuotations),
);

vendorQuotationRouter.post(
  "/",
  ...vendorAuth,
  validateBody(createVendorQuotationSchema),
  asyncHandler(quotationController.createQuotation),
);

vendorQuotationRouter.get(
  "/:id",
  ...vendorAuth,
  asyncHandler(quotationController.getQuotationById),
);

vendorQuotationRouter.patch(
  "/:id",
  ...vendorAuth,
  validateBody(updateVendorQuotationSchema),
  asyncHandler(quotationController.updateQuotation),
);

vendorQuotationRouter.delete(
  "/:id",
  ...vendorAuth,
  asyncHandler(quotationController.deleteQuotation),
);

// Lifecycle actions
vendorQuotationRouter.post(
  "/:id/sent",
  ...vendorAuth,
  validateBody(markSentSchema),
  asyncHandler(quotationController.markAsSent),
);

vendorQuotationRouter.post(
  "/:id/duplicate",
  ...vendorAuth,
  asyncHandler(quotationController.duplicateQuotation),
);

vendorQuotationRouter.post(
  "/:id/convert-invoice",
  ...vendorAuth,
  asyncHandler(quotationController.convertToInvoice),
);

vendorQuotationRouter.post(
  "/:id/convert-booking",
  ...vendorAuth,
  asyncHandler(quotationController.convertToBooking),
);
