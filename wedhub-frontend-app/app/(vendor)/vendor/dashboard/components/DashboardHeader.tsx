import Link from "next/link";

interface DashboardHeaderProps {
  displayName: string;
  categoryName?: string;
  emailUnverified: boolean;
  userEmail: string;
  vendorStatus: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function DashboardHeader({
  displayName,
  categoryName,
  emailUnverified,
  userEmail,
  vendorStatus,
}: DashboardHeaderProps) {
  const greeting = getGreeting();

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar Icon */}
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-10 text-emerald-70 shadow-xs border border-emerald-30/40">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 9l-6 6M10 9l-2 2M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-dark truncate">
                {greeting}, {displayName}
              </h1>
              {categoryName && (
                <span className="inline-flex items-center rounded-full bg-surface-input px-2.5 py-0.5 text-[11px] font-semibold text-text-grey border border-border">
                  {categoryName}
                </span>
              )}
            </div>
            <p className="text-xs text-text-grey mt-0.5">
              Welcome back to your vendor control center
            </p>
          </div>
        </div>

        <Link
          href="/vendor/profile"
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-text-dark shadow-xs transition-colors hover:bg-surface-input"
        >
          <span>Manage Profile</span>
          <span className="text-sm font-normal text-text-grey">→</span>
        </Link>
      </div>

      {/* Email Verification Alert */}
      {emailUnverified && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-30 bg-amber-10 p-3.5 shadow-xs">
          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-70 text-xs font-bold text-white">
            !
          </span>
          <div className="text-xs">
            <p className="font-bold text-text-dark">Verify your email to get reviewed</p>
            <p className="mt-0.5 text-text-grey">
              We sent a verification link to <strong>{userEmail}</strong>.
              {vendorStatus === "PENDING_VERIFICATION"
                ? " Your listing is submitted but won't be reviewed by our curation team until you verify — check your inbox and click the link."
                : " Verify it so your listing can be approved once you submit."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
