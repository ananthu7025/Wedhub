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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-border my-8" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-text-dark">
              {existingBooking ? "Edit Wedding / Booking" : "Add Wedding / Booking"}
            </h2>
            <p className="text-xs text-text-grey mt-0.5">
              Record couple details, event timing, venue, and advance status
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-medium">
              {error}
            </div>
          )}

          {/* Couple / Client Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">
              Client / Couple Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-grey mb-1">
                  Couple / Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Ananya & Rohan"
                  value={clientName}
                  onChange={(e) => handleClientNameChange(e.target.value)}
                  className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-grey mb-1">
                  Phone (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="e.g., 9876543210"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-grey mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g., couple@example.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-grey mb-1">
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
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
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">
                Date & Timings
              </h4>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-grey font-medium">
                <input
                  type="checkbox"
                  checked={isMultiDay}
                  onChange={(e) => {
                    setIsMultiDay(e.target.checked);
                    if (!e.target.checked) setEndDate(startDate);
                  }}
                  className="rounded border-border text-brand-primary focus:ring-brand-primary"
                />
                Multi-day event
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-grey mb-1">
                  {isMultiDay ? "Start Date" : "Event Date"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!isMultiDay) setEndDate(e.target.value);
                  }}
                  className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
                />
              </div>
              {isMultiDay ? (
                <div>
                  <label className="block text-xs font-semibold text-text-grey mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-text-grey mb-1">Shift / Slot</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as VendorBookingShift)}
                    className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
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
                <label className="block text-xs font-semibold text-text-grey mb-1">Start Time (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., 08:30 AM"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-grey mb-1">End Time (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., 04:00 PM"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Venue Details */}
          <div className="space-y-3 pt-3 border-t border-border">
            <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">
              Venue & Location
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-grey mb-1">Venue Name / Hall</label>
                <input
                  type="text"
                  placeholder="e.g., Leela Palace, Grand Ballroom"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-grey mb-1">City / Area</label>
                <input
                  type="text"
                  placeholder="e.g., Kochi, Ernakulam"
                  value={venueCity}
                  onChange={(e) => setVenueCity(e.target.value)}
                  className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Financials & Status */}
          <div className="space-y-3 pt-3 border-t border-border">
            <h4 className="text-xs font-bold text-text-dark uppercase tracking-wider">
              Commercials & Booking Status
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-grey mb-1">Total Value (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-grey mb-1">Advance Received (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(e.target.value)}
                  className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-grey mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VendorBookingStatus)}
                  className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none font-medium"
                >
                  <option value="CONFIRMED">✓ Confirmed</option>
                  <option value="TENTATIVE">⏳ Tentative Hold</option>
                  <option value="COMPLETED">🎉 Completed</option>
                  <option value="CANCELLED">✕ Cancelled</option>
                </select>
              </div>
            </div>

            {totalAmount && advancePaid && Number(totalAmount) > Number(advancePaid) && (
              <div className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Balance Due: ₹{(Number(totalAmount) - Number(advancePaid)).toLocaleString("en-IN")}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5 pt-3 border-t border-border">
            <label className="block text-xs font-semibold text-text-grey">Internal Notes / Requirements</label>
            <textarea
              rows={2}
              placeholder="e.g., Deliverables agreed, team crew assigned, gear checklist..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
            />
          </div>

          {/* Buttons */}
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
              {existingBooking ? "Save Changes" : "Create Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
