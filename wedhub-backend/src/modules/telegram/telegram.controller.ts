import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { registerWebhook } from "../../integrations/telegram/telegram.client";
import * as telegramWebhookService from "./telegram.webhook.service";
import type { RegisterWebhookBody } from "./telegram.admin.schema";

export async function handleTelegramWebhook(req: Request, res: Response): Promise<void> {
  const secretToken = req.header("x-telegram-bot-api-secret-token");
  await telegramWebhookService.handleWebhook(req.body, secretToken);
  // Telegram expects a 200 (any 2xx) to consider the update delivered —
  // anything else triggers retries against the same webhook.
  res.json(successResponse({ received: true }));
}

export async function registerWebhookAdmin(req: Request, res: Response): Promise<void> {
  const body = req.body as RegisterWebhookBody;
  await registerWebhook(body.url);
  res.json(successResponse({ registered: true, url: body.url }));
}
