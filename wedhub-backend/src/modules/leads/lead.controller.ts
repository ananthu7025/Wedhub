import type { Request, Response } from "express";
import type { LeadStatus } from "@prisma/client";
import { paginatedResponse, successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import { getOwnedVendorOrThrow } from "../vendors/vendor.policy";
import * as leadService from "./lead.service";
import type { CreateLeadNoteBody, ListLeadsQuery, UpdateLeadStatusBody } from "./lead.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function listOwnLeads(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const query = req.validatedQuery as ListLeadsQuery;
  const [leads, total] = await leadService.listOwnLeads(vendor.id, {
    status: query.status as LeadStatus | undefined,
    search: query.search,
    page: query.page,
    limit: query.limit,
  });
  res.json(
    paginatedResponse(leads, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}

export async function getOwnLead(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const lead = await leadService.getOwnLead(vendor.id, req.params.id as string);
  res.json(successResponse(lead));
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const body = req.body as UpdateLeadStatusBody;
  const lead = await leadService.updateStatus(vendor.id, userId, req.params.id as string, body.status, body.reason);
  res.json(successResponse(lead));
}

export async function addNote(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const body = req.body as CreateLeadNoteBody;
  const note = await leadService.addNote(vendor.id, userId, req.params.id as string, body.body);
  res.status(201).json(successResponse(note));
}

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const analytics = await leadService.getAnalytics(vendor.id);
  res.json(successResponse(analytics));
}

export async function listAllLeadsAdmin(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListLeadsQuery;
  const [leads, total] = await leadService.listAllLeadsAdmin({
    status: query.status as LeadStatus | undefined,
    page: query.page,
    limit: query.limit,
  });
  res.json(
    paginatedResponse(leads, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    }),
  );
}

export async function getLeadAdmin(req: Request, res: Response): Promise<void> {
  const lead = await leadService.getLeadAdmin(req.params.id as string);
  res.json(successResponse(lead));
}

export async function updateStatusAdmin(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as UpdateLeadStatusBody;
  const lead = await leadService.updateStatusAdmin(userId, req.params.id as string, body.status, body.reason);
  res.json(successResponse(lead));
}
