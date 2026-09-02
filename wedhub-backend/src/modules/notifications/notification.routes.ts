import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody, validateQuery } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import * as notificationController from "./notification.controller";
import { listNotificationsQuerySchema, setPreferenceSchema } from "./notification.schema";

export const notificationRouter = Router();
notificationRouter.use(authenticateMiddleware);

notificationRouter.get("/me", validateQuery(listNotificationsQuerySchema), asyncHandler(notificationController.listMyNotifications));
notificationRouter.get("/me/unread-count", asyncHandler(notificationController.getUnreadCount));
notificationRouter.post("/me/:id/read", asyncHandler(notificationController.markAsRead));
notificationRouter.post("/me/read-all", asyncHandler(notificationController.markAllAsRead));
notificationRouter.get("/me/preferences", asyncHandler(notificationController.listMyPreferences));
notificationRouter.put("/me/preferences", validateBody(setPreferenceSchema), asyncHandler(notificationController.setPreference));
