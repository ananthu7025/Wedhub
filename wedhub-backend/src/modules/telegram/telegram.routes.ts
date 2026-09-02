import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import { authenticateMiddleware } from "../../common/middleware/authenticate.middleware";
import { authorize } from "../../common/middleware/authorize.middleware";
import { Role } from "../../common/enums/roles.enum";
import * as telegramController from "./telegram.controller";
import { registerWebhookSchema } from "./telegram.admin.schema";

export const telegramRouter = Router();

// No auth middleware — trust is established via the X-Telegram-Bot-Api-
// Secret-Token header (verifyWebhookSecret), same pattern as the Razorpay
// webhook route trusting HMAC signature instead of a session.
telegramRouter.post("/webhook", asyncHandler(telegramController.handleTelegramWebhook));

export const telegramAdminRouter = Router();
telegramAdminRouter.use(authenticateMiddleware, authorize(Role.ADMIN));
telegramAdminRouter.post(
  "/register-webhook",
  validateBody(registerWebhookSchema),
  asyncHandler(telegramController.registerWebhookAdmin),
);
