import { AuthenticationError, ValidationError } from "../../common/errors";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import { verifyWebhookSignature } from "../../integrations/payment/razorpay.client";
import * as entitlementService from "../entitlements/entitlement.service";
import * as notificationService from "../notifications/notification.service";
import { notifyWeddingWebsitePublished } from "../telegram/telegram.webhook.service";
import { prisma } from "../../config/database";
import { periodEndFor } from "../subscriptions/billing-period.util";
import * as subscriptionRepository from "../subscriptions/subscription.repository";
import * as weddingWebsiteService from "../wedding-website/wedding-website.service";
import * as vendorPaymentRepository from "../vendor-payments/vendor-payment.repository";
import type { RazorpayWebhookPayload } from "./webhook.types";


// Razorpay does not send a single top-level event id — the convention is to
// derive an idempotency key from the event type plus the underlying
// entity's own id (payment/refund ids are themselves unique per Razorpay
// event, so `${event}:${entityId}` is stable and unique per real event,
// while a genuine redelivery of the same event carries the same value).
function idempotencyKeyFor(payload: RazorpayWebhookPayload): string {
  const entityId =
    payload.payload.payment?.entity.id ??
    payload.payload.refund?.entity.id ??
    payload.payload.transfer?.entity.id ??
    payload.payload.account?.entity.id ??
    payload.payload.payment_link?.entity.id ??
    String(payload.created_at);
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
  // delivery's INSERT fail — caught here.
  //
  // A real bug caught live while verifying the same pattern for Telegram:
  // if the FIRST attempt's INSERT succeeds but processing then fails (e.g.
  // a transient error), the row exists with processedAt still null. Without
  // this check, Razorpay's own retry of the same event_id would be silently
  // dropped as "already handled" even though it was never actually
  // processed — a genuine message-loss bug, not the duplicate-suppression
  // Scenario D is meant to provide. Only a row that was genuinely completed
  // (processedAt set) is treated as a true duplicate; a still-pending or
  // previously-errored row is reprocessed instead.
  try {
    await subscriptionRepository.recordWebhookEvent({ eventId, eventType: payload.event, payload });
  } catch {
    const existing = await subscriptionRepository.findWebhookEvent(eventId);
    if (existing?.processedAt) {
      logger.info({ eventId, eventType: payload.event }, "Duplicate webhook event ignored (idempotency)");
      return;
    }
    logger.info({ eventId, eventType: payload.event }, "Retrying a previously-unsuccessful webhook event");
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
    case "payment_link.paid":
      await handlePaymentLinkPaid(payload);
      return;
    case "refund.created":
    case "refund.processed":
      // Refunds initiated directly from the Razorpay dashboard (outside our
      // own admin refund endpoint) still need a local Refund record —
      // Scenario H's "original payment remains immutable, refund is a
      // separate record" applies regardless of which side initiated it.
      await handleRefundWebhook(payload);
      return;
    case "account.updated":
    case "account.activated":
    case "account.under_review":
      await handleAccountWebhook(payload);
      return;
    case "transfer.processed":
    case "transfer.failed":
    case "transfer.reversed":
      await handleTransferWebhook(payload);
      return;
    default:
      logger.info({ eventType: payload.event }, "Unhandled webhook event type (logged, no action)");
  }
}

