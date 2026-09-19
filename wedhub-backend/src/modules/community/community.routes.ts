import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware, optionalAuthenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { requireVerifiedMiddleware } from "../../common/middleware/require-verified.middleware";
import {
  communityCommentRateLimiter,
  communityPostRateLimiter,
  communityVoteRateLimiter,
} from "../../common/middleware/rate-limit.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as communityController from "./community.controller";
import {
  castPollVoteSchema,
  createCommentSchema,
  createPostSchema,
  listFeedQuerySchema,
  listFlaggedAdminQuerySchema,
  moderatePostSchema,
  reportPostSchema,
} from "./community.schema";

export const communityRouter = Router();

// Public reads (browsable by anyone, matching this app's public-vendor-read
// posture) — optionalAuthenticateMiddleware attaches req.user when a valid
// token happens to be present, so the feed/post response can include
// "did I already vote on this" without gating the read itself.
communityRouter.get(
  "/tags",
  asyncHandler(communityController.listTags),
);

communityRouter.get(
  "/posts",
  optionalAuthenticateMiddleware,
  validateQuery(listFeedQuerySchema),
  asyncHandler(communityController.listFeed),
);

communityRouter.get(
  "/posts/:id",
  optionalAuthenticateMiddleware,
  asyncHandler(communityController.getPost),
);

communityRouter.get(
  "/posts/:id/comments",
  asyncHandler(communityController.listComments),
);

// Couples-only writes — authorize(Role.END_USER) explicitly, not just
// authenticateMiddleware (see community.schema/routes plan: Reviews' own
// couple-write routes don't do this today, which is a gap this module must
// not repeat). Posting is also gated on email verification — the sensitive
// action explicitly called out for this module; voting/commenting/reporting
// below are not.
communityRouter.post(
  "/posts",
  authenticateMiddleware,
  authorize(Role.END_USER),
  requireVerifiedMiddleware,
  communityPostRateLimiter,
  validateBody(createPostSchema),
  asyncHandler(communityController.createPost),
);

communityRouter.post(
  "/posts/:id/vote",
  authenticateMiddleware,
  authorize(Role.END_USER),
  communityVoteRateLimiter,
  asyncHandler(communityController.toggleVote),
);

communityRouter.post(
  "/posts/:id/poll-vote",
  authenticateMiddleware,
  authorize(Role.END_USER),
  communityVoteRateLimiter,
  validateBody(castPollVoteSchema),
  asyncHandler(communityController.castPollVote),
);

communityRouter.post(
  "/posts/:id/comments",
  authenticateMiddleware,
  authorize(Role.END_USER),
  communityCommentRateLimiter,
  validateBody(createCommentSchema),
  asyncHandler(communityController.createComment),
);

communityRouter.post(
  "/posts/:id/report",
  authenticateMiddleware,
  authorize(Role.END_USER),
  validateBody(reportPostSchema),
  asyncHandler(communityController.reportPost),
);

export const communityAdminRouter = Router();

communityAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));

communityAdminRouter.get(
  "/flagged",
  validateQuery(listFlaggedAdminQuerySchema),
  asyncHandler(communityController.listFlaggedAdmin),
);

communityAdminRouter.patch(
  "/posts/:id/status",
  validateBody(moderatePostSchema),
  asyncHandler(communityController.moderatePost),
);
