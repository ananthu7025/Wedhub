import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { createOrder, createRefund } from "../../integrations/payment/razorpay.client";
import * as planRepository from "../plans/plan.repository";
import * as subscriptionRepository from "./subscription.repository";

const GRACE_PERIOD_DAYS = 7; // product.md §28 Scenario E: "grace period can be configured" — env-configurable later if needed

function periodEndFor(interval: "MONTHLY" | "YEARLY", from: Date): Date {
  const end = new Date(from);
  if (interval === "MONTHLY") {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }
  return end;
}

async function getOwnedVendorOrThrow(vendorId: string, ownerUserId: string) {
  const vendor = await subscriptionRepository.findVendorOwned(vendorId, ownerUserId);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }
  return vendor;
}

// product.md §28 Scenario A: a vendor with no subscription row at all is
// implicitly on FREE — no payment, no row needed. Callers that need "what
// features can this vendor use" (Arch Phase 12's EntitlementService) should
// treat a null return from this as "the FREE plan's limits apply."
export async function getCurrentSubscription(vendorId: string) {
  return subscriptionRepository.findCurrentSubscription(vendorId);
}

export async function listInvoices(vendorId: string, ownerUserId: string) {
  await getOwnedVendorOrThrow(vendorId, ownerUserId);
  return subscriptionRepository.listInvoices(vendorId);
}

export async function listPayments(vendorId: string, ownerUserId: string) {
  await getOwnedVendorOrThrow(vendorId, ownerUserId);
  return subscriptionRepository.listPayments(vendorId);
}

// Scenario B, steps 1-5: display plan, billing period, apply coupon, create
// payment intent, redirect to payment flow. This function covers everything
// up through "create the Razorpay order." Critically, NO Subscription row
// is created here for a paid plan — product.md §28 Scenario B/C is explicit
// that the subscription only becomes ACTIVE once the webhook (steps 7-8)
// confirms payment. Creating an ACTIVE (or even pending) Subscription at
// this point was a real bug caught during verification: it let a vendor
// appear subscribed before paying anything. The only exception is a trial
// (plan.trialDays > 0), which genuinely has no payment due yet — that path
// creates a TRIALING Subscription immediately since there's nothing to wait
// on a webhook for.
export async function initiateUpgrade(
  vendorId: string,
  ownerUserId: string,
  input: { planId: string; couponCode: string | undefined },
) {
  await getOwnedVendorOrThrow(vendorId, ownerUserId);

  const plan = await planRepository.findPlanById(input.planId);
  if (!plan || !plan.isActive) {
    throw new NotFoundError("Plan not found");
  }
  if (plan.tier === "FREE") {
    throw new ValidationError("Cannot create a paid checkout for the FREE plan");
  }

  const existing = await subscriptionRepository.findCurrentSubscription(vendorId);
  if (existing && existing.status === "ACTIVE" && existing.planId === plan.id) {
    throw new ConflictError("Vendor already has an active subscription to this plan");
  }

  let finalAmount = Number(plan.price);
  let couponId: string | undefined;
  if (input.couponCode) {
    const coupon = await subscriptionRepository.findActiveCoupon(input.couponCode);
    const now = new Date();
    const validNow =
      coupon &&
      (!coupon.validFrom || coupon.validFrom <= now) &&
      (!coupon.validUntil || coupon.validUntil >= now) &&
      (coupon.maxRedemptions === null || coupon.timesRedeemed < coupon.maxRedemptions);
    if (!validNow) {
      throw new ValidationError("Coupon is invalid or expired");
    }
    couponId = coupon.id;
    finalAmount =
      coupon.discountType === "PERCENTAGE"
        ? finalAmount * (1 - Number(coupon.discountValue) / 100)
        : Math.max(0, finalAmount - Number(coupon.discountValue));
  }

  const now = new Date();
  const trialEndsAt = plan.trialDays > 0 ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000) : undefined;

  if (trialEndsAt) {
    const subscription = await subscriptionRepository.createSubscription({
      vendorId,
      planId: plan.id,
      status: "TRIALING",
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      trialEndsAt,
      couponId,
    });
    return { subscription, checkout: null };
  }

  // Razorpay amounts are in the currency's smallest unit (paise for INR).
  // receipt has a hard 56-character limit on Razorpay's side (a real error
  // caught live: a vendorId UUID + timestamp overflowed it) — the full
  // vendorId/planId already travel in `notes`, which has no such limit, so
  // the receipt itself only needs to be short and locally unique.
  const amountInSmallestUnit = Math.round(finalAmount * 100);
  const { orderId } = await createOrder({
    amountInSmallestUnit,
    currency: plan.currency,
    receipt: `co_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
    notes: { vendorId, planId: plan.id },
  });

  const payment = await subscriptionRepository.createPendingCheckoutPayment({
    vendorId,
    planId: plan.id,
    couponId,
    razorpayOrderId: orderId,
    amount: finalAmount,
    currency: plan.currency,
  });

  return { subscription: null, checkout: { orderId, paymentId: payment.id, amount: finalAmount, currency: plan.currency } };
}

// Vendor cancellation (Scenario F). Default is cancel_at_period_end=true
// per product.md's explicit recommendation — immediate cancellation must be
// opted into.
export async function cancelSubscription(vendorId: string, ownerUserId: string, immediate: boolean) {
  await getOwnedVendorOrThrow(vendorId, ownerUserId);
  const subscription = await subscriptionRepository.findCurrentSubscription(vendorId);
  if (!subscription) {
    throw new NotFoundError("No active subscription to cancel");
  }

  if (immediate) {
    return subscriptionRepository.cancelImmediately(subscription.id);
  }
  return subscriptionRepository.setCancelAtPeriodEnd(subscription.id, true);
}

export async function undoCancellation(vendorId: string, ownerUserId: string) {
  await getOwnedVendorOrThrow(vendorId, ownerUserId);
  const subscription = await subscriptionRepository.findCurrentSubscription(vendorId);
  if (!subscription || !subscription.cancelAtPeriodEnd) {
    throw new NotFoundError("No pending cancellation to undo");
  }
  return subscriptionRepository.setCancelAtPeriodEnd(subscription.id, false);
}

// Scenario H: the original payment is never mutated — a Refund is always a
// separate, additional record. ADMIN-only, since refund policy/entitlement
// consequences are a business decision, not self-service.
export async function refundPayment(razorpayPaymentId: string, amountInSmallestUnit: number | undefined, reason: string | undefined) {
  const payment = await subscriptionRepository.findPaymentForRefund(razorpayPaymentId);
  if (!payment) {
    throw new NotFoundError("Payment not found");
  }
  const { refundId } = await createRefund(razorpayPaymentId, amountInSmallestUnit);
  const refundAmount = amountInSmallestUnit ? amountInSmallestUnit / 100 : Number(payment.amount);
  return subscriptionRepository.createRefundRecord({
    paymentId: payment.id,
    razorpayRefundId: refundId,
    amount: refundAmount,
    reason,
  });
}

export async function createCoupon(input: {
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  maxRedemptions: number | undefined;
  validFrom: Date | undefined;
  validUntil: Date | undefined;
}) {
  const existing = await subscriptionRepository.findCouponByCode(input.code);
  if (existing) {
    throw new ConflictError(`Coupon code "${input.code}" already exists`);
  }
  return subscriptionRepository.createCoupon(input);
}

export { GRACE_PERIOD_DAYS, periodEndFor };
