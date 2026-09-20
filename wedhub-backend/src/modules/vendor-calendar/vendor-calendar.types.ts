import type { VendorBookingStatus, VendorBookingShift } from "@prisma/client";

export interface VendorCalendarSettingDto {
  id: string;
  vendorId: string;
  maxBookingsPerDay: number;
  publicCalendarEnabled: boolean;
  icalToken: string;
  icalFeedUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorBookingDto {
  id: string;
  vendorId: string;
  leadId: string | null;
  invoiceId: string | null;
  coupleUserId: string | null;
  title: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  eventType: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  shift: VendorBookingShift;
  startTime: string | null;
  endTime: string | null;
  venueName: string | null;
  venueCity: string | null;
  packageTitle: string | null;
  totalAmount: number | null;
  advancePaid: number | null;
  balanceDue: number | null;
  status: VendorBookingStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorBlackoutDateDto {
  id: string;
  vendorId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type DayAvailabilityStatus = "AVAILABLE" | "BOOKED" | "BLOCKED" | "TENTATIVE";

export interface CalendarDaySummary {
  date: string; // YYYY-MM-DD
  status: DayAvailabilityStatus;
  isBlocked: boolean;
  blockReason?: string | null;
  bookingsCount: number;
  maxCapacity: number;
  bookings: Array<{
    id: string;
    title: string;
    clientName: string;
    eventType: string;
    shift: VendorBookingShift;
    status: VendorBookingStatus;
    venueName: string | null;
    venueCity: string | null;
  }>;
}

export interface VendorMonthCalendarResponse {
  year: number;
  month: number; // 1-12
  days: Record<string, CalendarDaySummary>; // keyed by YYYY-MM-DD
  summary: {
    totalBookingsThisMonth: number;
    confirmedCount: number;
    tentativeCount: number;
    blockedDaysCount: number;
  };
}

export interface UpcomingWeddingItem {
  id: string;
  title: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  eventType: string;
  startDate: string;
  endDate: string;
  shift: VendorBookingShift;
  startTime: string | null;
  endTime: string | null;
  venueName: string | null;
  venueCity: string | null;
  packageTitle: string | null;
  totalAmount: number | null;
  advancePaid: number | null;
  balanceDue: number | null;
  status: VendorBookingStatus;
  notes: string | null;
  daysUntil: number; // 0 = today, negative = past, positive = days in future
  whatsappUrl: string | null;
  googleCalendarUrl: string;
}

export interface PublicDateAvailabilityResponse {
  vendorSlug: string;
  businessName: string;
  publicCalendarEnabled: boolean;
  year: number;
  month: number;
  days: Record<
    string,
    {
      date: string;
      status: "AVAILABLE" | "BOOKED" | "BLOCKED";
      shiftAvailable: {
        fullDay: boolean;
        morning: boolean;
        evening: boolean;
      };
    }
  >;
}
