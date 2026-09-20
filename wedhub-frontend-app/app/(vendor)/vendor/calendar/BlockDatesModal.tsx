"use client";

import { useState } from "react";
import type { VendorBlackoutDate } from "@/lib/api/vendor-calendar.types";
import { createMyBlackoutDate } from "@/lib/api/vendor-calendar-client";
import { formatApiError } from "@/lib/utils/error";

interface BlockDatesModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (blackout: VendorBlackoutDate) => void;
  initialDate?: string;
}

const QUICK_REASONS = [
  "Vacation / Off",
  "Booked Offline",
  "Family Function",
  "Out of Town",
  "Maintenance & Gear Prep",
];

export function BlockDatesModal({
  open,
  onClose,
  onSuccess,
  initialDate,
}: BlockDatesModalProps) {
  if (!open) return null;

  const defaultDate = initialDate ?? new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) {
      setError("Please select a date to block.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await createMyBlackoutDate({
        startDate,
        endDate: endDate || startDate,
        reason: reason.trim() || null,
      });

      if (res.success) {
        onSuccess(res.data);
        onClose();
      } else {
        setError(formatApiError(res.error));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to block dates");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-surface-white rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle">
          <div>
            <h3 className="text-base font-bold text-text-dark">Block Dates / Mark Unavailable</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Mark personal leave, holidays, or offline commitments
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-dark hover:bg-surface-elevated rounded-lg transition"
            aria-label="Close modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-dark mb-1">
                From Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
                className="w-full px-3 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-dark mb-1">
                To Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-dark mb-1.5">Reason / Note</label>
            <input
              type="text"
              placeholder="e.g., Vacation, Family Event, Maintenance..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
            />
            {/* Quick reason chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                    reason === r
                      ? "bg-primary-50 text-primary-700 border-primary-300 font-medium"
                      : "bg-surface-subtle text-text-muted border-border hover:bg-surface-elevated"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            Blocked dates prevent double-booking and appear as unavailable on couple date checks.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-dark hover:bg-surface-elevated rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Block Date(s)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
