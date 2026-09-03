import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
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

// Public preview/published reads — must precede /me/:id-style routes only
// if they could collide; these live under distinct static prefixes so
// order doesn't matter here, but kept together for readability.
weddingWebsiteRouter.get("/preview/:token", asyncHandler(weddingWebsiteController.getPreview));
weddingWebsiteRouter.get("/published/:slug", asyncHandler(weddingWebsiteController.getPublished));
weddingWebsiteRouter.post("/published/:slug/rsvp", validateBody(submitRsvpSchema), asyncHandler(weddingWebsiteController.submitRsvp));

weddingWebsiteRouter.use("/me", authenticateMiddleware);
weddingWebsiteRouter.get("/me", asyncHandler(weddingWebsiteController.listOwnDrafts));
weddingWebsiteRouter.post("/me", validateBody(createWeddingWebsiteSchema), asyncHandler(weddingWebsiteController.createDraft));
weddingWebsiteRouter.get("/me/:id", asyncHandler(weddingWebsiteController.getOwnDraft));
weddingWebsiteRouter.patch(
  "/me/:id",
  validateBody(updateWeddingWebsiteSchema),
  asyncHandler(weddingWebsiteController.updateDraft),
);
weddingWebsiteRouter.post("/me/:id/preview", asyncHandler(weddingWebsiteController.generatePreview));
weddingWebsiteRouter.post("/me/:id/publish-order", asyncHandler(weddingWebsiteController.createPublishOrder));
weddingWebsiteRouter.get("/me/:id/rsvps", asyncHandler(weddingWebsiteController.listRsvps));

weddingWebsiteRouter.get("/me/:id/events", asyncHandler(weddingWebsiteController.listEvents));
weddingWebsiteRouter.post(
  "/me/:id/events",
  validateBody(createWeddingWebsiteEventSchema),
  asyncHandler(weddingWebsiteController.createEvent),
);
weddingWebsiteRouter.patch(
  "/me/events/:eventId",
  validateBody(updateWeddingWebsiteEventSchema),
  asyncHandler(weddingWebsiteController.updateEvent),
);
weddingWebsiteRouter.delete("/me/events/:eventId", asyncHandler(weddingWebsiteController.deleteEvent));

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
