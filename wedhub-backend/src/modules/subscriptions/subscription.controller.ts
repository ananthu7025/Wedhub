import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import { getOwnedVendorOrThrow } from "../vendors/vendor.policy";
import * as subscriptionService from "./subscription.service";
import type { CancelSubscriptionBody, CreateCouponBody, InitiateUpgradeBody, RefundBody } from "./subscription.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function getMySubscription(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const subscription = await subscriptionService.getCurrentSubscription(vendor.id);
  res.json(successResponse(subscription));
}

export async function initiateUpgrade(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const body = req.body as InitiateUpgradeBody;
  const result = await subscriptionService.initiateUpgrade(vendor.id, userId, {
    planId: body.planId,
    couponCode: body.couponCode,
  });
  res.status(201).json(successResponse(result));
}

export async function cancelSubscription(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const body = req.body as CancelSubscriptionBody;
  const subscription = await subscriptionService.cancelSubscription(vendor.id, userId, body.immediate);
  res.json(successResponse(subscription));
}

export async function undoCancellation(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const subscription = await subscriptionService.undoCancellation(vendor.id, userId);
  res.json(successResponse(subscription));
}

export async function listInvoices(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const invoices = await subscriptionService.listInvoices(vendor.id, userId);
  res.json(successResponse(invoices));
}

export async function listPayments(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const payments = await subscriptionService.listPayments(vendor.id, userId);
  res.json(successResponse(payments));
}

export async function refundPaymentAdmin(req: Request, res: Response): Promise<void> {
  const body = req.body as RefundBody;
  const refund = await subscriptionService.refundPayment(body.razorpayPaymentId, body.amountInSmallestUnit, body.reason);
  res.status(201).json(successResponse(refund));
}

export async function createCouponAdmin(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateCouponBody;
  const coupon = await subscriptionService.createCoupon({
    code: body.code,
    discountType: body.discountType,
    discountValue: body.discountValue,
    maxRedemptions: body.maxRedemptions,
    validFrom: body.validFrom,
    validUntil: body.validUntil,
  });
  res.status(201).json(successResponse(coupon));
}
