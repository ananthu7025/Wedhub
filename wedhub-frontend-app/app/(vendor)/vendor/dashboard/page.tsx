import Link from "next/link";
import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyAnalytics } from "@/lib/api/vendor-self";
import { getMe } from "@/lib/api/account";
import { COMPLETENESS_CHECKS } from "@/lib/api/vendor-self.types";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Same formatting rules as the standalone /vendor/analytics page's
// AnalyticsBoard (app/(vendor)/vendor/analytics/AnalyticsBoard.tsx) — kept
// duplicated rather than shared, since that component's formatDuration
// isn't exported and the two pages otherwise have independent layouts.
function formatResponseTime(ms: number | null): string {
  if (ms === null) return "No data yet";
  const minutes = ms / 60_000;
  const hours = ms / 3_600_000;
  const days = ms / 86_400_000;
  if (hours < 1) return `${Math.max(1, Math.round(minutes))} min`;
  if (days < 1) return `${hours.toFixed(1)} hours`;
  return `${days.toFixed(1)} days`;
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function isChecklistItemMet(label: string, vendor: Awaited<ReturnType<typeof requireVendorOwnership>>): boolean {
  switch (label) {
    case "Business name":
      return vendor.businessName.length > 0;
    case "Short description":
      return !!vendor.profile?.shortDescription;
    case "Full description":
      return !!vendor.profile?.description;
    case "Primary category":
      return vendor.categories.some((c) => c.isPrimary);
    case "Primary city":
      return vendor.cityId !== null;
    case "At least one service area":
      return vendor.serviceAreas.length > 0;
    case "Pricing information":
      return vendor.profile?.startingPrice != null || vendor.profile?.customQuoteAvailable === true;
    case "At least one package":
      return vendor.packages.length > 0;
    case "At least one service":
      return vendor.services.length > 0;
    case "A contact method":
      return !!(vendor.profile?.phone || vendor.profile?.email || vendor.profile?.website);
    case "Category attribute values":
      return vendor.attributeValues.length > 0;
    default:
      return false;
  }
}

export default async function VendorDashboardPage() {
  const vendor = await requireVendorOwnership();
  const [analytics, me] = await Promise.all([
    getMyAnalytics()
      .then((r) => r.data)
      .catch(() => null),
    getMe().then((r) => r.data),
  ]);
  const emailUnverified = !me.emailVerifiedAt;

  return (
    <VendorShell activeHref="/vendor/dashboard" vendorName={vendor.businessName}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome back, {vendor.businessName.split(" ")[0]}</h1>
        <p className="text-sm text-text-grey">Here&apos;s how your profile is performing.</p>
      </div>

      {emailUnverified && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-30 bg-amber-10 p-4">
          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-70 text-xs font-bold text-white">
            !
          </span>
          <div>
            <p className="text-[13px] font-bold text-jet-black">Verify your email to get reviewed</p>
            <p className="mt-0.5 text-[13px] text-text-grey">
              We sent a verification link to <strong>{me.email}</strong>.
              {vendor.status === "PENDING_VERIFICATION"
                ? " Your listing is submitted but won't be reviewed by our team until you verify — check your inbox and click the link."
                : " Verify it so your listing can be reviewed once you submit."}
            </p>
          </div>
        </div>
      )}

      <div className="mb-5 grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1">
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">
            Impressions ({analytics?.windowDays ?? "…"} days)
          </p>
          <p className="text-2xl font-bold">{analytics?.impressions ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">
            Profile views ({analytics?.windowDays ?? "…"} days)
          </p>
          <p className="text-2xl font-bold">{analytics?.profileViews ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">
            Enquiries ({analytics?.windowDays ?? "…"} days)
          </p>
          <p className="text-2xl font-bold">{analytics?.enquiries ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">Leads ({analytics?.windowDays ?? "…"} days)</p>
          <p className="text-2xl font-bold">{analytics?.leads ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">Response rate</p>
          <p className="text-2xl font-bold">{analytics ? formatPercent(analytics.responseRate) : "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">Avg. response time</p>
          <p className="text-2xl font-bold">
            {analytics ? formatResponseTime(analytics.averageResponseTimeMs) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">Conversion rate</p>
          <p className="text-2xl font-bold">{analytics ? formatPercent(analytics.conversionRate) : "—"}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">
            Approved reviews ({analytics?.windowDays ?? "…"} days)
          </p>
          <p className="text-2xl font-bold">{analytics?.reviews ?? "—"}</p>
        </div>
      </div>

      {analytics?.level !== "advanced" && (
        <div className="mb-5 rounded-xl border border-border bg-white p-4 text-[13px] text-text-grey">
          Daily view breakdown and a 90-day window are available on Pro and Premium plans.{" "}
          <Link href="/vendor/subscription" className="font-semibold text-brand-primary">
            Upgrade to unlock
          </Link>
          .
        </div>
      )}

      <div className="grid grid-cols-[2fr_1fr] gap-5 max-[1100px]:grid-cols-1">
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Status</h3>
              <p className="text-xs text-text-grey">Your listing&apos;s current review state</p>
            </div>
          </div>
          <p className="text-sm">
            Status: <strong>{vendor.status.replace(/_/g, " ")}</strong>
            {vendor.verificationLevel !== "UNVERIFIED" && <> · Verification: {vendor.verificationLevel.replace(/_/g, " ")}</>}
          </p>
          {vendor.rejectionReason && (
            <p className="mt-2 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{vendor.rejectionReason}</p>
          )}
          {(vendor.status === "DRAFT" || vendor.status === "REJECTED") && (
            <Link
              href="/vendor/profile"
              className="mt-4 inline-block rounded-md bg-brand-primary px-4 py-2.5 text-[13px] font-bold text-white no-underline"
            >
              {vendor.status === "REJECTED" ? "Update and resubmit" : "Complete and submit your profile"}
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-6">
          <h3 className="mb-1 text-base font-bold">Profile completeness</h3>
          <p className="mb-3 text-xs text-text-grey">{vendor.profileCompleteness}% complete</p>
          <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-surface-input">
            <div className="h-full rounded-full bg-brand-primary" style={{ width: `${vendor.profileCompleteness}%` }} />
          </div>
          {COMPLETENESS_CHECKS.map((check) => {
            const met = isChecklistItemMet(check.label, vendor);
            return (
              <div key={check.label} className="flex items-center gap-2.5 border-b border-neutral-grey-20 py-2 text-[13px] last:border-b-0">
                <span
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    met ? "bg-emerald-10 text-emerald-70" : "bg-neutral-grey-20 text-text-grey"
                  }`}
                >
                  {met ? "✓" : "○"}
                </span>
                <span className={met ? "text-text-body" : "text-text-grey"}>
                  {check.label}
                  {check.requiredForSubmission && !met && " (required)"}
                </span>
              </div>
            );
          })}
          <Link
            href="/vendor/profile"
            className="mt-4 block rounded-md bg-brand-primary py-2.5 text-center text-[13px] font-bold text-white no-underline"
          >
            Complete your profile
          </Link>
        </div>
      </div>
    </VendorShell>
  );
}
