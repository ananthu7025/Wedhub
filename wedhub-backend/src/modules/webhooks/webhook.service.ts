import { AuthenticationError, ValidationError } from "../../common/errors";
import { logger } from "../../config/logger";
import { verifyWebhookSignature } from "../../integrations/payment/razorpay.client";
import * as entitlementService from "../entitlements/entitlement.service";
import { periodEndFor } from "../subscriptions/billing-period.util";
import * as subscriptionRepository from "../subscriptions/subscription.repository";
import type { RazorpayWebhookPayload } from "./webhook.types";

// Razorpay does not send a single top-level event id — the convention is to
// derive an idempotency key from the event type plus the underlying
// entity's own id (payment/refund ids are themselves unique per Razorpay
// event, so `${event}:${entityId}` is stable and unique per real event,
// while a genuine redelivery of the same event carries the same value).
function idempotencyKeyFor(payload: RazorpayWebhookPayload): string {
  const entityId = payload.payload.payment?.entity.id ?? payload.payload.refund?.entity.id ?? String(payload.created_at);
  return `${payload.event}:${entityId}`;
}

export async function handleWebhook(rawBody: Buffer | undefined, signature: string | undefined): Promise<void> {
  if (!rawBody) {
    throw new ValidationError("Missing request body");
  }
  if (!signature) {
    throw new AuthenticationError("Missing webhook signature");
  }

  // Coding Rule 6: all external webhooks are verified before anything else
  // happens — an unsigned or tampered payload is rejected outright, never
  // parsed or acted on.
  const isValid = verifyWebhookSignature(rawBody.toString("utf8"), signature);
  if (!isValid) {
    throw new AuthenticationError("Invalid webhook signature");
  }

  const payload = JSON.parse(rawBody.toString("utf8")) as RazorpayWebhookPayload;
  const eventId = idempotencyKeyFor(payload);

  // Scenario D: log the event BEFORE processing, keyed on the idempotency
  // key. The unique constraint on webhook_events.event_id makes a duplicate
  // delivery's INSERT fail — caught here and treated as "already handled,"
  // never as a real error, and never processed a second time.
  try {
    await subscriptionRepository.recordWebhookEvent({ eventId, eventType: payload.event, payload });
  } catch {
    logger.info({ eventId, eventType: payload.event }, "Duplicate webhook event ignored (idempotency)");
    return;
  }

  try {
    await processEvent(payload);
    await subscriptionRepository.markWebhookProcessed(eventId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await subscriptionRepository.markWebhookError(eventId, message);
    throw err;
  }
}

async function processEvent(payload: RazorpayWebhookPayload): Promise<void> {
  switch (payload.event) {
    case "payment.captured":
      await handlePaymentCaptured(payload);
      return;
    case "payment.failed":
      await handlePaymentFailed(payload);
      return;
    case "refund.created":
    case "refund.processed":
      // Refunds initiated directly from the Razorpay dashboard (outside our
      // own admin refund endpoint) still need a local Refund record —
      // Scenario H's "original payment remains immutable, refund is a
      // separate record" applies regardless of which side initiated it.
      await handleRefundWebhook(payload);
      return;
    default:
      logger.info({ eventType: payload.event }, "Unhandled webhook event type (logged, no action)");
  }
}

async function handlePaymentCaptured(payload: RazorpayWebhookPayload): Promise<void> {
  const paymentEntity = payload.payload.payment?.entity;
  if (!paymentEntity) return;

  const payment = await subscriptionRepository.findPaymentByOrderId(paymentEntity.order_id);
  if (!payment) {
    logger.warn({ orderId: paymentEntity.order_id }, "Webhook for unknown order — ignoring");
    return;
  }

  // Defense in depth beyond the event-id-level idempotency check above: if
  // this exact Payment row was already captured (e.g. Razorpay reports a
  // second, different payment_id against the same already-paid order —
  // caught live while testing Scenario D with a test script that
  // accidentally generated a new random payment_id per run), do nothing
  // further rather than trying to re-activate/re-invoice and crashing on
  // the invoice table's unique payment_id constraint.
  if (payment.status === "CAPTURED") {
    logger.info({ paymentId: payment.id, orderId: paymentEntity.order_id }, "Payment already captured — ignoring");
    return;
  }

  // Scenario C: this webhook is the source of truth regardless of whether
  // the frontend's checkout-success callback ever fired — the subscription
  // activates here, not in response to any browser-side event.
  const now = new Date();

  if (payment.subscription) {
    // Renewal of an already-existing subscription.
    await subscriptionRepository.markPaymentCaptured(payment.id, paymentEntity.id);
    const periodEnd = periodEndFor(payment.subscription.plan.billingInterval, now);
    const renewed = await subscriptionRepository.renewSubscription(payment.subscription.id, now, periodEnd);
    await subscriptionRepository.createInvoice({
      subscriptionId: renewed.id,
      paymentId: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
    });
    // Scenario G's inverse: a successful renewal means the vendor is paid up
    // again — restore any entitlement-hidden media up to this plan's limits.
    await entitlementService.restoreInactiveMediaToLimits(
      payment.subscription.vendorId,
      entitlementService.readLimits(payment.subscription.plan),
    );
    return;
  }

  // First-time activation: no Subscription exists until this exact moment.
  if (!payment.pendingPlan) {
    logger.warn({ paymentId: payment.id }, "Captured payment has neither a subscription nor pending checkout info — ignoring");
    return;
  }
  const periodEnd = periodEndFor(payment.pendingPlan.billingInterval, now);
  const { subscription } = await subscriptionRepository.activatePendingCheckout(payment.id, paymentEntity.id, now, periodEnd);

  await subscriptionRepository.createInvoice({
    subscriptionId: subscription.id,
    paymentId: payment.id,
    amount: Number(payment.amount),
    currency: payment.currency,
  });
  await entitlementService.restoreInactiveMediaToLimits(subscription.vendorId, entitlementService.readLimits(payment.pendingPlan));
}

async function handlePaymentFailed(payload: RazorpayWebhookPayload): Promise<void> {
  const paymentEntity = payload.payload.payment?.entity;
  if (!paymentEntity) return;

  const payment = await subscriptionRepository.findPaymentByOrderId(paymentEntity.order_id);
  if (!payment) {
    logger.warn({ orderId: paymentEntity.order_id }, "Webhook for unknown order — ignoring");
    return;
  }

  await subscriptionRepository.markPaymentFailed(payment.id, paymentEntity.error_description);

  // A failed FIRST-time checkout (no subscriptionId yet) never created a
  // subscription at all — the vendor simply stays on the implicit FREE
  // plan, nothing to mark past-due. Scenario E's PAST_DUE handling only
  // applies to a RENEWAL payment failing against an already-ACTIVE
  // subscription — entitlements are only actually removed once the grace
  // period elapses, handled by a separate scheduled sweep (see
  // subscription.service's GRACE_PERIOD_DAYS), not inline here.
  if (payment.subscriptionId) {
    await subscriptionRepository.markPastDue(payment.subscriptionId);
  }
}

async function handleRefundWebhook(payload: RazorpayWebhookPayload): Promise<void> {
  const refundEntity = payload.payload.refund?.entity;
  if (!refundEntity) return;

  const payment = await subscriptionRepository.findPaymentForRefund(refundEntity.payment_id);
  if (!payment) {
    logger.warn({ paymentId: refundEntity.payment_id }, "Refund webhook for unknown payment — ignoring");
    return;
  }

  await subscriptionRepository.createRefundRecord({
    paymentId: payment.id,
    razorpayRefundId: refundEntity.id,
    amount: refundEntity.amount / 100,
    reason: undefined,
  });
}
