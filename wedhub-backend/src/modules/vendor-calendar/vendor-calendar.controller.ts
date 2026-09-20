import type { Request, Response } from "express";
import { AuthenticationError, ValidationError } from "../../common/errors";
import { successResponse } from "../../common/utils/api-response.util";
import { getOwnedVendorOrThrow } from "../vendors/vendor.policy";
import * as calendarService from "./vendor-calendar.service";
import {
  calendarMonthQuerySchema,
  createBlackoutDateSchema,
  createBookingSchema,
  upcomingQuerySchema,
  updateBookingSchema,
  updateCalendarSettingsSchema,
} from "./vendor-calendar.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  if (!val) {
    throw new ValidationError(`Missing parameter: ${name}`);
  }
  return val;
}

export async function getCalendarSettings(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const settings = await calendarService.getSettings(vendor.id);
  res.json(successResponse(settings));
}

export async function updateCalendarSettings(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const parsed = updateCalendarSettingsSchema.parse(req.body);
  const settings = await calendarService.updateSettings(vendor.id, parsed);
  res.json(successResponse(settings));
}

export async function getMonthCalendar(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const query = calendarMonthQuerySchema.parse(req.query);
  const calendar = await calendarService.getMonthCalendar(vendor.id, query.year, query.month);
  res.json(successResponse(calendar));
}

export async function getUpcomingWeddings(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const query = upcomingQuerySchema.parse(req.query);
  const upcoming = await calendarService.getUpcomingWeddings(vendor.id, query.limit);
  res.json(successResponse(upcoming));
}

export async function createBooking(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const parsed = createBookingSchema.parse(req.body);
  const booking = await calendarService.createBooking(vendor.id, parsed);
  res.status(201).json(successResponse(booking));
}

export async function updateBooking(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const bookingId = getParam(req, "id");
  const parsed = updateBookingSchema.parse(req.body);
  const updated = await calendarService.updateBooking(vendor.id, bookingId, parsed);
  res.json(successResponse(updated));
}

export async function deleteBooking(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const bookingId = getParam(req, "id");
  await calendarService.deleteBooking(vendor.id, bookingId);
  res.json(successResponse({ success: true }));
}

export async function createBlackoutDate(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const parsed = createBlackoutDateSchema.parse(req.body);
  const blackout = await calendarService.createBlackoutDate(vendor.id, parsed);
  res.status(201).json(successResponse(blackout));
}

export async function deleteBlackoutDate(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const vendor = await getOwnedVendorOrThrow(userId);
  const blackoutId = getParam(req, "id");
  await calendarService.deleteBlackoutDate(vendor.id, blackoutId);
  res.json(successResponse({ success: true }));
}

/**
 * Public/Couple availability check — requires authenticated user session (logged-in couple).
 * Sanitized: exposes ONLY date status (AVAILABLE / BOOKED / BLOCKED) and shifts, never couple names or amounts.
 */
export async function getPublicAvailability(req: Request, res: Response): Promise<void> {
  requireUserId(req); // Enforces user is logged in
  const slug = getParam(req, "slug");
  const query = calendarMonthQuerySchema.parse(req.query);
  const result = await calendarService.getPublicAvailability(slug, query.year, query.month);
  res.json(successResponse(result));
}

/**
 * iCal feed endpoint (authenticated via secret token in URL).
 * Used by Google Calendar, Apple Calendar, Outlook.
 */
export async function getIcalFeed(req: Request, res: Response): Promise<void> {
  const token = getParam(req, "token").replace(/\.ics$/i, "");
  const icsContent = await calendarService.generateIcalFeed(token);
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `inline; filename="wedhub-calendar-${token}.ics"`);
  res.send(icsContent);
}
