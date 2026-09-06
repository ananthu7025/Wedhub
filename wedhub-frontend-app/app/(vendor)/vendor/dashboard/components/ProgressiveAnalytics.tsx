import type { VendorAnalytics } from "@/lib/api/vendor-self.types";

interface ProgressiveAnalyticsProps {
  analytics: VendorAnalytics | null;
}

function formatResponseTime(ms: number | null): string {
  if (ms === null) return "No data";
  const minutes = ms / 60_000;
  const hours = ms / 3_600_000;
  const days = ms / 86_400_000;
  if (hours < 1) return `${Math.max(1, Math.round(minutes))}m`;
  if (days < 1) return `${hours.toFixed(1)}h`;
  return `${days.toFixed(1)}d`;
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function ProgressiveAnalytics({ analytics }: ProgressiveAnalyticsProps) {
  if (!analytics) return null;

  const hasImpressions = (analytics.impressions ?? 0) > 0;
  const hasEnquiries = (analytics.enquiries ?? 0) > 0 || (analytics.leads ?? 0) > 0;
  const hasResponseData = analytics.averageResponseTimeMs !== null || (analytics.responseRate ?? 0) > 0;
  const hasBookings = (analytics.wonLeads ?? 0) > 0;

  // If none of these secondary analytics have real non-zero data, do not render an empty card
  if (!hasImpressions && !hasResponseData && !hasBookings) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {/* Response Performance Block */}
      {hasResponseData && (
        <div className="rounded-2xl border border-border bg-white p-4 shadow-xs">
          <h3 className="text-xs font-bold text-text-dark uppercase tracking-wider mb-2.5">
            Response Performance
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-border bg-surface-page p-3">
              <span className="text-[11px] font-semibold text-text-muted block">Avg. Response Time</span>
              <span className="mt-1 text-base font-bold text-text-dark block">
                {formatResponseTime(analytics.averageResponseTimeMs)}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-surface-page p-3">
              <span className="text-[11px] font-semibold text-text-muted block">Response Rate</span>
              <span className="mt-1 text-base font-bold text-text-dark block">
                {formatPercent(analytics.responseRate)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Discovery & Conversion Funnel Block */}
      {(hasImpressions || hasBookings) && (
        <div className="rounded-2xl border border-border bg-white p-4 shadow-xs">
          <h3 className="text-xs font-bold text-text-dark uppercase tracking-wider mb-2.5">
            Discovery & Conversion Funnel
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="rounded-xl border border-border bg-surface-page p-2.5">
              <span className="text-[10px] font-semibold text-text-muted block">1. Impressions</span>
              <span className="mt-1 text-sm font-bold text-text-dark block">
                {analytics.impressions.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-surface-page p-2.5">
              <span className="text-[10px] font-semibold text-text-muted block">2. Views</span>
              <span className="mt-1 text-sm font-bold text-text-dark block">
                {analytics.profileViews.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-surface-page p-2.5">
              <span className="text-[10px] font-semibold text-text-muted block">3. Enquiries</span>
              <span className="mt-1 text-sm font-bold text-text-dark block">
                {analytics.enquiries.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="rounded-xl border border-border bg-surface-page p-2.5">
              <span className="text-[10px] font-semibold text-text-muted block">4. Bookings</span>
              <span className="mt-1 text-sm font-bold text-emerald-70 block">
                {(analytics.wonLeads ?? 0).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
