"use client";

import type { VendorAnalytics } from "@/lib/api/vendor-self.types";
import type { LeadAnalytics } from "@/lib/api/leads.types";

/**
 * Analytics page (Frontend Arch Phase 7), matching
 * wedhub-frontend/vendor/analytics.html as closely as real backend data
 * allows. Real gaps vs. the mockup, confirmed via backend research (see
 * frontenddocs/10-risks-and-open-questions.md):
 * - No week-over-week trend deltas exist anywhere (no previous-period
 *   comparison is computed) — the mockup's "↑ 12% vs last month" arrows on
 *   every metric card are omitted rather than fabricated.
 * - The "Profile views over time" chart uses vendor-self's real
 *   profileViewsByDay (DAY granularity, only present for advanced-tier
 *   vendors — GET /vendors/me/analytics's level field), not the mockup's
 *   12-week bars — basic-tier vendors see a clear upgrade prompt instead of
 *   an empty/fake chart.
 * - "Leads received vs won" reuses GET /leads/analytics's real
 *   qualifiedLeads/wonLeads/lostLeads counts. There is no spam count on
 *   this endpoint (Lead.isSpam isn't aggregated here) — omitted rather
 *   than estimated.
 * - "Response performance"'s avg response time is real
 *   (averageResponseTimeMs); "fastest response this month" has no backing
 *   computation anywhere in the backend and is omitted.
 */

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.round(ms / 60_000)} min`;
  return `${hours.toFixed(1)} hrs`;
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function AnalyticsBoard({
  profileAnalytics,
  leadAnalytics,
}: {
  profileAnalytics: VendorAnalytics;
  leadAnalytics: LeadAnalytics;
}) {
  const byDay = profileAnalytics.profileViewsByDay ?? [];
  const maxViews = Math.max(1, ...byDay.map((d) => d.count));

  const funnelRows = [
    { label: "Qualified", count: leadAnalytics.qualifiedLeads, color: "bg-amber" },
    { label: "Won", count: leadAnalytics.wonLeads, color: "bg-emerald" },
    { label: "Lost", count: leadAnalytics.lostLeads, color: "bg-paynes-grey-30" },
  ];
  const funnelTotal = Math.max(1, leadAnalytics.leadsReceived);

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Analytics</h1>
        <p className="text-xs sm:text-sm text-text-grey">
          Track how your profile is performing over the last {profileAnalytics.windowDays} days.
        </p>
      </div>

      <div className="mb-5 sm:mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border bg-white p-3.5 sm:p-5 shadow-xs">
          <p className="mb-1 text-[11px] sm:text-xs font-semibold text-text-grey truncate">Profile & Portfolio views</p>
          <p className="text-xl sm:text-2xl font-bold text-text-dark">{profileAnalytics.profileViews}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3.5 sm:p-5 shadow-xs">
          <p className="mb-1 text-[11px] sm:text-xs font-semibold text-text-grey truncate">WhatsApp Inquiries</p>
          <p className="text-xl sm:text-2xl font-bold text-[#1da851]">{profileAnalytics.whatsappClicks ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3.5 sm:p-5 shadow-xs">
          <p className="mb-1 text-[11px] sm:text-xs font-semibold text-text-grey truncate">Leads received</p>
          <p className="text-xl sm:text-2xl font-bold text-text-dark">{leadAnalytics.leadsReceived}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3.5 sm:p-5 shadow-xs">
          <p className="mb-1 text-[11px] sm:text-xs font-semibold text-text-grey truncate">Response rate</p>
          <p className="text-xl sm:text-2xl font-bold text-text-dark">{formatPercent(leadAnalytics.responseRate)}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3.5 sm:p-5 shadow-xs col-span-2 sm:col-span-1">
          <p className="mb-1 text-[11px] sm:text-xs font-semibold text-text-grey truncate">Conversion rate</p>
          <p className="text-xl sm:text-2xl font-bold text-text-dark">{formatPercent(leadAnalytics.conversionRate)}</p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-white p-6">
        <h3 className="mb-1 text-base font-bold">Profile views over time</h3>
        {profileAnalytics.level === "advanced" ? (
          byDay.length === 0 ? (
            <p className="text-sm text-text-grey">No profile views yet in this window.</p>
          ) : (
            <>
              <p className="mb-4 text-xs text-text-grey">Daily views, last {profileAnalytics.windowDays} days</p>
              <div className="flex h-[180px] items-end gap-1 border-b border-border pt-2.5">
                {byDay.map((d) => (
                  <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${d.day}: ${d.count}`}>
                    <div
                      className="w-full max-w-[16px] rounded-t bg-brand-primary"
                      style={{ height: `${Math.max(2, (d.count / maxViews) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          <p className="text-sm text-text-grey">
            Daily view breakdown is available on Pro and Premium plans.{" "}
            <a href="/vendor/subscription" className="font-semibold text-brand-primary">
              Upgrade to unlock
            </a>
            .
          </p>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
        <div className="rounded-xl border border-border bg-white p-6">
          <h3 className="mb-4 text-base font-bold">Leads received vs won</h3>
          {leadAnalytics.leadsReceived === 0 ? (
            <p className="text-sm text-text-grey">No leads yet.</p>
          ) : (
            funnelRows.map((row) => (
              <div key={row.label} className="mb-4 last:mb-0">
                <div className="mb-1.5 flex justify-between text-[13px] font-semibold">
                  <span>{row.label}</span>
                  <span className="text-text-grey">
                    {row.count} · {formatPercent(row.count / funnelTotal)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-input">
                  <div className={`h-full rounded-full ${row.color}`} style={{ width: `${(row.count / funnelTotal) * 100}%` }} />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-6">
          <h3 className="mb-1 text-base font-bold">Response performance</h3>
          <div className="border-b border-neutral-grey-20 py-3.5">
            <p className="mb-1 text-xs text-text-grey">Avg. response time</p>
            <p className="text-xl font-bold">{formatDuration(leadAnalytics.averageResponseTimeMs)}</p>
          </div>
          <div className="py-3.5">
            <p className="mb-1 text-xs text-text-grey">Leads contacted</p>
            <p className="text-xl font-bold">
              {leadAnalytics.leadsContacted} / {leadAnalytics.leadsReceived}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <h3 className="mb-4 text-base font-bold">Summary</h3>
        <div className="grid grid-cols-3 gap-4 max-[700px]:grid-cols-1">
          <div className="border-b border-neutral-grey-20 py-3.5 max-[700px]:border-b">
            <p className="mb-1 text-xs text-text-grey">Qualified leads</p>
            <p className="text-xl font-bold">{leadAnalytics.qualifiedLeads}</p>
          </div>
          <div className="border-b border-neutral-grey-20 py-3.5">
            <p className="mb-1 text-xs text-text-grey">Won leads</p>
            <p className="text-xl font-bold">{leadAnalytics.wonLeads}</p>
          </div>
          <div className="border-b border-neutral-grey-20 py-3.5">
            <p className="mb-1 text-xs text-text-grey">Lost leads</p>
            <p className="text-xl font-bold">{leadAnalytics.lostLeads}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
