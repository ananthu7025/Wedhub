"use client";

import { useState } from "react";
import { CalendarIcon, MapPinIcon, SunriseIcon, MoonIcon, RingIcon } from "@/components/portfolio/icons";
import type {
  CalendarDaySummary,
  UpcomingWeddingItem,
  VendorBooking,
  VendorCalendarSetting,
  VendorMonthCalendarResponse,
} from "@/lib/api/vendor-calendar.types";
import { fetchMyCalendarMonth, fetchMyUpcomingWeddings } from "@/lib/api/vendor-calendar-client";
import { BookingModal } from "./BookingModal";
import { BlockDatesModal } from "./BlockDatesModal";
import { BookingDetailDrawer } from "./BookingDetailDrawer";
import { GoogleCalendarSyncModal } from "./GoogleCalendarSyncModal";

interface CalendarBoardProps {
  initialCalendar: VendorMonthCalendarResponse;
  initialUpcoming: UpcomingWeddingItem[];
  initialSettings: VendorCalendarSetting | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarBoard({
  initialCalendar,
  initialUpcoming,
  initialSettings,
}: CalendarBoardProps) {
  const [calendar, setCalendar] = useState<VendorMonthCalendarResponse>(initialCalendar);
  const [upcoming, setUpcoming] = useState<UpcomingWeddingItem[]>(initialUpcoming);
  const [settings, setSettings] = useState<VendorCalendarSetting | null>(initialSettings);

  const [currentYear, setCurrentYear] = useState(initialCalendar.year);
  const [currentMonth, setCurrentMonth] = useState(initialCalendar.month);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const [viewMode, setViewMode] = useState<"MONTH" | "AGENDA">("MONTH");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "TENTATIVE" | "BLOCKED">("ALL");

  // Modals state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [selectedDateForNew, setSelectedDateForNew] = useState<string | undefined>();
  const [editingBooking, setEditingBooking] = useState<VendorBooking | null>(null);
  const [activeBookingDetail, setActiveBookingDetail] = useState<VendorBooking | null>(null);

  // Month navigation
  async function changeMonth(delta: number) {
    let nextMonth = currentMonth + delta;
    let nextYear = currentYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }

    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
    setLoadingMonth(true);

    try {
      const res = await fetchMyCalendarMonth(nextYear, nextMonth);
      if (res.success) {
        setCalendar(res.data);
      }
    } finally {
      setLoadingMonth(false);
    }
  }

