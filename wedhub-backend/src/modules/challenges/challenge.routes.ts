import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware, optionalAuthenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as challengeController from "./challenge.controller";
import {
  activeChallengeQuerySchema,
  createChallengeSchema,
  listChallengesQuerySchema,
  participantsQuerySchema,
  promoteToGallerySchema,
  rankingsQuerySchema,
  setWinnerSchema,
  updateChallengeSchema,
} from "./challenge.schema";

// Public router — specific GET paths (active, then :slug and its sub-paths)
// registered before any other module mounts onto it, since Express tries
// routes in registration order within one router.
export const challengePublicRouter = Router();

challengePublicRouter.get("/", validateQuery(listChallengesQuerySchema), asyncHandler(challengeController.listChallenges));
challengePublicRouter.get(
  "/active",
  optionalAuthenticateMiddleware,
  validateQuery(activeChallengeQuerySchema),
  asyncHandler(challengeController.getActiveChallenge),
);
challengePublicRouter.get(
  "/:slug",
  optionalAuthenticateMiddleware,
  asyncHandler(challengeController.getChallengeBySlug),
);
challengePublicRouter.get(
  "/:slug/rankings",
  optionalAuthenticateMiddleware,
  validateQuery(rankingsQuerySchema),
  asyncHandler(challengeController.getRankings),
);

export const challengeAdminRouter = Router();
challengeAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

challengeAdminRouter.get("/", validateQuery(listChallengesQuerySchema), asyncHandler(challengeController.listAdminChallenges));
challengeAdminRouter.get("/:id", asyncHandler(challengeController.getAdminChallenge));
challengeAdminRouter.post("/", validateBody(createChallengeSchema), asyncHandler(challengeController.createChallenge));
challengeAdminRouter.patch("/:id", validateBody(updateChallengeSchema), asyncHandler(challengeController.updateChallenge));
challengeAdminRouter.post("/:id/set-winner", validateBody(setWinnerSchema), asyncHandler(challengeController.setWinner));
challengeAdminRouter.post(
  "/:id/promote-to-gallery",
  validateBody(promoteToGallerySchema),
  asyncHandler(challengeController.promoteToGallery),
);
challengeAdminRouter.get(
  "/:id/participants",
  validateQuery(participantsQuerySchema),
  asyncHandler(challengeController.listParticipants),
);
