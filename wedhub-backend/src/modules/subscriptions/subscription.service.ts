import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { createOrder, createRefund } from "../../integrations/payment/razorpay.client";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import * as entitlementService from "../entitlements/entitlement.service";
import * as planRepository from "../plans/plan.repository";
import * as subscriptionRepository from "./subscription.repository";

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
    // The vendor may have entitlement-hidden media from an earlier
    // downgrade — starting a trial regains that capacity immediately.
    await entitlementService.restoreInactiveMediaToLimits(vendorId, entitlementService.readLimits(plan));
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

  // Arch Phase 18 Stage A — "Checkout started" (product.md §46), fired only
  // on the real-payment path above, not the trial branch (a trial has no
  // checkout — see this function's own comment). "Upgrade" vs. "new
  // subscription" isn't distinguished here: `existing` (looked up above)
  // tells us whether the vendor already had an active subscription, which
  // is enough to answer that later from this event's metadata without a
  // second near-duplicate event type (see product.md §46 item 17 / the
  // Arch Phase 18 progress note for the full reasoning).
  await logAnalyticsEvent({
    userId: ownerUserId,
    eventType: "checkout_started",
    vendorId,
    metadata: { planId: plan.id, planTier: plan.tier, amount: finalAmount, currency: plan.currency, isUpgrade: existing !== null },
  });

  return { subscription: null, checkout: { orderId, paymentId: payment.id, amount: finalAmount, currency: plan.currency } };
}

// Vendor cancellation (Scenario F). Default is cancel_at_period_end=true
// per product.md's explicit recommendation — immediate cancellation must be
// opted into. This is also how a vendor downgrades to FREE: there is no
// separate "downgrade" endpoint — Premium/Pro → Free is simply "cancel,
// don't renew" — confirmed with the user.
export async function cancelSubscription(vendorId: string, ownerUserId: string, immediate: boolean) {
  await getOwnedVendorOrThrow(vendorId, ownerUserId);
  const subscription = await subscriptionRepository.findCurrentSubscription(vendorId);
  if (!subscription) {
    throw new NotFoundError("No active subscription to cancel");
  }

  if (immediate) {
    const cancelled = await subscriptionRepository.cancelImmediately(subscription.id);
    // Scenario G: immediate cancellation drops the vendor to FREE right now,
    // not at some future period end — sweep excess media in the same beat.
    await entitlementService.sweepMediaToLimits(vendorId, entitlementService.FREE_PLAN_DEFAULT_LIMITS);
    await logAnalyticsEvent({
      userId: ownerUserId,
      eventType: "subscription_cancelled",
      vendorId,
      metadata: { subscriptionId: subscription.id, planId: subscription.planId, immediate: true },
    });
    return cancelled;
  }
  // cancelAtPeriodEnd=true: paid benefits continue until currentPeriodEnd
  // (Scenario F). The Scenario G sweep happens lazily, the first time
  // getEffectivePlan() is called after that date elapses.
  const updated = await subscriptionRepository.setCancelAtPeriodEnd(subscription.id, true);
  await logAnalyticsEvent({
    userId: ownerUserId,
    eventType: "subscription_cancelled",
    vendorId,
    metadata: { subscriptionId: subscription.id, planId: subscription.planId, immediate: false },
  });
  return updated;
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