  async function jumpToToday() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    setCurrentMonth(m);
    setCurrentYear(y);
    setLoadingMonth(true);
    try {
      const res = await fetchMyCalendarMonth(y, m);
      if (res.success) {
        setCalendar(res.data);
      }
    } finally {
      setLoadingMonth(false);
    }
  }

  async function reloadCalendar() {
    const [monthRes, upRes] = await Promise.all([
      fetchMyCalendarMonth(currentYear, currentMonth),
      fetchMyUpcomingWeddings(10),
    ]);
    if (monthRes.success) setCalendar(monthRes.data);
    if (upRes.success) setUpcoming(upRes.data);
  }

  // Generate calendar grid structure (including preceding blank days)
  const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();

  const monthName = new Date(Date.UTC(currentYear, currentMonth - 1, 1)).toLocaleString("en-US", {
    month: "long",
  });

  const nextUpcoming = upcoming.find((u) => u.daysUntil >= 0);

  return (
    <div className="space-y-6">
      {/* Top Banner: Next Wedding Countdown & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {nextUpcoming ? (
          <div className="lg:col-span-2 p-5 rounded-2xl bg-gradient-to-r from-primary-900 to-indigo-900 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider backdrop-blur-xs">
                  {nextUpcoming.daysUntil === 0
                    ? "Wedding Today!"
                    : nextUpcoming.daysUntil === 1
                    ? "Wedding Tomorrow"
                    : `In ${nextUpcoming.daysUntil} days`}
                </span>
                <span className="text-xs text-white/80 font-medium">{nextUpcoming.eventType}</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{nextUpcoming.title}</h2>
              <p className="text-xs text-white/80 flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />{" "}
                  {new Date(nextUpcoming.startDate + "T00:00:00Z").toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {nextUpcoming.venueName && (
                  <span className="inline-flex items-center gap-1">
                    • <MapPinIcon className="h-3.5 w-3.5" /> {nextUpcoming.venueName}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {nextUpcoming.whatsappUrl && (
                <a
                  href={nextUpcoming.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition shadow flex items-center gap-1.5"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z" />
                  </svg>
                  Chat Couple
                </a>
              )}
              <a
                href={nextUpcoming.googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition backdrop-blur-xs flex items-center gap-1.5"
              >
                Google Cal
              </a>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-border shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-text-dark">Ready for Upcoming Weddings</h3>
              <p className="text-xs text-text-grey mt-0.5">
                Mark confirmed wedding bookings to keep track of schedules and advance balances
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedDateForNew(undefined);
                setEditingBooking(null);
                setBookingModalOpen(true);
              }}
              className="rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover transition"
            >
              + Add Wedding
            </button>
          </div>
        )}

        {/* Monthly Metrics Summary Card */}
        <div className="p-5 rounded-2xl bg-white border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-grey uppercase tracking-wider">
              {monthName} Overview
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-input text-text-grey">
              Cap: {settings?.maxBookingsPerDay || 1}/day
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-border">
            <div>
              <p className="text-xs text-text-grey">Booked</p>
              <p className="text-xl font-bold text-text-dark mt-0.5">
                {calendar.summary.totalBookingsThisMonth}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-grey">Confirmed</p>
              <p className="text-xl font-bold text-emerald-600 mt-0.5">
                {calendar.summary.confirmedCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-grey">Blocked</p>
              <p className="text-xl font-bold text-rose-600 mt-0.5">
                {calendar.summary.blockedDaysCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Calendar Card & Toolbar */}
      <div className="bg-white border border-border rounded-2xl shadow-xs overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Month Navigator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-surface-input border border-border rounded-xl p-1">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="p-1.5 hover:bg-white rounded-lg text-text-dark transition"
                title="Previous month"
                aria-label="Previous month"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="px-3 text-sm font-bold text-text-dark min-w-[140px] text-center">
                {monthName} {currentYear}
              </span>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="p-1.5 hover:bg-white rounded-lg text-text-dark transition"
                title="Next month"
                aria-label="Next month"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              onClick={jumpToToday}
              className="px-3 py-1.5 text-xs font-bold bg-surface-input hover:bg-gray-200 text-text-dark border border-border rounded-lg transition"
            >
              Today
            </button>

            {loadingMonth && (
              <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* View Toggles & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher */}
            <div className="flex items-center bg-surface-input p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setViewMode("MONTH")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  viewMode === "MONTH"
                    ? "bg-white text-text-dark shadow-xs"
                    : "text-text-grey hover:text-text-dark"
                }`}
              >
                Month Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("AGENDA")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  viewMode === "AGENDA"
                    ? "bg-white text-text-dark shadow-xs"
                    : "text-text-grey hover:text-text-dark"
                }`}
              >
                Upcoming Agenda ({upcoming.length})
              </button>
            </div>

            {/* Google Cal Sync */}
            <button
              type="button"
              onClick={() => setSyncModalOpen(true)}
              className="px-3 py-2 text-xs font-bold bg-brand-primary-soft/50 hover:bg-brand-primary-soft text-brand-primary border border-brand-primary/20 rounded-lg transition flex items-center gap-1.5"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Google Cal Sync
            </button>

            {/* Block Dates */}
            <button
              type="button"
              onClick={() => setBlockModalOpen(true)}
              className="px-3 py-2 text-xs font-bold bg-surface-input hover:bg-gray-200 text-text-dark border border-border rounded-lg transition flex items-center gap-1.5"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              Block Dates
            </button>
          </div>
        </div>

        {/* Status Filters Bar */}
        <div className="px-5 py-2.5 bg-surface-input border-b border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-text-grey font-semibold mr-1">Filter:</span>
            {(["ALL", "CONFIRMED", "TENTATIVE", "BLOCKED"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  statusFilter === filter
                    ? "bg-text-dark text-white"
                    : "bg-white text-text-grey border border-border hover:bg-gray-100"
                }`}
              >
                {filter === "ALL" ? "All Dates" : filter}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-4 text-[11px] text-text-grey">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Confirmed Wedding
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Tentative
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Blocked Date
            </span>
          </div>
        </div>

        {/* View Mode: MONTH GRID */}
        {viewMode === "MONTH" && (
          <div className="p-4 sm:p-5">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {WEEKDAYS.map((w, idx) => (
                <div
                  key={w}
                  className={`text-center text-xs font-semibold py-1.5 uppercase tracking-wider ${
                    idx === 0 || idx === 6 ? "text-primary-600" : "text-text-muted"
                  }`}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty leading padding cells */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="min-h-[90px] sm:min-h-[115px] bg-slate-50/50 rounded-xl border border-dashed border-slate-200/60 opacity-40"
                />
              ))}

              {/* Real month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(dayNum).padStart(
                  2,
                  "0",
                )}`;
                const dayData: CalendarDaySummary | undefined = calendar.days[dateStr];
                const isToday = dateStr === new Date().toISOString().slice(0, 10);

                // Filter logic
                if (statusFilter === "CONFIRMED" && dayData?.status !== "BOOKED") return null;
                if (statusFilter === "TENTATIVE" && dayData?.status !== "TENTATIVE") return null;
                if (statusFilter === "BLOCKED" && !dayData?.isBlocked) return null;

                const hasBookings = dayData && dayData.bookingsCount > 0;
                const isBlocked = dayData?.isBlocked;

                return (
                  <div
                    key={dateStr}
                    onClick={() => {
                      if (!hasBookings && !isBlocked) {
                        setSelectedDateForNew(dateStr);
                        setEditingBooking(null);
                        setBookingModalOpen(true);
                      }
                    }}
                    className={`group relative min-h-[95px] sm:min-h-[120px] p-2 rounded-xl border transition flex flex-col justify-between ${
                      isToday
                        ? "border-brand-primary ring-2 ring-brand-primary/20 bg-brand-primary-soft/15"
                        : isBlocked
                        ? "border-rose-200 bg-rose-50/40"
                        : hasBookings
                        ? "border-indigo-200 bg-indigo-50/20"
                        : "border-border bg-white hover:border-brand-primary hover:bg-surface-input cursor-pointer"
                    }`}
                  >
                    {/* Top Date Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? "bg-brand-primary text-white shadow-xs"
                            : isBlocked
                            ? "text-rose-700 font-semibold"
                            : hasBookings
                            ? "text-indigo-900 font-bold"
                            : "text-text-dark"
                        }`}
                      >
                        {dayNum}
                      </span>

                      {/* Quick Add Button on Hover */}
                      {!isBlocked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDateForNew(dateStr);
                            setEditingBooking(null);
                            setBookingModalOpen(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white border border-border text-text-grey hover:text-brand-primary shadow-xs transition"
                          title="Add wedding on this date"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Middle: Events or Blackout tags */}
                    <div className="flex-1 my-1 space-y-1 overflow-hidden">
                      {isBlocked && (
                        <div className="p-1 sm:p-1.5 rounded-lg bg-rose-100 text-rose-800 text-[10px] font-semibold truncate border border-rose-200">
                          🚫 {dayData.blockReason || "Blocked"}
                        </div>
                      )}

                      {dayData?.bookings.map((bk) => (
                        <div
                          key={bk.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Find full booking from upcoming or mock
                            const up = upcoming.find((u) => u.id === bk.id);
                            setActiveBookingDetail(
                              up
                                ? {
                                    ...up,
                                    vendorId: "",
                                    leadId: null,
                                    invoiceId: null,
                                    coupleUserId: null,
                                    createdAt: "",
                                    updatedAt: "",
                                  }
                                : {
                                    id: bk.id,
                                    vendorId: "",
                                    leadId: null,
                                    invoiceId: null,
                                    coupleUserId: null,
                                    title: bk.title,
                                    clientName: bk.clientName,
                                    clientPhone: null,
                                    clientEmail: null,
                                    eventType: bk.eventType,
                                    startDate: dateStr,
                                    endDate: dateStr,
                                    shift: bk.shift,
                                    startTime: null,
                                    endTime: null,
                                    venueName: bk.venueName,
                                    venueCity: bk.venueCity,
                                    packageTitle: null,
                                    totalAmount: null,
                                    advancePaid: null,
                                    balanceDue: null,
                                    status: bk.status,
                                    notes: null,
                                    createdAt: "",
                                    updatedAt: "",
                                  },
                            );
                          }}
                          className={`p-1 sm:p-1.5 rounded-lg text-[10px] font-medium truncate cursor-pointer transition shadow-xs border ${
                            bk.status === "CONFIRMED"
                              ? "bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-700"
                              : bk.status === "TENTATIVE"
                              ? "bg-amber-100 text-amber-900 hover:bg-amber-200 border-amber-300"
                              : "bg-slate-200 text-slate-800"
                          }`}
                          title={`${bk.eventType}: ${bk.clientName}`}
                        >
                          {bk.shift === "MORNING" ? (
                            <SunriseIcon className="inline h-2.5 w-2.5" />
                          ) : bk.shift === "EVENING" ? (
                            <MoonIcon className="inline h-2.5 w-2.5" />
                          ) : (
                            <RingIcon className="inline h-2.5 w-2.5" />
                          )}{" "}
                          {bk.clientName}
                        </div>
                      ))}
                    </div>

                    {/* Bottom Indicator */}
                    <div className="text-[10px] text-text-muted text-right">
                      {hasBookings && !isBlocked && (
                        <span className="font-semibold text-indigo-700">
                          {dayData.bookingsCount}/{dayData.maxCapacity} booked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode: UPCOMING AGENDA LIST */}
        {viewMode === "AGENDA" && (
          <div className="p-5">
            {upcoming.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="mx-auto text-slate-300 mb-3"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p className="text-sm font-semibold text-text-dark">No upcoming weddings scheduled</p>
                <p className="text-xs text-text-muted mt-1">
                  Click &ldquo;+ Add Wedding&rdquo; to schedule future wedding commitments.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {upcoming.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveBookingDetail({
                        ...item,
                        vendorId: "",
                        leadId: null,
                        invoiceId: null,
                        coupleUserId: null,
                        createdAt: "",
                        updatedAt: "",
                      });
                    }}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-input px-3 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 bg-brand-primary-soft/50 text-brand-primary rounded-xl font-mono text-center min-w-[65px] shrink-0 border border-brand-primary/20">
                        <span className="block text-xs uppercase text-brand-primary font-bold">
                          {new Date(item.startDate + "T00:00:00Z").toLocaleString("en-IN", {
                            month: "short",
                          })}
                        </span>
                        <span className="block text-xl font-extrabold text-text-dark leading-none mt-0.5">
                          {new Date(item.startDate + "T00:00:00Z").getUTCDate()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              item.status === "CONFIRMED"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.status === "TENTATIVE"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-input text-text-grey">
                            {item.eventType}
                          </span>
                          <span className="text-xs text-text-grey">
                            {item.daysUntil === 0
                              ? "• Today!"
                              : item.daysUntil > 0
                              ? `• In ${item.daysUntil} days`
                              : "• Past"}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-text-dark">{item.title}</h4>
                        <p className="text-xs text-text-grey">
                          Couple: <span className="font-semibold text-text-dark">{item.clientName}</span>
                          {item.venueName && (
                            <>
                              {" "}
                              • <MapPinIcon className="inline h-3 w-3 align-text-bottom" /> {item.venueName}
                            </>
                          )}
                          {item.venueCity && `, ${item.venueCity}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.totalAmount && (
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-text-grey">Total</p>
                          <p className="text-sm font-bold text-text-dark font-mono">
                            ₹{item.totalAmount.toLocaleString("en-IN")}
                          </p>
                        </div>
                      )}

                      {item.whatsappUrl && (
                        <a
                          href={item.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl border border-emerald-200 transition"
                          title="WhatsApp couple"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z" />
                          </svg>
                        </a>
                      )}

                      <a
                        href={item.googleCalendarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition flex items-center gap-1"
                      >
                        Google Cal
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals & Drawers */}
      <BookingModal
        open={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setEditingBooking(null);
        }}
        initialDate={selectedDateForNew}
        existingBooking={editingBooking}
        onSuccess={() => {
          reloadCalendar();
        }}
      />

      <BlockDatesModal
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        initialDate={selectedDateForNew}
        onSuccess={() => {
          reloadCalendar();
        }}
      />

      <GoogleCalendarSyncModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        settings={settings}
        onSettingsUpdated={(updated) => setSettings(updated)}
      />

      <BookingDetailDrawer
        booking={activeBookingDetail}
        onClose={() => setActiveBookingDetail(null)}
        onEdit={(booking) => {
          setActiveBookingDetail(null);
          setEditingBooking(booking);
          setBookingModalOpen(true);
        }}
        onBookingUpdated={() => {
          reloadCalendar();
          setActiveBookingDetail(null);
        }}
        onBookingDeleted={() => {
          reloadCalendar();
          setActiveBookingDetail(null);
        }}
      />
    </div>
  );
}
