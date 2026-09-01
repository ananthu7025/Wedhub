import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";
import type { UserPreferences } from "./users.types";

export function findUserWithProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, weddingProfile: true },
  });
}

export interface ProfileFields {
  firstName: string | undefined;
  lastName: string | undefined;
  avatarUrl: string | undefined;
  bio: string | undefined;
  preferences: UserPreferences | undefined;
}

export function upsertProfile(userId: string, data: ProfileFields) {
  const fields = omitUndefined({
    firstName: data.firstName,
    lastName: data.lastName,
    avatarUrl: data.avatarUrl,
    bio: data.bio,
    preferences: data.preferences as Prisma.InputJsonValue | undefined,
  });
  return prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...fields },
    update: fields,
  });
}

export interface WeddingProfileFields {
  weddingDate: Date | undefined;
  guestCount: number | undefined;
  estimatedBudget: number | undefined;
  weddingStyle: string | undefined;
  partnerName: string | undefined;
  notes: string | undefined;
}

export function upsertWeddingProfile(userId: string, data: WeddingProfileFields) {
  const fields = omitUndefined({
    weddingDate: data.weddingDate,
    guestCount: data.guestCount,
    estimatedBudget: data.estimatedBudget,
    weddingStyle: data.weddingStyle,
    partnerName: data.partnerName,
    notes: data.notes,
  });
  return prisma.weddingProfile.upsert({
    where: { userId },
    create: { userId, ...fields },
    update: fields,
  });
}

export function deleteWeddingProfile(userId: string) {
  return prisma.weddingProfile.deleteMany({ where: { userId } });
}

export function setUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED") {
  return prisma.user.update({ where: { id: userId }, data: { status } });
}

export function anonymizeUser(
  userId: string,
  input: { email: string; phone: null; passwordHash: string },
) {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash: input.passwordHash,
        deletedAt: new Date(),
        status: "DEACTIVATED",
      },
    }),
    prisma.userProfile.updateMany({
      where: { userId },
      data: { firstName: null, lastName: null, avatarUrl: null, bio: null, preferences: Prisma.JsonNull },
    }),
    prisma.weddingProfile.deleteMany({ where: { userId } }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
