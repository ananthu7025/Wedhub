import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import * as webhookController from "./webhook.controller";

export const webhookRouter = Router();

// No authenticateMiddleware — Razorpay calls this directly with no user
// session. Trust is established entirely by verifying the HMAC signature
// inside webhook.service.handleWebhook, not by any auth header.
webhookRouter.post("/razorpay", asyncHandler(webhookController.handleRazorpayWebhook));
