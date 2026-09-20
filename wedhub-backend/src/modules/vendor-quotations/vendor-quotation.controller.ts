import type { Request, Response } from "express";
import { AuthenticationError, ValidationError } from "../../common/errors";
import { successResponse } from "../../common/utils/api-response.util";
import { getOwnedVendorOrThrow } from "../vendors/vendor.policy";
import * as quotationService from "./vendor-quotation.service";
import type {
  CreateVendorQuotationInput,
  ListQuotationsFilters,
  UpdateVendorQuotationInput,
} from "./vendor-quotation.types";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  if (!val) {
    throw new ValidationError(`Missing parameter: ${name}`);
  }
  return val;
}

export async function listQuotations(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const query = req.query as unknown as ListQuotationsFilters;
  const result = await quotationService.listQuotations(vendor.id, query);
  res.json(
    successResponse(result.items, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    }),
  );
}

export async function getMetrics(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const metrics = await quotationService.getMetrics(vendor.id);
  res.json(successResponse(metrics));
}

export async function getLeadPrefill(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const leadId = getParam(req, "leadId");
  const prefill = await quotationService.getLeadPrefill(vendor.id, leadId);
  res.json(successResponse(prefill));
}

export async function createQuotation(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const body = req.body as CreateVendorQuotationInput;
  const quote = await quotationService.createQuotation(vendor.id, body);
  res.status(201).json(successResponse(quote));
}

export async function getQuotationById(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const quote = await quotationService.getQuotationById(vendor.id, id);
  res.json(successResponse(quote));
}

export async function updateQuotation(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const body = req.body as UpdateVendorQuotationInput;
  const quote = await quotationService.updateQuotation(vendor.id, id, body);
  res.json(successResponse(quote));
}

export async function deleteQuotation(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const result = await quotationService.deleteQuotation(vendor.id, id);
  res.json(successResponse(result));
}

export async function markAsSent(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const sentVia = (req.body?.sentVia as string) || "WHATSAPP";
  const quote = await quotationService.markAsSent(vendor.id, id, sentVia);
  res.json(successResponse(quote));
}

export async function duplicateQuotation(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const quote = await quotationService.duplicateQuotation(vendor.id, id);
  res.status(201).json(successResponse(quote));
}

export async function convertToInvoice(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const payload = await quotationService.convertToInvoice(vendor.id, id);
  res.json(successResponse(payload));
}

export async function convertToBooking(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const booking = await quotationService.convertToBooking(vendor.id, id);
  res.status(201).json(successResponse(booking));
}

// Public endpoints (no vendor auth required)
export async function getPublicQuotation(req: Request, res: Response): Promise<void> {
  const token = getParam(req, "token");
  const quote = await quotationService.getQuotationByToken(token);
  res.json(successResponse(quote));
}

export async function publicAcceptQuotation(req: Request, res: Response): Promise<void> {
  const token = getParam(req, "token");
  const clientNote = req.body?.clientNote as string | undefined;
  const result = await quotationService.publicAcceptQuotation(token, clientNote);
  res.json(successResponse(result));
}

export async function publicDeclineQuotation(req: Request, res: Response): Promise<void> {
  const token = getParam(req, "token");
  const reason = req.body?.reason as string | undefined;
  const result = await quotationService.publicDeclineQuotation(token, reason);
  res.json(successResponse(result));
}
