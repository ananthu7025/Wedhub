"use client";

import { useState } from "react";
import Link from "next/link";
import { COMPLETENESS_CHECKS } from "@/lib/api/vendor-self.types";

interface ProfileSetupCardProps {
  completeness: number;
  checksStatus: Array<{
    label: string;
    weight: number;
    requiredForSubmission: boolean;
    met: boolean;
  }>;
}

export function ProfileSetupCard({ completeness, checksStatus }: ProfileSetupCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Separate incomplete items, sorting required items first
  const incompleteItems = checksStatus
    .filter((c) => !c.met)
    .sort((a, b) => (b.requiredForSubmission ? 1 : 0) - (a.requiredForSubmission ? 1 : 0));

  const topMissing = incompleteItems.slice(0, 3);
  const completedCount = checksStatus.filter((c) => c.met).length;

  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-primary/10 text-brand-primary font-bold text-xs">
              ⚡
            </span>
            <h3 className="text-sm sm:text-base font-bold text-text-dark">Your Profile</h3>
            <span className="rounded-full bg-brand-primary-soft px-2.5 py-0.5 text-xs font-bold text-brand-primary">
              {completeness}% complete
            </span>
          </div>
          <p className="mt-1 text-xs text-text-grey">
            Complete your profile to appear in search and start receiving enquiries.
          </p>
        </div>

        <Link
          href="/vendor/profile"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-primary-hover shrink-0"
        >
          <span>Complete Profile</span>
          <span>→</span>
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-surface-input">
        <div
          className="h-full rounded-full bg-brand-primary transition-all duration-500"
          style={{ width: `${completeness}%` }}
        />
      </div>

      {/* Compact Top Incomplete Actions */}
      {topMissing.length > 0 && (
        <div className="mt-3.5">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
            Next steps to complete:
          </p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {topMissing.map((item) => (
              <Link
                key={item.label}
                href="/vendor/profile"
                className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-page p-2.5 text-xs transition-colors hover:border-brand-primary/40 hover:bg-white"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-amber-60 text-[9px] font-bold text-amber-70">
                    !
                  </span>
                  <span className="truncate font-medium text-text-dark group-hover:text-brand-primary">
                    {item.label}
                  </span>
                </div>
                <span className="text-text-muted transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Toggle Full Checklist */}
      <div className="mt-3.5 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-xs font-semibold text-text-grey hover:text-text-dark transition-colors"
        >
          <span>
            Checklist details ({completedCount}/{checksStatus.length} completed)
          </span>
          <span className="flex items-center gap-1 text-[11px] text-brand-primary font-bold">
            {expanded ? "Hide checklist ▲" : "Show full checklist ▼"}
          </span>
        </button>

        {expanded && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {checksStatus.map((check) => (
              <div
                key={check.label}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-page p-2 text-xs"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    check.met ? "bg-emerald-10 text-emerald-70" : "bg-neutral-grey-20 text-text-grey"
                  }`}
                >
                  {check.met ? "✓" : "○"}
                </span>
                <span className={`truncate ${check.met ? "font-medium text-text-dark" : "text-text-grey"}`}>
                  {check.label}
                  {check.requiredForSubmission && !check.met && " *"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
