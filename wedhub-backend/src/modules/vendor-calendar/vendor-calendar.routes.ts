import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as calendarController from "./vendor-calendar.controller";
import {
  calendarMonthQuerySchema,
  createBlackoutDateSchema,
  createBookingSchema,
  upcomingQuerySchema,
  updateBookingSchema,
  updateCalendarSettingsSchema,
} from "./vendor-calendar.schema";

export const vendorCalendarRouter = Router();

// ---------------------------------------------------------------------------
// 1. iCal Feed (Token-based auth in URL, consumed by Google/Apple Calendar)
// ---------------------------------------------------------------------------
vendorCalendarRouter.get(
  "/feed/:token",
  asyncHandler(calendarController.getIcalFeed),
);

// ---------------------------------------------------------------------------
// 2. Public / Couple Availability (Requires Logged-In User session)
// ---------------------------------------------------------------------------
vendorCalendarRouter.get(
  "/availability/:slug",
  authenticateMiddleware,
  validateQuery(calendarMonthQuerySchema),
  asyncHandler(calendarController.getPublicAvailability),
);

// ---------------------------------------------------------------------------
// 3. Vendor Calendar Management (Authenticated VENDOR only)
// ---------------------------------------------------------------------------
vendorCalendarRouter.use(authenticateMiddleware);
vendorCalendarRouter.use(authorize(Role.VENDOR));

// Settings
vendorCalendarRouter.get(
  "/settings",
  asyncHandler(calendarController.getCalendarSettings),
);

vendorCalendarRouter.patch(
  "/settings",
  validateBody(updateCalendarSettingsSchema),
  asyncHandler(calendarController.updateCalendarSettings),
);

// Month view calendar matrix
vendorCalendarRouter.get(
  "/month",
  validateQuery(calendarMonthQuerySchema),
  asyncHandler(calendarController.getMonthCalendar),
);

// Upcoming weddings agenda
vendorCalendarRouter.get(
  "/upcoming",
  validateQuery(upcomingQuerySchema),
  asyncHandler(calendarController.getUpcomingWeddings),
);

// Bookings CRUD
vendorCalendarRouter.post(
  "/bookings",
  validateBody(createBookingSchema),
  asyncHandler(calendarController.createBooking),
);

vendorCalendarRouter.patch(
  "/bookings/:id",
  validateBody(updateBookingSchema),
  asyncHandler(calendarController.updateBooking),
);

vendorCalendarRouter.delete(
  "/bookings/:id",
  asyncHandler(calendarController.deleteBooking),
);

// Blackout dates
vendorCalendarRouter.post(
  "/blackout-dates",
  validateBody(createBlackoutDateSchema),
  asyncHandler(calendarController.createBlackoutDate),
);

vendorCalendarRouter.delete(
  "/blackout-dates/:id",
  asyncHandler(calendarController.deleteBlackoutDate),
);
