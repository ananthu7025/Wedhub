import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { requireVerifiedMiddleware } from "../../common/middleware/require-verified.middleware";
import * as usersController from "./users.controller";
import { submitProfileSetupSchema, updateProfileSchema, upsertWeddingProfileSchema } from "./users.schema";

export const usersRouter = Router();

usersRouter.use(authenticateMiddleware);

usersRouter.get("/me", asyncHandler(usersController.getMe));
usersRouter.patch("/me", validateBody(updateProfileSchema), asyncHandler(usersController.updateMe));
usersRouter.delete("/me", asyncHandler(usersController.deleteMe));

// The couple side's closest existing analog to "profile setup" (item 1's
// verification gate applies here until Phase 2 builds the real multi-step
// wedding-profile wizard) — gated the same way vendor creation is.
usersRouter.put(
  "/me/wedding-profile",
  requireVerifiedMiddleware,
  validateBody(upsertWeddingProfileSchema),
  asyncHandler(usersController.upsertWeddingProfile),
);
usersRouter.delete("/me/wedding-profile", asyncHandler(usersController.deleteWeddingProfile));

// Couple profile-setup wizard (item 2) — richer than the flat
// wedding-profile endpoint above (event dates + per-category budget
// preferences). GET backs the wizard's "resume/edit" case (prefilling from
// a prior submission); POST is the wizard's final "Submit" step, not its
// draft-save (drafts are localStorage-only per the confirmed 2026-09-16
// decision — no server draft endpoint exists).
usersRouter.get("/me/profile-setup", asyncHandler(usersController.getProfileSetup));
usersRouter.post(
  "/me/profile-setup",
  requireVerifiedMiddleware,
  validateBody(submitProfileSetupSchema),
  asyncHandler(usersController.submitProfileSetup),
);

usersRouter.post("/me/deactivate", asyncHandler(usersController.deactivateMe));
