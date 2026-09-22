"use client";

import { useState } from "react";
import type { AdminPlan, BillingInterval, FeatureDefinition } from "@/lib/api/admin.types";

const INTERVALS: BillingInterval[] = ["MONTHLY", "YEARLY"];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Create/edit modal for a SubscriptionPlan. Dynamic-plans redesign
 * (2026-09-22, see PLAN-2026-09-22-dynamic-plans-and-feature-registry.md):
 * plans are admin-created, not limited to 3 fixed tiers — the Tier select is
 * gone, replaced by a slug field. billingInterval/currency are only settable
 * at creation (confirmed via updatePlanSchema, which omits both) — those
 * fields are locked once editing an existing plan.
 *
 * The Features section renders generically from featureCatalog (fetched via
 * GET /admin/plans/feature-catalog) rather than one hardcoded checkbox per
 * key — adding a 7th catalog feature on the backend needs no change here.
 */
export function PlanFormModal({
  plan,
  featureCatalog,
  onClose,
  onCreate,
  onUpdate,
}: {
  plan: AdminPlan | null;
  featureCatalog: FeatureDefinition[];
  onClose: () => void;
  onCreate: (body: {
    slug: string;
    billingInterval: BillingInterval;
    name: string;
    price: number;
    trialDays: number;
    isDefault: boolean;
    sortOrder: number;
    features: Record<string, boolean>;
    limits: Record<string, number>;
  }) => Promise<{ success: boolean; error?: string }>;
  onUpdate: (
    id: string,
    body: {
      name: string;
      price: number;
      trialDays: number;
      sortOrder: number;
      isDefault: boolean;
      isActive: boolean;
      features: Record<string, boolean>;
      limits: Record<string, number>;
    },
  ) => Promise<{ success: boolean; error?: string }>;
}) {
  const [slug, setSlug] = useState(plan?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(plan));
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(plan?.billingInterval ?? "MONTHLY");
  const [name, setName] = useState(plan?.name ?? "");
  const [price, setPrice] = useState(plan?.price ?? "0");
  const [trialDays, setTrialDays] = useState(String(plan?.trialDays ?? 0));
  const [sortOrder, setSortOrder] = useState(String(plan?.sortOrder ?? 0));
  const [isDefault, setIsDefault] = useState(plan?.isDefault ?? false);
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [features, setFeatures] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const f of featureCatalog) {
      if (f.valueType === "boolean") {
        initial[f.key] = Boolean((plan?.features as Record<string, unknown> | undefined)?.[f.key] ?? f.defaultValue);
      }
    }
    return initial;
  });
  const [limits, setLimits] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of featureCatalog) {
      if (f.valueType === "limit") {
        initial[f.key] = String((plan?.limits as Record<string, unknown> | undefined)?.[f.key] ?? f.defaultValue);
      }
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const booleanFeatures = featureCatalog.filter((f) => f.valueType === "boolean");
  const limitFeatures = featureCatalog.filter((f) => f.valueType === "limit");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (isDefault && !plan?.isDefault && !confirm(`Make "${name || slug}" the default plan? This will unset the current default plan.`)) {
      return;
    }

    setSaving(true);
    const numericLimits = Object.fromEntries(Object.entries(limits).map(([k, v]) => [k, Number(v)]));
    const result = plan
      ? await onUpdate(plan.id, {
          name: name.trim(),
          price: Number(price),
          trialDays: Number(trialDays),
          sortOrder: Number(sortOrder),
          isDefault,
          isActive,
          features,
          limits: numericLimits,
        })
      : await onCreate({
          slug: slugify(slug || name),
          billingInterval,
          name: name.trim(),
          price: Number(price),
          trialDays: Number(trialDays),
          isDefault,
          sortOrder: Number(sortOrder),
          features,
          limits: numericLimits,
        });
    setSaving(false);
    if (!result.success) {
      setError(result.error || "Could not save plan");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-xl bg-white p-6">
        <h3 className="mb-4 text-lg font-bold">{plan ? `Edit ${plan.name}` : "Create plan"}</h3>
        {error && <div className="mb-3 rounded-md bg-red-10 p-2.5 text-[12px] text-red-70">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-text-grey">Plan name</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!plan && !slugTouched) setSlug(slugify(e.target.value));
              }}
              maxLength={100}
              required
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>
          {!plan && (
            <div className="flex gap-3">
              <label className="flex-1 block">
                <span className="mb-1.5 block text-xs font-semibold text-text-grey">Slug</span>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  onBlur={() => setSlug((s) => slugify(s))}
                  placeholder="e.g. gold-tier"
                  required
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                />
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
          <div className="flex gap-3">
            <label className="flex-1 block">
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
            <label className="flex-1 block">
              <span className="mb-1.5 block text-xs font-semibold text-text-grey">Trial days</span>
              <input
                type="number"
                min={0}
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="w-28 block">
              <span className="mb-1.5 block text-xs font-semibold text-text-grey">Sort order</span>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </label>
          </div>

          {limitFeatures.length > 0 && (
            <div>
              <span className="mb-2 block text-xs font-semibold text-text-grey">Limits</span>
              <div className="flex flex-wrap gap-3">
                {limitFeatures.map((f) => (
                  <label key={f.key} className="block" title={f.description}>
                    <span className="mb-1.5 block text-xs text-text-grey">{f.label}</span>
                    <input
                      type="number"
                      min={0}
                      value={limits[f.key] ?? ""}
                      onChange={(e) => setLimits((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-28 rounded-md border border-border px-3 py-2 text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {booleanFeatures.length > 0 && (
            <div>
              <span className="mb-2 block text-xs font-semibold text-text-grey">Features</span>
              <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                {booleanFeatures.map((f) => (
                  <label key={f.key} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={features[f.key] ?? false}
                      onChange={(e) => setFeatures((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                    />
                    <span>
                      <span className="font-semibold">{f.label}</span>
                      <span className="block text-xs text-text-grey">{f.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Default plan (fallback for vendors with no active subscription)
          </label>
          {plan && (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={plan.isDefault} />
              Active (visible on public /plans)
              {plan.isDefault && <span className="text-xs font-normal text-text-grey">— can&apos;t deactivate the default plan</span>}
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
