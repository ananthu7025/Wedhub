import { prisma } from "../../config/database";

// "What plan is this vendor on right now" is derived from the latest
// TRIALING/ACTIVE/PAST_DUE subscription row rather than a denormalized
// column on Vendor — confirmed with the user. No matching row means the
// vendor is implicitly on FREE.
export function findCurrentSubscription(vendorId: string) {
  return prisma.subscription.findFirst({
    where: { vendorId, status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
}

export function findSubscriptionById(id: string) {
  return prisma.subscription.findUnique({ where: { id }, include: { plan: true, vendor: true } });
}

export function findVendorOwned(vendorId: string, ownerUserId: string) {
  return prisma.vendor.findFirst({ where: { id: vendorId, ownerUserId }, select: { id: true } });
}

// Notification recipient lookup — an ACTIVE/TRIALING/PAST_DUE subscription
// always has a real vendorId; this resolves that vendor's owning user (may
// be null for the same reason as elsewhere: an admin-created, unclaimed
// vendor genuinely has no one to notify yet).
export function findVendorOwner(vendorId: string) {
  return prisma.vendor.findUnique({ where: { id: vendorId }, select: { ownerUserId: true, businessName: true } });
}

export function createSubscription(data: {
  vendorId: string;
  planId: string;
  status: "TRIALING" | "ACTIVE";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt: Date | undefined;
  couponId: string | undefined;
}) {
  return prisma.subscription.create({
    data: {
      vendorId: data.vendorId,
      planId: data.planId,
      status: data.status,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      trialEndsAt: data.trialEndsAt ?? null,
      couponId: data.couponId ?? null,
    },
    // Every other subscription-returning query in this file includes `plan`
    // (see findCurrentSubscription) except this one previously didn't — the
    // frontend's immediate-trial-activation path (SubscriptionBoard.tsx)
    // assigns this response straight into state assuming `.plan` exists,
    // same as GET /subscriptions/me, and crashed with "Cannot read
    // properties of undefined (reading 'tier')" without this include.
    include: { plan: true },
  });
}

// No Subscription exists yet at this point — product.md §28 Scenario B/C:
// a subscription only becomes ACTIVE once the webhook confirms payment.
// The vendor/plan/coupon selection is carried on the Payment row itself
// until then (see the Payment model's own comment in schema.prisma).
export function createPendingCheckoutPayment(data: {
  vendorId: string;
  planId: string;
  couponId: string | undefined;
  razorpayOrderId: string;
  amount: number;
  currency: string;
}) {
  return prisma.payment.create({
    data: {
      pendingVendorId: data.vendorId,
      pendingPlanId: data.planId,
      pendingCouponId: data.couponId ?? null,
      razorpayOrderId: data.razorpayOrderId,
      amount: data.amount,
      currency: data.currency,
      status: "CREATED",
    },
  });
}

export function findPaymentByOrderId(razorpayOrderId: string) {
  return prisma.payment.findUnique({
    where: { razorpayOrderId },
    include: { subscription: { include: { plan: true } }, pendingPlan: true },
  });
}

export function findPaymentByPaymentId(razorpayPaymentId: string) {
  return prisma.payment.findUnique({ where: { razorpayPaymentId } });
}

export function markPaymentCaptured(paymentId: string, razorpayPaymentId: string) {
  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: "CAPTURED", razorpayPaymentId },
  });
}

// The real activation moment (Scenario B step 8 / Scenario C): a Subscription
// is created here, ACTIVE, for the first time — never earlier. Runs as one
// transaction so a crash between steps can never leave a captured payment
// with no resulting subscription, or vice versa.
export async function activatePendingCheckout(
  paymentId: string,
  razorpayPaymentId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "CAPTURED", razorpayPaymentId },
    });

    if (!payment.pendingVendorId || !payment.pendingPlanId) {
      throw new Error(`Payment ${paymentId} has no pending checkout info to activate`);
    }

    const subscription = await tx.subscription.create({
      data: {
        vendorId: payment.pendingVendorId,
        planId: payment.pendingPlanId,
        couponId: payment.pendingCouponId,
        status: "ACTIVE",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    const linkedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: { subscriptionId: subscription.id },
    });

    if (payment.pendingCouponId) {
      await tx.coupon.update({ where: { id: payment.pendingCouponId }, data: { timesRedeemed: { increment: 1 } } });
    }

    return { subscription, payment: linkedPayment };
  });
}

