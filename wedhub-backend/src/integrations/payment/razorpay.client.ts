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
export interface RouteTransferInput {
  account: string;
  amount: number;
  currency: string;
  notes?: Record<string, string>;
  // on_hold: 0 - Do not hold this Route transfer (transfers immediately upon payment capture)
  on_hold?: 0 | 1;
}

export async function createOrder(input: {
  amountInSmallestUnit: number;
  currency?: string;
  receipt: string;
  notes: Record<string, string>;
  transfers?: RouteTransferInput[];
}): Promise<{ orderId: string }> {
  const isRouteOrder = Boolean(input.transfers && input.transfers.length > 0);
  // Razorpay Route requires INR currency and strictly forbids partial_payment when transfers are attached
  const currency = isRouteOrder ? "INR" : (input.currency || "INR");

  const params: Record<string, unknown> = {
    amount: input.amountInSmallestUnit,
    currency,
    receipt: input.receipt,
    notes: input.notes,
  };

  if (isRouteOrder) {
    params.transfers = input.transfers;
    params.partial_payment = false;
  }

  const order = await getClient().orders.create(params as any);
  return { orderId: order.id };
}

export async function fetchOrder(orderId: string) {
  return getClient().orders.fetch(orderId);
}

export async function fetchPayment(paymentId: string) {
  return getClient().payments.fetch(paymentId);
}

export async function fetchPaymentTransfers(paymentId: string) {
  const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/transfers`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${authHeader}`,
    },
  });
  if (!response.ok) {
    throw new ExternalServiceError(`Failed to fetch transfers for payment ${paymentId}`);
  }
  return response.json() as Promise<{ entity: string; count: number; items: any[] }>;
}

export async function fetchTransferWithSettlement(transferId: string) {
  const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1/transfers/${transferId}?expand[]=recipient_settlement`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${authHeader}`,
    },
  });
  if (!response.ok) {
    throw new ExternalServiceError(`Failed to fetch transfer settlement for transfer ${transferId}`);
  }
  return response.json();
}

export async function createPaymentLink(input: {
  amountInSmallestUnit: number;
  currency: string;
  description: string;
  contactName: string;
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

export async function createLinkedAccount(input: {
  email: string;
  phone: string;
  type: "standard";
  legalBusinessName: string;
  businessType?: string;
  contactName?: string;
  notes?: Record<string, string>;
}): Promise<{ accountId: string; status?: string }> {
  const client = getClient() as any;
  if (client.accounts && typeof client.accounts.create === "function") {
    const acc = await client.accounts.create({
      email: input.email,
      phone: input.phone,
      type: input.type,
      legal_business_name: input.legalBusinessName,
      business_type: input.businessType || "individual",
      contact_name: input.contactName || input.legalBusinessName,
      notes: input.notes,
    });
    const result: { accountId: string; status?: string } = { accountId: acc.id };
    if (acc.status) result.status = acc.status;
    return result;
  }

  // Fallback direct HTTPS request to Razorpay v2 API if SDK method differs
  const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v2/accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      email: input.email,
      phone: input.phone,
      type: input.type,
      legal_business_name: input.legalBusinessName,
      business_type: input.businessType || "individual",
      contact_name: input.contactName || input.legalBusinessName,
      notes: input.notes,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new ExternalServiceError(`Failed to create Razorpay linked account: ${errBody}`);
  }

  const data = (await response.json()) as { id: string; status?: string };
  const result: { accountId: string; status?: string } = { accountId: data.id };
  if (data.status) result.status = data.status;
  return result;
}


export async function fetchLinkedAccount(accountId: string) {
  const client = getClient() as any;
  if (client.accounts && typeof client.accounts.fetch === "function") {
    return client.accounts.fetch(accountId);
  }

  const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v2/accounts/${accountId}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${authHeader}`,
    },
  });

  if (!response.ok) {
    throw new ExternalServiceError(`Failed to fetch Razorpay linked account ${accountId}`);
  }

  return response.json();
}

export async function createAccountLink(accountId: string): Promise<{ shortUrl: string }> {
  const client = getClient() as any;
  if (client.accountLinks && typeof client.accountLinks.create === "function") {
    const link = await client.accountLinks.create({
      account_id: accountId,
      type: "account_onboarding",
    });
    return { shortUrl: link.short_url || link.url };
  }

  const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v2/accounts/${accountId}/account_links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      type: "account_onboarding",
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new ExternalServiceError(`Failed to create Razorpay account onboarding link: ${errBody}`);
  }

  const data = (await response.json()) as { url?: string; short_url?: string };
  return { shortUrl: (data.short_url || data.url) as string };
}

export async function createRefund(
  paymentId: string,
  amountInSmallestUnit: number | undefined,
  options?: { reverseTransfer?: boolean; notes?: Record<string, string> },
) {
  // Omitting `amount` refunds the payment's full remaining amount, per
  // Razorpay's API — an empty object is the documented way to request that,
  // not a no-op.
  const params: Record<string, unknown> = {};
  if (amountInSmallestUnit !== undefined) {
    params.amount = amountInSmallestUnit;
  }
  if (options?.reverseTransfer) {
    params.reverse_all = 1;
  }
  if (options?.notes) {
    params.notes = options.notes;
  }

  const refund = await getClient().payments.refund(paymentId, params as any);
  return { refundId: refund.id };
}

export async function reverseTransfer(
  transferId: string,
  amountInSmallestUnit?: number,
  notes?: Record<string, string>,
): Promise<{ reversalId: string; amount: number }> {
  const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const payload: Record<string, unknown> = {};
  if (amountInSmallestUnit !== undefined) payload.amount = amountInSmallestUnit;
  if (notes) payload.notes = notes;

  const response = await fetch(`https://api.razorpay.com/v1/transfers/${transferId}/reversals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new ExternalServiceError(`Failed to reverse transfer ${transferId}: ${errBody}`);
  }

  const data = (await response.json()) as { id: string; amount: number };
  return { reversalId: data.id, amount: data.amount };
}

