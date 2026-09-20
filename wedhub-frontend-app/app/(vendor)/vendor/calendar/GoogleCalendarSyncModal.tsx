"use client";

import { useState } from "react";
import type { VendorCalendarSetting } from "@/lib/api/vendor-calendar.types";
import { updateMyCalendarSettings } from "@/lib/api/vendor-calendar-client";
import { formatApiError } from "@/lib/utils/error";

interface GoogleCalendarSyncModalProps {
  open: boolean;
  onClose: () => void;
  settings: VendorCalendarSetting | null;
  onSettingsUpdated: (settings: VendorCalendarSetting) => void;
}

export function GoogleCalendarSyncModal({
  open,
  onClose,
  settings,
  onSettingsUpdated,
}: GoogleCalendarSyncModalProps) {
  if (!open) return null;

  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feedUrl = settings?.icalFeedUrl || "";
  // Webcal protocol link (launches native calendar app / Google subscription prompt)
  const webcalUrl = feedUrl.replace(/^https?:\/\//i, "webcal://");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  }

  async function handleRegenerate() {
    if (!confirm("Regenerating the link will disconnect any existing calendar subscriptions. Are you sure?")) {
      return;
    }
    setRegenerating(true);
    setError(null);
    try {
      const res = await updateMyCalendarSettings({ regenerateIcalToken: true });
      if (res.success) {
        onSettingsUpdated(res.data);
      } else {
        setError(formatApiError(res.error));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate token");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-border my-8" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary font-bold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-dark">Sync with Google Calendar</h2>
              <p className="text-xs text-text-grey mt-0.5">Live subscription feed for your phone and desktop</p>
            </div>
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

        {/* Body */}
        <div className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-medium">
              {error}
            </div>
          )}

          {/* Feed URL Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-grey">
              Your Private Calendar Feed URL (iCal)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={feedUrl}
                placeholder="https://..."
                className="flex-1 px-3.5 py-2 text-xs font-mono bg-surface-input border border-border rounded-lg text-text-dark select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                disabled={!feedUrl}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 disabled:opacity-50 ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-brand-primary text-white hover:bg-brand-primary-hover"
                }`}
              >
                {copied ? "✓ Copied" : "Copy Link"}
              </button>
            </div>
            <p className="text-[11px] text-text-grey">
              Keep this URL private. Anyone with this link can view your scheduled wedding dates.
            </p>
          </div>

          {/* Quick Subscribe Button */}
          <div>
            <a
              href={webcalUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-primary-soft/50 hover:bg-brand-primary-soft text-brand-primary border border-brand-primary/20 rounded-lg text-xs font-bold transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open in Default Calendar App / Google Calendar
            </a>
          </div>

          {/* How to setup in Google Calendar */}
          <div className="p-4 rounded-xl bg-surface-input border border-border space-y-2">
            <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">
              How to add to Google Calendar
            </h4>
            <ol className="text-xs text-text-grey space-y-1.5 list-decimal pl-4">
              <li>
                Open{" "}
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary font-bold hover:underline"
                >
                  Google Calendar
                </a>{" "}
                on your computer.
              </li>
              <li>
                On the left sidebar, click the <strong>+</strong> next to <em>Other calendars</em>.
              </li>
              <li>
                Click <strong>From URL</strong>.
              </li>
              <li>Paste the URL copied above and click <strong>Add calendar</strong>.</li>
            </ol>
            <p className="text-[11px] text-text-grey mt-2 pt-2 border-t border-border">
              WedHub bookings will automatically update inside Google Calendar as they are booked or rescheduled!
            </p>
          </div>

          {/* Security reset */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              type="button"
              disabled={regenerating}
              onClick={handleRegenerate}
              className="text-xs text-red-600 hover:underline font-semibold transition disabled:opacity-50"
            >
              {regenerating ? "Resetting..." : "Reset Private Link (Revoke old link)"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-text-dark hover:bg-surface-input transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
