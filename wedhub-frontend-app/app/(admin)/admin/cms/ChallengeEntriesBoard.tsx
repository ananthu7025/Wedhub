"use client";

import { useState } from "react";
import Image from "next/image";
import {
  approveAdminChallengeEntry,
  disqualifyAdminChallengeEntry,
  rejectAdminChallengeEntry,
} from "@/lib/api/admin-challenges-client";
import { getPublicMediaUrl } from "@/lib/media/url";
import { formatApiError } from "@/lib/utils/error";
import type { Challenge, ChallengeEntry, ChallengeEntryStatus } from "@/lib/api/challenges.types";

const STATUS_FILTERS: Array<{ label: string; value: ChallengeEntryStatus | "ALL" }> = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Disqualified", value: "DISQUALIFIED" },
  { label: "All", value: "ALL" },
];

export function ChallengeEntriesBoard({
  challenges,
  initialEntries,
}: {
  challenges: Challenge[];
  initialEntries: ChallengeEntry[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [challengeFilter, setChallengeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ChallengeEntryStatus | "ALL">("PENDING");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const visibleEntries = entries.filter((entry) => {
    if (challengeFilter && entry.challengeId !== challengeFilter) return false;
    if (statusFilter !== "ALL" && entry.status !== statusFilter) return false;
    return true;
  });

  async function handleApprove(entry: ChallengeEntry) {
    setPendingId(entry.id);
    setError(null);
    const result = await approveAdminChallengeEntry(entry.id);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? result.data : e)));
  }

  async function handleReject(entry: ChallengeEntry) {
    setPendingId(entry.id);
    setError(null);
    const result = await rejectAdminChallengeEntry(entry.id, reasonDrafts[entry.id] || undefined);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? result.data : e)));
  }

  async function handleDisqualify(entry: ChallengeEntry) {
    setPendingId(entry.id);
    setError(null);
    const result = await disqualifyAdminChallengeEntry(entry.id, reasonDrafts[entry.id] || undefined);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? result.data : e)));
  }

  return (
    <div>
      {error && <div className="mb-3 rounded-md bg-red-10 p-2.5 text-[13px] text-red-70">{error}</div>}

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={challengeFilter}
          onChange={(e) => setChallengeFilter(e.target.value)}
          className="rounded-md border border-border px-2.5 py-1.5 text-xs"
        >
          <option value="">All challenges</option>
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              statusFilter === f.value ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visibleEntries.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface-input p-6 text-center text-xs text-text-grey">
          No entries match this filter.
        </p>
      ) : (
        <div className="space-y-3">
          {visibleEntries.map((entry) => {
            const imageKey = entry.image.optimizedObjectKey ?? entry.image.originalObjectKey;
            return (
              <div key={entry.id} className="flex gap-3 rounded-xl border border-border bg-white p-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-input">
                  <Image src={getPublicMediaUrl(imageKey)} alt={entry.title} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text-dark">{entry.title}</p>
                  <p className="text-[11px] text-text-grey">
                    {entry.vendor.businessName}
                    {entry.location && ` · ${entry.location}`} · {entry.voteCount} votes · {entry.status}
                  </p>
                  {(entry.status === "PENDING" || entry.status === "APPROVED") && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        placeholder="Reason (for reject/disqualify)"
                        value={reasonDrafts[entry.id] ?? ""}
                        onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                        className="w-48 rounded-md border border-border px-2 py-1 text-[11px]"
                      />
                      {entry.status === "PENDING" && (
                        <button
                          type="button"
                          disabled={pendingId === entry.id}
                          onClick={() => handleApprove(entry)}
                          className="rounded-md bg-emerald-70 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-60"
                        >
                          Approve
                        </button>
                      )}
                      {entry.status === "PENDING" && (
                        <button
                          type="button"
                          disabled={pendingId === entry.id}
                          onClick={() => handleReject(entry)}
                          className="rounded-md border border-border px-2.5 py-1 text-[11px] font-bold text-text-body hover:bg-surface-input disabled:opacity-60"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={pendingId === entry.id}
                        onClick={() => handleDisqualify(entry)}
                        className="rounded-md border border-red-70 px-2.5 py-1 text-[11px] font-bold text-red-70 hover:bg-red-10 disabled:opacity-60"
                      >
                        Disqualify
                      </button>
                    </div>
                  )}
                  {entry.rejectionReason && <p className="mt-1 text-[11px] text-red-70">Reason: {entry.rejectionReason}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
