import Link from "next/link";
import type { VendorAnalytics } from "@/lib/api/vendor-self.types";

interface UpgradeCardProps {
  analytics: VendorAnalytics | null;
}

export function UpgradeCard({ analytics }: UpgradeCardProps) {
  // If vendor is already on advanced tier, don't show upgrade
  if (analytics?.level === "advanced") {
    return null;
  }

  const views = analytics?.profileViews ?? 0;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 rounded-2xl border border-border bg-surface-page p-4 sm:p-5 text-xs text-text-grey shadow-xs">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
            ★
          </span>
          <span className="font-bold text-text-dark text-xs sm:text-sm">
            WedHub Pro Analytics
          </span>
        </div>
        <p className="text-xs text-text-grey">
          {views > 0
            ? `${views.toLocaleString("en-IN")} people viewed your profile this month. Unlock extended 90-day analytics, daily breakdowns, and priority search placement.`
            : "Unlock daily view breakdowns, extended 90-day analytics, and featured search placement with Pro."}
        </p>
      </div>

      <Link
        href="/vendor/subscription"
        className="w-full sm:w-auto text-center flex-shrink-0 rounded-xl bg-text-dark px-4 py-2.5 font-bold text-white transition-colors hover:bg-neutral-grey-70 shadow-xs"
      >
        {views > 0 ? "View Pro Analytics →" : "Explore Pro Plans →"}
      </Link>
    </div>
  );
}
