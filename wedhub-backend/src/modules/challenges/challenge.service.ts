import { prisma } from "../../config/database";
import { NotFoundError, ValidationError } from "../../common/errors";
import { generateUniqueSlug, slugify } from "../../common/utils/slug.util";
import * as challengeRepository from "./challenge.repository";
import * as challengeEntryRepository from "./challenge-entry.repository";
import * as featuredMediaRepository from "../featured-media/featured-media.repository";
import type { CreateChallengeBody, UpdateChallengeBody } from "./challenge.schema";

export function listChallenges(filter: { status?: string | undefined }) {
  return challengeRepository.findAll(filter);
}

export async function getBySlug(slug: string) {
  const challenge = await challengeRepository.findBySlug(slug);
  if (!challenge) {
    throw new NotFoundError("Challenge not found");
  }
  return challenge;
}

export async function getById(id: string) {
  const challenge = await challengeRepository.findById(id);
  if (!challenge) {
    throw new NotFoundError("Challenge not found");
  }
  return challenge;
}

export function getActive(filter: { categoryId?: string | undefined; gallerySlug?: string | undefined }) {
  return challengeRepository.findActive(filter);
}

export async function createChallenge(input: CreateChallengeBody) {
  const slug = await generateUniqueSlug(slugify(input.title), async (candidate) =>
    Boolean(await challengeRepository.findBySlugAnyCase(candidate)),
  );

  return challengeRepository.create(slug, input);
}

export async function updateChallenge(id: string, input: UpdateChallengeBody) {
  await getById(id);
  return challengeRepository.update(id, input);
}

export async function setWinner(id: string, entryId: string, adminId: string) {
  const challenge = await getById(id);
  const entry = await challengeEntryRepository.findById(entryId);
  if (!entry || entry.challengeId !== id) {
    throw new NotFoundError("Entry not found for this challenge");
  }
  if (entry.status !== "APPROVED") {
    throw new ValidationError("Only an approved entry can be set as the winner");
  }

  const [updated] = await prisma.$transaction([
    prisma.challenge.update({ where: { id }, data: { winnerEntryId: entryId } }),
    prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: "CHALLENGE_SET_WINNER",
        entityType: "challenge",
        entityId: id,
        before: { winnerEntryId: challenge.winnerEntryId },
        after: { winnerEntryId: entryId },
      },
    }),
  ]);

  return updated;
}

// Reuses the existing FeaturedMedia model/repository directly (no new
// model) — an approved ChallengeEntry's cover image is already guaranteed
// READY/APPROVED (a prerequisite of ChallengeEntryStatus.APPROVED), so this
// is a straight, defense-in-depth-checked reuse of the Gallery module's own
// createFeaturedMedia, not a new pathway.
export async function promoteToGallery(
  challengeId: string,
  entryIds: string[],
  galleryCategoryId: string,
  adminId: string,
) {
  await getById(challengeId); // 404s if the challenge itself doesn't exist
  const entries = await challengeEntryRepository.findByIdsForChallenge(entryIds, challengeId);

  const created: unknown[] = [];
  const skipped: string[] = [];

  for (const entry of entries) {
    if (entry.status !== "APPROVED") {
      skipped.push(entry.id);
      continue;
    }
    try {
      const featured = await featuredMediaRepository.createFeaturedMedia({
        mediaId: entry.imageMediaId,
        galleryCategoryId,
        titleOverride: `${entry.title} — ${entry.vendor.businessName}`,
        sortOrder: undefined,
      });
      created.push(featured);
    } catch (err) {
      if (isUniqueConstraintViolation(err)) {
        skipped.push(entry.id);
        continue;
      }
      throw err;
    }
  }

  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      action: "CHALLENGE_PROMOTE_TO_GALLERY",
      entityType: "challenge",
      entityId: challengeId,
      after: { entryIds, galleryCategoryId, promotedCount: created.length, skippedEntryIds: skipped },
    },
  });

  return { promoted: created.length, skipped };
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}
