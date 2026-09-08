"use client";

import { useState } from "react";
import {
  createAdminChallenge,
  promoteChallengeEntriesToGallery,
  setAdminChallengeWinner,
  updateAdminChallenge,
  type AdminCreateChallengeBody,
} from "@/lib/api/admin-challenges-client";
import { formatApiError } from "@/lib/utils/error";
import type { Challenge, ChallengeEntry, ChallengeStatus } from "@/lib/api/challenges.types";
import type { Category, GalleryCategory } from "@/lib/api/vendors.types";

const STATUS_OPTIONS: ChallengeStatus[] = ["DRAFT", "UPCOMING", "LIVE", "VOTING", "COMPLETED", "ARCHIVED"];

function toDatetimeLocal(iso: string): string {
  return iso.slice(0, 16);
}

const EMPTY_FORM: AdminCreateChallengeBody = {
  title: "",
  categoryId: "",
  startDate: "",
  endDate: "",
  votingStartDate: "",
  votingEndDate: "",
};

export function ChallengesBoard({
  initialChallenges,
  categories,
  galleryCategories,
  entriesByChallenge,
}: {
  initialChallenges: Challenge[];
  categories: Category[];
  galleryCategories: GalleryCategory[];
  entriesByChallenge: Record<string, ChallengeEntry[]>;
}) {
  const [challenges, setChallenges] = useState(initialChallenges);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<AdminCreateChallengeBody>(EMPTY_FORM);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<string | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [selectedGalleryCategoryId, setSelectedGalleryCategoryId] = useState("");

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setPendingId("new");
    setError(null);
    const result = await createAdminChallenge(form);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setChallenges((prev) => [result.data, ...prev]);
    setForm(EMPTY_FORM);
    setCreating(false);
  }

  async function handleStatusChange(challenge: Challenge, status: ChallengeStatus) {
    setPendingId(challenge.id);
    setError(null);
    const result = await updateAdminChallenge(challenge.id, { status });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setChallenges((prev) => prev.map((c) => (c.id === challenge.id ? result.data : c)));
  }

  async function handleSetWinner(challenge: Challenge, entryId: string) {
    if (!entryId) return;
    setPendingId(challenge.id);
    setError(null);
    const result = await setAdminChallengeWinner(challenge.id, entryId);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setChallenges((prev) => prev.map((c) => (c.id === challenge.id ? result.data : c)));
  }

  async function handlePromote(challengeId: string) {
    if (selectedEntryIds.size === 0 || !selectedGalleryCategoryId) return;
    setPendingId(challengeId);
    setError(null);
    const result = await promoteChallengeEntriesToGallery(challengeId, Array.from(selectedEntryIds), selectedGalleryCategoryId);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setPromoteTarget(null);
    setSelectedEntryIds(new Set());
  }

  return (
    <div>
      {error && <div className="mb-3 rounded-md bg-red-10 p-2.5 text-[13px] text-red-70">{error}</div>}

      {challenges.length === 0 && <p className="mb-3 text-sm text-text-grey">No challenges created yet.</p>}

      <div className="mb-5 space-y-3">
        {challenges.map((challenge) => {
          const entries = entriesByChallenge[challenge.id] ?? [];
          const approvedEntries = entries.filter((e) => e.status === "APPROVED");
          return (
            <div key={challenge.id} className="rounded-xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-text-dark">{challenge.title}</p>
                  <p className="text-[11px] text-text-grey">
                    /{challenge.slug} · {challenge.category.name}
                  </p>
                </div>
                <select
                  value={challenge.status}
                  disabled={pendingId === challenge.id}
                  onChange={(e) => handleStatusChange(challenge, e.target.value as ChallengeStatus)}
                  className="rounded-md border border-border px-2 py-1.5 text-xs disabled:opacity-60"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href={`/api/admin/challenges/${challenge.id}/participants?format=csv`}
                  className="rounded-md border border-border px-3 py-1.5 text-[11px] font-bold text-text-body hover:bg-surface-input"
                >
                  Export Participants (CSV)
                </a>

                {challenge.status === "COMPLETED" && approvedEntries.length > 0 && (
                  <>
                    <select
                      defaultValue=""
                      disabled={pendingId === challenge.id}
                      onChange={(e) => handleSetWinner(challenge, e.target.value)}
                      className="rounded-md border border-border px-2 py-1.5 text-[11px] disabled:opacity-60"
                    >
                      <option value="">Set winner…</option>
                      {approvedEntries.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.title} — {entry.vendor.businessName} ({entry.voteCount} votes)
                        </option>
                      ))}
                    </select>
                    {challenge.winnerEntry && (
                      <span className="text-[11px] font-bold text-emerald-70">🏆 {challenge.winnerEntry.vendor.businessName}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPromoteTarget(promoteTarget === challenge.id ? null : challenge.id)}
                      className="rounded-md border border-border px-3 py-1.5 text-[11px] font-bold text-text-body hover:bg-surface-input"
                    >
                      Promote to Gallery
                    </button>
                  </>
                )}
              </div>

              {promoteTarget === challenge.id && (
                <div className="mt-3 rounded-md border border-dashed border-border p-3">
                  <p className="mb-2 text-[11px] font-semibold text-text-grey">Pick entries to feature, then a gallery category:</p>
                  <div className="mb-2 max-h-[200px] space-y-1 overflow-y-auto">
                    {approvedEntries
                      .slice()
                      .sort((a, b) => b.voteCount - a.voteCount)
                      .map((entry) => (
                        <label key={entry.id} className="flex items-center gap-2 text-[11px]">
                          <input
                            type="checkbox"
                            checked={selectedEntryIds.has(entry.id)}
                            onChange={(e) => {
                              setSelectedEntryIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(entry.id);
                                else next.delete(entry.id);
                                return next;
                              });
                            }}
                          />
                          {entry.title} — {entry.vendor.businessName} ({entry.voteCount} votes)
                        </label>
                      ))}
                  </div>
                  <select
                    value={selectedGalleryCategoryId}
                    onChange={(e) => setSelectedGalleryCategoryId(e.target.value)}
                    className="mb-2 w-full rounded-md border border-border px-2 py-1.5 text-[11px]"
                  >
                    <option value="">Select gallery category</option>
                    {galleryCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={pendingId === challenge.id || selectedEntryIds.size === 0 || !selectedGalleryCategoryId}
                    onClick={() => handlePromote(challenge.id)}
                    className="rounded-md bg-brand-primary px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
                  >
                    Add {selectedEntryIds.size || ""} to Gallery
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {creating ? (
        <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-border p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Title</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Category</span>
              <select
                required
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Gallery category (display)</span>
              <select
                value={form.galleryCategoryId ?? ""}
                onChange={(e) => setForm({ ...form, galleryCategoryId: e.target.value || undefined })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              >
                <option value="">None</option>
                {galleryCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Banner image URL</span>
              <input
                value={form.bannerImage ?? ""}
                onChange={(e) => setForm({ ...form, bannerImage: e.target.value || undefined })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Start date</span>
              <input
                type="datetime-local"
                required
                value={form.startDate ? toDatetimeLocal(form.startDate) : ""}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">End date</span>
              <input
                type="datetime-local"
                required
                value={form.endDate ? toDatetimeLocal(form.endDate) : ""}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Voting start</span>
              <input
                type="datetime-local"
                required
                value={form.votingStartDate ? toDatetimeLocal(form.votingStartDate) : ""}
                onChange={(e) => setForm({ ...form, votingStartDate: e.target.value })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Voting end</span>
              <input
                type="datetime-local"
                required
                value={form.votingEndDate ? toDatetimeLocal(form.votingEndDate) : ""}
                onChange={(e) => setForm({ ...form, votingEndDate: e.target.value })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Max entries (optional)</span>
              <input
                type="number"
                min={1}
                value={form.maxEntries ?? ""}
                onChange={(e) => setForm({ ...form, maxEntries: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Vote scope</span>
              <select
                value={form.voteScope ?? "PER_ENTRY"}
                onChange={(e) => setForm({ ...form, voteScope: e.target.value as "PER_ENTRY" | "PER_CHALLENGE" })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              >
                <option value="PER_ENTRY">One vote per entry</option>
                <option value="PER_CHALLENGE">One vote per challenge</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Ranking freeze (hours before voting ends)</span>
              <input
                type="number"
                min={0}
                value={form.hideLiveRankingsBeforeEndHours ?? ""}
                onChange={(e) =>
                  setForm({ ...form, hideLiveRankingsBeforeEndHours: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              />
            </label>
            <label className="flex items-center gap-2 text-[11px] text-text-grey">
              <input
                type="checkbox"
                checked={form.allowMultipleEntriesPerVendor ?? false}
                onChange={(e) => setForm({ ...form, allowMultipleEntriesPerVendor: e.target.checked })}
              />
              Allow multiple entries per vendor
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Prize title</span>
              <input
                value={form.prizeTitle ?? ""}
                onChange={(e) => setForm({ ...form, prizeTitle: e.target.value || undefined })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Prize value</span>
              <input
                value={form.prizeValue ?? ""}
                onChange={(e) => setForm({ ...form, prizeValue: e.target.value || undefined })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Sponsor name</span>
              <input
                value={form.sponsorName ?? ""}
                onChange={(e) => setForm({ ...form, sponsorName: e.target.value || undefined })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-text-grey">Sponsor URL</span>
              <input
                value={form.sponsorUrl ?? ""}
                onChange={(e) => setForm({ ...form, sponsorUrl: e.target.value || undefined })}
                className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-text-grey">Description</span>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value || undefined })}
              rows={2}
              className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
            />
          </label>

          <div className="flex gap-2">
            <button type="submit" disabled={pendingId === "new"} className="rounded-md bg-brand-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              Create Challenge
            </button>
            <button type="button" onClick={() => setCreating(false)} className="text-xs font-bold text-text-grey hover:underline">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setCreating(true)} className="text-xs font-bold text-brand-primary hover:underline">
          + Create Challenge
        </button>
      )}
    </div>
  );
}
