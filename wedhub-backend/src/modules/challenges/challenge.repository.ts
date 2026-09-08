import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";
import type { CreateChallengeBody, UpdateChallengeBody } from "./challenge.schema";

export const CHALLENGE_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  galleryCategory: { select: { id: true, name: true, slug: true } },
  winnerEntry: {
    include: {
      vendor: { select: { id: true, slug: true, businessName: true } },
      image: { select: { id: true, optimizedObjectKey: true, originalObjectKey: true } },
    },
  },
} satisfies Prisma.ChallengeInclude;

export function findAll(filter: { status?: string | undefined }) {
  return prisma.challenge.findMany({
    where: omitUndefined({ status: filter.status as never }),
    include: CHALLENGE_INCLUDE,
    orderBy: { startDate: "desc" },
  });
}

export function findBySlug(slug: string) {
  return prisma.challenge.findUnique({ where: { slug }, include: CHALLENGE_INCLUDE });
}

export function findById(id: string) {
  return prisma.challenge.findUnique({ where: { id }, include: CHALLENGE_INCLUDE });
}

// Single active (LIVE or VOTING) challenge for a given eligibility category
// or gallery-display category — used by the Gallery page to decide whether
// to render the challenge banner, and by the participate flow to resolve
// which challenge a category maps to.
export function findActive(filter: { categoryId?: string | undefined; gallerySlug?: string | undefined }) {
  const where: Prisma.ChallengeWhereInput = { status: { in: ["LIVE", "VOTING"] } };
  if (filter.categoryId) {
    where.categoryId = filter.categoryId;
  }
  if (filter.gallerySlug) {
    where.galleryCategory = { slug: filter.gallerySlug };
  }
  return prisma.challenge.findFirst({ where, include: CHALLENGE_INCLUDE, orderBy: { startDate: "desc" } });
}

export function findBySlugAnyCase(slug: string) {
  return prisma.challenge.findFirst({ where: { slug } });
}

export function create(slug: string, data: CreateChallengeBody) {
  const fields = omitUndefined({
    galleryCategoryId: data.galleryCategoryId,
    description: data.description,
    bannerImage: data.bannerImage,
    voteScope: data.voteScope,
    hideLiveRankingsBeforeEndHours: data.hideLiveRankingsBeforeEndHours,
    allowMultipleEntriesPerVendor: data.allowMultipleEntriesPerVendor,
    maxEntries: data.maxEntries,
    prizeTitle: data.prizeTitle,
    prizeDescription: data.prizeDescription,
    prizeValue: data.prizeValue,
    sponsorName: data.sponsorName,
    sponsorLogo: data.sponsorLogo,
    sponsorUrl: data.sponsorUrl,
    rules: data.rules,
    termsAndConditions: data.termsAndConditions,
  });
  return prisma.challenge.create({
    data: {
      title: data.title,
      slug,
      categoryId: data.categoryId,
      startDate: data.startDate,
      endDate: data.endDate,
      votingStartDate: data.votingStartDate,
      votingEndDate: data.votingEndDate,
      ...fields,
    },
    include: CHALLENGE_INCLUDE,
  });
}

export function update(id: string, data: UpdateChallengeBody) {
  return prisma.challenge.update({ where: { id }, data: omitUndefined(data), include: CHALLENGE_INCLUDE });
}

export function setWinner(id: string, winnerEntryId: string) {
  return prisma.challenge.update({ where: { id }, data: { winnerEntryId }, include: CHALLENGE_INCLUDE });
}

export function clearWinnerIfEntry(entryId: string) {
  return prisma.challenge.updateMany({ where: { winnerEntryId: entryId }, data: { winnerEntryId: null } });
}
