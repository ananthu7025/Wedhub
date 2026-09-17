import { randomUUID } from "node:crypto";
import { NotFoundError, ValidationError } from "../../common/errors";
import { hashPassword } from "../../common/utils/password.util";
import * as categoriesRepository from "../categories/categories.repository";
import { matchProfileToVendors } from "../matching";
import * as usersRepository from "./users.repository";
import type { ProfileUpdateInput, ProfileSetupInput, WeddingProfileUpsertInput } from "./users.types";

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

// Couple profile-setup wizard submission (item 2) — validates every
// categoryId against the real Category table before writing anything (a
// clean 400 instead of a raw FK-violation error), then writes the whole
// wedding profile + event dates + category preferences in one transaction.
// Deliberately does NOT reuse upsertOwnWeddingProfile — that one is the
// account page's lightweight quick-edit form (predates this wizard) and
// has no event-dates/category-preferences concept at all.
//
// Item 8: on first completion, or a later meaningful edit (city or category/
// budget preferences actually changed — see users.repository.ts's
// matchingFingerprint), kicks off vendor matching AFTER the transaction
// commits and WITHOUT awaiting it — matching does several sequential writes
// plus notification/messaging delivery, none of which should make the
// wizard's own save feel slow or fail because a downstream vendor-matching
// step hit a problem. Errors are caught and logged inside
// matchProfileToVendors itself (never thrown back here).
export async function submitProfileSetup(userId: string, input: ProfileSetupInput) {
  const categoryIds = input.categoryPreferences.map((pref) => pref.categoryId);
  const validCategoryIds = await categoriesRepository.findActiveCategoryIds(categoryIds);
  const invalidIds = categoryIds.filter((id) => !validCategoryIds.has(id));
  if (invalidIds.length > 0) {
    throw new ValidationError("One or more selected categories are invalid or no longer active", {
      categoryPreferences: invalidIds,
    });
  }

  const result = await usersRepository.submitProfileSetup(userId, {
    cityId: input.cityId,
    guestCount: input.guestCount,
    weddingStyle: input.weddingStyle,
    partnerName: input.partnerName,
    notes: input.notes,
    eventDates: input.eventDates.map((eventDate) => ({
      functionType: eventDate.functionType,
      otherLabel: eventDate.otherLabel,
      date: new Date(eventDate.date),
      time: eventDate.time,
      guestCount: eventDate.guestCount,
    })),
    categoryPreferences: input.categoryPreferences,
  });

  if (result.isFirstCompletion || result.matchingFieldsChanged) {
    void triggerVendorMatching(userId, result.weddingProfile.id, input);
  }

  return result.weddingProfile;
}

async function triggerVendorMatching(userId: string, weddingProfileId: string, input: ProfileSetupInput): Promise<void> {
  const user = await usersRepository.findUserWithProfile(userId);
  if (!user) return; // deleted mid-request — nothing to match against

  const categoryNames = await categoriesRepository.findCategoryNamesByIds(
    input.categoryPreferences.map((pref) => pref.categoryId),
  );
  const contactName = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") || user.email;
  const earliestDate =
    input.eventDates.length > 0
      ? input.eventDates.reduce((earliest, ed) => (ed.date < earliest ? ed.date : earliest), input.eventDates[0]!.date)
      : undefined;

  await matchProfileToVendors({
    userId,
    weddingProfileId,
    cityId: input.cityId,
    contactName,
    contactEmail: user.email,
    contactPhone: user.phone ?? undefined,
    weddingDate: earliestDate ? new Date(earliestDate) : null,
    guestCount: input.guestCount ?? null,
    categoryPreferences: input.categoryPreferences.map((pref) => ({
      categoryId: pref.categoryId,
      categoryName: categoryNames.get(pref.categoryId) ?? "vendor",
      budgetMin: pref.budgetMin ?? null,
      budgetMax: pref.budgetMax ?? null,
    })),
  });
}

export async function getOwnProfileSetup(userId: string) {
  return usersRepository.getWeddingProfileWithDetails(userId);
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
