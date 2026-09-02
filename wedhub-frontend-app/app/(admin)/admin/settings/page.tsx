import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: "Settings",
};

/**
 * Settings (Frontend Arch Phase 10), matching
 * wedhub-frontend/admin/settings.html. Confirmed via research: zero
 * backend representation exists for feature flags, notification rules,
 * lead rules, or subscription rules — no Settings/FeatureFlag Prisma
 * model, no config endpoint of any kind. Per user decision, 2026-09-02,
 * this is a fully static placeholder — every control is visibly disabled
 * with no working state, not a working form with nowhere to persist to.
 */

const FEATURE_FLAGS = [
  { label: "Telegram bot intake", desc: "Allow enquiries to be created via the Telegram assistant" },
  { label: "Featured listings marketplace", desc: "Enable paid featured placement purchase flow for vendors" },
  { label: "Vendor self-service coupons", desc: "Let vendors apply coupon codes at checkout" },
  { label: "CMS & SEO pages", desc: "Pages, blog, guides, banners — not yet built" },
  { label: "Fine-grained RBAC enforcement", desc: "Enforce Role/Permission tables beyond the coarse Admin flag" },
];

const NOTIFICATION_SETTINGS = [
  { label: "New vendor submission alerts", desc: "Email admins when a vendor submits for approval" },
  { label: "Payment failure alerts", desc: "Notify Finance role on failed/past-due subscription payments" },
  { label: "Flagged review alerts", desc: "Notify Trust & Safety role when a review is auto-flagged" },
  { label: "Weekly digest email", desc: "Summary of platform metrics sent every Monday" },
];

const LEAD_RULES = [
  { label: "Duplicate lead dedup window", value: "24", unit: "hrs" },
  { label: "Spam score threshold", value: "75", unit: "/100" },
  { label: "Vendor response SLA", value: "48", unit: "hrs" },
  { label: "Max enquiries per user per day", value: "10", unit: "/day" },
];

const SUBSCRIPTION_RULES = [
  { label: "Default trial length", value: "14", unit: "days" },
  { label: "Past-due grace period", value: "7", unit: "days" },
];

function DisabledToggle({ checked }: { checked: boolean }) {
  return (
    <div className={`relative h-[22px] w-10 flex-shrink-0 rounded-full ${checked ? "bg-brand-primary/40" : "bg-border"}`}>
      <div className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow ${checked ? "left-[19px]" : "left-[3px]"}`} />
    </div>
  );
}

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <AdminShell activeHref="/admin/settings">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-text-grey">Platform-wide configuration and business rules.</p>
        </div>
      </div>

      <div className="mb-5 rounded-md bg-amber-10 p-3.5 text-[13px] text-amber-70">
        Nothing on this page is backed by a real endpoint — no Settings, FeatureFlag, or config model exists on the
        backend yet. Every control below is a disabled placeholder showing the intended shape of this screen, not a
        working configuration surface.
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-white p-5">
            <h3 className="mb-3 text-[15px] font-bold">Feature flags</h3>
            {FEATURE_FLAGS.map((row, i) => (
              <div key={row.label} className={`flex items-center justify-between gap-4 py-3.5 ${i < FEATURE_FLAGS.length - 1 ? "border-b border-neutral-grey-20" : ""}`}>
                <div>
                  <div className="text-sm font-semibold">{row.label}</div>
                  <div className="text-xs text-text-grey">{row.desc}</div>
                </div>
                <DisabledToggle checked={i < 3} />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-white p-5">
            <h3 className="mb-3 text-[15px] font-bold">Notification settings</h3>
            {NOTIFICATION_SETTINGS.map((row, i) => (
              <div key={row.label} className={`flex items-center justify-between gap-4 py-3.5 ${i < NOTIFICATION_SETTINGS.length - 1 ? "border-b border-neutral-grey-20" : ""}`}>
                <div>
                  <div className="text-sm font-semibold">{row.label}</div>
                  <div className="text-xs text-text-grey">{row.desc}</div>
                </div>
                <DisabledToggle checked={i < 3} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-white p-5">
            <h3 className="mb-3 text-[15px] font-bold">Lead rules</h3>
            {LEAD_RULES.map((row, i) => (
              <div key={row.label} className={`flex items-center justify-between gap-4 py-3 ${i < LEAD_RULES.length - 1 ? "border-b border-neutral-grey-20" : ""}`}>
                <div>
                  <div className="text-sm font-semibold">{row.label}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input disabled value={row.value} className="w-20 rounded-md border border-border bg-surface-input px-3 py-1.5 text-right text-sm text-text-grey" />
                  <span className="text-xs text-text-grey">{row.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-white p-5">
            <h3 className="mb-3 text-[15px] font-bold">Subscription rules</h3>
            {SUBSCRIPTION_RULES.map((row, i) => (
              <div key={row.label} className={`flex items-center justify-between gap-4 py-3 ${i < SUBSCRIPTION_RULES.length - 1 ? "border-b border-neutral-grey-20" : ""}`}>
                <div className="text-sm font-semibold">{row.label}</div>
                <div className="flex items-center gap-2">
                  <input disabled value={row.value} className="w-20 rounded-md border border-border bg-surface-input px-3 py-1.5 text-right text-sm text-text-grey" />
                  <span className="text-xs text-text-grey">{row.unit}</span>
                </div>
              </div>
            ))}
            <p className="mt-3 rounded-md bg-surface-input p-2.5 text-xs text-text-grey">
              Actual plan prices and limits are edited per-plan under Subscriptions &amp; payments → Plans, which is a
              real, working screen — unlike this stub.
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
