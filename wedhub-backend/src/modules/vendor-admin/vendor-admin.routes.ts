import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as vendorAdminController from "./vendor-admin.controller";
import {
  adminCreateVendorSchema,
  adminUpdateVendorSchema,
  createInvitationSchema,
  listAdminVendorsQuerySchema,
  rejectVendorSchema,
  setVerificationSchema,
  suspendVendorSchema,
} from "./vendor-admin.schema";

export const vendorAdminRouter = Router();

vendorAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

vendorAdminRouter.get(
  "/",
  validateQuery(listAdminVendorsQuerySchema),
  asyncHandler(vendorAdminController.listVendors),
);

vendorAdminRouter.post(
  "/",
  validateBody(adminCreateVendorSchema),
  asyncHandler(vendorAdminController.createVendor),
);

vendorAdminRouter.get("/:id", asyncHandler(vendorAdminController.getVendorDetail));

vendorAdminRouter.patch(
  "/:id",
  validateBody(adminUpdateVendorSchema),
  asyncHandler(vendorAdminController.updateVendor),
);

vendorAdminRouter.post(
  "/:id/invitations",
  validateBody(createInvitationSchema),
  asyncHandler(vendorAdminController.createInvitation),
);

vendorAdminRouter.post(
  "/:id/verify",
  validateBody(setVerificationSchema),
  asyncHandler(vendorAdminController.setVerification),
);

vendorAdminRouter.post("/:id/approve", asyncHandler(vendorAdminController.approve));

vendorAdminRouter.post(
  "/:id/reject",
  validateBody(rejectVendorSchema),
  asyncHandler(vendorAdminController.reject),
);

vendorAdminRouter.post(
  "/:id/suspend",
  validateBody(suspendVendorSchema),
  asyncHandler(vendorAdminController.suspend),
);

vendorAdminRouter.post("/:id/restore", asyncHandler(vendorAdminController.restore));

vendorAdminRouter.post("/:id/deactivate", asyncHandler(vendorAdminController.deactivate));

vendorAdminRouter.get("/:id/status-history", asyncHandler(vendorAdminController.getStatusHistory));
