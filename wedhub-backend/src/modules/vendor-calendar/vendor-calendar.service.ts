import { randomUUID } from "crypto";
import { NotFoundError, ValidationError } from "../../common/errors";
import { env } from "../../config/env";
import * as calendarRepository from "./vendor-calendar.repository";
import type {
  CreateBlackoutDateInput,
  CreateBookingInput,
  UpdateBookingInput,
  UpdateCalendarSettingsInput,
} from "./vendor-calendar.schema";
import type {
  CalendarDaySummary,
  PublicDateAvailabilityResponse,
  UpcomingWeddingItem,
  VendorBlackoutDateDto,
  VendorBookingDto,
  VendorCalendarSettingDto,
  VendorMonthCalendarResponse,
} from "./vendor-calendar.types";

function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildGoogleCalendarUrl(booking: {
  title: string;
  clientName: string;
  eventType: string;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  venueName?: string | null;
  venueCity?: string | null;
  notes?: string | null;
}): string {
  const startCompact = booking.startDate.replace(/-/g, "");
  // For all-day events in Google Calendar, end date is exclusive, so add 1 day
  const endD = parseDateOnly(booking.endDate);
  endD.setUTCDate(endD.getUTCDate() + 1);
  const endCompact = formatDateOnly(endD).replace(/-/g, "");

  const datesParam = `${startCompact}/${endCompact}`;
  const titleParam = encodeURIComponent(`${booking.eventType}: ${booking.clientName} (${booking.title})`);
  const locationParts = [booking.venueName, booking.venueCity].filter(Boolean);
  const locationParam = encodeURIComponent(locationParts.join(", "));

  const detailsParts = [
    `Client: ${booking.clientName}`,
    `Event: ${booking.eventType}`,
    booking.startTime ? `Time: ${booking.startTime}${booking.endTime ? ` - ${booking.endTime}` : ""}` : "",
    booking.notes ? `Notes: ${booking.notes}` : "",
    `Managed via WedHub Vendor Calendar`,
  ].filter(Boolean);
  const detailsParam = encodeURIComponent(detailsParts.join("\n"));

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleParam}&dates=${datesParam}&details=${detailsParam}&location=${locationParam}`;
}

function buildWhatsAppUrl(phone: string | null | undefined, clientName: string, eventType: string, date: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const formattedPhone = digits.length === 10 ? `91${digits}` : digits;
  const text = encodeURIComponent(
    `Hello ${clientName}! Reaching out regarding your upcoming ${eventType} on ${date}. Let us know if you need any assistance with arrangements!`
  );
  return `https://wa.me/${formattedPhone}?text=${text}`;
}

