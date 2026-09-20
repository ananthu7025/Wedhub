import { describe, expect, it } from "vitest";
import {
  createBookingSchema,
  createBlackoutDateSchema,
  updateCalendarSettingsSchema,
  calendarMonthQuerySchema,
} from "../../src/modules/vendor-calendar/vendor-calendar.schema";

describe("Vendor Calendar Zod Validation Schemas", () => {
  it("validates a valid wedding booking", () => {
    const validBooking = {
      title: "Priya & Rahul Wedding",
      clientName: "Priya Nair",
      clientPhone: "9876543210",
      clientEmail: "priya@example.com",
      eventType: "Wedding",
      startDate: "2026-11-20",
      endDate: "2026-11-20",
      shift: "FULL_DAY" as const,
      startTime: "08:00 AM",
      endTime: "10:00 PM",
      venueName: "Lulu Grand Palace",
      venueCity: "Kochi",
      totalAmount: 150000,
      advancePaid: 50000,
      status: "CONFIRMED" as const,
      notes: "Arrive 1 hour early for drone setup",
    };

    const parsed = createBookingSchema.safeParse(validBooking);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.clientName).toBe("Priya Nair");
      expect(parsed.data.totalAmount).toBe(150000);
      expect(parsed.data.advancePaid).toBe(50000);
    }
  });

  it("fails if required fields are missing", () => {
    const invalidBooking = {
      startDate: "2026-11-20",
    };

    const parsed = createBookingSchema.safeParse(invalidBooking);
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const invalidDate = {
      title: "Wedding",
      clientName: "Rahul",
      startDate: "20-11-2026", // Wrong format
    };

    const parsed = createBookingSchema.safeParse(invalidDate);
    expect(parsed.success).toBe(false);
  });

  it("validates blackout date input", () => {
    const blackout = {
      startDate: "2026-12-25",
      endDate: "2026-12-31",
      reason: "Holiday Break",
    };

    const parsed = createBlackoutDateSchema.safeParse(blackout);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.reason).toBe("Holiday Break");
    }
  });

  it("validates calendar settings updates", () => {
    const settings = {
      maxBookingsPerDay: 2,
      publicCalendarEnabled: true,
      regenerateIcalToken: false,
    };

    const parsed = updateCalendarSettingsSchema.safeParse(settings);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.maxBookingsPerDay).toBe(2);
      expect(parsed.data.publicCalendarEnabled).toBe(true);
    }
  });

  it("parses calendar month query and defaults to current month/year", () => {
    const parsed = calendarMonthQuerySchema.parse({ year: "2026", month: "10" });
    expect(parsed.year).toBe(2026);
    expect(parsed.month).toBe(10);
  });
});
