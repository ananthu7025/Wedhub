import Link from "next/link";
import type { UpcomingWeddingItem } from "@/lib/api/vendor-calendar.types";

interface UpcomingWeddingsWidgetProps {
  weddings: UpcomingWeddingItem[];
}

export function UpcomingWeddingsWidget({ weddings }: UpcomingWeddingsWidgetProps) {
  const activeWeddings = weddings.filter((w) => w.daysUntil >= 0);

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-brand-primary-soft text-brand-primary rounded-xl font-bold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-dark">Upcoming Weddings & Events</h3>
            <p className="text-xs text-text-grey mt-0.5">Your scheduled wedding commitments</p>
          </div>
        </div>

        <Link
          href="/vendor/calendar"
          className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover flex items-center gap-1"
        >
          View Calendar →
        </Link>
      </div>

      <div className="mt-3.5 space-y-2.5">
        {activeWeddings.length === 0 ? (
          <div className="py-6 text-center text-text-grey">
            <p className="text-xs font-medium">No upcoming weddings scheduled yet</p>
            <Link
              href="/vendor/calendar"
              className="inline-block mt-2 text-xs font-bold text-brand-primary hover:underline"
            >
              + Mark your dates on Booking Calendar
            </Link>
          </div>
        ) : (
          activeWeddings.slice(0, 3).map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between p-3 rounded-xl bg-surface-input border border-border hover:border-text-grey/30 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-center min-w-[50px] border border-border shadow-xs">
                  <span className="block text-[10px] uppercase font-bold text-text-grey">
                    {new Date(w.startDate + "T00:00:00Z").toLocaleString("en-IN", { month: "short" })}
                  </span>
                  <span className="block text-base font-extrabold text-text-dark leading-none">
                    {new Date(w.startDate + "T00:00:00Z").getUTCDate()}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-text-dark">{w.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-brand-primary-soft text-brand-primary">
                      {w.eventType}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-grey mt-0.5">
                    {w.daysUntil === 0
                      ? "Today!"
                      : w.daysUntil === 1
                      ? "Tomorrow"
                      : `In ${w.daysUntil} days`}
                    {w.venueName && ` • 📍 ${w.venueName}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {w.whatsappUrl && (
                  <a
                    href={w.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition"
                    title="WhatsApp couple"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z" />
                    </svg>
                  </a>
                )}
                <Link
                  href="/vendor/calendar"
                  className="px-2.5 py-1 text-xs font-bold text-text-dark hover:bg-white border border-border rounded-lg transition"
                >
                  Details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
