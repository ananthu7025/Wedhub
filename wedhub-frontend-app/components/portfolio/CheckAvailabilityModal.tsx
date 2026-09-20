"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchPublicAvailability } from "@/lib/api/vendor-calendar-client";
import type { PublicDateAvailabilityResponse } from "@/lib/api/vendor-calendar.types";

interface CheckAvailabilityModalProps {
  open: boolean;
  onClose: () => void;
  vendorSlug: string;
  vendorName: string;
  onProceedToEnquire: (selectedDate: string) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CheckAvailabilityModal({
  open,
  onClose,
  vendorSlug,
  vendorName,
  onProceedToEnquire,
}: CheckAvailabilityModalProps) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [availability, setAvailability] = useState<PublicDateAvailabilityResponse | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Check auth on open
  useEffect(() => {
    if (!open) return;
    setCheckingAuth(true);
    fetch("/api/users/me", { credentials: "include" })
      .then((res) => res.json())
      .then((json: { success: boolean; data?: unknown }) => {
        setIsLoggedIn(Boolean(json.success && json.data));
      })
      .catch(() => {
        setIsLoggedIn(false);
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, [open]);

  // Fetch availability when logged in
  useEffect(() => {
    if (!open || !isLoggedIn) return;
    setLoadingCalendar(true);
    fetchPublicAvailability(vendorSlug, year, month)
      .then((res) => {
        if (res.success) {
          setAvailability(res.data);
        }
      })
      .catch(() => {
        // Fallback gracefully
      })
      .finally(() => {
        setLoadingCalendar(false);
      });
  }, [open, isLoggedIn, vendorSlug, year, month]);

  if (!open) return null;

  function changeMonth(delta: number) {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setMonth(nextMonth);
    setYear(nextYear);
  }

  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
  });
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const selectedDayInfo = selectedDate && availability?.days ? availability.days[selectedDate] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-surface-white rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-text-dark">Check Date Availability</h3>
              <p className="text-xs text-text-muted">{vendorName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-dark hover:bg-surface-elevated rounded-xl transition"
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Auth Check State */}
        {checkingAuth ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-text-muted font-medium">Checking session...</p>
          </div>
        ) : !isLoggedIn ? (
          /* Authentication Gate */
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200/80">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-text-dark">Sign in to View Availability</h4>
              <p className="text-xs text-text-muted max-w-sm mx-auto mt-1.5 leading-relaxed">
                Real-time booking calendars are exclusive to registered couples on WedHub. Please sign in or create a free account to check whether {vendorName} is available for your wedding.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-text-muted hover:text-text-dark transition"
              >
                Cancel
              </button>
              <Link
                href={`/login?returnUrl=/portfolio/${vendorSlug}`}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition"
              >
                Sign In to View Calendar →
              </Link>
            </div>
          </div>
        ) : (
          /* Logged-in Availability Calendar */
          <div className="p-6 space-y-5">
            {/* Month Header Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 bg-surface-subtle p-1 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="p-1.5 hover:bg-surface-white rounded-lg text-text-dark transition"
                  aria-label="Previous month"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <span className="px-3 text-xs font-bold text-text-dark min-w-[120px] text-center">
                  {monthName} {year}
                </span>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="p-1.5 hover:bg-surface-white rounded-lg text-text-dark transition"
                  aria-label="Next month"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[11px] text-text-muted font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Booked
                </span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-1">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((w, idx) => (
                  <div
                    key={w}
                    className={`text-center text-[11px] font-bold py-1 ${
                      idx === 0 || idx === 6 ? "text-primary-600" : "text-text-muted"
                    }`}
                  >
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {/* Empty leading cells */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10 rounded-lg bg-slate-50/40" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const isPast = dateStr < todayStr;
                  const dayData = availability?.days[dateStr];
                  const isSelected = selectedDate === dateStr;

                  const isBooked = dayData?.status === "BOOKED";
                  const isBlocked = dayData?.status === "BLOCKED";
                  const isAvailable = !isPast && !isBooked && !isBlocked;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isPast || isBlocked}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`h-11 rounded-xl text-xs font-semibold flex flex-col items-center justify-center relative transition border ${
                        isSelected
                          ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                          : isPast
                          ? "bg-slate-50 text-slate-300 border-transparent cursor-not-allowed"
                          : isBooked
                          ? "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                          : isBlocked
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-surface-white text-text-dark border-border hover:border-emerald-300 hover:bg-emerald-50/50"
                      }`}
                    >
                      <span>{dayNum}</span>
                      {!isPast && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            isSelected
                              ? "bg-white"
                              : isBooked
                              ? "bg-rose-500"
                              : isBlocked
                              ? "bg-slate-400"
                              : "bg-emerald-500"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Feedback Strip */}
            {selectedDate ? (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                  selectedDayInfo?.status === "BOOKED"
                    ? "bg-rose-50 border-rose-200 text-rose-800"
                    : selectedDayInfo?.status === "BLOCKED"
                    ? "bg-slate-100 border-slate-200 text-slate-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}
              >
                <div>
                  <p className="font-bold">
                    {new Date(selectedDate + "T00:00:00Z").toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-[11px] mt-0.5">
                    {selectedDayInfo?.status === "BOOKED"
                      ? "⚠️ Vendor has another wedding scheduled. You can still reach out to discuss flexibility."
                      : selectedDayInfo?.status === "BLOCKED"
                      ? "Vendor has marked this date unavailable."
                      : "✓ Vendor is currently free and open for bookings on this date!"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onProceedToEnquire(selectedDate);
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-text-dark hover:bg-neutral-800 shrink-0 transition"
                >
                  Enquire for Date →
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-text-muted">
                Tap on any date above to check availability for your wedding day
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
