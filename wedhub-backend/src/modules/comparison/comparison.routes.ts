import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateQuery } from "../../common/middleware/validate.middleware";
import { optionalAuthenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import * as comparisonController from "./comparison.controller";
import { compareVendorsQuerySchema } from "./comparison.schema";

export const comparisonRouter = Router();

// Public — comparing publicly visible (APPROVED) vendors requires no auth,
// mirroring GET /vendors/:slug and GET /search/vendors. optionalAuthenticateMiddleware
// attributes the comparison analytics event to a logged-in user when present,
// same as Arch Phase 7's search endpoint, without gating the route on auth.
comparisonRouter.get(
  "/vendors",
  optionalAuthenticateMiddleware,
  validateQuery(compareVendorsQuerySchema),
  asyncHandler(comparisonController.compareVendors),
);
