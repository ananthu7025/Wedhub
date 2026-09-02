import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as featuredListingController from "./featured-listing.controller";
import {
  createFeaturedListingSchema,
  listFeaturedListingsAdminQuerySchema,
  listFeaturedListingsQuerySchema,
  updateFeaturedListingSchema,
} from "./featured-listing.schema";

// Public — currently-ACTIVE, in-window listings only. Placement logic (how
// search/homepage actually consume this) is deferred to a later phase; this
// is just the query surface for that future logic to call.
export const featuredListingRouter = Router();
featuredListingRouter.get(
  "/",
  validateQuery(listFeaturedListingsQuerySchema),
  asyncHandler(featuredListingController.listActiveFeaturedListings),
);

export const featuredListingAdminRouter = Router();
featuredListingAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

featuredListingAdminRouter.get(
  "/",
  validateQuery(listFeaturedListingsAdminQuerySchema),
  asyncHandler(featuredListingController.listFeaturedListingsAdmin),
);
featuredListingAdminRouter.post(
  "/",
  validateBody(createFeaturedListingSchema),
  asyncHandler(featuredListingController.createFeaturedListing),
);
featuredListingAdminRouter.patch(
  "/:id",
  validateBody(updateFeaturedListingSchema),
  asyncHandler(featuredListingController.updateFeaturedListing),
);
featuredListingAdminRouter.delete("/:id", asyncHandler(featuredListingController.cancelFeaturedListing));
