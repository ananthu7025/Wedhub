import { describe, expect, it } from "vitest";
import { createChallengeSchema, submitEntrySchema } from "../../src/modules/challenges/challenge.schema";
import { isRankingsFrozen } from "../../src/modules/challenges/challenge-ranking.service";

const baseDates = {
  startDate: "2026-01-01T00:00:00.000Z",
  endDate: "2026-01-31T00:00:00.000Z",
  votingStartDate: "2026-01-15T00:00:00.000Z",
  votingEndDate: "2026-02-05T00:00:00.000Z",
};

describe("createChallengeSchema", () => {
  it("accepts a valid challenge payload", () => {
    const result = createChallengeSchema.safeParse({
      title: "30-Day Mehndi Challenge",
      categoryId: "11111111-1111-1111-1111-111111111111",
      ...baseDates,
    });
    expect(result.success).toBe(true);
  });

  it("rejects endDate before startDate", () => {
    const result = createChallengeSchema.safeParse({
      title: "Bad Challenge",
      categoryId: "11111111-1111-1111-1111-111111111111",
      ...baseDates,
      endDate: "2025-12-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects votingEndDate before votingStartDate", () => {
    const result = createChallengeSchema.safeParse({
      title: "Bad Challenge",
      categoryId: "11111111-1111-1111-1111-111111111111",
      ...baseDates,
      votingEndDate: "2026-01-10T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects votingStartDate before the challenge startDate", () => {
    const result = createChallengeSchema.safeParse({
      title: "Bad Challenge",
      categoryId: "11111111-1111-1111-1111-111111111111",
      ...baseDates,
      votingStartDate: "2025-12-15T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("submitEntrySchema", () => {
  const baseEntry = {
    title: "My Mehndi Design",
    imageMediaId: "22222222-2222-2222-2222-222222222222",
    acceptedTerms: true as const,
  };

  it("accepts a minimal valid entry for an existing vendor", () => {
    expect(submitEntrySchema.safeParse(baseEntry).success).toBe(true);
  });

  it("rejects when acceptedTerms is not true", () => {
    const result = submitEntrySchema.safeParse({ ...baseEntry, acceptedTerms: false });
    expect(result.success).toBe(false);
  });

  it("accepts the vendor-bootstrap fields alongside entry fields", () => {
    const result = submitEntrySchema.safeParse({
      ...baseEntry,
      businessName: "Priya Mehndi Art",
      shortDescription: "Bridal mehndi specialist in Kochi",
      cityId: "33333333-3333-3333-3333-333333333333",
      startingPrice: 5000,
      contactPhone: "9999999999",
    });
    expect(result.success).toBe(true);
  });
});

describe("isRankingsFrozen", () => {
  const baseChallenge = {
    votingEndDate: new Date("2026-02-05T00:00:00.000Z"),
    status: "VOTING" as const,
    hideLiveRankingsBeforeEndHours: 24,
  };

  it("is not frozen when hideLiveRankingsBeforeEndHours is null", () => {
    expect(
      isRankingsFrozen({ ...baseChallenge, hideLiveRankingsBeforeEndHours: null } as never, new Date("2026-02-04T12:00:00.000Z")),
    ).toBe(false);
  });

  it("is not frozen when the challenge is not in VOTING status", () => {
    expect(isRankingsFrozen({ ...baseChallenge, status: "LIVE" } as never, new Date("2026-02-04T12:00:00.000Z"))).toBe(false);
  });

  it("is not frozen more than the freeze window before votingEndDate", () => {
    expect(isRankingsFrozen(baseChallenge as never, new Date("2026-02-03T00:00:00.000Z"))).toBe(false);
  });

  it("is frozen exactly at the freeze window boundary", () => {
    expect(isRankingsFrozen(baseChallenge as never, new Date("2026-02-04T00:00:00.000Z"))).toBe(true);
  });

  it("is frozen inside the freeze window", () => {
    expect(isRankingsFrozen(baseChallenge as never, new Date("2026-02-04T23:00:00.000Z"))).toBe(true);
  });

  it("is not frozen after votingEndDate has passed", () => {
    expect(isRankingsFrozen(baseChallenge as never, new Date("2026-02-06T00:00:00.000Z"))).toBe(false);
  });
});
