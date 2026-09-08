import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { challengeVoteRateLimiter } from "../../common/middleware/rate-limit.middleware";
import * as challengeVoteController from "./challenge-vote.controller";

export const challengeVoteRouter = Router({ mergeParams: true });

challengeVoteRouter.post(
  "/:slug/entries/:entryId/votes",
  authenticateMiddleware,
  challengeVoteRateLimiter,
  asyncHandler(challengeVoteController.castVote),
);
