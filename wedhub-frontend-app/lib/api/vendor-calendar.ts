import "server-only";
import { apiFetch } from "./client";
import type {
  PublicDateAvailabilityResponse,
  UpcomingWeddingItem,
  VendorCalendarSetting,
  VendorMonthCalendarResponse,
} from "./vendor-calendar.types";

export function getMyCalendarSettings() {
  return apiFetch<VendorCalendarSetting>("/vendor-calendar/settings", {
    cache: "no-store",
  });
}

export function getMyMonthCalendar(year?: number, month?: number) {
  const query: Record<string, string | number> = {};
  if (year) query.year = year;
  if (month) query.month = month;

  return apiFetch<VendorMonthCalendarResponse>("/vendor-calendar/month", {
    query,
    cache: "no-store",
  });
}

export function getMyUpcomingWeddings(limit = 10) {
  return apiFetch<UpcomingWeddingItem[]>("/vendor-calendar/upcoming", {
    query: { limit },
    cache: "no-store",
  });
}

export function getPublicVendorAvailability(slug: string, year?: number, month?: number) {
  const query: Record<string, string | number> = {};
  if (year) query.year = year;
  if (month) query.month = month;

  return apiFetch<PublicDateAvailabilityResponse>(`/vendor-calendar/availability/${slug}`, {
    query,
    cache: "no-store",
  });
}
