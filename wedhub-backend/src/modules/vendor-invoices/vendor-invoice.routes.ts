import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as invoiceController from "./vendor-invoice.controller";
import {
  cancelInvoiceSchema,
  createVendorInvoiceSchema,
  listInvoicesQuerySchema,
  recordPaymentSchema,
  updateVendorInvoiceSchema,
  upsertBillingProfileSchema,
} from "./vendor-invoice.schema";

export const vendorInvoiceRouter = Router();

// All vendor invoice routes require authentication and VENDOR role
vendorInvoiceRouter.use(authenticateMiddleware);
vendorInvoiceRouter.use(authorize(Role.VENDOR));

// Billing profile & settings
vendorInvoiceRouter.get(
  "/billing-profile",
  asyncHandler(invoiceController.getBillingProfile),
);

vendorInvoiceRouter.put(
  "/billing-profile",
  validateBody(upsertBillingProfileSchema),
  asyncHandler(invoiceController.updateBillingProfile),
);

// Metrics rollup
vendorInvoiceRouter.get(
  "/metrics",
  asyncHandler(invoiceController.getMetrics),
);

// Lead prefill data
vendorInvoiceRouter.get(
  "/prefill/lead/:leadId",
  asyncHandler(invoiceController.getLeadPrefill),
);

// Invoices CRUD & listing
vendorInvoiceRouter.get(
  "/",
  validateQuery(listInvoicesQuerySchema),
  asyncHandler(invoiceController.listInvoices),
);

vendorInvoiceRouter.post(
  "/",
  validateBody(createVendorInvoiceSchema),
  asyncHandler(invoiceController.createInvoice),
);

vendorInvoiceRouter.get(
  "/:id",
  asyncHandler(invoiceController.getInvoiceById),
);

vendorInvoiceRouter.patch(
  "/:id",
  validateBody(updateVendorInvoiceSchema),
  asyncHandler(invoiceController.updateInvoice),
);

vendorInvoiceRouter.delete(
  "/:id",
  asyncHandler(invoiceController.deleteInvoice),
);

// Status lifecycle transitions
vendorInvoiceRouter.post(
  "/:id/issue",
  asyncHandler(invoiceController.issueInvoice),
);

vendorInvoiceRouter.post(
  "/:id/cancel",
  validateBody(cancelInvoiceSchema),
  asyncHandler(invoiceController.cancelInvoice),
);

vendorInvoiceRouter.post(
  "/:id/duplicate",
  asyncHandler(invoiceController.duplicateInvoice),
);

// Payments management
vendorInvoiceRouter.post(
  "/:id/payments",
  validateBody(recordPaymentSchema),
  asyncHandler(invoiceController.recordPayment),
);

vendorInvoiceRouter.delete(
  "/:id/payments/:paymentId",
  asyncHandler(invoiceController.deletePayment),
);
