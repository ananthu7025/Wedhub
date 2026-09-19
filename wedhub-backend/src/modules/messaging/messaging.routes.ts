import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { requireVerifiedMiddleware } from "../../common/middleware/require-verified.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as messagingController from "./messaging.controller";
import {
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  sendMessageSchema,
  startConversationSchema,
} from "./messaging.schema";

export const messagingRouter = Router();

// END_USER/VENDOR only — item 7's inbox is couple<->vendor messaging, ADMIN
// has no side of a conversation to see.
messagingRouter.use(authenticateMiddleware, authorize(Role.END_USER, Role.VENDOR));

messagingRouter.get(
  "/conversations",
  validateQuery(listConversationsQuerySchema),
  asyncHandler(messagingController.listMyConversations),
);

// Couple-initiated only — a vendor never "starts" a conversation with a
// couple out of the blue; they only ever reply within one a couple already
// started. Matches the request's framing: the couple's completed profile is
// what triggers a message TO a vendor (item 8), never the reverse. Enforced
// in the controller (requireCoupleRole), not a second authorize() layer here
// — this router already mixes END_USER+VENDOR at the top, so a per-route
// narrowing reads more clearly as an explicit check at the point of use.
// Also gated on email verification (messaging a vendor is a sensitive write,
// per the same policy as reveal-contact/enquiries/reviews) — reading
// conversations/messages below stays unverified-accessible.
messagingRouter.post(
  "/conversations",
  requireVerifiedMiddleware,
  validateBody(startConversationSchema),
  asyncHandler(messagingController.startConversation),
);

messagingRouter.get(
  "/conversations/:id/messages",
  validateQuery(listMessagesQuerySchema),
  asyncHandler(messagingController.listMessages),
);

messagingRouter.post(
  "/conversations/:id/messages",
  requireVerifiedMiddleware,
  validateBody(sendMessageSchema),
  asyncHandler(messagingController.sendMessage),
);

messagingRouter.post("/conversations/:id/read", asyncHandler(messagingController.markRead));

messagingRouter.get("/unread-count", asyncHandler(messagingController.getUnreadCount));
