import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import { setRefreshCookie } from "../auth/auth.controller";
import type { RequestContext } from "../auth/auth.types";
import * as vendorClaimService from "./vendor-claim.service";
import type { ClaimLinkBody, ClaimRegisterBody, SendClaimOtpBody, VerifyClaimOtpBody } from "./vendor-claim.schema";

function requestContext(req: Request): RequestContext {
  return { ipAddress: req.ip, userAgent: req.header("user-agent") };
}

export async function resolveInvitation(req: Request, res: Response): Promise<void> {
  const invitation = await vendorClaimService.resolveInvitation(req.params.token as string);
  res.json(successResponse(invitation));
}

export async function claimRegister(req: Request, res: Response): Promise<void> {
  const body = req.body as ClaimRegisterBody;
  const result = await vendorClaimService.claimByRegistering(
    { token: body.token, email: body.email, password: body.password, phone: body.phone },
    requestContext(req),
  );
  setRefreshCookie(res, result.tokens);
  res.status(201).json(
    successResponse({
      userId: result.userId,
      vendorId: result.vendorId,
      accessToken: result.tokens.accessToken,
    }),
  );
}

export async function claimLink(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AuthenticationError();
  }
  const body = req.body as ClaimLinkBody;
  const result = await vendorClaimService.claimByLinking(body.token, req.user.id, req.user.role);
  res.json(successResponse(result));
}

export async function sendOtp(req: Request, res: Response): Promise<void> {
  const body = req.body as SendClaimOtpBody;
  const result = await vendorClaimService.sendClaimOtp(body.token);
  res.json(successResponse(result));
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const body = req.body as VerifyClaimOtpBody;
  await vendorClaimService.verifyClaimOtp(body.token, body.code);
  res.json(successResponse({ verified: true }));
}
