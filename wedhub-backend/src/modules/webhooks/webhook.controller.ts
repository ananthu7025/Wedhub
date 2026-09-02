import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as webhookService from "./webhook.service";
import "./webhook.types";

export async function handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.header("x-razorpay-signature");
  await webhookService.handleWebhook(req.rawBody, signature);
  // Razorpay expects a 200 to consider the webhook delivered — returning
  // anything else (or timing out) triggers their retry schedule.
  res.json(successResponse({ received: true }));
}
