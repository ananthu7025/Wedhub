"use client";

import { useState } from "react";
import type { VendorBooking, VendorBookingStatus } from "@/lib/api/vendor-calendar.types";
import { deleteMyBooking, updateMyBooking } from "@/lib/api/vendor-calendar-client";
import { formatApiError } from "@/lib/utils/error";

interface BookingDetailDrawerProps {
  booking: VendorBooking | null;
  onClose: () => void;
  onEdit: (booking: VendorBooking) => void;
  onBookingUpdated: (booking: VendorBooking) => void;
  onBookingDeleted: (id: string) => void;
}

export function BookingDetailDrawer({
  booking,
  onClose,
  onEdit,
  onBookingUpdated,
  onBookingDeleted,
}: BookingDetailDrawerProps) {
  if (!booking) return null;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate Google Calendar Link
  const startCompact = booking.startDate.replace(/-/g, "");
  const endD = new Date(`${booking.endDate}T00:00:00.000Z`);
  endD.setUTCDate(endD.getUTCDate() + 1);
  const endCompact = endD.toISOString().slice(0, 10).replace(/-/g, "");

  const gCalDates = `${startCompact}/${endCompact}`;
  const gCalTitle = encodeURIComponent(`${booking.eventType}: ${booking.clientName}`);
  const gCalLocation = encodeURIComponent([booking.venueName, booking.venueCity].filter(Boolean).join(", "));
  const gCalDetails = encodeURIComponent(
    [
      `Client: ${booking.clientName}`,
      booking.clientPhone ? `Phone: ${booking.clientPhone}` : "",
      `Status: ${booking.status}`,
      booking.notes ? `Notes: ${booking.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gCalTitle}&dates=${gCalDates}&details=${gCalDetails}&location=${gCalLocation}`;

  // WhatsApp Link
  const phoneDigits = booking.clientPhone ? booking.clientPhone.replace(/\D/g, "") : "";
  const formattedPhone = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;
  const whatsappUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
        `Hello ${booking.clientName}! Reaching out regarding your upcoming ${booking.eventType} on ${booking.startDate}.`,
      )}`
    : null;

  async function handleStatusChange(newStatus: VendorBookingStatus) {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      const res = await updateMyBooking(booking.id, { status: newStatus });
      if (res.success) {
        onBookingUpdated(res.data);
      } else {
        setError(formatApiError(res.error));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!booking) return;
    if (!confirm(`Are you sure you want to remove "${booking.title}"?`)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await deleteMyBooking(booking.id);
      if (res.success) {
        onBookingDeleted(booking.id);
        onClose();
      } else {
        setError(formatApiError(res.error));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete booking");
    } finally {
      setBusy(false);
    }
  }

  const statusColors: Record<VendorBookingStatus, { bg: string; text: string; border: string }> = {
    CONFIRMED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    TENTATIVE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    COMPLETED: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    CANCELLED: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  };

  const statusStyle = statusColors[booking.status] || statusColors.CONFIRMED;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
            >
              {booking.status}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-input text-text-grey">
              {booking.eventType}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-grey hover:bg-surface-input hover:text-text-dark transition"
            aria-label="Close drawer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-medium">
              {error}
            </div>
          )}

          {/* Title & Client */}
          <div>
            <h2 className="text-xl font-bold text-text-dark">{booking.title}</h2>
            <p className="text-sm font-medium text-text-grey mt-0.5">Couple: {booking.clientName}</p>
          </div>

          {/* Date & Time Badge */}
          <div className="p-4 rounded-xl bg-surface-input border border-border flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary font-bold shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-dark">
                {new Date(booking.startDate + "T00:00:00Z").toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {booking.startDate !== booking.endDate && (
                  <>
                    {" "}
                    to{" "}
                    {new Date(booking.endDate + "T00:00:00Z").toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </>
                )}
              </p>
              <p className="text-xs text-text-grey mt-0.5">
                Shift: <span className="font-bold text-text-dark">{booking.shift.replace("_", " ")}</span>
                {booking.startTime && ` • ${booking.startTime}${booking.endTime ? ` - ${booking.endTime}` : ""}`}
              </p>
            </div>
          </div>

          {/* Venue & Location */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">Venue Location</h4>
            <div className="p-3.5 rounded-xl border border-border bg-white flex items-center gap-3">
              <div className="p-2 bg-surface-input text-text-grey rounded-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-text-dark">{booking.venueName || "Venue not specified"}</p>
                {booking.venueCity && <p className="text-xs text-text-grey">{booking.venueCity}</p>}
              </div>
            </div>
          </div>

          {/* Quick Actions (WhatsApp & Google Calendar) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold transition"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z" />
                  </svg>
                  Chat on WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-2 p-3 bg-surface-input text-text-grey border border-border rounded-xl text-xs font-medium cursor-not-allowed opacity-60"
                >
                  No Phone Number
                </button>
              )}

              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-semibold transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Add to Google Cal
              </a>
            </div>
          </div>

          {/* Financials Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">Payment Summary</h4>
            <div className="p-4 rounded-xl bg-surface-input border border-border space-y-2.5">
              <div className="flex justify-between text-xs text-text-grey">
                <span>Total Amount</span>
                <span className="font-semibold text-text-dark font-mono">
                  {booking.totalAmount ? `₹${Number(booking.totalAmount).toLocaleString("en-IN")}` : "—"}
                </span>
              </div>
              <div className="flex justify-between text-xs text-text-grey">
                <span>Advance Paid</span>
                <span className="font-semibold text-emerald-600 font-mono">
                  {booking.advancePaid ? `₹${Number(booking.advancePaid).toLocaleString("en-IN")}` : "₹0"}
                </span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between text-xs">
                <span className="font-semibold text-text-dark">Balance Remaining</span>
                <span className="font-bold text-amber-800 font-mono">
                  {booking.balanceDue ? `₹${Number(booking.balanceDue).toLocaleString("en-IN")}` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">Notes & Checklist</h4>
              <div className="p-3.5 rounded-xl border border-border bg-white text-xs text-text-dark whitespace-pre-wrap">
                {booking.notes}
              </div>
            </div>
          )}

          {/* Quick Status Changers */}
          <div className="space-y-2 pt-3 border-t border-border">
            <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">Update Status</h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || booking.status === "CONFIRMED"}
                onClick={() => handleStatusChange("CONFIRMED")}
                className="text-xs px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold disabled:opacity-50"
              >
                Mark Confirmed
              </button>
              <button
                type="button"
                disabled={busy || booking.status === "COMPLETED"}
                onClick={() => handleStatusChange("COMPLETED")}
                className="text-xs px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold disabled:opacity-50"
              >
                Mark Completed
              </button>
              <button
                type="button"
                disabled={busy || booking.status === "CANCELLED"}
                onClick={() => handleStatusChange("CANCELLED")}
                className="text-xs px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold disabled:opacity-50"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-border bg-surface-input flex items-center justify-between">
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
          >
            Delete Booking
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(booking)}
              className="rounded-lg bg-brand-primary px-5 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover transition"
            >
              Edit Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
