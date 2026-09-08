import { prisma } from "../../config/database";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { omitUndefined } from "../../common/utils/object.util";
import * as challengeService from "./challenge.service";
import * as challengeEntryRepository from "./challenge-entry.repository";
import * as challengeEntryMediaRepository from "./challenge-entry-media.repository";
import * as challengeRepository from "./challenge.repository";
import { checkEligibility, assertChallengeOpenForEntries } from "./challenge-entry.policy";
import { extractBootstrapFields, bootstrapVendorForChallenge } from "./challenge-entry.vendor-bootstrap";
import type { RequestContext, TokenPair } from "../auth/auth.types";
import type { SubmitEntryBody } from "./challenge.schema";

export async function listApprovedEntries(slug: string, filter: { page: number; limit: number; sort: "votes" | "recent" }) {
  const challenge = await challengeService.getBySlug(slug);
  const [items, total] = await Promise.all([
    challengeEntryRepository.findApproved(challenge.id, filter),
    challengeEntryRepository.countApproved(challenge.id),
  ]);
  return { items, total };
}

export async function getApprovedEntry(slug: string, entryId: string) {
  const challenge = await challengeService.getBySlug(slug);
  const entry = await challengeEntryRepository.findApprovedById(challenge.id, entryId);
  if (!entry) {
    throw new NotFoundError("Entry not found");
  }
  return { challenge, entry };
}

export async function getMyEntry(slug: string, userId: string) {
  const challenge = await challengeService.getBySlug(slug);
  const eligibility = await checkEligibility(userId, challenge);
  if (eligibility.kind !== "eligible" && eligibility.kind !== "wrong_category") {
    return null;
  }
  return challengeEntryRepository.findMineForChallenge(challenge.id, eligibility.vendorId);
}

export interface SubmitEntryResult {
  entry: NonNullable<Awaited<ReturnType<typeof challengeEntryRepository.findById>>>;
  refreshedTokens: TokenPair | undefined;
}

export async function submitEntry(
  slug: string,
  userId: string,
  body: SubmitEntryBody,
  requestContext: RequestContext,
): Promise<SubmitEntryResult> {
  const challenge = await challengeService.getBySlug(slug);
  assertChallengeOpenForEntries(challenge);

  const eligibility = await checkEligibility(userId, challenge);

  let vendorId: string;
  let refreshedTokens: TokenPair | undefined;

  if (eligibility.kind === "wrong_category") {
    throw new ValidationError(
      `This challenge is only open to ${eligibility.primaryCategoryName ?? "a different category of"} vendors`,
    );
  }

  if (eligibility.kind === "no_vendor") {
    const bootstrapFields = extractBootstrapFields(body);
    if (!bootstrapFields) {
      throw new ValidationError(
        "You do not have a vendor profile yet — please also fill in your artist name, a short description, and your city to enter",
      );
    }
    const bootstrap = await bootstrapVendorForChallenge(userId, challenge, bootstrapFields, requestContext);
    vendorId = bootstrap.vendorId;
    refreshedTokens = bootstrap.refreshedTokens;
  } else {
    vendorId = eligibility.vendorId;
  }

  if (!challenge.allowMultipleEntriesPerVendor) {
    const existing = await challengeEntryRepository.findMineForChallenge(challenge.id, vendorId);
    if (existing) {
      throw new ConflictError("You have already submitted an entry to this challenge");
    }
  }

  if (challenge.maxEntries != null) {
    const currentCount = await challengeEntryRepository.countForChallenge(challenge.id, ["PENDING", "APPROVED"]);
    if (currentCount >= challenge.maxEntries) {
      throw new ConflictError("This challenge has reached its maximum number of entries");
    }
  }

  const image = await challengeEntryMediaRepository.findOwnUnattachedPhoto(userId, body.imageMediaId);
  if (!image) {
    throw new ValidationError("imageMediaId must reference your own, fully-processed, unattached photo");
  }

  const additionalIds = body.additionalImageMediaIds ?? [];
  if (additionalIds.length > 0) {
    const owned = await challengeEntryMediaRepository.countOwnUnattachedPhotos(userId, additionalIds);
    if (owned !== additionalIds.length) {
      throw new ValidationError("additionalImageMediaIds must all reference your own, unattached photos");
    }
  }

  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.challengeEntry.create({
      data: {
        challengeId: challenge.id,
        vendorId,
        categoryId: challenge.categoryId,
        title: body.title,
        imageMediaId: body.imageMediaId,
        ...omitUndefined({ description: body.description, location: body.location }),
      },
    });
    await tx.media.update({ where: { id: body.imageMediaId }, data: { vendorId } });
    if (additionalIds.length > 0) {
      await tx.challengeEntryPhoto.createMany({
        data: additionalIds.map((mediaId, index) => ({ entryId: created.id, mediaId, sortOrder: index })),
      });
      await tx.media.updateMany({ where: { id: { in: additionalIds } }, data: { vendorId } });
    }
    return created;
  });

  const full = await challengeEntryRepository.findById(entry.id);
  return { entry: full!, refreshedTokens };
}

