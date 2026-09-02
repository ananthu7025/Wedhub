import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware, optionalAuthenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as vendorController from "./vendor.controller";
import {
  attachServiceSchema,
  createPackageSchema,
  createVendorSchema,
  listVendorsQuerySchema,
  setAttributesSchema,
  setCategoriesSchema,
  setServiceAreasSchema,
  updatePackageSchema,
  updateVendorSchema,
  upsertProfileSchema,
} from "./vendor.schema";

export const vendorRouter = Router();

// Public routes
vendorRouter.get("/", validateQuery(listVendorsQuerySchema), asyncHandler(vendorController.listPublicVendors));
vendorRouter.get("/:slug", optionalAuthenticateMiddleware, asyncHandler(vendorController.getPublicVendor));

// Vendor self-service routes
vendorRouter.post(
  "/",
  authenticateMiddleware,
  authorize(Role.VENDOR),
  validateBody(createVendorSchema),
  asyncHandler(vendorController.createVendor),
);

vendorRouter.get("/me/detail", authenticateMiddleware, asyncHandler(vendorController.getMyVendor));

vendorRouter.get("/me/analytics", authenticateMiddleware, asyncHandler(vendorController.getMyAnalytics));

vendorRouter.patch(
  "/me/detail",
  authenticateMiddleware,
  validateBody(updateVendorSchema),
  asyncHandler(vendorController.updateMyVendor),
);

vendorRouter.put(
  "/me/profile",
  authenticateMiddleware,
  validateBody(upsertProfileSchema),
  asyncHandler(vendorController.upsertProfile),
);

vendorRouter.put(
  "/me/categories",
  authenticateMiddleware,
  validateBody(setCategoriesSchema),
  asyncHandler(vendorController.setCategories),
);

vendorRouter.put(
  "/me/service-areas",
  authenticateMiddleware,
  validateBody(setServiceAreasSchema),
  asyncHandler(vendorController.setServiceAreas),
);

vendorRouter.put(
  "/me/attributes",
  authenticateMiddleware,
  validateBody(setAttributesSchema),
  asyncHandler(vendorController.setAttributes),
);

vendorRouter.post(
  "/me/services",
  authenticateMiddleware,
  validateBody(attachServiceSchema),
  asyncHandler(vendorController.attachService),
);

vendorRouter.delete(
  "/me/services/:serviceId",
  authenticateMiddleware,
  asyncHandler(vendorController.detachService),
);

vendorRouter.post(
  "/me/packages",
  authenticateMiddleware,
  validateBody(createPackageSchema),
  asyncHandler(vendorController.createPackage),
);

vendorRouter.patch(
  "/me/packages/:packageId",
  authenticateMiddleware,
  validateBody(updatePackageSchema),
  asyncHandler(vendorController.updatePackage),
);

vendorRouter.delete(
  "/me/packages/:packageId",
  authenticateMiddleware,
  asyncHandler(vendorController.deletePackage),
);

vendorRouter.post("/me/submit", authenticateMiddleware, asyncHandler(vendorController.submit));
