import { createHmac } from "node:crypto";
import Razorpay from "razorpay";
import { env } from "../../config/env";
import { ExternalServiceError } from "../../common/errors";

let client: Razorpay | undefined;

function isConfigured(): boolean {
  return !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

function getClient(): Razorpay {
  if (!isConfigured()) {
    throw new ExternalServiceError("Payment provider is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  if (!client) {
    client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID as string,
      key_secret: env.RAZORPAY_KEY_SECRET as string,
    });
  }

  return client;
}

export function isPaymentProviderConfigured(): boolean {
  return isConfigured();
}

// Amount in the given currency's smallest unit (e.g. paise for INR), per
// Razorpay's convention — the caller is responsible for converting.
export async function createOrder(input: {
  amountInSmallestUnit: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}): Promise<{ orderId: string }> {
  const order = await getClient().orders.create({
    amount: input.amountInSmallestUnit,
    currency: input.currency,
    receipt: input.receipt,
    notes: input.notes,
  });
  return { orderId: order.id };
}

export async function fetchPayment(paymentId: string) {
  return getClient().payments.fetch(paymentId);
}

export async function createRefund(paymentId: string, amountInSmallestUnit: number | undefined) {
  // Omitting `amount` refunds the payment's full remaining amount, per
  // Razorpay's API — an empty object is the documented way to request that,
  // not a no-op.
  const params = amountInSmallestUnit !== undefined ? { amount: amountInSmallestUnit } : {};
  const refund = await getClient().payments.refund(paymentId, params);
  return { refundId: refund.id };
}

// Razorpay's own static helper — verifies the HMAC-SHA256 signature Razorpay
// sends in the `X-Razorpay-Signature` header against the raw request body,
// using the webhook secret configured in the Razorpay dashboard (product.md
// §29: webhooks must be "signature verified").
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new ExternalServiceError("RAZORPAY_WEBHOOK_SECRET is not configured.");
  }
  return Razorpay.validateWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET);
}

// Verifies the checkout-completion signature Razorpay's frontend widget
// returns (order_id|payment_id signed with the key secret) — a SEPARATE
// signature from the webhook one above, used only to sanity-check the
// frontend's callback before treating a payment as provisionally successful.
// The webhook remains the actual source of truth (Scenario C) regardless.
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET as string)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}
