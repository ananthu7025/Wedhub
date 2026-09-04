import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { optionalAuthenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { analyticsEventRateLimiter } from "../../common/middleware/rate-limit.middleware";
import * as analyticsController from "./analytics.controller";
import { trackEventSchema } from "./analytics.schema";

export const analyticsRouter = Router();

// Public — fires from anonymous and logged-in visitors alike.
// optionalAuthenticateMiddleware attaches req.user when a valid token
// happens to be present (same pattern as search/enquiries) without gating
// the endpoint; an invalid/missing token just stays anonymous.
analyticsRouter.post(
  "/events",
  analyticsEventRateLimiter,
  optionalAuthenticateMiddleware,
  validateBody(trackEventSchema),
  asyncHandler(analyticsController.trackEvent),
);
