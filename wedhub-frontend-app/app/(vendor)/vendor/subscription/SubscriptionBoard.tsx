"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { initiateUpgrade, cancelMySubscription, undoMyCancellation, getMySubscriptionClient } from "@/lib/api/subscriptions-client";
import type { Invoice, Subscription, SubscriptionPlan, SubscriptionStatus } from "@/lib/api/subscriptions.types";
import { CheckoutButton } from "./CheckoutButton";

/**
 * Subscription page (Frontend Arch Phase 7), matching
 * wedhub-frontend/vendor/subscription.html's plan cards + current-subscription
 * + invoice history. Real backend behaviors this UI must respect (see
 * lib/api/subscriptions.types.ts's header comment and
 * frontenddocs/10-risks-and-open-questions.md):
 * - subscription === null means the vendor is on the implicit FREE plan —
 *   not an error/loading state.
 * - There is no dedicated "downgrade" endpoint — downgrading to Free is
 *   cancelSubscription (immediate or at period end), same as the mockup's
 *   disabled "Downgrade to Free" button implies is Free-card-specific (it's
 *   actually just "Cancel subscription" reframed).
 * - A trial-eligible paid plan (trialDays > 0) activates immediately with
 *   no payment (checkout: null in the response) — the UI must handle that
 *   path distinctly from a real checkout.
 * - Only MONTHLY-interval plans are used for the plan-card grid (mirroring
 *   the mockup's simple 3-card layout); YEARLY variants exist in the real
 *   plan data but aren't surfaced in this pass — a billing-interval toggle
 *   is a reasonable follow-up, not required to match the mockup.
 */

function billingLabel(interval: SubscriptionPlan["billingInterval"]): string {
  return interval === "MONTHLY" ? "/month" : "/year";
}