export function listForAdmin(filter: { challengeId?: string | undefined; status?: string | undefined; page: number; limit: number }) {
  return Promise.all([
    challengeEntryRepository.listForAdmin(filter),
    challengeEntryRepository.countForAdmin(filter),
  ]);
}

async function getEntryOrThrow(id: string) {
  const entry = await challengeEntryRepository.findById(id);
  if (!entry) {
    throw new NotFoundError("Entry not found");
  }
  return entry;
}

export async function approveEntry(id: string, adminId: string) {
  const entry = await getEntryOrThrow(id);
  const [updated] = await prisma.$transaction([
    prisma.challengeEntry.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date(), rejectionReason: null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: "CHALLENGE_ENTRY_APPROVE",
        entityType: "challenge_entry",
        entityId: id,
        before: { status: entry.status },
        after: { status: "APPROVED" },
      },
    }),
  ]);
  return updated;
}

export async function rejectEntry(id: string, reason: string | undefined, adminId: string) {
  const entry = await getEntryOrThrow(id);
  const [updated] = await prisma.$transaction([
    prisma.challengeEntry.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason ?? null } }),
    prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: "CHALLENGE_ENTRY_REJECT",
        entityType: "challenge_entry",
        entityId: id,
        before: { status: entry.status },
        after: { status: "REJECTED", reason },
      },
    }),
  ]);
  return updated;
}

// Disqualification removes vote-contribution outside the normal insert-only
// flow, so it also self-heals voteCount and clears winnerEntryId if this
// entry had been selected — a stale winner/vote count would visibly break
// the leaderboard otherwise.
export async function disqualifyEntry(id: string, reason: string | undefined, adminId: string) {
  const entry = await getEntryOrThrow(id);
  await prisma.$transaction([
    prisma.challengeEntry.update({ where: { id }, data: { status: "DISQUALIFIED", rejectionReason: reason ?? null } }),
    prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: "CHALLENGE_ENTRY_DISQUALIFY",
        entityType: "challenge_entry",
        entityId: id,
        before: { status: entry.status },
        after: { status: "DISQUALIFIED", reason },
      },
    }),
  ]);
  await challengeEntryRepository.recalculateEntryVoteCount(id);
  await challengeRepository.clearWinnerIfEntry(id);
  return challengeEntryRepository.findById(id);
}

export async function listParticipants(challengeId: string) {
  await challengeService.getById(challengeId);
  return challengeEntryRepository.listParticipants(challengeId);
}

export function toParticipantsCsv(
  participants: Array<{
    id: string;
    title: string;
    status: string;
    voteCount: number;
    submittedAt: Date;
    vendor: { businessName: string; slug: string };
  }>,
): string {
  const header = "Entry ID,Vendor,Vendor Slug,Title,Status,Votes,Submitted At";
  const rows = participants.map((p) =>
    [p.id, csvEscape(p.vendor.businessName), p.vendor.slug, csvEscape(p.title), p.status, p.voteCount, p.submittedAt.toISOString()].join(","),
  );
  return [header, ...rows].join("\n");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
