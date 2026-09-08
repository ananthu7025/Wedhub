import type { Request, Response } from "express";
import { paginatedResponse, successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as challengeEntryService from "./challenge-entry.service";
import type { CreateEntryPhotoUploadRequestBody, ListAdminEntriesQuery, ModerateEntryBody } from "./challenge.schema";
import * as challengeEntryMediaService from "./challenge-entry-media.service";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function createUploadRequest(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as CreateEntryPhotoUploadRequestBody;
  const result = await challengeEntryMediaService.createUploadRequest(userId, body);
  res.status(201).json(successResponse(result));
}

export async function confirmUpload(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const media = await challengeEntryMediaService.confirmUpload(userId, req.params.id as string);
  res.json(successResponse(media));
}

// Admin
export async function listAdminEntries(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListAdminEntriesQuery;
  const [items, total] = await challengeEntryService.listForAdmin(query);
  res.json(paginatedResponse(items, { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) }));
}

export async function approveEntry(req: Request, res: Response): Promise<void> {
  const adminId = requireUserId(req);
  const entry = await challengeEntryService.approveEntry(req.params.id as string, adminId);
  res.json(successResponse(entry));
}

export async function rejectEntry(req: Request, res: Response): Promise<void> {
  const adminId = requireUserId(req);
  const body = req.body as ModerateEntryBody;
  const entry = await challengeEntryService.rejectEntry(req.params.id as string, body.reason, adminId);
  res.json(successResponse(entry));
}

export async function disqualifyEntry(req: Request, res: Response): Promise<void> {
  const adminId = requireUserId(req);
  const body = req.body as ModerateEntryBody;
  const entry = await challengeEntryService.disqualifyEntry(req.params.id as string, body.reason, adminId);
  res.json(successResponse(entry));
}
