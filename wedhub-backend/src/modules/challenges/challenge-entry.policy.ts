import { ValidationError } from "../../common/errors";
import * as vendorRepository from "../vendors/vendor.repository";
import type { Challenge } from "@prisma/client";

export type EligibilityResult =
  | { kind: "eligible"; vendorId: string }
  | { kind: "no_vendor" }
  | { kind: "wrong_category"; vendorId: string; primaryCategoryName: string | undefined };

// Looks up the caller's own vendor (if any) and checks whether it is in the
// challenge's eligibility category. Deliberately never 404s outright when
// there is no vendor yet — "no_vendor" is a real, expected branch the
// submission flow uses to offer inline vendor-bootstrap instead of a dead end.
export async function checkEligibility(userId: string, challenge: Challenge): Promise<EligibilityResult> {
  const vendor = await vendorRepository.findVendorByOwnerId(userId);
  if (!vendor) {
    return { kind: "no_vendor" };
  }

  const inCategory = vendor.categories.some((c) => c.categoryId === challenge.categoryId);
  if (!inCategory) {
    const primary = vendor.categories.find((c) => c.isPrimary);
    return { kind: "wrong_category", vendorId: vendor.id, primaryCategoryName: primary?.category.name };
  }

  return { kind: "eligible", vendorId: vendor.id };
}

export function assertChallengeOpenForEntries(challenge: Challenge): void {
  if (challenge.status !== "LIVE") {
    throw new ValidationError(
      challenge.status === "UPCOMING"
        ? "This challenge has not started yet"
        : "This challenge is no longer accepting entries",
    );
  }
  const now = new Date();
  if (now < challenge.startDate) {
    throw new ValidationError("This challenge has not started yet");
  }
  if (now > challenge.endDate) {
    throw new ValidationError("This challenge is no longer accepting entries");
  }
}

export function assertChallengeOpenForVoting(challenge: Challenge): void {
  if (challenge.status !== "VOTING") {
    throw new ValidationError("Voting is not currently open for this challenge");
  }
  const now = new Date();
  if (now < challenge.votingStartDate || now > challenge.votingEndDate) {
    throw new ValidationError("Voting is not currently open for this challenge");
  }
}
