import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware, optionalAuthenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { challengeEntryRateLimiter } from "../../common/middleware/rate-limit.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as challengeController from "./challenge.controller";
import * as challengeEntryController from "./challenge-entry.controller";
import { listAdminEntriesQuerySchema, listEntriesQuerySchema, moderateEntrySchema, submitEntrySchema } from "./challenge.schema";

// Mounted under /challenges/:slug/entries — registered before challenge.routes's
// generic /:slug catch-all reaches it since Express matches the more specific
// /:slug/entries* path regardless of mount order, but kept as its own router
// (mergeParams) so this file owns everything entry-shaped.
export const challengeEntryPublicRouter = Router({ mergeParams: true });

challengeEntryPublicRouter.get(
  "/:slug/entries",
  optionalAuthenticateMiddleware,
  validateQuery(listEntriesQuerySchema),
  asyncHandler(challengeController.listEntries),
);
challengeEntryPublicRouter.get(
  "/:slug/entries/:entryId",
  optionalAuthenticateMiddleware,
  asyncHandler(challengeController.getEntry),
);
challengeEntryPublicRouter.get(
  "/:slug/my-entry",
  authenticateMiddleware,
  asyncHandler(challengeController.getMyEntry),
);
challengeEntryPublicRouter.post(
  "/:slug/entries",
  authenticateMiddleware,
  challengeEntryRateLimiter,
  validateBody(submitEntrySchema),
  asyncHandler(challengeController.submitEntry),
);

export const challengeEntryAdminRouter = Router();
challengeEntryAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

challengeEntryAdminRouter.get("/", validateQuery(listAdminEntriesQuerySchema), asyncHandler(challengeEntryController.listAdminEntries));
challengeEntryAdminRouter.patch("/:id/approve", asyncHandler(challengeEntryController.approveEntry));
challengeEntryAdminRouter.patch(
  "/:id/reject",
  validateBody(moderateEntrySchema),
  asyncHandler(challengeEntryController.rejectEntry),
);
challengeEntryAdminRouter.patch(
  "/:id/disqualify",
  validateBody(moderateEntrySchema),
  asyncHandler(challengeEntryController.disqualifyEntry),
);
