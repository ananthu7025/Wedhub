import { apiFetch } from "./client";
import type { Invoice, Payment, Subscription, SubscriptionPlan } from "./subscriptions.types";

/**
 * Server-only, authenticated reads for the vendor subscription/billing
 * surface (Frontend Arch Phase 7). Ownership-gated the same way as
 * /vendors/me/* and /leads/* (getOwnedVendorOrThrow) — no vendorId param
 * needed. GET /plans is the one public, unauthenticated route here.
 */

export function listPlans() {
  return apiFetch<SubscriptionPlan[]>("/plans", { skipAuth: true });
}

export function getMySubscription() {
  return apiFetch<Subscription | null>("/subscriptions/me");
}

export function listMyInvoices() {
  return apiFetch<Invoice[]>("/subscriptions/me/invoices");
}

export function listMyPayments() {
  return apiFetch<Payment[]>("/subscriptions/me/payments");
}
