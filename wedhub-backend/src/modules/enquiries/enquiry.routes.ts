import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware, optionalAuthenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { enquiryRateLimiter } from "../../common/middleware/rate-limit.middleware";
import * as enquiryController from "./enquiry.controller";
import { createMultiVendorEnquirySchema, createSingleVendorEnquirySchema, listMyEnquiriesQuerySchema } from "./enquiry.schema";

export const enquiryRouter = Router();

// Public — enquiring does not require an account (product.md's "Get Quote"
// flow works for anonymous visitors); optionalAuthenticateMiddleware
// attributes the enquiry to a logged-in user when a valid token is present,
// same pattern as Arch Phase 7/8's public endpoints.
enquiryRouter.use(optionalAuthenticateMiddleware);
enquiryRouter.use(enquiryRateLimiter);

enquiryRouter.post(
  "/single-vendor",
  validateBody(createSingleVendorEnquirySchema),
  asyncHandler(enquiryController.createSingleVendorEnquiry),
);

enquiryRouter.post(
  "/multi-vendor",
  validateBody(createMultiVendorEnquirySchema),
  asyncHandler(enquiryController.createMultiVendorEnquiry),
);

// Couple-scoped enquiry tracker (Frontend Arch Phase 4) — unlike the two
// POST routes above, this genuinely requires a real account (there is no
// anonymous "my enquiries" concept), so it layers the strictly-stronger
// authenticateMiddleware on top of the router-wide optional one.
enquiryRouter.get(
  "/mine",
  authenticateMiddleware,
  validateQuery(listMyEnquiriesQuerySchema),
  asyncHandler(enquiryController.listMyEnquiries),
);
