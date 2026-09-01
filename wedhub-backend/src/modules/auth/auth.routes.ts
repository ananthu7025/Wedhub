import { Router } from "express";
import { asyncHandler } from "../../common/utils/async-handler.util";
import { validateBody } from "../../common/middleware/validate.middleware";
import {
  forgotPasswordRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
} from "../../common/middleware/rate-limit.middleware";
import * as authController from "./auth.controller";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.schema";

export const authRouter = Router();

authRouter.post(
  "/register",
  registerRateLimiter,
  validateBody(registerSchema),
  asyncHandler(authController.register),
);

authRouter.post("/login", loginRateLimiter, validateBody(loginSchema), asyncHandler(authController.login));

authRouter.post("/logout", asyncHandler(authController.logout));

authRouter.post("/refresh", asyncHandler(authController.refresh));

authRouter.post(
  "/verify-email",
  validateBody(verifyEmailSchema),
  asyncHandler(authController.verifyEmail),
);

authRouter.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);

authRouter.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);
