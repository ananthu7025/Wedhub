import { Prisma, type FunctionType } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";
import type { UserPreferences } from "./users.types";

export function findUserWithProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, weddingProfile: true },
  });
}

// Item 7: User.phone is a separate table from UserProfile, and is globally
// unique (schema.prisma) — mirrors auth.service.ts's registration-time
// check (findUserByPhone there) so a duplicate phone number surfaces as a
// friendly 409, not a raw Prisma constraint violation. Kept local to this
// module rather than importing the auth module's repository, per this
// codebase's module-layering convention.
export function findUserByPhone(phone: string) {
  return prisma.user.findUnique({ where: { phone } });
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

// Separate write from upsertProfile above — User.phone lives on the User
// row itself, not UserProfile. `undefined` leaves it untouched (omitted
// entirely, no query at all); `null`/a string both go through as a real
// write, since phone is nullable and the caller (users.service.ts) already
// decided this update should happen.
export function updateUserPhone(userId: string, phone: string | null) {
  return prisma.user.update({ where: { id: userId }, data: { phone } });
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

export interface EventDateFields {
  functionType: FunctionType;
  otherLabel: string | undefined;
  date: Date;
  time: string | undefined;
  guestCount: number | undefined;
}

export interface CategoryPreferenceFields {
  categoryId: string;
  budgetMin: number | undefined;
  budgetMax: number | undefined;
}

export interface ProfileSetupFields {
  cityId: string;
  guestCount: number | undefined;
  weddingStyle: string | undefined;
  partnerName: string | undefined;
  notes: string | undefined;
  eventDates: EventDateFields[];
  categoryPreferences: CategoryPreferenceFields[];
}

// A fingerprint of exactly the fields Phase 6's vendor-matching cares about
// (city + which categories, with what budget) — used to detect a
// "meaningful edit" per the item 8 guardrail: re-run matching on first
// completion and on a later meaningful edit, but not on every trivial
// re-save (e.g. just editing `notes` or `weddingStyle`). Order-independent
// (sorted by categoryId) so re-submitting the same categories in a
// different order isn't treated as a change. Accepts a loose shape
// (`number | Decimal | null | undefined`) since callers compare the
// incoming request's plain-number fields against Prisma's own Decimal-typed
// existing row — both stringify to the same value either way.
function matchingFingerprint(
  cityId: string,
  categoryPreferences: { categoryId: string; budgetMin?: unknown; budgetMax?: unknown }[],
): string {
  const sorted = [...categoryPreferences]
    .map((p) => `${p.categoryId}:${p.budgetMin ?? ""}:${p.budgetMax ?? ""}`)
    .sort();
  return JSON.stringify({ cityId, categories: sorted });
}

// One transaction: upsert the flat WeddingProfile summary fields (stamping
// profileCompletedAt — see schema.prisma's doc comment on that column), then
// fully replace its event-date and category-preference child rows. Delete
// + recreate rather than a per-row diff/upsert — the wizard always submits
// its complete current state (every step's data, not just what changed), so
// there's no partial-update case to preserve old rows against.
export async function submitProfileSetup(userId: string, data: ProfileSetupFields) {
  // weddingDate mirrors the EARLIEST event date (not just whichever the
  // couple happened to list first — they can add functions in any order),
  // so the account page's existing flat "Wedding date" field and anything
  // else still reading WeddingProfile.weddingDate directly keeps working
  // without needing to know about the new per-function dates.
  const earliestDate =
    data.eventDates.length > 0
      ? data.eventDates.reduce((earliest, ed) => (ed.date < earliest ? ed.date : earliest), data.eventDates[0]!.date)
      : null;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.weddingProfile.findUnique({
      where: { userId },
      include: { categoryPreferences: true },
    });
    const isFirstCompletion = !existing?.profileCompletedAt;
    const previousFingerprint = existing
      ? matchingFingerprint(existing.cityId ?? "", existing.categoryPreferences)
      : null;
    const newFingerprint = matchingFingerprint(data.cityId, data.categoryPreferences);
    const matchingFieldsChanged = previousFingerprint !== newFingerprint;

    const weddingProfile = await tx.weddingProfile.upsert({
      where: { userId },
      create: {
        userId,
        cityId: data.cityId,
        guestCount: data.guestCount ?? null,
        weddingStyle: data.weddingStyle ?? null,
        partnerName: data.partnerName ?? null,
        notes: data.notes ?? null,
        weddingDate: earliestDate,
        profileCompletedAt: new Date(),
      },
      update: {
        cityId: data.cityId,
        guestCount: data.guestCount ?? null,
        weddingStyle: data.weddingStyle ?? null,
        partnerName: data.partnerName ?? null,
        notes: data.notes ?? null,
        weddingDate: earliestDate,
        profileCompletedAt: new Date(),
      },
    });

    await tx.weddingProfileEventDate.deleteMany({ where: { weddingProfileId: weddingProfile.id } });
    await tx.weddingProfileEventDate.createMany({
      data: data.eventDates.map((eventDate) => ({
        weddingProfileId: weddingProfile.id,
        functionType: eventDate.functionType,
        otherLabel: eventDate.otherLabel ?? null,
        date: eventDate.date,
        time: eventDate.time ?? null,
        guestCount: eventDate.guestCount ?? null,
      })),
    });

    await tx.weddingProfileCategoryPreference.deleteMany({ where: { weddingProfileId: weddingProfile.id } });
    await tx.weddingProfileCategoryPreference.createMany({
      data: data.categoryPreferences.map((pref) => ({
        weddingProfileId: weddingProfile.id,
        categoryId: pref.categoryId,
        budgetMin: pref.budgetMin ?? null,
        budgetMax: pref.budgetMax ?? null,
      })),
    });

    const fullProfile = await tx.weddingProfile.findUniqueOrThrow({
      where: { id: weddingProfile.id },
      include: { eventDates: true, categoryPreferences: true },
    });

    return { weddingProfile: fullProfile, isFirstCompletion, matchingFieldsChanged };
  });
}

export function getWeddingProfileWithDetails(userId: string) {
  return prisma.weddingProfile.findUnique({
    where: { userId },
    include: { eventDates: { orderBy: { date: "asc" } }, categoryPreferences: true },
  });
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
