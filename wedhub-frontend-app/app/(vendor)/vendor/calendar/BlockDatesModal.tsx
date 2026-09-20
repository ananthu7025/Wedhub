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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-border my-8" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-text-dark">Block Dates / Mark Unavailable</h2>
            <p className="text-xs text-text-grey mt-0.5">
              Mark personal leave, holidays, or offline commitments
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-grey hover:bg-surface-input hover:text-text-dark transition"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">
                From Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">
                To Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-grey mb-1">Reason / Note</label>
            <input
              type="text"
              placeholder="e.g., Vacation, Family Event, Maintenance..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
            />
            {/* Quick reason chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                    reason === r
                      ? "bg-brand-primary-soft text-brand-primary border-brand-primary font-bold"
                      : "bg-surface-input text-text-dark border-border hover:bg-gray-200"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3.5 text-xs text-blue-900 leading-relaxed">
            Blocked dates prevent double-booking and appear as unavailable on couple date checks.
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-text-dark hover:bg-surface-input transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-primary px-5 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover transition disabled:opacity-60 flex items-center gap-2"
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
