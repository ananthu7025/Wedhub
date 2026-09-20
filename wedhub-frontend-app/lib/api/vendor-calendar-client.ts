"use client";

import type { ApiResponse } from "./types";
import type {
  CreateBlackoutDateBody,
  CreateBookingBody,
  PublicDateAvailabilityResponse,
  UpcomingWeddingItem,
  UpdateBookingBody,
  UpdateCalendarSettingsBody,
  VendorBlackoutDate,
  VendorBooking,
  VendorCalendarSetting,
  VendorMonthCalendarResponse,
} from "./vendor-calendar.types";

async function call<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
): Promise<ApiResponse<T>> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return (await response.json()) as ApiResponse<T>;
}

export function fetchMyCalendarMonth(year: number, month: number) {
  return call<VendorMonthCalendarResponse>(`/vendor-calendar/month?year=${year}&month=${month}`, "GET");
}

export function fetchMyUpcomingWeddings(limit = 10) {
  return call<UpcomingWeddingItem[]>(`/vendor-calendar/upcoming?limit=${limit}`, "GET");
}

export function fetchMyCalendarSettings() {
  return call<VendorCalendarSetting>("/vendor-calendar/settings", "GET");
}

export function updateMyCalendarSettings(body: UpdateCalendarSettingsBody) {
  return call<VendorCalendarSetting>("/vendor-calendar/settings", "PATCH", body);
}

export function createMyBooking(body: CreateBookingBody) {
  return call<VendorBooking>("/vendor-calendar/bookings", "POST", body);
}

export function updateMyBooking(id: string, body: UpdateBookingBody) {
  return call<VendorBooking>(`/vendor-calendar/bookings/${id}`, "PATCH", body);
}

export function deleteMyBooking(id: string) {
  return call<{ success: boolean }>(`/vendor-calendar/bookings/${id}`, "DELETE");
}

export function createMyBlackoutDate(body: CreateBlackoutDateBody) {
  return call<VendorBlackoutDate>("/vendor-calendar/blackout-dates", "POST", body);
}

export function deleteMyBlackoutDate(id: string) {
  return call<{ success: boolean }>(`/vendor-calendar/blackout-dates/${id}`, "DELETE");
}

export function fetchPublicAvailability(slug: string, year: number, month: number) {
  return call<PublicDateAvailabilityResponse>(
    `/vendor-calendar/availability/${slug}?year=${year}&month=${month}`,
    "GET",
  );
}
