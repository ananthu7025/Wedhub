import Link from "next/link";
import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyAnalytics } from "@/lib/api/vendor-self";
import { getMe, listMyNotifications } from "@/lib/api/account";
import { listMyLeads } from "@/lib/api/leads";
import { getVendorReviews } from "@/lib/api/catalog";
import { COMPLETENESS_CHECKS } from "@/lib/api/vendor-self.types";
import { DashboardSparkline } from "./DashboardSparkline";
import { DashboardInteractiveSections } from "./DashboardInteractiveSections";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Vendor Dashboard Page (Frontend Arch Phase 5 / Phase 18 Stage B / UI Redesign).
 * Uses real backend analytics (GET /vendors/me/analytics), authenticated leads (GET /leads),
 * notifications (GET /notifications/me), and approved reviews (GET /vendors/:id/reviews).
 *
 * Adopts the card-and-sparkline UI layout while adhering to the project's canonical
 * design tokens (border-border, text-text-grey, text-text-dark, bg-surface-input).
 */

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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning!";
  if (hour < 17) return "Good Afternoon!";
  return "Good Evening!";
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
  const [analytics, me, leadsResponse, notificationsResponse, reviewsResponse] = await Promise.all([
    getMyAnalytics()
      .then((r) => r.data)
      .catch(() => null),
    getMe().then((r) => r.data),
    listMyLeads({ limit: 10 })
      .then((r) => r.data)
      .catch(() => []),
    listMyNotifications(false, 1, 10)
      .then((r) => r.data)
      .catch(() => []),
    getVendorReviews(vendor.id, 1, 5)
      .then((r) => r.data)
      .catch(() => []),
  ]);

  const emailUnverified = !me.emailVerifiedAt;
  const greeting = getGreeting();
  const displayName = vendor.businessName;
  const windowDays = analytics?.windowDays ?? 30;

  return (
    <VendorShell activeHref="/vendor/dashboard" vendorName={vendor.businessName} vendorSlug={vendor.slug}>
      <div className="space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Vendor Scenic Avatar Icon */}
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-10 text-emerald-70 shadow-sm">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 9l-6 6M10 9l-2 2M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-dark">
                {greeting} <span className="font-semibold text-text-grey">{displayName}</span>
              </h1>
            </div>
          </div>

          <Link
            href="/vendor/portfolio"
            className="flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-xs font-bold text-text-dark shadow-sm transition-all hover:bg-surface-input"
          >
            <span>Add New Album</span>
            <span className="text-base font-normal leading-none text-text-grey">+</span>
          </Link>
        </div>

        {/* Email Verification Alert */}
        {emailUnverified && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-30 bg-amber-10 p-4 shadow-sm">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-70 text-xs font-bold text-white">
              !
            </span>
            <div>
              <p className="text-[13px] font-bold text-text-dark">Verify your email to get reviewed</p>
              <p className="mt-0.5 text-[13px] text-text-grey">
                We sent a verification link to <strong>{me.email}</strong>.
                {vendor.status === "PENDING_VERIFICATION"
                  ? " Your listing is submitted but won't be reviewed by our team until you verify — check your inbox and click the link."
                  : " Verify it so your listing can be reviewed once you submit."}
              </p>
            </div>
          </div>
        )}

        {/* Top 4 Hero Metric Cards with Sparklines */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Customer Views */}
          <div className="flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-grey">Customer Views</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-10 px-2 py-0.5 text-[10px] font-bold text-emerald-70">
                    {analytics?.profileViews && analytics.profileViews > 0 ? "Active ↗" : "0 views"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-text-muted">
                  <span className="rounded bg-emerald-70 px-1.5 py-0.5 text-white">{windowDays}D</span>
                  <span className="px-1 py-0.5 text-text-grey">window</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-extrabold tracking-tight text-emerald-70">
                {analytics?.profileViews ? analytics.profileViews.toLocaleString("en-IN") : "0"}
              </span>
              <DashboardSparkline
                color="emerald"
                dataPoints={analytics?.profileViewsByDay?.map((d) => d.count)}
              />
            </div>
          </div>

          {/* Card 2: WhatsApp Inquiries */}
          <div className="flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-grey">WhatsApp Inquiries</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-10 px-2 py-0.5 text-[10px] font-bold text-emerald-70">
                    {analytics?.whatsappClicks && analytics.whatsappClicks > 0 ? "Direct Chat ↗" : "0 chats"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-text-muted">
                  <span className="rounded bg-[#25D366] px-1.5 py-0.5 text-white">{windowDays}D</span>
                  <span className="px-1 py-0.5 text-text-grey">window</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-extrabold tracking-tight text-[#1da851]">
                {analytics?.whatsappClicks ? analytics.whatsappClicks.toLocaleString("en-IN") : "0"}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#25D366]">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.95.814 3.027.815h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.519-4.481 10-10 10-1.748 0-3.387-.45-4.821-1.239l-5.179 1.359 1.385-5.059c-.86-1.488-1.385-3.228-1.385-5.061 0-5.519 4.481-10 10-10s10 4.481 10 10z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 3: Inquiries Received */}
          <div className="flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-grey">Inquiries Received</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-byzantine-blue-10 px-2 py-0.5 text-[10px] font-bold text-byzantine-blue-70">
                    {analytics?.enquiries && analytics.enquiries > 0 ? "Active ↗" : "0 enquiries"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-text-muted">
                  <span className="rounded bg-byzantine-blue px-1.5 py-0.5 text-white">{windowDays}D</span>
                  <span className="px-1 py-0.5 text-text-grey">window</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-extrabold tracking-tight text-byzantine-blue">
                {analytics?.enquiries ? analytics.enquiries.toLocaleString("en-IN") : "0"}
              </span>
              <DashboardSparkline
                color="blue"
                dataPoints={
                  leadsResponse.length > 1
                    ? [0, Math.round(leadsResponse.length / 2), leadsResponse.length]
                    : undefined
                }
              />
            </div>
          </div>

          {/* Card 4: Conversion Rate */}
          <div className="flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-grey">Conversion Rate</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-red-10 px-2 py-0.5 text-[10px] font-bold text-red-70">
                    {analytics?.conversionRate && analytics.conversionRate > 0 ? "Won leads ↗" : "0% won"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-text-muted">
                  <span className="rounded bg-red-70 px-1.5 py-0.5 text-white">Won / Total</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-extrabold tracking-tight text-red-70">
                {analytics ? formatPercent(analytics.conversionRate) : "0%"}
              </span>
              <DashboardSparkline color="coral" />
            </div>
          </div>
        </div>

        {/* Secondary KPI Bar (Canonical Design Tokens) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-white p-3.5 shadow-sm">
            <p className="truncate text-[11px] font-semibold text-text-muted">Avg. Response Time</p>
            <p className="mt-1 truncate text-base font-bold text-text-dark">
              {analytics ? formatResponseTime(analytics.averageResponseTimeMs) : "No data yet"}
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-white p-3.5 shadow-sm">
            <p className="truncate text-[11px] font-semibold text-text-muted">Response Rate</p>
            <p className="mt-1 truncate text-base font-bold text-text-dark">
              {analytics ? formatPercent(analytics.responseRate) : "0%"}
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-white p-3.5 shadow-sm">
            <p className="truncate text-[11px] font-semibold text-text-muted">Total Leads ({windowDays}d)</p>
            <p className="mt-1 truncate text-base font-bold text-text-dark">
              {analytics?.leads ? analytics.leads.toLocaleString("en-IN") : "0"}
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-white p-3.5 shadow-sm">
            <p className="truncate text-[11px] font-semibold text-text-muted">Impressions ({windowDays}d)</p>
            <p className="mt-1 truncate text-base font-bold text-text-dark">
              {analytics?.impressions ? analytics.impressions.toLocaleString("en-IN") : "0"}
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-white p-3.5 shadow-sm col-span-2 sm:col-span-1">
            <p className="truncate text-[11px] font-semibold text-text-muted">Approved Reviews</p>
            <p className="mt-1 truncate text-base font-bold text-text-dark">
              {analytics?.reviews ? `${analytics.reviews} verified` : "0 verified"}
            </p>
          </div>
        </div>

        {/* Pro Plan Analytics Banner */}
        {analytics?.level !== "advanced" && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-page px-5 py-3.5 text-xs text-text-grey shadow-sm">
            <span>
              Daily view breakdown and an extended 90-day analytics window are available on <strong>Pro and Premium plans</strong>.
            </span>
            <Link
              href="/vendor/subscription"
              className="flex-shrink-0 rounded-md bg-text-dark px-4 py-1.5 font-bold text-white transition-colors hover:bg-neutral-grey-70"
            >
              Upgrade Plan →
            </Link>
          </div>
        )}

        {/* Main 2-Column Split: Leads Table & Manage Prospects on Left, Activity on Right */}
        <DashboardInteractiveSections
          leads={leadsResponse}
          notifications={notificationsResponse}
          reviews={reviewsResponse}
          vendor={{
            businessName: vendor.businessName,
            status: vendor.status,
            verificationLevel: vendor.verificationLevel,
            profileCompleteness: vendor.profileCompleteness,
            rejectionReason: vendor.rejectionReason,
            slug: vendor.slug,
          }}
          analytics={analytics}
        />

        {/* Profile Completeness Checklist Container — only shown when profile is not yet 100% complete */}
        {vendor.profileCompleteness < 100 && (
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-text-dark">Profile Completeness</h3>
                <p className="text-xs text-text-grey">
                  A complete profile ranks higher in search results and earns up to 3x more couple enquiries.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-brand-primary">{vendor.profileCompleteness}%</span>
                <span className="text-xs font-semibold text-text-muted"> complete</span>
              </div>
            </div>

            <div className="mt-4 mb-6 h-2 w-full overflow-hidden rounded-full bg-surface-input">
              <div
                className="h-full rounded-full bg-brand-primary transition-all duration-500"
                style={{ width: `${vendor.profileCompleteness}%` }}
              />
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {COMPLETENESS_CHECKS.map((check) => {
                const met = isChecklistItemMet(check.label, vendor);
                return (
                  <div
                    key={check.label}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-page p-2.5 text-xs"
                  >
                    <span
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        met ? "bg-emerald-10 text-emerald-70" : "bg-neutral-grey-20 text-text-grey"
                      }`}
                    >
                      {met ? "✓" : "○"}
                    </span>
                    <span className={met ? "font-medium text-text-dark" : "text-text-grey"}>
                      {check.label}
                      {check.requiredForSubmission && !met && " *"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <Link
                href="/vendor/profile"
                className="rounded-md bg-brand-primary px-6 py-2.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(224,11,65,0.18)] transition-all hover:bg-brand-primary-hover"
              >
                Complete your profile →
              </Link>
            </div>
          </div>
        )}
      </div>
    </VendorShell>
  );
}
