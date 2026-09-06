import { DashboardSparkline } from "../DashboardSparkline";
import type { VendorAnalytics } from "@/lib/api/vendor-self.types";

interface PerformanceOverviewProps {
  analytics: VendorAnalytics | null;
  windowDays?: number;
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function PerformanceOverview({ analytics, windowDays = 30 }: PerformanceOverviewProps) {
  const profileViews = analytics?.profileViews ?? 0;
  const whatsappClicks = analytics?.whatsappClicks ?? 0;
  const enquiries = analytics?.enquiries ?? 0;
  const conversionRate = analytics?.conversionRate ?? 0;

  const viewDataPoints = analytics?.profileViewsByDay?.map((d) => d.count);

  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-10 text-emerald-70 font-bold text-xs">
            📊
          </span>
          <h2 className="text-sm sm:text-base font-bold text-text-dark">
            Performance Overview
          </h2>
        </div>
        <span className="rounded-md bg-surface-input px-2 py-0.5 text-[11px] font-semibold text-text-grey border border-border">
          Last {windowDays} Days
        </span>
      </div>

      {/* Unified Metrics Grid: 2x2 on mobile, 4-column on desktop */}
      <div className="mt-3.5 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Profile Views */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-page p-3 sm:p-4 transition-colors">
          <div>
            <span className="text-xs font-semibold text-text-grey block">Profile Views</span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-70">
                {profileViews.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          {viewDataPoints && (
            <div className="mt-1 flex justify-end">
              <DashboardSparkline color="emerald" dataPoints={viewDataPoints} />
            </div>
          )}
        </div>

        {/* Metric 2: WhatsApp Inquiries */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-page p-3 sm:p-4 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-grey">WhatsApp</span>
              <span className="text-[#25D366]">
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.95.814 3.027.815h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.519-4.481 10-10 10-1.748 0-3.387-.45-4.821-1.239l-5.179 1.359 1.385-5.059c-.86-1.488-1.385-3.228-1.385-5.061 0-5.519 4.481-10 10-10s10 4.481 10 10z" />
                </svg>
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1da851]">
                {whatsappClicks.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Enquiries */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-page p-3 sm:p-4 transition-colors">
          <div>
            <span className="text-xs font-semibold text-text-grey block">Enquiries</span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-byzantine-blue">
                {enquiries.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Conversion Rate */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-page p-3 sm:p-4 transition-colors">
          <div>
            <span className="text-xs font-semibold text-text-grey block">Conversion</span>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-red-70">
                {formatPercent(conversionRate)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