async function handlePaymentCaptured(payload: RazorpayWebhookPayload): Promise<void> {
  const paymentEntity = payload.payload.payment?.entity;
  if (!paymentEntity) return;

  // Check if this payment is for a Vendor Store Order
  if (paymentEntity.notes?.purpose === "VENDOR_STORE_ORDER" || paymentEntity.notes?.storeOrderId) {
    await handleStoreOrderPaymentCaptured(paymentEntity);
    return;
  }

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

  // Arch Phase 26 — a ₹49 wedding-website publish charge has no
  // subscription/pendingPlan concept at all; dispatch it to its own
  // publish flow before falling into the subscription-shaped logic below.
  // publishWeddingWebsite() is itself idempotent (no-ops if already
  // PUBLISHED — Business Rule 10), matching this handler's own duplicate-
  // capture defense above.
  if (payment.purpose === "WEDDING_WEBSITE") {
    if (!payment.weddingWebsiteId) {
      logger.warn({ paymentId: payment.id }, "WEDDING_WEBSITE payment with no weddingWebsiteId — ignoring");
      return;
    }
    await subscriptionRepository.markPaymentCaptured(payment.id, paymentEntity.id);
    // Web-checkout (Orders+Checkout.js) only ever charges a USER-owned
    // draft (createPublishOrder is only reachable via the web controller)
    // — no Telegram conversation can exist for this weddingWebsiteId, so
    // unlike handlePaymentLinkPaid above there's no bot push to send here.
    await weddingWebsiteService.publishWeddingWebsite(payment.weddingWebsiteId);
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
    // Arch Phase 18 Stage A — "Payment completed" (product.md §46). No
    // separate "Upgrade" event: this branch is a same-plan renewal today
    // (no caller currently creates a Payment pre-linked to a subscriptionId
    // for a plan change — see subscription.service.ts's initiateUpgrade,
    // which always routes a real plan change through the first-time
    // activation branch below via a fresh pendingPlanId), so isRenewal is
    // sufficient metadata rather than a near-duplicate event type.
    await logAnalyticsEvent({
      userId: undefined,
      eventType: "payment_completed",
      vendorId: payment.subscription.vendorId,
      metadata: { paymentId: payment.id, subscriptionId: renewed.id, planId: payment.subscription.planId, amount: Number(payment.amount), isRenewal: true },
    });
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

  // Arch Phase 18 Stage A — "Payment completed" (product.md §46). This
  // branch is reached both for a brand-new subscription AND a plan change
  // on top of an existing one (initiateUpgrade routes both through the same
  // pendingPlanId checkout path — see that function's own checkout_started
  // event, which does carry an isUpgrade flag from the vendor's
  // subscription state at checkout time). Duplicating that same isUpgrade
  // determination here would need an extra "did this vendor have a prior
  // subscription" query on the hot payment-capture path for a distinction
  // already answered by joining back to the checkout_started event's
  // metadata — so it's deliberately left out here.
  await logAnalyticsEvent({
    userId: undefined,
    eventType: "payment_completed",
    vendorId: subscription.vendorId,
    metadata: { paymentId: payment.id, subscriptionId: subscription.id, planId: payment.pendingPlan.id, amount: Number(payment.amount), isRenewal: false },
  });

  // Scenario B step 9 ("feature entitlements updated") + product.md §45's
  // SUBSCRIPTION_ACTIVATED event — first-time activation only, not renewal
  // (renewal isn't "newly activated", see the renewal branch above which
  // deliberately doesn't fire this).
  const vendor = await subscriptionRepository.findVendorOwner(subscription.vendorId);
  if (vendor?.ownerUserId) {
    await notificationService.notify({
      userId: vendor.ownerUserId,
      eventType: "SUBSCRIPTION_ACTIVATED",
      data: { planName: payment.pendingPlan.name },
      relatedEntityType: "subscription",
      relatedEntityId: subscription.id,
    });
  }
}

// Arch Phase 26's Telegram ₹49 publish flow — the Payment Link
// equivalent of handlePaymentCaptured above. Always WEDDING_WEBSITE
// purpose (Payment Links are only ever created by
// wedding-website.service.ts's createPublishPaymentLink), so this never
// needs the subscription-shaped branches handlePaymentCaptured has.
async function handlePaymentLinkPaid(payload: RazorpayWebhookPayload): Promise<void> {
  const linkEntity = payload.payload.payment_link?.entity;
  // Razorpay sends payload.payment.entity alongside payload.payment_link.entity
  // on this event — the actual payment made against the link, same shape as
  // a normal payment.captured event's payment entity. The link's own id is
  // only used to look up our Payment row (see razorpayPaymentLinkId's
  // schema comment); the underlying payment's id is what's stored as
  // razorpayPaymentId, consistent with every other capture path.
  const paymentEntity = payload.payload.payment?.entity;
  if (!linkEntity || !paymentEntity) return;

  const payment = await weddingWebsiteService.findPaymentByPaymentLinkId(linkEntity.id);
  if (!payment) {
    logger.warn({ paymentLinkId: linkEntity.id }, "Webhook for unknown payment link — ignoring");
    return;
  }

  if (payment.status === "CAPTURED") {
    logger.info({ paymentId: payment.id, paymentLinkId: linkEntity.id }, "Payment link already captured — ignoring");
    return;
  }
  if (!payment.weddingWebsiteId) {
    logger.warn({ paymentId: payment.id }, "WEDDING_WEBSITE payment link with no weddingWebsiteId — ignoring");
    return;
  }

  await subscriptionRepository.markPaymentCaptured(payment.id, paymentEntity.id);
  const { slug } = await weddingWebsiteService.publishWeddingWebsite(payment.weddingWebsiteId);
  // Telegram-only owners have no User account and so no in-app place to
  // see this confirmation — this webhook is the only moment we know
  // payment succeeded, so the bot push happens right here rather than
  // waiting for the user's next message. No-ops if the website wasn't
  // Telegram-owned (see notifyWeddingWebsitePublished).
  await notifyWeddingWebsitePublished(payment.weddingWebsiteId, `${env.FRONTEND_URL}/wedding/${slug}`);
}

async function handlePaymentFailed(payload: RazorpayWebhookPayload): Promise<void> {
  const paymentEntity = payload.payload.payment?.entity;
  if (!paymentEntity) return;

  if (paymentEntity.notes?.purpose === "VENDOR_STORE_ORDER" || paymentEntity.notes?.storeOrderId) {
    await handleStoreOrderPaymentFailed(paymentEntity);
    return;
  }

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

  // product.md §45's PAYMENT_FAILED fires either way — confirmed with the
  // user: a vendor whose first checkout attempt was declined deserves to
  // know why they're still on FREE, not just a renewal-failure vendor who
  // at least sees PAST_DUE in their own dashboard.
  const vendorId = payment.subscription?.vendorId ?? payment.pendingVendorId;
  if (vendorId) {
    const vendor = await subscriptionRepository.findVendorOwner(vendorId);
    if (vendor?.ownerUserId) {
      await notificationService.notify({
        userId: vendor.ownerUserId,
        eventType: "PAYMENT_FAILED",
        relatedEntityType: "payment",
        relatedEntityId: payment.id,
      });
    }
  }
}

async function handleRefundWebhook(payload: RazorpayWebhookPayload): Promise<void> {
  const refundEntity = payload.payload.refund?.entity;
  if (!refundEntity) return;

  const payment = await subscriptionRepository.findPaymentForRefund(refundEntity.payment_id);
  if (payment) {
    await subscriptionRepository.createRefundRecord({
      paymentId: payment.id,
      razorpayRefundId: refundEntity.id,
      amount: refundEntity.amount / 100,
      reason: undefined,
    });
    return;
  }

  // Check if refund is for a Vendor Store Order
  await handleStoreOrderRefund(refundEntity);
}

async function handleStoreOrderPaymentCaptured(paymentEntity: any): Promise<void> {
  const order = paymentEntity.notes?.storeOrderId
    ? await vendorPaymentRepository.findStoreOrderById(paymentEntity.notes.storeOrderId)
    : await vendorPaymentRepository.findStoreOrderByRazorpayOrderId(paymentEntity.order_id);

  if (!order) {
    logger.warn({ orderId: paymentEntity.order_id }, "Store order payment captured for unknown order — ignoring");
    return;
  }

  if (order.paymentStatus === "CAPTURED") {
    logger.info({ orderId: order.id }, "Store order payment already captured — ignoring");
    return;
  }

  const actualGatewayFee = typeof paymentEntity.fee === "number" ? paymentEntity.fee / 100 : undefined;

  await vendorPaymentRepository.markOrderPaymentCaptured(order.id, {
    razorpayPaymentId: paymentEntity.id,
    paidAt: new Date(),
    actualGatewayFee,
  });

  if (paymentEntity.order_id) {
    try {
      await vendorPaymentRepository.updatePaymentAttempt(order.id, paymentEntity.order_id, {
        razorpayPaymentId: paymentEntity.id,
        status: "CAPTURED",
      });
    } catch (err) {
      logger.warn({ err, orderId: order.id }, "Failed to update payment attempt status in webhook");
    }
  }

  const vendorOwner = await subscriptionRepository.findVendorOwner(order.store.vendorId);
  if (vendorOwner?.ownerUserId) {
    await notificationService.notify({
      userId: vendorOwner.ownerUserId,
      eventType: "LEAD_STATUS_UPDATED",
      data: {
        title: `Online Order #${order.orderNumber} Confirmed!`,
        message: `Customer ${order.customerName} completed payment of ₹${Number(order.totalAmount).toLocaleString("en-IN")}.`,
      },
      relatedEntityType: "store_order",
      relatedEntityId: order.id,
    });
  }

  await logAnalyticsEvent({
    userId: order.userId ?? undefined,
    eventType: "store_order_paid",
    vendorId: order.store.vendorId,
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
      paymentId: paymentEntity.id,
    },
  });
}

