"use client";

import { useState } from "react";
import type { AdminPlan, BillingInterval, PlanTier } from "@/lib/api/admin.types";

const TIERS: PlanTier[] = ["FREE", "PRO", "PREMIUM"];
const INTERVALS: BillingInterval[] = ["MONTHLY", "YEARLY"];

/**
 * Create/edit modal for a SubscriptionPlan. tier/billingInterval/currency
 * are only settable at creation (confirmed via updatePlanSchema, which
 * omits all three) — those fields are locked once editing an existing plan.
 */
export function PlanFormModal({
  plan,
  onClose,
  onCreate,
  onUpdate,
}: {
  plan: AdminPlan | null;
  onClose: () => void;
  onCreate: (body: { tier: PlanTier; billingInterval: BillingInterval; name: string; price: number; trialDays: number }) => Promise<{ success: boolean; error?: string }>;
  onUpdate: (id: string, body: { name: string; price: number; trialDays: number; isActive: boolean }) => Promise<{ success: boolean; error?: string }>;
}) {
  const [tier, setTier] = useState<PlanTier>(plan?.tier ?? "PRO");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(plan?.billingInterval ?? "MONTHLY");
  const [name, setName] = useState(plan?.name ?? "");
  const [price, setPrice] = useState(plan?.price ?? "0");
  const [trialDays, setTrialDays] = useState(String(plan?.trialDays ?? 0));
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const result = plan
      ? await onUpdate(plan.id, { name: name.trim(), price: Number(price), trialDays: Number(trialDays), isActive })
      : await onCreate({ tier, billingInterval, name: name.trim(), price: Number(price), trialDays: Number(trialDays) });
    setSaving(false);
    if (!result.success) {
      setError(result.error || "Could not save plan");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[440px] rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-bold">{plan ? `Edit ${plan.name}` : "Create plan"}</h3>
        {error && <div className="mb-3 rounded-md bg-red-10 p-2.5 text-[12px] text-red-70">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!plan && (
            <div className="flex gap-3">
              <label className="flex-1 block">
                <span className="mb-1.5 block text-xs font-semibold text-text-grey">Tier</span>
                <select value={tier} onChange={(e) => setTier(e.target.value as PlanTier)} className="w-full rounded-md border border-border px-3 py-2 text-sm">
                  {TIERS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="flex-1 block">
                <span className="mb-1.5 block text-xs font-semibold text-text-grey">Billing interval</span>
                <select
                  value={billingInterval}
                  onChange={(e) => setBillingInterval(e.target.value as BillingInterval)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                >
                  {INTERVALS.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-grey">Plan name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-grey">Price (₹)</span>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-grey">Trial days</span>
            <input
              type="number"
              min={0}
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
          {plan && (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active (visible on public /plans)
            </label>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 rounded-md bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-dark">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
