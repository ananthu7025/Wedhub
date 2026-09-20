"use client";

import { useState } from "react";
import type {
  CreateBookingBody,
  VendorBooking,
  VendorBookingShift,
  VendorBookingStatus,
} from "@/lib/api/vendor-calendar.types";
import { createMyBooking, updateMyBooking } from "@/lib/api/vendor-calendar-client";
import { formatApiError } from "@/lib/utils/error";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (booking: VendorBooking) => void;
  initialDate?: string;
  existingBooking?: VendorBooking | null;
}

const EVENT_TYPES = [
  "Wedding",
  "Reception",
  "Engagement",
  "Sangeet",
  "Mehendi",
  "Haldi",
  "Pre-Wedding Shoot",
  "Other",
];

export function BookingModal({
  open,
  onClose,
  onSuccess,
  initialDate,
  existingBooking,
}: BookingModalProps) {
  if (!open) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultDate = existingBooking?.startDate ?? initialDate ?? todayStr;

  const [title, setTitle] = useState(existingBooking?.title ?? "");
  const [clientName, setClientName] = useState(existingBooking?.clientName ?? "");
  const [clientPhone, setClientPhone] = useState(existingBooking?.clientPhone ?? "");
  const [clientEmail, setClientEmail] = useState(existingBooking?.clientEmail ?? "");
  const [eventType, setEventType] = useState(existingBooking?.eventType ?? "Wedding");
  const [startDate, setStartDate] = useState(defaultDate);
  const [isMultiDay, setIsMultiDay] = useState(
    existingBooking ? existingBooking.startDate !== existingBooking.endDate : false,
  );
  const [endDate, setEndDate] = useState(existingBooking?.endDate ?? defaultDate);
  const [shift, setShift] = useState<VendorBookingShift>(existingBooking?.shift ?? "FULL_DAY");
  const [startTime, setStartTime] = useState(existingBooking?.startTime ?? "");
  const [endTime, setEndTime] = useState(existingBooking?.endTime ?? "");
  const [venueName, setVenueName] = useState(existingBooking?.venueName ?? "");
  const [venueCity, setVenueCity] = useState(existingBooking?.venueCity ?? "");
  const [packageTitle, setPackageTitle] = useState(existingBooking?.packageTitle ?? "");
  const [totalAmount, setTotalAmount] = useState<string>(
    existingBooking?.totalAmount ? String(existingBooking.totalAmount) : "",
  );
  const [advancePaid, setAdvancePaid] = useState<string>(
    existingBooking?.advancePaid ? String(existingBooking.advancePaid) : "",
  );
  const [status, setStatus] = useState<VendorBookingStatus>(existingBooking?.status ?? "CONFIRMED");
  const [notes, setNotes] = useState(existingBooking?.notes ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill title if empty when clientName or eventType changes
  function handleClientNameChange(val: string) {
    setClientName(val);
    if (!existingBooking && (!title || title === `${clientName} ${eventType}`)) {
      setTitle(`${val} ${eventType}`.trim());
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) {
      setError("Please enter the couple / client name.");
      return;
    }
    if (!startDate) {
      setError("Please select a start date.");
      return;
    }

    setSaving(true);
    setError(null);

    const body: CreateBookingBody = {
      title: title.trim() || `${clientName} ${eventType}`,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || null,
      clientEmail: clientEmail.trim() || null,
      eventType,
      startDate,
      endDate: isMultiDay ? endDate : startDate,
      shift,
      startTime: startTime.trim() || null,
      endTime: endTime.trim() || null,
      venueName: venueName.trim() || null,
      venueCity: venueCity.trim() || null,
      packageTitle: packageTitle.trim() || null,
      totalAmount: totalAmount ? Number(totalAmount) : null,
      advancePaid: advancePaid ? Number(advancePaid) : null,
      status,
      notes: notes.trim() || null,
    };

    try {
      if (existingBooking) {
        const res = await updateMyBooking(existingBooking.id, body);
        if (res.success) {
          onSuccess(res.data);
          onClose();
        } else {
          setError(formatApiError(res.error));
        }
      } else {
        const res = await createMyBooking(body);
        if (res.success) {
          onSuccess(res.data);
          onClose();
        } else {
          setError(formatApiError(res.error));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save booking");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-surface-white rounded-2xl shadow-2xl border border-border overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle">
          <div>
            <h3 className="text-lg font-bold text-text-dark">
              {existingBooking ? "Edit Wedding / Booking" : "Add Wedding / Booking"}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Record couple details, event timing, venue, and advance status
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-dark hover:bg-surface-elevated rounded-lg transition"
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Couple / Client Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Client / Couple Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-dark mb-1">
                  Couple / Client Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Ananya & Rohan"
                  value={clientName}
                  onChange={(e) => handleClientNameChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dark mb-1">
                  Phone (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="e.g., 9876543210"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-dark mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g., couple@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dark mb-1">
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Event Schedule & Dates */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Date & Timings
              </h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-muted font-medium">
                <input
                  type="checkbox"
                  checked={isMultiDay}
                  onChange={(e) => {
                    setIsMultiDay(e.target.checked);
                    if (!e.target.checked) setEndDate(startDate);
                  }}
                  className="rounded border-border text-primary-600 focus:ring-primary-500"
                />
                Multi-day event
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-dark mb-1">
                  {isMultiDay ? "Start Date" : "Event Date"} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!isMultiDay) setEndDate(e.target.value);
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
                />
              </div>
              {isMultiDay ? (
                <div>
                  <label className="block text-xs font-medium text-text-dark mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-text-dark mb-1">Shift / Slot</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as VendorBookingShift)}
                    className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
                  >
                    <option value="FULL_DAY">Full Day</option>
                    <option value="MORNING">Morning Shift</option>
                    <option value="EVENING">Evening Shift</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-dark mb-1">Start Time (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., 08:30 AM"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dark mb-1">End Time (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., 04:00 PM"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
                />
              </div>
            </div>
          </div>

          {/* Venue Details */}
          <div className="space-y-3 pt-2 border-t border-border">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Venue & Location
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-dark mb-1">Venue Name / Hall</label>
                <input
                  type="text"
                  placeholder="e.g., Leela Palace, Grand Ballroom"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dark mb-1">City / Area</label>
                <input
                  type="text"
                  placeholder="e.g., Kochi, Ernakulam"
                  value={venueCity}
                  onChange={(e) => setVenueCity(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
                />
              </div>
            </div>
          </div>

          {/* Financials & Status */}
          <div className="space-y-3 pt-2 border-t border-border">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Commercials & Booking Status
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-dark mb-1">Total Value (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dark mb-1">Advance Received (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dark mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VendorBookingStatus)}
                  className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark font-medium"
                >
                  <option value="CONFIRMED">✓ Confirmed</option>
                  <option value="TENTATIVE">⏳ Tentative Hold</option>
                  <option value="COMPLETED">🎉 Completed</option>
                  <option value="CANCELLED">✕ Cancelled</option>
                </select>
              </div>
            </div>

            {totalAmount && advancePaid && Number(totalAmount) > Number(advancePaid) && (
              <div className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                Balance Due: ₹{(Number(totalAmount) - Number(advancePaid)).toLocaleString("en-IN")}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <label className="block text-xs font-medium text-text-dark">Internal Notes / Requirements</label>
            <textarea
              rows={2}
              placeholder="e.g., Deliverables agreed, team crew assigned, gear checklist..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-text-dark"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
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
              className="px-6 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {existingBooking ? "Save Changes" : "Create Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
