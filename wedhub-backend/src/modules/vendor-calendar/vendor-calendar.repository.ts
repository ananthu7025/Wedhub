import type { Prisma, VendorBookingStatus, VendorBookingShift } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export async function getOrCreateCalendarSettings(vendorId: string) {
  const existing = await prisma.vendorCalendarSetting.findUnique({
    where: { vendorId },
  });
  if (existing) return existing;

  return prisma.vendorCalendarSetting.create({
    data: { vendorId },
  });
}

export function updateCalendarSettings(
  vendorId: string,
  data: {
    maxBookingsPerDay?: number;
    publicCalendarEnabled?: boolean;
    icalToken?: string;
  },
) {
  const updateData = omitUndefined(data);
  return prisma.vendorCalendarSetting.upsert({
    where: { vendorId },
    create: {
      vendorId,
      ...updateData,
    },
    update: updateData,
  });
}

export function findSettingsByIcalToken(icalToken: string) {
  return prisma.vendorCalendarSetting.findUnique({
    where: { icalToken },
    include: { vendor: { select: { id: true, businessName: true, slug: true } } },
  });
}

export function findBookingsBetween(vendorId: string, start: Date, end: Date) {
  return prisma.vendorBooking.findMany({
    where: {
      vendorId,
      status: { not: "CANCELLED" },
      OR: [
        { startDate: { gte: start, lte: end } },
        { endDate: { gte: start, lte: end } },
        { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] },
      ],
    },
    orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
  });
}

export function findUpcomingBookings(vendorId: string, fromDate: Date, limit: number) {
  return prisma.vendorBooking.findMany({
    where: {
      vendorId,
      endDate: { gte: fromDate },
      status: { in: ["CONFIRMED", "TENTATIVE"] },
    },
    orderBy: [{ startDate: "asc" }],
    take: limit,
  });
}

export function findBookingById(vendorId: string, id: string) {
  return prisma.vendorBooking.findFirst({
    where: { id, vendorId },
  });
}

export function countActiveBookingsOnDate(
  vendorId: string,
  date: Date,
  excludeBookingId?: string,
) {
  return prisma.vendorBooking.count({
    where: {
      vendorId,
      status: { not: "CANCELLED" },
      startDate: { lte: date },
      endDate: { gte: date },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
  });
}

export function createBooking(
  vendorId: string,
  data: {
    title: string;
    clientName: string;
    clientPhone?: string | null;
    clientEmail?: string | null;
    eventType: string;
    startDate: Date;
    endDate: Date;
    shift: VendorBookingShift;
    startTime?: string | null;
    endTime?: string | null;
    venueName?: string | null;
    venueCity?: string | null;
    packageTitle?: string | null;
    totalAmount?: Prisma.Decimal | number | null;
    advancePaid?: Prisma.Decimal | number | null;
    status: VendorBookingStatus;
    notes?: string | null;
    leadId?: string | null;
    invoiceId?: string | null;
    coupleUserId?: string | null;
  },
) {
  return prisma.vendorBooking.create({
    data: {
      vendorId,
      ...data,
    },
  });
}

export type UpdateBookingRepoData = Partial<{
  title: string | undefined;
  clientName: string | undefined;
  clientPhone: string | null | undefined;
  clientEmail: string | null | undefined;
  eventType: string | undefined;
  startDate: Date | undefined;
  endDate: Date | undefined;
  shift: VendorBookingShift | undefined;
  startTime: string | null | undefined;
  endTime: string | null | undefined;
  venueName: string | null | undefined;
  venueCity: string | null | undefined;
  packageTitle: string | null | undefined;
  totalAmount: Prisma.Decimal | number | null | undefined;
  advancePaid: Prisma.Decimal | number | null | undefined;
  status: VendorBookingStatus | undefined;
  notes: string | null | undefined;
  leadId: string | null | undefined;
  invoiceId: string | null | undefined;
  coupleUserId: string | null | undefined;
}>;

export function updateBooking(
  vendorId: string,
  id: string,
  data: UpdateBookingRepoData,
) {
  return prisma.vendorBooking.updateMany({
    where: { id, vendorId },
    data: omitUndefined(data),
  });
}

export function deleteBooking(vendorId: string, id: string) {
  return prisma.vendorBooking.deleteMany({
    where: { id, vendorId },
  });
}

export function findBlackoutDatesBetween(vendorId: string, start: Date, end: Date) {
  return prisma.vendorBlackoutDate.findMany({
    where: {
      vendorId,
      OR: [
        { startDate: { gte: start, lte: end } },
        { endDate: { gte: start, lte: end } },
        { AND: [{ startDate: { lte: start } }, { endDate: { gte: end } }] },
      ],
    },
    orderBy: { startDate: "asc" },
  });
}

export function findBlackoutDateById(vendorId: string, id: string) {
  return prisma.vendorBlackoutDate.findFirst({
    where: { id, vendorId },
  });
}

export function createBlackoutDate(
  vendorId: string,
  data: {
    startDate: Date;
    endDate: Date;
    reason?: string | null;
  },
) {
  return prisma.vendorBlackoutDate.create({
    data: {
      vendorId,
      ...data,
    },
  });
}

export function deleteBlackoutDate(vendorId: string, id: string) {
  return prisma.vendorBlackoutDate.deleteMany({
    where: { id, vendorId },
  });
}

export function findVendorBySlug(slug: string) {
  return prisma.vendor.findUnique({
    where: { slug },
    select: {
      id: true,
      businessName: true,
      slug: true,
      calendarSetting: true,
    },
  });
}