export async function createStakeholder(
  accountId: string,
  input: {
    name: string;
    email: string;
    phone?: string;
    relationship?: {
      director?: boolean;
      executive?: boolean;
    };
    notes?: Record<string, string>;
  },
): Promise<{ stakeholderId: string }> {
  const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v2/accounts/${accountId}/stakeholders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      phone: input.phone,
      relationship: input.relationship || { executive: true },
      notes: input.notes,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new ExternalServiceError(`Failed to create stakeholder for account ${accountId}: ${errBody}`);
  }

  const data = (await response.json()) as { id: string };
  return { stakeholderId: data.id };
}

export async function requestRouteProduct(
  accountId: string,
): Promise<{ productId: string; routeActivationStatus?: string | undefined }> {
  const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v2/accounts/${accountId}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      product_name: "route",
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new ExternalServiceError(`Failed to request Route product for account ${accountId}: ${errBody}`);
  }

  const data = (await response.json()) as { id: string; activation_status?: string };
  return { productId: data.id, routeActivationStatus: data.activation_status ?? undefined };
}

export async function configureRouteProduct(
  accountId: string,
  productId: string,
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    beneficiaryName: string;
  },
): Promise<{ productId: string; routeActivationStatus?: string | undefined }> {
  const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v2/accounts/${accountId}/products/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      settlements: {
        account_number: bankDetails.accountNumber,
        ifsc_code: bankDetails.ifscCode,
        beneficiary_name: bankDetails.beneficiaryName,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new ExternalServiceError(`Failed to configure Route product for account ${accountId}: ${errBody}`);
  }

  const data = (await response.json()) as { id: string; activation_status?: string };
  return { productId: data.id, routeActivationStatus: data.activation_status ?? undefined };
}

export async function fetchAccount(
  accountId: string,
): Promise<{
  id: string;
  status: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  products?: Array<{ product_name: string; status: string }>;
}> {
  const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v2/accounts/${accountId}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${authHeader}`,
    },
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new ExternalServiceError(`Failed to fetch account ${accountId}: ${errBody}`);
  }

  return response.json() as Promise<any>;
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
