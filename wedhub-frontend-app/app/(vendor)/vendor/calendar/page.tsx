import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import {
  getMyCalendarSettings,
  getMyMonthCalendar,
  getMyUpcomingWeddings,
} from "@/lib/api/vendor-calendar";
import type {
  UpcomingWeddingItem,
  VendorCalendarSetting,
  VendorMonthCalendarResponse,
} from "@/lib/api/vendor-calendar.types";
import { CalendarBoard } from "./CalendarBoard";

export const metadata: Metadata = {
  title: "Booking Calendar | WedHub Vendor",
  description: "Mark available and booked dates, manage upcoming weddings, and sync with Google Calendar.",
};

export default async function VendorCalendarPage() {
  const vendor = await requireVendorOwnership();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let calendar: VendorMonthCalendarResponse = {
    year: currentYear,
    month: currentMonth,
    days: {},
    summary: {
      totalBookingsThisMonth: 0,
      confirmedCount: 0,
      tentativeCount: 0,
      blockedDaysCount: 0,
    },
  };
  let upcoming: UpcomingWeddingItem[] = [];
  let settings: VendorCalendarSetting | null = null;

  try {
    const [calendarRes, upcomingRes, settingsRes] = await Promise.all([
      getMyMonthCalendar(currentYear, currentMonth),
      getMyUpcomingWeddings(15),
      getMyCalendarSettings(),
    ]);
    if (calendarRes.data) calendar = calendarRes.data;
    if (upcomingRes.data) upcoming = upcomingRes.data;
    if (settingsRes.data) settings = settingsRes.data;
  } catch {
    // Fallback gracefully if error
  }

  return (
    <VendorShell
      activeHref="/vendor/calendar"
      vendorName={vendor.businessName}
      vendorSlug={vendor.slug}
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-dark tracking-tight">Booking Calendar</h1>
          <p className="text-sm text-text-muted mt-1">
            Manage your wedding dates, client commitments, availability, and Google Calendar sync
          </p>
        </div>

        <CalendarBoard
          initialCalendar={calendar}
          initialUpcoming={upcoming}
          initialSettings={settings}
        />
      </div>
    </VendorShell>
  );
}
