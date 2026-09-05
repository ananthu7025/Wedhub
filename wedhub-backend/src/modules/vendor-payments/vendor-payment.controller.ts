import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as paymentService from "./vendor-payment.service";

export async function getPaymentAccount(req: Request, res: Response) {
  const account = await paymentService.getVendorPaymentAccount(req.user!.id);
  res.json(successResponse(account));
}

export async function onboardPaymentAccount(req: Request, res: Response) {
  const account = await paymentService.onboardVendorPaymentAccount(req.user!.id, req.body);
  res.status(200).json(successResponse(account));
}

export async function createKycLink(req: Request, res: Response) {
  const result = await paymentService.createVendorKycLink(req.user!.id);
  res.json(successResponse(result));
}

export async function getPaymentSummary(req: Request, res: Response) {
  const summary = await paymentService.getVendorPaymentSummary(req.user!.id);
  res.json(successResponse(summary));
}

export async function syncPaymentAccount(req: Request, res: Response) {
  const updated = await paymentService.syncVendorPaymentAccount(req.user!.id);
  res.json(successResponse(updated));
}

export async function refundOrder(req: Request, res: Response) {
  const result = await paymentService.refundStoreOrder(req.user!.id, req.params.id as string, req.body);
  res.json(successResponse(result));
}

export async function verifyStorePayment(req: Request, res: Response) {
  const result = await paymentService.verifyStorePayment(
    req.params.slug as string,
    req.params.id as string,
    req.body,
  );
  res.json(successResponse(result));
}
