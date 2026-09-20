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
  try {
    const response = await fetch(`/api${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      return {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: `Server returned an unexpected response (Status ${response.status})`,
        },
      };
    }

    if (!response.ok) {
      if (parsed && typeof parsed === "object" && "error" in parsed) {
        return parsed as ApiResponse<T>;
      }
      return {
        success: false,
        error: {
          code: "HTTP_ERROR",
          message: `Request failed with status ${response.status}`,
        },
      };
    }

    return parsed as ApiResponse<T>;
  } catch (err) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Network connection error",
      },
    };
  }
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
