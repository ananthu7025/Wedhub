import type { Request, Response } from "express";
import { AuthenticationError } from "../../common/errors";
import { paginatedResponse, successResponse } from "../../common/utils/api-response.util";
import * as weddingWebsiteService from "./wedding-website.service";
import { TEMPLATES } from "./wedding-website.schema";
import type {
  CreateWeddingWebsiteBody,
  CreateWeddingWebsiteEventBody,
  ListAdminWeddingWebsitesQuery,
  SubmitRsvpBody,
  UpdateWeddingWebsiteBody,
  UpdateWeddingWebsiteEventBody,
} from "./wedding-website.schema";

// Data-driven, per the feature spec's explicit "templates must be
// data-driven, do not create three completely independent applications"
// instruction — this list is just labels for the WeddingWebsiteTemplate
// enum; the actual visual rendering lives entirely in the frontend's
// template-renderer component, keyed off the same enum value.
const TEMPLATE_LIST = [
  { id: "ROYAL_WEDDING", name: "Royal Wedding" },
  { id: "MINIMAL_ELEGANT", name: "Minimal Elegant" },
  { id: "TRADITIONAL_INDIAN", name: "Traditional Indian Wedding" },
] as const satisfies ReadonlyArray<{ id: (typeof TEMPLATES)[number]; name: string }>;

export async function listTemplates(_req: Request, res: Response): Promise<void> {
  res.json(successResponse(TEMPLATE_LIST));
}

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function createDraft(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreateWeddingWebsiteBody;
  const website = await weddingWebsiteService.createDraft(userId, body);
  res.status(201).json(successResponse(website));
}

export async function listOwnDrafts(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const websites = await weddingWebsiteService.listOwnDrafts(userId);
  res.json(successResponse(websites));
}

export async function getOwnDraft(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const website = await weddingWebsiteService.getOwnDraft(req.params.id as string, userId);
  res.json(successResponse(website));
}

export async function updateDraft(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as UpdateWeddingWebsiteBody;
  const website = await weddingWebsiteService.updateDraft(req.params.id as string, userId, body);
  res.json(successResponse(website));
}

export async function generatePreview(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await weddingWebsiteService.generatePreview(req.params.id as string, userId);
  res.status(201).json(successResponse(result));
}

export async function getPreview(req: Request, res: Response): Promise<void> {
  const website = await weddingWebsiteService.getPreviewByToken(req.params.token as string);
  res.json(successResponse(website));
}

export async function getPublished(req: Request, res: Response): Promise<void> {
  const website = await weddingWebsiteService.getPublishedBySlug(req.params.slug as string);
  if (!website) {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Wedding website not found" } });
    return;
  }
  res.json(successResponse(website));
}

// Backs the frontend's sitemap.ts — every published slug, nothing else.
export async function listPublishedSlugs(_req: Request, res: Response): Promise<void> {
  const websites = await weddingWebsiteService.listPublishedSlugs();
  res.json(successResponse(websites));
}

export async function createPublishOrder(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await weddingWebsiteService.createPublishOrder(req.params.id as string, userId);
  res.status(201).json(successResponse(result));
}

// Events

export async function listEvents(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const events = await weddingWebsiteService.listEvents(req.params.id as string, userId);
  res.json(successResponse(events));
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreateWeddingWebsiteEventBody;
  const event = await weddingWebsiteService.createEvent(req.params.id as string, userId, body);
  res.status(201).json(successResponse(event));
}

export async function updateEvent(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as UpdateWeddingWebsiteEventBody;
  const event = await weddingWebsiteService.updateEvent(req.params.eventId as string, userId, body);
  res.json(successResponse(event));
}

export async function deleteEvent(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  await weddingWebsiteService.deleteEvent(req.params.eventId as string, userId);
  res.json(successResponse({ deleted: true }));
}

// RSVP

export async function submitRsvp(req: Request, res: Response): Promise<void> {
  const body = req.body as SubmitRsvpBody;
  const rsvp = await weddingWebsiteService.submitRsvp(req.params.slug as string, body);
  res.status(201).json(successResponse(rsvp));
}

export async function listRsvps(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const rsvps = await weddingWebsiteService.listRsvps(req.params.id as string, userId);
  res.json(successResponse(rsvps));
}

// Admin read-only visibility

export async function listAllForAdmin(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListAdminWeddingWebsitesQuery;
  const { items, total } = await weddingWebsiteService.listAllForAdmin(query.page, query.limit);
  res.json(paginatedResponse(items, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) }));
}
