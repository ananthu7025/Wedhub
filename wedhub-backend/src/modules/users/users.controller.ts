import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import { AuthenticationError } from "../../common/errors";
import * as usersService from "./users.service";
import type { UpdateProfileBody, UpsertWeddingProfileBody } from "./users.schema";

function requireUserId(req: Request): string {
  if (!req.user) {
    throw new AuthenticationError();
  }
  return req.user.id;
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const user = await usersService.getOwnProfile(userId);
  res.json(
    successResponse({
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      profile: user.profile,
      weddingProfile: user.weddingProfile,
    }),
  );
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as UpdateProfileBody;
  const profile = await usersService.updateOwnProfile(userId, {
    firstName: body.firstName,
    lastName: body.lastName,
    avatarUrl: body.avatarUrl,
    bio: body.bio,
    preferences: body.preferences,
  });
  res.json(successResponse({ profile }));
}

export async function upsertWeddingProfile(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const body = req.body as UpsertWeddingProfileBody;
  const weddingProfile = await usersService.upsertOwnWeddingProfile(userId, {
    weddingDate: body.weddingDate,
    guestCount: body.guestCount,
    estimatedBudget: body.estimatedBudget,
    weddingStyle: body.weddingStyle,
    partnerName: body.partnerName,
    notes: body.notes,
  });
  res.json(successResponse({ weddingProfile }));
}

export async function deleteWeddingProfile(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  await usersService.deleteOwnWeddingProfile(userId);
  res.json(successResponse({ deleted: true }));
}

export async function deactivateMe(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  await usersService.deactivateOwnAccount(userId);
  res.json(successResponse({ status: "DEACTIVATED" }));
}

export async function deleteMe(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  await usersService.deleteOwnAccount(userId);
  res.json(successResponse({ deleted: true }));
}
