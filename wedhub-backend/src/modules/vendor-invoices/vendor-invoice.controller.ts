import type { Request, Response } from "express";
import { AuthenticationError, ValidationError } from "../../common/errors";
import { successResponse } from "../../common/utils/api-response.util";
import { getOwnedVendorOrThrow } from "../vendors/vendor.policy";
import * as invoiceService from "./vendor-invoice.service";
import type {
  CreateVendorInvoiceInput,
  ListInvoicesFilters,
  RecordPaymentInput,
  UpdateVendorInvoiceInput,
  UpsertBillingProfileInput,
} from "./vendor-invoice.types";

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

export async function getBillingProfile(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const profile = await invoiceService.getBillingProfile(vendor.id);
  res.json(successResponse(profile));
}

export async function updateBillingProfile(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const body = req.body as UpsertBillingProfileInput;
  const profile = await invoiceService.upsertBillingProfile(vendor.id, body);
  res.json(successResponse(profile));
}

export async function listInvoices(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const query = req.query as unknown as ListInvoicesFilters;
  const result = await invoiceService.listInvoices(vendor.id, query);
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
  const metrics = await invoiceService.getMetrics(vendor.id);
  res.json(successResponse(metrics));
}

export async function getLeadPrefill(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const leadId = getParam(req, "leadId");
  const prefill = await invoiceService.getLeadPrefill(vendor.id, leadId);
  res.json(successResponse(prefill));
}

export async function getInvoiceById(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const invoice = await invoiceService.getInvoiceById(vendor.id, id);
  res.json(successResponse(invoice));
}

export async function createInvoice(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const body = req.body as CreateVendorInvoiceInput;
  const invoice = await invoiceService.createInvoice(vendor.id, userId, body);
  res.status(201).json(successResponse(invoice));
}

export async function updateInvoice(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const body = req.body as UpdateVendorInvoiceInput;
  const invoice = await invoiceService.updateInvoice(vendor.id, userId, id, body);
  res.json(successResponse(invoice));
}

export async function deleteInvoice(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const result = await invoiceService.deleteInvoice(vendor.id, id);
  res.json(successResponse(result));
}

export async function issueInvoice(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const invoice = await invoiceService.issueInvoice(vendor.id, userId, id);
  res.json(successResponse(invoice));
}

export async function cancelInvoice(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const body = req.body as { reason?: string };
  const invoice = await invoiceService.cancelInvoice(vendor.id, userId, id, body?.reason);
  res.json(successResponse(invoice));
}

export async function duplicateInvoice(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const invoice = await invoiceService.duplicateInvoice(vendor.id, userId, id);
  res.status(201).json(successResponse(invoice));
}

export async function recordPayment(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const body = req.body as RecordPaymentInput;
  const invoice = await invoiceService.recordPayment(vendor.id, userId, id, body);
  res.json(successResponse(invoice));
}

export async function deletePayment(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const id = getParam(req, "id");
  const paymentId = getParam(req, "paymentId");
  const invoice = await invoiceService.deletePayment(vendor.id, userId, id, paymentId);
  res.json(successResponse(invoice));
}