function statusBadgeVariant(status: SubscriptionStatus): "green" | "amber" | "red" | "grey" | "blue" {
  switch (status) {
    case "ACTIVE":
      return "green";
    case "TRIALING":
      return "blue";
    case "PAST_DUE":
      return "amber";
    case "PAUSED":
      return "grey";
    case "CANCELLED":
    case "EXPIRED":
      return "red";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function SubscriptionBoard({
  initialPlans,
  initialSubscription,
  invoices,
}: {
  initialPlans: SubscriptionPlan[];
  initialSubscription: Subscription | null;
  invoices: Invoice[];
}) {
  const [subscription, setSubscription] = useState(initialSubscription);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ plan: SubscriptionPlan; orderId: string; amount: string; currency: string } | null>(null);
  const [polling, setPolling] = useState(false);

  const monthlyPlans = initialPlans.filter((p) => p.billingInterval === "MONTHLY").sort((a, b) => Number(a.price) - Number(b.price));
  const currentTier = subscription?.plan.tier ?? "FREE";

  async function handleSelectPlan(plan: SubscriptionPlan) {
    if (plan.tier === currentTier) return;
    setError(null);

    if (plan.tier === "FREE") {
      if (!confirm(`Downgrade to Free? You'll lose ${currentTier} benefits at the end of the current billing cycle.`)) return;
      setPending(plan.id);
      const result = await cancelMySubscription({ immediate: false });
      setPending(null);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      // cancel/undo-cancel responses omit `plan` — merge back the plan we
      // already have client-side rather than losing it (see
      // subscriptions.types.ts's SubscriptionWithoutPlan comment).
      setSubscription((prev) => (prev ? { ...result.data, plan: prev.plan } : null));
      return;
    }

    setPending(plan.id);
    const result = await initiateUpgrade({ planId: plan.id });
    setPending(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }

    if (result.data.subscription) {
      // Trial-eligible plan — activated immediately, no payment needed.
      setSubscription(result.data.subscription);
      return;
    }

    if (result.data.checkout) {
      setCheckout({ plan, orderId: result.data.checkout.orderId, amount: result.data.checkout.amount, currency: result.data.checkout.currency });
    }
  }

  async function pollForActivation() {
    setPolling(true);
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const result = await getMySubscriptionClient();
      if (result.success && result.data && result.data.status === "ACTIVE") {
        setSubscription(result.data);
        break;
      }
    }
    setPolling(false);
    setCheckout(null);
  }

  async function handleCancel() {
    if (!subscription) return;
    if (!confirm(`Cancel your ${subscription.plan.name} subscription? You will lose ${subscription.plan.name} benefits at the end of the current billing cycle.`)) return;
    setPending("cancel");
    setError(null);
    const result = await cancelMySubscription({ immediate: false });
    setPending(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setSubscription((prev) => (prev ? { ...result.data, plan: prev.plan } : null));
  }

  async function handleUndoCancel() {
    setPending("undo-cancel");
    setError(null);
    const result = await undoMyCancellation();
    setPending(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setSubscription((prev) => (prev ? { ...result.data, plan: prev.plan } : null));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-sm text-text-grey">Manage your WedHub plan and billing.</p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      {checkout && (
        <div className="mb-5 rounded-xl border border-border bg-white p-6">
          <h3 className="mb-2 text-base font-bold">Complete payment for {checkout.plan.name}</h3>
          <p className="mb-4 text-sm text-text-grey">
            Amount: {checkout.currency} {Number(checkout.amount).toLocaleString("en-IN")} · Order {checkout.orderId}
          </p>
          <CheckoutButton
            orderId={checkout.orderId}
            amount={checkout.amount}
            currency={checkout.currency}
            planName={checkout.plan.name}
            onSuccess={pollForActivation}
          />
          {polling && <p className="mt-3 text-sm text-text-grey">Waiting for payment confirmation…</p>}
        </div>
      )}

      <div className="mb-7 grid grid-cols-3 gap-5 max-[900px]:grid-cols-1">
        {monthlyPlans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border bg-white p-6 ${isCurrent ? "border-2 border-brand-primary" : "border-border"}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-5">
                  <Badge variant="crimson">Current plan</Badge>
                </div>
              )}
              <div className="mb-2.5 text-sm font-bold uppercase tracking-wide text-text-grey">{plan.name}</div>
              <div className="mb-1 text-[32px] font-bold">
                ₹{Number(plan.price).toLocaleString("en-IN")}
                <span className="text-sm font-semibold text-text-grey">{billingLabel(plan.billingInterval)}</span>
              </div>
              {plan.trialDays > 0 && !isCurrent && (
                <p className="mb-2 text-xs text-emerald-70">{plan.trialDays}-day free trial</p>
              )}
              <ul className="mb-5.5 flex-1 list-none space-y-1.5 p-0 text-[13.5px] text-text-body">
                <li>Portfolio limit: {plan.limits.portfolio_limit ?? 10}</li>
                <li>Video limit: {plan.limits.video_limit ?? 1}</li>
                <li>Analytics: {plan.features.analytics_level === "advanced" ? "Advanced" : "Basic"}</li>
                {plan.features.featured_eligibility && <li>Featured placement eligible</li>}
                {plan.features.promotional_placement && <li>Promotional placement</li>}
                {plan.features.response_tools && <li>Response tools</li>}
                {plan.features.priority_support && <li>Priority support</li>}
              </ul>
              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={isCurrent || pending === plan.id}
                className={`w-full rounded-md py-2.5 text-center text-sm font-bold ${
                  isCurrent
                    ? "cursor-default border border-border bg-white text-text-grey opacity-60"
                    : plan.tier === "FREE"
                      ? "border border-border bg-white text-text-dark hover:bg-surface-input"
                      : "bg-brand-primary text-white hover:opacity-90"
                }`}
              >
                {isCurrent
                  ? "Current plan"
                  : pending === plan.id
                    ? "Please wait…"
                    : plan.tier === "FREE"
                      ? "Downgrade to Free"
                      : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {subscription && (
        <div className="mb-6 rounded-xl border border-border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold">Current subscription</h3>
            <Badge variant={statusBadgeVariant(subscription.status)}>{subscription.status.replace(/_/g, " ")}</Badge>
          </div>
          <div className="mb-5 grid grid-cols-3 gap-4 text-sm max-[700px]:grid-cols-1">
            <div>
              <div className="mb-1 text-xs text-text-grey">Plan</div>
              <div className="font-semibold">
                {subscription.plan.name} — ₹{Number(subscription.plan.price).toLocaleString("en-IN")}
                {billingLabel(subscription.plan.billingInterval)}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-text-grey">
                {subscription.cancelAtPeriodEnd ? "Access ends" : "Next billing date"}
              </div>
              <div className="font-semibold">{formatDate(subscription.currentPeriodEnd)}</div>
            </div>
            {subscription.trialEndsAt && subscription.status === "TRIALING" && (
              <div>
                <div className="mb-1 text-xs text-text-grey">Trial ends</div>
                <div className="font-semibold">{formatDate(subscription.trialEndsAt)}</div>
              </div>
            )}
          </div>
          {subscription.cancelAtPeriodEnd ? (
            <div className="flex items-center gap-3">
              <p className="text-[13px] text-text-grey">
                Your subscription will end on {formatDate(subscription.currentPeriodEnd)} and revert to Free.
              </p>
              <button
                onClick={handleUndoCancel}
                disabled={pending === "undo-cancel"}
                className="rounded-md border border-border bg-white px-4 py-2 text-[13px] font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
              >
                Undo cancellation
              </button>
            </div>
          ) : (
            subscription.plan.tier !== "FREE" && (
              <button
                onClick={handleCancel}
                disabled={pending === "cancel"}
                className="rounded-md bg-red px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
              >
                Cancel subscription
              </button>
            )
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-white p-6">
        <h3 className="mb-4 text-base font-bold">Invoice history</h3>
        {invoices.length === 0 ? (
          <p className="text-sm text-text-grey">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-xs text-text-grey">
                  <th className="pb-2 font-semibold">Invoice date</th>
                  <th className="pb-2 font-semibold">Amount</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-neutral-grey-20 last:border-b-0">
                    <td className="py-2.5">{formatDate(invoice.issuedAt)}</td>
                    <td className="py-2.5">
                      {invoice.currency} {Number(invoice.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5">
                      <Badge variant={invoice.status === "PAID" ? "green" : invoice.status === "VOID" ? "grey" : "amber"}>
                        {invoice.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
