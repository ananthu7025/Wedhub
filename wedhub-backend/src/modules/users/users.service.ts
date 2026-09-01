import { randomUUID } from "node:crypto";
import { NotFoundError } from "../../common/errors";
import { hashPassword } from "../../common/utils/password.util";
import * as usersRepository from "./users.repository";
import type { ProfileUpdateInput, WeddingProfileUpsertInput } from "./users.types";

export async function getOwnProfile(userId: string) {
  const user = await usersRepository.findUserWithProfile(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
}

export async function updateOwnProfile(userId: string, input: ProfileUpdateInput) {
  return usersRepository.upsertProfile(userId, {
    firstName: input.firstName,
    lastName: input.lastName,
    avatarUrl: input.avatarUrl,
    bio: input.bio,
    preferences: input.preferences,
  });
}

export async function upsertOwnWeddingProfile(userId: string, input: WeddingProfileUpsertInput) {
  return usersRepository.upsertWeddingProfile(userId, {
    weddingDate: input.weddingDate ? new Date(input.weddingDate) : undefined,
    guestCount: input.guestCount,
    estimatedBudget: input.estimatedBudget,
    weddingStyle: input.weddingStyle,
    partnerName: input.partnerName,
    notes: input.notes,
  });
}

export async function deleteOwnWeddingProfile(userId: string): Promise<void> {
  await usersRepository.deleteWeddingProfile(userId);
}

export async function deactivateOwnAccount(userId: string): Promise<void> {
  await usersRepository.setUserStatus(userId, "DEACTIVATED");
}

export async function deleteOwnAccount(userId: string): Promise<void> {
  const anonymizedEmail = `deleted-${randomUUID()}@wedhub.invalid`;
  const unusablePasswordHash = await hashPassword(randomUUID());

  await usersRepository.anonymizeUser(userId, {
    email: anonymizedEmail,
    phone: null,
    passwordHash: unusablePasswordHash,
  });
}
