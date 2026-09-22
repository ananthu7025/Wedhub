import type { Request, Response } from "express";
import { isProduction } from "../../config/env";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError, ValidationError } from "../../common/errors";
import * as authService from "./auth.service";
import type {
  ChangeEmailBody,
  ConfirmEmailChangeBody,
  ForgotPasswordBody,
  GoogleLoginBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  VerifyEmailBody,
} from "./auth.schema";
import type { RequestContext, TokenPair } from "./auth.types";

const REFRESH_TOKEN_COOKIE = "refresh_token";

function requestContext(req: Request): RequestContext {
  return { ipAddress: req.ip, userAgent: req.header("user-agent") };
}

export function setRefreshCookie(res: Response, tokens: TokenPair): void {
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    expires: tokens.refreshTokenExpiresAt,
    path: "/api/v1/auth",
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/api/v1/auth" });
}

export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as RegisterBody;
  const result = await authService.register({
    email: body.email,
    phone: body.phone,
    password: body.password,
    role: body.role,
  });
  res.status(201).json(successResponse({ user: result.user }));
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = req.body as LoginBody;
  const result = await authService.login(body, requestContext(req));
  setRefreshCookie(res, result.tokens);
  res.json(successResponse({ user: result.user, accessToken: result.tokens.accessToken }));
}

export async function google(req: Request, res: Response): Promise<void> {
  const body = req.body as GoogleLoginBody;
  const result = await authService.loginWithGoogle(body, requestContext(req));
  setRefreshCookie(res, result.tokens);
  res.json(successResponse({ user: result.user, accessToken: result.tokens.accessToken }));
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const presentedToken = (req.cookies as Record<string, string | undefined>)[REFRESH_TOKEN_COOKIE];
  if (!presentedToken) {
    throw new AuthenticationError("Missing refresh token");
  }

  const tokens = await authService.refresh(presentedToken, requestContext(req));
  setRefreshCookie(res, tokens);
  res.json(successResponse({ accessToken: tokens.accessToken }));
}

export async function logout(req: Request, res: Response): Promise<void> {
  const presentedToken = (req.cookies as Record<string, string | undefined>)[REFRESH_TOKEN_COOKIE];
  if (presentedToken) {
    await authService.logout(presentedToken);
  }
  clearRefreshCookie(res);
  res.json(successResponse({ loggedOut: true }));
}

export async function logoutAll(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError();
  }
  await authService.logoutAllDevices(req.user.id);
  clearRefreshCookie(res);
  res.json(successResponse({ loggedOut: true }));
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const body = req.body as VerifyEmailBody;
  const { email } = await authService.verifyEmail(body.token);
  res.json(successResponse({ verified: true, email }));
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const body = req.body as ForgotPasswordBody;
  await authService.forgotPassword(body.email);
  res.json(successResponse({ message: "If an account exists for this email, a reset link has been sent." }));
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const body = req.body as ResetPasswordBody;
  if (!body.token) {
    throw new ValidationError("Reset token is required");
  }
  await authService.resetPassword(body.token, body.password);
  res.json(successResponse({ passwordReset: true }));
}

export async function resendVerificationEmail(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError();
  }
  await authService.resendVerificationEmail(req.user.id);
  res.json(successResponse({ sent: true }));
}

export async function changeEmail(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError();
  }
  const body = req.body as ChangeEmailBody;
  await authService.changeEmail(req.user.id, body);
  res.json(successResponse({ pending: true }));
}

export async function confirmEmailChange(req: Request, res: Response): Promise<void> {
  const body = req.body as ConfirmEmailChangeBody;
  const result = await authService.confirmEmailChange(body.token);
  res.json(successResponse(result));
}
