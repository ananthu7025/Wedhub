"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { UnavailablePanel } from "@/components/admin/UnavailablePanel";
import { createAdminPlan, updateAdminPlan, createAdminCoupon } from "@/lib/api/admin-client";
import type { AdminPlan, BillingInterval, CouponDiscountType, PlanTier } from "@/lib/api/admin.types";
import { formatApiError } from "@/lib/utils/error";
import { PlanFormModal } from "./PlanFormModal";

/**
 * Subscriptions & payments (Frontend Arch Phase 10), matching
 * wedhub-frontend/admin/subscriptions.html's 5-tab layout. Real gaps vs.
 * the mockup, confirmed via research (see admin.types.ts's header
 * comment): Plans is fully real (list/create/update, incl. deactivate).
 * Active Subscriptions, Transactions and Webhooks have no backend list
 * endpoint at all — rendered as explicit unavailable states rather than
 * fabricated rows, per user decision. Coupons has a real create-only
 * endpoint — wired for real, with an unavailable-state list below it.
 */

type TabId = "plans" | "subscriptions" | "transactions" | "webhooks" | "coupons";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "plans", label: "Plans" },
  { id: "subscriptions", label: "Active Subscriptions" },
  { id: "transactions", label: "Transactions" },
  { id: "webhooks", label: "Webhooks" },
  { id: "coupons", label: "Coupons" },
];

function tierBadgeVariant(tier: PlanTier): "grey" | "crimson" {
  return tier === "PREMIUM" ? "crimson" : "grey";
}

