export type VendorBookingStatus = "CONFIRMED" | "TENTATIVE" | "COMPLETED" | "CANCELLED";
export type VendorBookingShift = "FULL_DAY" | "MORNING" | "EVENING";
export type DayAvailabilityStatus = "AVAILABLE" | "BOOKED" | "BLOCKED" | "TENTATIVE";

export interface VendorCalendarSetting {
  id: string;
  vendorId: string;
  maxBookingsPerDay: number;
  publicCalendarEnabled: boolean;
  icalToken: string;
  icalFeedUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorBooking {
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
  createdAt: string;
  updatedAt: string;
}

export interface VendorBlackoutDate {
  id: string;
  vendorId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarDayBookingSummary {
  id: string;
  title: string;
  clientName: string;
  eventType: string;
  shift: VendorBookingShift;
  status: VendorBookingStatus;
  venueName: string | null;
  venueCity: string | null;
}

export interface CalendarDaySummary {
  date: string; // YYYY-MM-DD
  status: DayAvailabilityStatus;
  isBlocked: boolean;
  blockReason?: string | null;
  bookingsCount: number;
  maxCapacity: number;
  bookings: CalendarDayBookingSummary[];
}

export interface VendorMonthCalendarResponse {
  year: number;
  month: number;
  days: Record<string, CalendarDaySummary>;
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
  daysUntil: number;
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

export interface CreateBookingBody {
  title: string;
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  eventType?: string;
  startDate: string;
  endDate?: string;
  shift?: VendorBookingShift;
  startTime?: string | null;
  endTime?: string | null;
  venueName?: string | null;
  venueCity?: string | null;
  packageTitle?: string | null;
  totalAmount?: number | null;
  advancePaid?: number | null;
  status?: VendorBookingStatus;
  notes?: string | null;
  leadId?: string | null;
  invoiceId?: string | null;
  coupleUserId?: string | null;
}

export type UpdateBookingBody = Partial<CreateBookingBody>;

export interface CreateBlackoutDateBody {
  startDate: string;
  endDate?: string;
  reason?: string | null;
}

export interface UpdateCalendarSettingsBody {
  maxBookingsPerDay?: number;
  publicCalendarEnabled?: boolean;
  regenerateIcalToken?: boolean;
}
