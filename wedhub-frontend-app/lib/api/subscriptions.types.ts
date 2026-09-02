/**
 * Backend response shapes for the vendor-facing subscription/billing
 * surface (GET /plans, /subscriptions/me/*) — verified against
 * wedhub-backend/src/modules/{plans,subscriptions} during Frontend Arch
 * Phase 7 research.
 *
 * Prisma Decimal fields (price, amount) serialize as strings over JSON.
 *
 * Real backend gaps confirmed during research (see
 * frontenddocs/10-risks-and-open-questions.md for the full entries):
 * - No entitlements HTTP endpoint exists — plan limits/features are read
 *   directly from SubscriptionPlan.limits/features JSON (embedded in
 *   GET /subscriptions/me's `plan`), which does NOT merge in FREE-tier
 *   defaults for missing keys the way the backend's internal
 *   entitlement.service.ts does. A vendor with no Subscription row at all
 *   (implicit FREE) has `subscription: null` — the frontend must render
 *   FREE-tier defaults itself in that case, not assume a `plan` object.
 * - Payment confirmation is 100% webhook-driven — there is no "verify
 *   payment" endpoint. After Razorpay Checkout's client-side success
 *   callback, the only correct next step is to poll GET /subscriptions/me
 *   until it reflects the new plan, not to treat the callback itself as
 *   confirmation.
 * - No real Razorpay test-mode credentials exist in this dev environment,
 *   so checkout can be verified up to Checkout.js's invocation but not a
 *   completed payment.
 */

export type PlanTier = "FREE" | "PRO" | "PREMIUM";
export type BillingInterval = "MONTHLY" | "YEARLY";
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "PAUSED" | "CANCELLED" | "EXPIRED";
export type PaymentStatus = "CREATED" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "REFUNDED";
export type InvoiceStatus = "ISSUED" | "PAID" | "VOID";

export interface PlanLimits {
  portfolio_limit?: number;
  video_limit?: number;
}

export interface PlanFeatures {
  analytics_level?: "basic" | "advanced";
  lead_access?: boolean;
  featured_eligibility?: boolean;
  promotional_placement?: boolean;
  response_tools?: boolean;
  priority_support?: boolean;
}

// ---- GET /plans (public) ----
export interface SubscriptionPlan {
  id: string;
  tier: PlanTier;
  billingInterval: BillingInterval;
  name: string;
  price: string;
  currency: string;
  trialDays: number;
  features: PlanFeatures;
  limits: PlanLimits;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- GET /subscriptions/me ----
export interface Subscription {
  id: string;
  vendorId: string;
  planId: string;
  status: SubscriptionStatus;
  razorpaySubscriptionId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  pastDueSince: string | null;
  couponId: string | null;
  createdAt: string;
  updatedAt: string;
  plan: SubscriptionPlan;
}

// ---- POST /subscriptions/me/upgrade ----
export interface InitiateUpgradeBody {
  planId: string;
  couponCode?: string;
}

export interface CheckoutInfo {
  orderId: string;
  paymentId: string;
  amount: string;
  currency: string;
}

export interface InitiateUpgradeResult {
  subscription: Subscription | null;
  checkout: CheckoutInfo | null;
}

// ---- POST /subscriptions/me/cancel ----
export interface CancelSubscriptionBody {
  immediate?: boolean;
}

// POST /subscriptions/me/cancel and /undo-cancel return the Subscription
// row WITHOUT a `plan` include (confirmed via live curl — only
// GET /subscriptions/me includes `plan`) — this narrower type reflects
// that so callers can't assume `.plan` is present without re-fetching.
export type SubscriptionWithoutPlan = Omit<Subscription, "plan">;

// ---- GET /subscriptions/me/invoices ----
export interface Invoice {
  id: string;
  subscriptionId: string;
  paymentId: string | null;
  amount: string;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  payment: Payment | null;
}

// ---- GET /subscriptions/me/payments ----
export interface Payment {
  id: string;
  subscriptionId: string | null;
  pendingVendorId: string | null;
  pendingPlanId: string | null;
  pendingCouponId: string | null;
  provider: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}