export async function getSettings(vendorId: string): Promise<VendorCalendarSettingDto> {
  const settings = await calendarRepository.getOrCreateCalendarSettings(vendorId);
  const baseUrl = env.API_PUBLIC_URL ? `${env.API_PUBLIC_URL}/api/v1` : `http://localhost:${env.PORT}/api/v1`;
  const icalFeedUrl = `${baseUrl}/vendor-calendar/feed/${settings.icalToken}.ics`;

  return {
    id: settings.id,
    vendorId: settings.vendorId,
    maxBookingsPerDay: settings.maxBookingsPerDay,
    publicCalendarEnabled: settings.publicCalendarEnabled,
    icalToken: settings.icalToken,
    icalFeedUrl,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

export async function updateSettings(
  vendorId: string,
  input: UpdateCalendarSettingsInput,
): Promise<VendorCalendarSettingDto> {
  const data: {
    maxBookingsPerDay?: number;
    publicCalendarEnabled?: boolean;
    icalToken?: string;
  } = {};

  if (input.maxBookingsPerDay !== undefined) {
    data.maxBookingsPerDay = input.maxBookingsPerDay;
  }
  if (input.publicCalendarEnabled !== undefined) {
    data.publicCalendarEnabled = input.publicCalendarEnabled;
  }
  if (input.regenerateIcalToken) {
    data.icalToken = randomUUID();
  }

  const updated = await calendarRepository.updateCalendarSettings(vendorId, data);
  const baseUrl = env.API_PUBLIC_URL ? `${env.API_PUBLIC_URL}/api/v1` : `http://localhost:${env.PORT}/api/v1`;
  return {
    id: updated.id,
    vendorId: updated.vendorId,
    maxBookingsPerDay: updated.maxBookingsPerDay,
    publicCalendarEnabled: updated.publicCalendarEnabled,
    icalToken: updated.icalToken,
    icalFeedUrl: `${baseUrl}/vendor-calendar/feed/${updated.icalToken}.ics`,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

export async function getMonthCalendar(
  vendorId: string,
  year: number,
  month: number,
): Promise<VendorMonthCalendarResponse> {
  const settings = await calendarRepository.getOrCreateCalendarSettings(vendorId);

  // Month is 1-indexed (1 = Jan, 12 = Dec)
  const monthStartStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const monthEndD = new Date(Date.UTC(nextMonthYear, nextMonthNum - 1, 0));
  const monthEndStr = formatDateOnly(monthEndD);

  const startD = parseDateOnly(monthStartStr);
  const endD = parseDateOnly(monthEndStr);

  const [bookings, blackouts] = await Promise.all([
    calendarRepository.findBookingsBetween(vendorId, startD, endD),
    calendarRepository.findBlackoutDatesBetween(vendorId, startD, endD),
  ]);

  const daysInMonth = monthEndD.getUTCDate();
  const days: Record<string, CalendarDaySummary> = {};

  let confirmedCount = 0;
  let tentativeCount = 0;
  let blockedDaysCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // Check blackout
    const matchingBlackout = blackouts.find((b) => {
      const bStart = formatDateOnly(b.startDate);
      const bEnd = formatDateOnly(b.endDate);
      return dateStr >= bStart && dateStr <= bEnd;
    });

    // Check bookings covering this day
    const matchingBookings = bookings.filter((bk) => {
      const bkStart = formatDateOnly(bk.startDate);
      const bkEnd = formatDateOnly(bk.endDate);
      return dateStr >= bkStart && dateStr <= bkEnd;
    });

    let status: "AVAILABLE" | "BOOKED" | "BLOCKED" | "TENTATIVE" = "AVAILABLE";

    if (matchingBlackout) {
      status = "BLOCKED";
      blockedDaysCount++;
    } else if (matchingBookings.length >= settings.maxBookingsPerDay) {
      status = "BOOKED";
    } else if (matchingBookings.length > 0) {
      const allTentative = matchingBookings.every((b) => b.status === "TENTATIVE");
      status = allTentative ? "TENTATIVE" : "BOOKED";
    }

    days[dateStr] = {
      date: dateStr,
      status,
      isBlocked: Boolean(matchingBlackout),
      blockReason: matchingBlackout?.reason ?? null,
      bookingsCount: matchingBookings.length,
      maxCapacity: settings.maxBookingsPerDay,
      bookings: matchingBookings.map((b) => ({
        id: b.id,
        title: b.title,
        clientName: b.clientName,
        eventType: b.eventType,
        shift: b.shift,
        status: b.status,
        venueName: b.venueName,
        venueCity: b.venueCity,
      })),
    };
  }

  // Monthly summary stats
  bookings.forEach((b) => {
    if (b.status === "CONFIRMED") confirmedCount++;
    if (b.status === "TENTATIVE") tentativeCount++;
  });

  return {
    year,
    month,
    days,
    summary: {
      totalBookingsThisMonth: bookings.length,
      confirmedCount,
      tentativeCount,
      blockedDaysCount,
    },
  };
}

export async function getUpcomingWeddings(
  vendorId: string,
  limit = 10,
): Promise<UpcomingWeddingItem[]> {
  const todayStr = formatDateOnly(new Date());
  const todayD = parseDateOnly(todayStr);

  const bookings = await calendarRepository.findUpcomingBookings(vendorId, todayD, limit);

  return bookings.map((b) => {
    const startStr = formatDateOnly(b.startDate);
    const endStr = formatDateOnly(b.endDate);
    const startD = parseDateOnly(startStr);

    const diffMs = startD.getTime() - todayD.getTime();
    const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const total = b.totalAmount ? Number(b.totalAmount) : null;
    const advance = b.advancePaid ? Number(b.advancePaid) : null;
    const balance = total !== null && advance !== null ? Math.max(0, total - advance) : null;

    return {
      id: b.id,
      title: b.title,
      clientName: b.clientName,
      clientPhone: b.clientPhone,
      clientEmail: b.clientEmail,
      eventType: b.eventType,
      startDate: startStr,
      endDate: endStr,
      shift: b.shift,
      startTime: b.startTime,
      endTime: b.endTime,
      venueName: b.venueName,
      venueCity: b.venueCity,
      packageTitle: b.packageTitle,
      totalAmount: total,
      advancePaid: advance,
      balanceDue: balance,
      status: b.status,
      notes: b.notes,
      daysUntil,
      whatsappUrl: buildWhatsAppUrl(b.clientPhone, b.clientName, b.eventType, startStr),
      googleCalendarUrl: buildGoogleCalendarUrl({
        title: b.title,
        clientName: b.clientName,
        eventType: b.eventType,
        startDate: startStr,
        endDate: endStr,
        startTime: b.startTime,
        endTime: b.endTime,
        venueName: b.venueName,
        venueCity: b.venueCity,
        notes: b.notes,
      }),
    };
  });
}

export async function createBooking(
  vendorId: string,
  input: CreateBookingInput,
): Promise<VendorBookingDto> {
  const startDate = parseDateOnly(input.startDate);
  const endDate = input.endDate ? parseDateOnly(input.endDate) : startDate;

  if (startDate.getTime() > endDate.getTime()) {
    throw new ValidationError("startDate cannot be after endDate");
  }

  const booking = await calendarRepository.createBooking(vendorId, {
    title: input.title,
    clientName: input.clientName,
    clientPhone: input.clientPhone ?? null,
    clientEmail: input.clientEmail ?? null,
    eventType: input.eventType,
    startDate,
    endDate,
    shift: input.shift,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    venueName: input.venueName ?? null,
    venueCity: input.venueCity ?? null,
    packageTitle: input.packageTitle ?? null,
    totalAmount: input.totalAmount ?? null,
    advancePaid: input.advancePaid ?? null,
    status: input.status,
    notes: input.notes ?? null,
    leadId: input.leadId ?? null,
    invoiceId: input.invoiceId ?? null,
    coupleUserId: input.coupleUserId ?? null,
  });

  const total = booking.totalAmount ? Number(booking.totalAmount) : null;
  const advance = booking.advancePaid ? Number(booking.advancePaid) : null;
  const balance = total !== null && advance !== null ? Math.max(0, total - advance) : null;

  return {
    id: booking.id,
    vendorId: booking.vendorId,
    leadId: booking.leadId,
    invoiceId: booking.invoiceId,
    coupleUserId: booking.coupleUserId,
    title: booking.title,
    clientName: booking.clientName,
    clientPhone: booking.clientPhone,
    clientEmail: booking.clientEmail,
    eventType: booking.eventType,
    startDate: formatDateOnly(booking.startDate),
    endDate: formatDateOnly(booking.endDate),
    shift: booking.shift,
    startTime: booking.startTime,
    endTime: booking.endTime,
    venueName: booking.venueName,
    venueCity: booking.venueCity,
    packageTitle: booking.packageTitle,
    totalAmount: total,
    advancePaid: advance,
    balanceDue: balance,
    status: booking.status,
    notes: booking.notes,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export async function updateBooking(
  vendorId: string,
  id: string,
  input: UpdateBookingInput,
): Promise<VendorBookingDto> {
  const existing = await calendarRepository.findBookingById(vendorId, id);
  if (!existing) {
    throw new NotFoundError("Booking not found");
  }

  const data: calendarRepository.UpdateBookingRepoData = {
    title: input.title,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    clientEmail: input.clientEmail,
    eventType: input.eventType,
    shift: input.shift,
    startTime: input.startTime,
    endTime: input.endTime,
    venueName: input.venueName,
    venueCity: input.venueCity,
    packageTitle: input.packageTitle,
    totalAmount: input.totalAmount,
    advancePaid: input.advancePaid,
    status: input.status,
    notes: input.notes,
    leadId: input.leadId,
    invoiceId: input.invoiceId,
    coupleUserId: input.coupleUserId,
  };

  if (input.startDate) {
    data.startDate = parseDateOnly(input.startDate);
  }
  if (input.endDate) {
    data.endDate = parseDateOnly(input.endDate);
  }

  if (data.startDate && data.endDate && data.startDate.getTime() > data.endDate.getTime()) {
    throw new ValidationError("startDate cannot be after endDate");
  }

  await calendarRepository.updateBooking(vendorId, id, data);

  const updated = await calendarRepository.findBookingById(vendorId, id);
  if (!updated) {
    throw new NotFoundError("Booking not found after update");
  }

  const total = updated.totalAmount ? Number(updated.totalAmount) : null;
  const advance = updated.advancePaid ? Number(updated.advancePaid) : null;
  const balance = total !== null && advance !== null ? Math.max(0, total - advance) : null;

  return {
    id: updated.id,
    vendorId: updated.vendorId,
    leadId: updated.leadId,
    invoiceId: updated.invoiceId,
    coupleUserId: updated.coupleUserId,
    title: updated.title,
    clientName: updated.clientName,
    clientPhone: updated.clientPhone,
    clientEmail: updated.clientEmail,
    eventType: updated.eventType,
    startDate: formatDateOnly(updated.startDate),
    endDate: formatDateOnly(updated.endDate),
    shift: updated.shift,
    startTime: updated.startTime,
    endTime: updated.endTime,
    venueName: updated.venueName,
    venueCity: updated.venueCity,
    packageTitle: updated.packageTitle,
    totalAmount: total,
    advancePaid: advance,
    balanceDue: balance,
    status: updated.status,
    notes: updated.notes,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

export async function deleteBooking(vendorId: string, id: string): Promise<{ success: boolean }> {
  const existing = await calendarRepository.findBookingById(vendorId, id);
  if (!existing) {
    throw new NotFoundError("Booking not found");
  }
  await calendarRepository.deleteBooking(vendorId, id);
  return { success: true };
}

export async function createBlackoutDate(
  vendorId: string,
  input: CreateBlackoutDateInput,
): Promise<VendorBlackoutDateDto> {
  const startDate = parseDateOnly(input.startDate);
  const endDate = input.endDate ? parseDateOnly(input.endDate) : startDate;

  if (startDate.getTime() > endDate.getTime()) {
    throw new ValidationError("startDate cannot be after endDate");
  }

  const blackout = await calendarRepository.createBlackoutDate(vendorId, {
    startDate,
    endDate,
    reason: input.reason ?? null,
  });

  return {
    id: blackout.id,
    vendorId: blackout.vendorId,
    startDate: formatDateOnly(blackout.startDate),
    endDate: formatDateOnly(blackout.endDate),
    reason: blackout.reason,
    createdAt: blackout.createdAt,
    updatedAt: blackout.updatedAt,
  };
}

export async function deleteBlackoutDate(vendorId: string, id: string): Promise<{ success: boolean }> {
  const existing = await calendarRepository.findBlackoutDateById(vendorId, id);
  if (!existing) {
    throw new NotFoundError("Blackout date not found");
  }
  await calendarRepository.deleteBlackoutDate(vendorId, id);
  return { success: true };
}

export async function getPublicAvailability(
  slug: string,
  year: number,
  month: number,
): Promise<PublicDateAvailabilityResponse> {
  const vendor = await calendarRepository.findVendorBySlug(slug);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }

  const settings = vendor.calendarSetting ?? (await calendarRepository.getOrCreateCalendarSettings(vendor.id));
  if (!settings.publicCalendarEnabled) {
    return {
      vendorSlug: vendor.slug,
      businessName: vendor.businessName,
      publicCalendarEnabled: false,
      year,
      month,
      days: {},
    };
  }

  const monthStartStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonthNum = month === 12 ? 1 : month + 1;
  const monthEndD = new Date(Date.UTC(nextMonthYear, nextMonthNum - 1, 0));
  const monthEndStr = formatDateOnly(monthEndD);

  const startD = parseDateOnly(monthStartStr);
  const endD = parseDateOnly(monthEndStr);

  const [bookings, blackouts] = await Promise.all([
    calendarRepository.findBookingsBetween(vendor.id, startD, endD),
    calendarRepository.findBlackoutDatesBetween(vendor.id, startD, endD),
  ]);

  const daysInMonth = monthEndD.getUTCDate();
  const days: PublicDateAvailabilityResponse["days"] = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const hasBlackout = blackouts.some((b) => {
      const bStart = formatDateOnly(b.startDate);
      const bEnd = formatDateOnly(b.endDate);
      return dateStr >= bStart && dateStr <= bEnd;
    });

    const activeBookings = bookings.filter((bk) => {
      const bkStart = formatDateOnly(bk.startDate);
      const bkEnd = formatDateOnly(bk.endDate);
      return dateStr >= bkStart && dateStr <= bkEnd && bk.status === "CONFIRMED";
    });

    let status: "AVAILABLE" | "BOOKED" | "BLOCKED" = "AVAILABLE";
    if (hasBlackout) {
      status = "BLOCKED";
    } else if (activeBookings.length >= settings.maxBookingsPerDay) {
      status = "BOOKED";
    }

    const hasMorningBooking = activeBookings.some((b) => b.shift === "MORNING" || b.shift === "FULL_DAY");
    const hasEveningBooking = activeBookings.some((b) => b.shift === "EVENING" || b.shift === "FULL_DAY");

    days[dateStr] = {
      date: dateStr,
      status,
      shiftAvailable: {
        fullDay: !hasBlackout && activeBookings.length === 0,
        morning: !hasBlackout && !hasMorningBooking && activeBookings.length < settings.maxBookingsPerDay,
        evening: !hasBlackout && !hasEveningBooking && activeBookings.length < settings.maxBookingsPerDay,
      },
    };
  }

  return {
    vendorSlug: vendor.slug,
    businessName: vendor.businessName,
    publicCalendarEnabled: true,
    year,
    month,
    days,
  };
}

export async function generateIcalFeed(token: string): Promise<string> {
  const setting = await calendarRepository.findSettingsByIcalToken(token);
  if (!setting) {
    throw new NotFoundError("Calendar feed not found or invalid token");
  }

  const vendor = setting.vendor;
  // Fetch from 60 days ago to 365 days ahead
  const pastDate = new Date();
  pastDate.setUTCDate(pastDate.getUTCDate() - 60);
  const futureDate = new Date();
  futureDate.setUTCDate(futureDate.getUTCDate() + 365);

  const bookings = await calendarRepository.findBookingsBetween(vendor.id, pastDate, futureDate);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WedHub//Vendor Calendar//EN",
    `X-WR-CALNAME:WedHub - ${vendor.businessName}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const b of bookings) {
    const startCompact = formatDateOnly(b.startDate).replace(/-/g, "");
    const endD = parseDateOnly(formatDateOnly(b.endDate));
    endD.setUTCDate(endD.getUTCDate() + 1); // DTEND is exclusive for VALUE=DATE
    const endCompact = formatDateOnly(endD).replace(/-/g, "");

    const locationParts = [b.venueName, b.venueCity].filter(Boolean);
    const location = locationParts.join(", ");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:booking-${b.id}@wedhub.in`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`);
    lines.push(`DTSTART;VALUE=DATE:${startCompact}`);
    lines.push(`DTEND;VALUE=DATE:${endCompact}`);
    lines.push(`SUMMARY:${b.eventType}: ${b.clientName} (${b.status})`);
    if (location) {
      lines.push(`LOCATION:${location}`);
    }
    const descParts = [
      `Client: ${b.clientName}`,
      b.clientPhone ? `Phone: ${b.clientPhone}` : "",
      `Event: ${b.eventType}`,
      b.shift ? `Shift: ${b.shift}` : "",
      b.notes ? `Notes: ${b.notes}` : "",
      `Status: ${b.status}`,
    ].filter(Boolean);
    lines.push(`DESCRIPTION:${descParts.join("\\n")}`);
    lines.push(`STATUS:${b.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