async function handleStoreOrderPaymentFailed(paymentEntity: any): Promise<void> {
  const order = paymentEntity.notes?.storeOrderId
    ? await vendorPaymentRepository.findStoreOrderById(paymentEntity.notes.storeOrderId)
    : await vendorPaymentRepository.findStoreOrderByRazorpayOrderId(paymentEntity.order_id);

  if (!order) return;
  await vendorPaymentRepository.markOrderPaymentFailed(order.id);

  if (paymentEntity.order_id) {
    try {
      await vendorPaymentRepository.updatePaymentAttempt(order.id, paymentEntity.order_id, {
        razorpayPaymentId: paymentEntity.id,
        status: "FAILED",
        failureCode: paymentEntity.error_code || null,
        failureReason: paymentEntity.error_description || paymentEntity.error_reason || null,
      });
    } catch (err) {
      logger.warn({ err, orderId: order.id }, "Failed to update payment attempt status on failure webhook");
    }
  }
}

async function handleStoreOrderRefund(refundEntity: any): Promise<void> {
  const storeOrder = refundEntity.notes?.orderId
    ? await vendorPaymentRepository.findStoreOrderById(refundEntity.notes.orderId)
    : (refundEntity.payment_id
        ? await prisma.vendorStoreOrder.findUnique({
            where: { razorpayPaymentId: refundEntity.payment_id },
            include: { refunds: true, store: { include: { vendor: true } } },
          })
        : null);

  if (!storeOrder) {
    logger.warn({ refundId: refundEntity.id, paymentId: refundEntity.payment_id }, "Refund webhook for unknown entity — ignoring");
    return;
  }

  const existingRefund = storeOrder.refunds?.find((r) => r.razorpayRefundId === refundEntity.id);
  if (existingRefund) {
    logger.info({ refundId: refundEntity.id }, "Store order refund already recorded — ignoring");
    return;
  }

  const refundAmount = refundEntity.amount / 100;
  const currentTotalRefunded = storeOrder.refunds?.reduce((sum, r) => sum + Number(r.amount), 0) ?? 0;
  const isFullyRefunded = currentTotalRefunded + refundAmount >= Number(storeOrder.totalAmount);

  await vendorPaymentRepository.createOrderRefundTx(storeOrder.id, {
    razorpayRefundId: refundEntity.id,
    amount: refundAmount,
    reason: refundEntity.notes?.reason || "Refund via gateway",
    isFullyRefunded,
  });
}

