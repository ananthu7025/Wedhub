import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { requireVerifiedMiddleware } from "../../common/middleware/require-verified.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as weddingWebsiteController from "./wedding-website.controller";
import {
  createWeddingWebsiteEventSchema,
  createWeddingWebsiteSchema,
  listAdminWeddingWebsitesQuerySchema,
  submitRsvpSchema,
  updateWeddingWebsiteEventSchema,
  updateWeddingWebsiteSchema,
} from "./wedding-website.schema";

// Mounted at /api/v1/wedding-websites — public read (templates, preview,
// published) + self-service draft management (authenticateMiddleware
// only, ownership enforced in the service layer per draft, same pattern
// as vendors/me and shortlists).
export const weddingWebsiteRouter = Router();

weddingWebsiteRouter.get("/templates", asyncHandler(weddingWebsiteController.listTemplates));
weddingWebsiteRouter.get("/published", asyncHandler(weddingWebsiteController.listPublishedSlugs));

// Public preview/published reads — must precede /me/:id-style routes only
// if they could collide; these live under distinct static prefixes so
// order doesn't matter here, but kept together for readability.
weddingWebsiteRouter.get("/preview/:token", asyncHandler(weddingWebsiteController.getPreview));
weddingWebsiteRouter.get("/published/:slug", asyncHandler(weddingWebsiteController.getPublished));
weddingWebsiteRouter.post("/published/:slug/rsvp", validateBody(submitRsvpSchema), asyncHandler(weddingWebsiteController.submitRsvp));

// Gated at the specific mutating endpoints below, not router-wide at this
// .use() — an unverified user can still view/browse their own draft(s) and
// RSVPs (GET routes) and generate a preview, matching "read-only browsing
// should stay unverified-accessible"; only creating/editing draft content,
// managing events, and the actual publish-order action are sensitive
// enough to require a verified email (same requireVerifiedMiddleware
// pattern as vendor.routes.ts's self-service writes).
weddingWebsiteRouter.use("/me", authenticateMiddleware);
weddingWebsiteRouter.get("/me", asyncHandler(weddingWebsiteController.listOwnDrafts));
weddingWebsiteRouter.post(
  "/me",
  requireVerifiedMiddleware,
  validateBody(createWeddingWebsiteSchema),
  asyncHandler(weddingWebsiteController.createDraft),
);
weddingWebsiteRouter.get("/me/:id", asyncHandler(weddingWebsiteController.getOwnDraft));
weddingWebsiteRouter.patch(
  "/me/:id",
  requireVerifiedMiddleware,
  validateBody(updateWeddingWebsiteSchema),
  asyncHandler(weddingWebsiteController.updateDraft),
);
weddingWebsiteRouter.post("/me/:id/preview", asyncHandler(weddingWebsiteController.generatePreview));
weddingWebsiteRouter.post(
  "/me/:id/publish-order",
  requireVerifiedMiddleware,
  asyncHandler(weddingWebsiteController.createPublishOrder),
);
weddingWebsiteRouter.get("/me/:id/rsvps", asyncHandler(weddingWebsiteController.listRsvps));

weddingWebsiteRouter.get("/me/:id/events", asyncHandler(weddingWebsiteController.listEvents));
weddingWebsiteRouter.post(
  "/me/:id/events",
  requireVerifiedMiddleware,
  validateBody(createWeddingWebsiteEventSchema),
  asyncHandler(weddingWebsiteController.createEvent),
);
weddingWebsiteRouter.patch(
  "/me/events/:eventId",
  requireVerifiedMiddleware,
  validateBody(updateWeddingWebsiteEventSchema),
  asyncHandler(weddingWebsiteController.updateEvent),
);
weddingWebsiteRouter.delete(
  "/me/events/:eventId",
  requireVerifiedMiddleware,
  asyncHandler(weddingWebsiteController.deleteEvent),
);

// Mounted at /api/v1/admin/wedding-websites — read-only visibility only
// (count, owner, template, payment status, website status, dates), per
// the feature spec's explicit "do not build a large admin system"
// instruction.
export const weddingWebsiteAdminRouter = Router();
weddingWebsiteAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));
weddingWebsiteAdminRouter.get(
  "/",
  validateQuery(listAdminWeddingWebsitesQuerySchema),
  asyncHandler(weddingWebsiteController.listAllForAdmin),
);
