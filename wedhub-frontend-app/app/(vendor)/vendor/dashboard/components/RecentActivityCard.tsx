import Link from "next/link";
import type { NotificationItem } from "@/lib/api/account.types";
import type { VendorLead } from "@/lib/api/leads.types";

interface RecentActivityCardProps {
  notifications: NotificationItem[];
  leads: VendorLead[];
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export function RecentActivityCard({ notifications, leads }: RecentActivityCardProps) {
  const hasNotifications = notifications.length > 0;
  const hasLeads = leads.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-input text-text-dark font-bold text-xs">
            🕒
          </span>
          <h2 className="text-sm sm:text-base font-bold text-text-dark">
            Recent Activity
          </h2>
        </div>
        <Link
          href="/vendor/leads"
          className="group flex items-center gap-1 text-xs font-bold text-text-grey transition-colors hover:text-brand-primary"
        >
          <span>View all</span>
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>

      <div className="mt-3.5">
        {!hasNotifications && !hasLeads ? (
          <div className="py-4 text-center text-xs text-text-grey">
            <p className="font-semibold text-text-dark">No recent activity</p>
            <p className="mt-1 text-[11px] text-text-grey">
              System alerts, couple messages, and enquiry notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {hasNotifications &&
              notifications.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-surface-page">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary text-xs">
                    •
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text-dark truncate">{item.title}</p>
                    <p className="text-[11px] text-text-grey line-clamp-1">{item.body}</p>
                  </div>
                  <span className="text-[10px] text-text-muted shrink-0 mt-0.5">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              ))}

            {!hasNotifications &&
              hasLeads &&
              leads.slice(0, 4).map((lead) => (
                <div key={lead.id} className="flex items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-surface-page">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-10 text-emerald-70 text-xs font-bold">
                    ✓
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text-dark truncate">
                      Enquiry received from {lead.enquiry?.contactName || "a couple"}
                    </p>
                    <p className="text-[11px] text-text-grey line-clamp-1">
                      {lead.enquiry?.weddingLocation ? `Wedding in ${lead.enquiry.weddingLocation}` : "New wedding inquiry"}
                    </p>
                  </div>
                  <span className="text-[10px] text-text-muted shrink-0 mt-0.5">
                    {formatRelativeTime(lead.createdAt)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