async function handleAccountWebhook(payload: RazorpayWebhookPayload): Promise<void> {
  const accountEntity = (payload.payload as any).account?.entity;
  if (!accountEntity?.id) return;

  const isActivated = payload.event === "account.activated" || accountEntity.status === "activated";
  const bankStatus = accountEntity.bank_account_verification?.status || undefined;
  const routeStatus = accountEntity.products?.find((p: any) => p.product_name === "route")?.status || undefined;

  await vendorPaymentRepository.updatePaymentAccountByRazorpayId(accountEntity.id, {
    status: isActivated ? "ACTIVE" : "PENDING_VERIFICATION",
    chargesEnabled: isActivated,
    payoutsEnabled: isActivated,
    ...(bankStatus ? { bankVerificationStatus: bankStatus } : {}),
    ...(routeStatus ? { routeActivationStatus: routeStatus } : {}),
  });
}

async function handleTransferWebhook(payload: RazorpayWebhookPayload): Promise<void> {
  const transferEntity = payload.payload.transfer?.entity;
  if (!transferEntity) return;

  const eventName = payload.event;
  const transferId = transferEntity.id;
  const recipient = transferEntity.recipient;
  const amount = transferEntity.amount / 100;
  const storeOrderId = transferEntity.notes?.storeOrderId;

  logger.info(
    { transferId, recipient, amount, eventName, status: transferEntity.status },
    "Razorpay Route transfer webhook received",
  );

  let order: any = null;
  if (storeOrderId) {
    order = await vendorPaymentRepository.findStoreOrderById(storeOrderId);
  }

  if (eventName === "transfer.failed") {
    const reason = transferEntity.error?.description || transferEntity.error?.reason || "Transfer settlement failed";
    const code = transferEntity.error?.code || null;
    logger.error(
      { transferId, recipient, amount, reason },
      "Razorpay Route linked account transfer failed!",
    );

    await vendorPaymentRepository.recordOrUpdateStoreTransfer(transferId, {
      orderId: storeOrderId,
      vendorId: order?.store?.vendorId,
      recipientAccountId: recipient,
      amount,
      currency: transferEntity.currency || "INR",
      status: "FAILED",
      failureCode: code,
      failureReason: reason,
      failedAt: new Date(),
    });

    if (order) {
      const existingNotes = order.notes ? `${order.notes} | ` : "";
      const bounceNote = `${existingNotes}[SETTLEMENT_ATTENTION: Transfer ${transferId} to ${recipient} failed: ${reason}]`;
      await prisma.vendorStoreOrder.update({
        where: { id: order.id },
        data: { notes: bounceNote },
      });

      if (order.store?.vendor?.ownerUserId) {
        await notificationService.notify({
          userId: order.store.vendor.ownerUserId,
          eventType: "LEAD_STATUS_UPDATED",
          data: {
            title: `Settlement Attention Required for Order #${order.orderNumber}`,
            message: `Razorpay Route failed to settle ₹${amount} to your linked account: ${reason}. Please verify your bank details in Settings.`,
          },
          relatedEntityType: "store_order",
          relatedEntityId: order.id,
        });
      }
    }
  } else if (eventName === "transfer.processed") {
    logger.info(
      { transferId, recipient, amount, storeOrderId },
      "Razorpay Route linked account transfer successfully processed",
    );

    await vendorPaymentRepository.recordOrUpdateStoreTransfer(transferId, {
      orderId: storeOrderId,
      vendorId: order?.store?.vendorId,
      recipientAccountId: recipient,
      amount,
      currency: transferEntity.currency || "INR",
      status: "PROCESSED",
      processedAt: new Date(),
    });

    const tr = transferEntity as any;
    const settlementId = tr.recipient_settlement_id || tr.settlement_id;
    if (settlementId) {
      await vendorPaymentRepository.recordOrUpdateStoreSettlement(settlementId, {
        vendorId: order?.store?.vendorId,
        orderId: storeOrderId,
        recipientAccountId: recipient,
        amount,
        status: "PROCESSED",
        processedAt: new Date(),
      });
    }
  } else if (eventName === "transfer.reversed") {
    logger.warn(
      { transferId, recipient, amount, storeOrderId },
      "Razorpay Route linked account transfer reversed",
    );

    await vendorPaymentRepository.recordOrUpdateStoreTransfer(transferId, {
      orderId: storeOrderId,
      vendorId: order?.store?.vendorId,
      recipientAccountId: recipient,
      amount,
      currency: transferEntity.currency || "INR",
      status: "REVERSED",
      reversedAt: new Date(),
    });
  }
}


