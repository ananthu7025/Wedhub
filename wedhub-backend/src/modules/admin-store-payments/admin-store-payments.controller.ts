import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as adminService from "./admin-store-payments.service";

export async function getOverview(_req: Request, res: Response) {
  const overview = await adminService.getMarketplaceOverview();
  res.json(successResponse(overview));
}

export async function listVendorAccounts(_req: Request, res: Response) {
  const accounts = await adminService.listVendorAccounts();
  res.json(successResponse(accounts));
}

export async function listOrders(req: Request, res: Response) {
  const { status, paymentStatus } = req.query as { status?: string; paymentStatus?: string };
  const filters: { status?: string; paymentStatus?: string } = {};
  if (status) filters.status = status;
  if (paymentStatus) filters.paymentStatus = paymentStatus;
  const orders = await adminService.listAllStoreOrders(filters);
  res.json(successResponse(orders));
}

export async function triggerCleanup(req: Request, res: Response) {
  const minutes = req.query.minutes ? parseInt(req.query.minutes as string, 10) : 60;
  const result = await adminService.cleanupAbandonedOrders(isNaN(minutes) ? 60 : minutes);
  res.json(successResponse(result));
}

export async function reconcileOrder(req: Request, res: Response) {
  const { reconcileTransfersForStoreOrder } = await import("../vendor-payments/vendor-payment.service");
  const result = await reconcileTransfersForStoreOrder(req.params.id as string);
  res.json(successResponse(result));
}


