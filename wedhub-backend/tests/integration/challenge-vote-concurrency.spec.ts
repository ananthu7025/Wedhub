import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/database";
import { castVote } from "../../src/modules/challenges/challenge-vote.service";

/**
 * Proves the Serializable-transaction vote logic in challenge-vote.service.ts
 * against a real Postgres instance (not a mock). Two concurrent votes from
 * the same user must never both succeed — for PER_ENTRY scope the DB unique
 * constraint alone closes it, but for PER_CHALLENGE scope (voting for two
 * DIFFERENT entries in the same challenge) only the Serializable isolation
 * level closes the check-then-insert race, since the composite unique
 * constraint permits both rows individually. Same pattern as
 * vendor-store-stock-concurrency.spec.ts.
 */
describe("Challenge voting — concurrency", () => {
  let categoryId: string;
  let vendorId: string;
  let userId: string;
  const createdMediaIds: string[] = [];

  async function createEntryMedia(): Promise<string> {
    const media = await prisma.media.create({
      data: {
        mediaType: "CHALLENGE_ENTRY_PHOTO",
        originalObjectKey: `test/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
        mimeType: "image/jpeg",
        fileSize: 1000,
        status: "READY",
        moderationStatus: "APPROVED",
      },
    });
    createdMediaIds.push(media.id);
    return media.id;
  }

  async function createChallenge(voteScope: "PER_ENTRY" | "PER_CHALLENGE") {
    const now = new Date();
    return prisma.challenge.create({
      data: {
        title: `Vote Concurrency Test ${voteScope} ${Date.now()}`,
        slug: `vote-concurrency-test-${voteScope.toLowerCase()}-${Date.now()}`,
        categoryId,
        startDate: new Date(now.getTime() - 86_400_000),
        endDate: new Date(now.getTime() + 86_400_000),
        votingStartDate: new Date(now.getTime() - 3_600_000),
        votingEndDate: new Date(now.getTime() + 86_400_000),
        status: "VOTING",
        voteScope,
      },
    });
  }

  async function createApprovedEntry(challengeId: string, mediaId: string, title: string) {
    return prisma.challengeEntry.create({
      data: {
        challengeId,
        vendorId,
        categoryId,
        title,
        imageMediaId: mediaId,
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });
  }

  beforeAll(async () => {
    const category = await prisma.category.create({
      data: {
        name: `Vote Concurrency Test Category ${Date.now()}`,
        slug: `vote-concurrency-test-category-${Date.now()}`,
        isActive: true,
      },
    });
    categoryId = category.id;

    const vendor = await prisma.vendor.create({
      data: {
        businessName: `Vote Concurrency Test Vendor ${Date.now()}`,
        slug: `vote-concurrency-test-vendor-${Date.now()}`,
        status: "APPROVED",
        creationSource: "SELF_REGISTERED",
        categories: { create: [{ categoryId, isPrimary: true }] },
      },
    });
    vendorId = vendor.id;

    const user = await prisma.user.create({
      data: { email: `vote-concurrency-test-${Date.now()}@example.com`, role: "END_USER" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.challengeVote.deleteMany({ where: { challenge: { categoryId } } });
    await prisma.challengeEntry.deleteMany({ where: { categoryId } });
    await prisma.challenge.deleteMany({ where: { categoryId } });
    await prisma.media.deleteMany({ where: { id: { in: createdMediaIds } } });
    await prisma.vendorCategory.deleteMany({ where: { vendorId } });
    await prisma.vendor.deleteMany({ where: { id: vendorId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it("PER_ENTRY: allows exactly one of two simultaneous votes for the same entry to succeed", async () => {
    const challenge = await createChallenge("PER_ENTRY");
    const entry = await createApprovedEntry(challenge.id, await createEntryMedia(), "Entry A");

    const attempt = () =>
      castVote({ challengeSlug: challenge.slug, entryId: entry.id, userId, ipAddress: undefined, userAgent: undefined });

    const results = await Promise.allSettled([attempt(), attempt()]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const voteCount = await prisma.challengeVote.count({ where: { entryId: entry.id, userId } });
    expect(voteCount).toBe(1);

    const finalEntry = await prisma.challengeEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(finalEntry.voteCount).toBe(1);
  });

  it("PER_CHALLENGE: allows exactly one of two simultaneous votes for DIFFERENT entries to succeed", async () => {
    const challenge = await createChallenge("PER_CHALLENGE");
    const entryA = await createApprovedEntry(challenge.id, await createEntryMedia(), "Entry A");
    const entryB = await createApprovedEntry(challenge.id, await createEntryMedia(), "Entry B");

    const results = await Promise.allSettled([
      castVote({ challengeSlug: challenge.slug, entryId: entryA.id, userId, ipAddress: undefined, userAgent: undefined }),
      castVote({ challengeSlug: challenge.slug, entryId: entryB.id, userId, ipAddress: undefined, userAgent: undefined }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const totalVotes = await prisma.challengeVote.count({ where: { challengeId: challenge.id, userId } });
    expect(totalVotes).toBe(1);
  });
});