export function SubscriptionsBoard({ initialPlans }: { initialPlans: AdminPlan[] }) {
  const [tab, setTab] = useState<TabId>("plans");
  const [plans, setPlans] = useState(initialPlans);
  const [editingPlan, setEditingPlan] = useState<AdminPlan | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(body: { tier: PlanTier; billingInterval: BillingInterval; name: string; price: number; trialDays: number }): Promise<{ success: boolean; error?: string }> {
    const result = await createAdminPlan(body);
    if (!result.success) {
      const errMsg = formatApiError(result.error);
      setError(errMsg);
      return { success: false, error: errMsg };
    }
    setPlans((prev) => [...prev, result.data]);
    setEditingPlan(null);
    return { success: true };
  }

  async function handleUpdate(id: string, body: { name: string; price: number; trialDays: number; isActive: boolean }): Promise<{ success: boolean; error?: string }> {
    const result = await updateAdminPlan(id, body);
    if (!result.success) {
      const errMsg = formatApiError(result.error);
      setError(errMsg);
      return { success: false, error: errMsg };
    }
    setPlans((prev) => prev.map((p) => (p.id === id ? result.data : p)));
    setEditingPlan(null);
    return { success: true };
  }

  async function handleToggleActive(plan: AdminPlan) {
    const result = await updateAdminPlan(plan.id, { isActive: !plan.isActive });
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? result.data : p)));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Subscriptions & payments</h1>
        <p className="text-sm text-text-grey">Plan pricing, active subscriptions, transactions, webhooks and coupons.</p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-[13px] font-bold ${
              tab === t.id ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "plans" && (
        <div>
          <div className="mb-4 flex items-center justify-between rounded-md bg-byzantine-blue-10 p-3.5 text-[13px] text-byzantine-blue-70">
            <span>Prices and feature limits are admin-configurable. Editing a plan here only affects new subscriptions and renewals going forward.</span>
            <button
              onClick={() => setEditingPlan("new")}
              className="ml-4 flex-shrink-0 rounded-md bg-brand-primary px-3.5 py-2 text-xs font-bold text-white"
            >
              + Create plan
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className={`rounded-xl border p-5 ${plan.tier === "PREMIUM" ? "border-brand-primary" : "border-border"}`}>
                <div className="mb-1.5 flex items-center justify-between">
                  <Badge variant={tierBadgeVariant(plan.tier)}>
                    {plan.tier} · {plan.billingInterval}
                  </Badge>
                  <Badge variant={plan.isActive ? "green" : "grey"}>{plan.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="mb-1 text-lg font-bold">{plan.name}</p>
                <p className="mb-3 text-2xl font-bold">
                  ₹{Number(plan.price).toLocaleString("en-IN")}
                  <span className="text-xs font-medium text-text-grey"> /{plan.billingInterval === "MONTHLY" ? "month" : "year"}</span>
                </p>
                <p className="mb-3 text-xs text-text-grey">
                  {plan.trialDays > 0 ? `${plan.trialDays}-day trial · ` : ""}
                  {plan.limits.portfolio_limit ?? "—"} portfolio images · {plan.limits.video_limit ?? "—"} videos
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingPlan(plan)}
                    className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-xs font-bold text-text-dark"
                  >
                    Edit plan
                  </button>
                  <button
                    onClick={() => handleToggleActive(plan)}
                    className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-xs font-bold text-text-dark"
                  >
                    {plan.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "subscriptions" && (
        <UnavailablePanel
          title="No admin subscriptions list endpoint"
          reason="The backend has no GET /admin/subscriptions (or similar) list endpoint — only refund and coupon-creation actions exist under /admin/subscriptions. Subscription records exist per-vendor (GET /subscriptions/me for the owning vendor), but there is no cross-vendor admin view to display here yet."
        />
      )}

      {tab === "transactions" && (
        <UnavailablePanel
          title="No admin transactions list endpoint"
          reason="Payment records are captured by the backend (via Razorpay webhooks), but no admin endpoint exposes them as a list. The modules/payments/ directory is an empty stub — this table has nothing to fetch from yet."
        />
      )}

      {tab === "webhooks" && (
        <UnavailablePanel
          title="No admin webhooks list endpoint"
          reason="Every inbound Razorpay webhook call is logged to a WebhookEvent row (with idempotency key, event type and processed/error state) before processing, but no admin GET endpoint exists to view that log yet."
        />
      )}

      {tab === "coupons" && (
        <div>
          <CreateCouponForm onCreated={() => setError(null)} onError={setError} />
          <div className="mt-5">
            <UnavailablePanel
              title="No admin coupons list endpoint"
              reason="POST /admin/subscriptions/coupons is the only coupon endpoint that exists — there is no GET to list previously created coupons, and no PATCH/DELETE to update or deactivate one. A coupon created above cannot be viewed again from this screen."
            />
          </div>
        </div>
      )}

      {editingPlan && (
        <PlanFormModal
          plan={editingPlan === "new" ? null : editingPlan}
          onClose={() => setEditingPlan(null)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}

function CreateCouponForm({ onCreated, onError }: { onCreated: () => void; onError: (message: string) => void }) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("10");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setSaving(true);
    setCreated(null);
    const result = await createAdminCoupon({ code: code.trim(), discountType, discountValue: Number(discountValue) });
    setSaving(false);
    if (!result.success) {
      onError(formatApiError(result.error));
      return;
    }
    onCreated();
    setCreated(result.data.code);
    setCode("");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-bold">Create coupon</h3>
          <p className="text-xs text-text-grey">Discount codes redeemable at checkout.</p>
        </div>
      </div>
      {created && (
        <div className="mb-3 rounded-md bg-emerald-10 p-3 text-[13px] text-emerald-70">
          Coupon <strong>{created}</strong> created. (No list view exists to see it again — copy the code now if you need it.)
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-text-grey">Code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WEDHUB25"
            maxLength={50}
            className="w-40 rounded-md border border-border px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-text-grey">Type</span>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as CouponDiscountType)}
            className="w-44 rounded-md border border-border px-3 py-2 text-sm"
          >
            <option value="PERCENTAGE">Percentage off</option>
            <option value="FIXED_AMOUNT">Fixed amount off (₹)</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-text-grey">Value</span>
          <input
            type="number"
            min={0}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className="w-28 rounded-md border border-border px-3 py-2 text-sm"
            required
          />
        </label>
        <button
          type="submit"
          disabled={saving || !code.trim()}
          className="rounded-md bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "Creating…" : "+ Create coupon"}
        </button>
      </div>
    </form>
  );
}