export function markPaymentFailed(paymentId: string, failureReason: string | undefined) {
  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: "FAILED", failureReason: failureReason ?? null },
  });
}

// For a RENEWAL payment against an already-existing subscription (not the
// first-time activation — see activatePendingCheckout for that).
export function renewSubscription(subscriptionId: string, periodStart: Date, periodEnd: Date) {
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "ACTIVE", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, pastDueSince: null },
  });
}

export function markPastDue(subscriptionId: string) {
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "PAST_DUE", pastDueSince: new Date() },
  });
}

export function expireSubscription(subscriptionId: string) {
  return prisma.subscription.update({ where: { id: subscriptionId }, data: { status: "EXPIRED" } });
}

export function setCancelAtPeriodEnd(subscriptionId: string, cancelAtPeriodEnd: boolean) {
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: { cancelAtPeriodEnd, cancelledAt: cancelAtPeriodEnd ? new Date() : null },
  });
}

export function cancelImmediately(subscriptionId: string) {
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelAtPeriodEnd: false },
  });
}

export function createInvoice(data: { subscriptionId: string; paymentId: string; amount: number; currency: string }) {
  return prisma.invoice.create({
    data: {
      subscriptionId: data.subscriptionId,
      paymentId: data.paymentId,
      amount: data.amount,
      currency: data.currency,
      status: "PAID",
    },
  });
}

export function listInvoices(vendorId: string) {
  return prisma.invoice.findMany({
    where: { subscription: { vendorId } },
    orderBy: { issuedAt: "desc" },
    include: { payment: true },
  });
}

export function listPayments(vendorId: string) {
  return prisma.payment.findMany({
    where: { subscription: { vendorId } },
    orderBy: { createdAt: "desc" },
  });
}

export function findActiveCoupon(code: string) {
  return prisma.coupon.findFirst({ where: { code, isActive: true } });
}

export function findCouponByCode(code: string) {
  return prisma.coupon.findUnique({ where: { code } });
}

export function createCoupon(data: {
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  maxRedemptions: number | undefined;
  validFrom: Date | undefined;
  validUntil: Date | undefined;
}) {
  return prisma.coupon.create({
    data: {
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxRedemptions: data.maxRedemptions ?? null,
      validFrom: data.validFrom ?? null,
      validUntil: data.validUntil ?? null,
    },
  });
}

export function incrementCouponRedemption(couponId: string) {
  return prisma.coupon.update({ where: { id: couponId }, data: { timesRedeemed: { increment: 1 } } });
}

// Webhook idempotency (product.md §29/Scenario D): a unique constraint on
// eventId means a duplicate delivery's INSERT fails, caught and treated as
// "already processed" rather than raising a real error.
export function recordWebhookEvent(data: { eventId: string; eventType: string; payload: unknown }) {
  return prisma.webhookEvent.create({
    data: { eventId: data.eventId, eventType: data.eventType, payload: data.payload as object },
  });
}

export function findWebhookEvent(eventId: string) {
  return prisma.webhookEvent.findUnique({ where: { eventId } });
}

export function markWebhookProcessed(eventId: string) {
  return prisma.webhookEvent.update({ where: { eventId }, data: { processedAt: new Date() } });
}

export function markWebhookError(eventId: string, error: string) {
  return prisma.webhookEvent.update({ where: { eventId }, data: { error } });
}

export function findPaymentForRefund(razorpayPaymentId: string) {
  return prisma.payment.findUnique({ where: { razorpayPaymentId } });
}

export function createRefundRecord(data: { paymentId: string; razorpayRefundId: string; amount: number; reason: string | undefined }) {
  return prisma.refund.create({
    data: {
      paymentId: data.paymentId,
      razorpayRefundId: data.razorpayRefundId,
      amount: data.amount,
      reason: data.reason ?? null,
    },
  });
}
