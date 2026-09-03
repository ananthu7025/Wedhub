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

// Payment Links (not Orders+Checkout.js) — the ₹49 wedding-website publish
// charge's Telegram path, since there's no browser inside a Telegram chat
// to run Checkout.js against a pre-created order. Returns a real,
// short, shareable URL the bot sends as a button; the eventual payment
// fires Razorpay's own payment_link.paid webhook event (see
// webhook.service.ts), correlated back to our Payment row via this
// link's own id (echoed in that event, set in `notes` here) — not via
// razorpayOrderId, since a Payment Link generates its own internal order
// that we never created or stored ahead of time.
export async function createPaymentLink(input: {
  amountInSmallestUnit: number;
  currency: string;
  description: string;
  contactName: string;
  // Telegram's Bot API never exposes a user's phone number unless they
  // explicitly share a contact card (a separate, unbuilt request_contact
  // flow) — omitted entirely rather than sent as a synthesized
  // placeholder. A real bug caught live: Razorpay's test-mode API
  // rejects placeholder-looking numbers outright ("Recurring digits in
  // customer contact are disallowed" for "9999999999"), and `contact` is
  // optional in Razorpay's own customer schema, so omitting it is both
  // simpler and more honest than guessing a fake number that happens to
  // pass validation.
  contactPhone: string | undefined;
  notes: Record<string, string>;
}): Promise<{ paymentLinkId: string; shortUrl: string }> {
  const link = await getClient().paymentLink.create({
    amount: input.amountInSmallestUnit,
    currency: input.currency,
    description: input.description,
    customer: input.contactPhone ? { name: input.contactName, contact: input.contactPhone } : { name: input.contactName },
    notify: { sms: false, email: false },
    notes: input.notes,
  });
  return { paymentLinkId: link.id, shortUrl: link.short_url };
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
