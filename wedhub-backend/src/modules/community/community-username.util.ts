import { prisma } from "../../config/database";

// Reddit-style anonymous handle: adjective_noun_1234. Small, static word
// lists rather than a random-string generator — produces something
// legible/memorable ("curious_bride_4821") instead of an opaque token,
// while still being effectively collision-free at this app's scale (2 word
// lists x 9000 numeric suffixes = tens of thousands of combinations before
// a retry is ever likely needed).
const ADJECTIVES = [
  "curious",
  "happy",
  "dreamy",
  "gentle",
  "bold",
  "quiet",
  "cheerful",
  "sunny",
  "calm",
  "eager",
  "hopeful",
  "lucky",
  "mellow",
  "vivid",
  "witty",
  "cozy",
  "graceful",
  "joyful",
  "radiant",
  "serene",
];

const NOUNS = [
  "bride",
  "groom",
  "couple",
  "planner",
  "florist",
  "dreamer",
  "wanderer",
  "sparrow",
  "lotus",
  "maple",
  "comet",
  "harbor",
  "meadow",
  "willow",
  "ember",
  "aurora",
  "orchid",
  "breeze",
  "lantern",
  "compass",
];

function randomHandle(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = 1000 + Math.floor(Math.random() * 9000);
  return `${adjective}_${noun}_${suffix}`;
}

const MAX_ATTEMPTS = 10;

// Lazy, idempotent: returns the user's existing handle if one was already
// generated (first post/comment/vote), otherwise generates and persists a
// new one. Called from every community write path before it needs to
// display an author, so a user's handle is stable across every future
// action once assigned. Retries on the rare unique-constraint collision
// (UserProfile.communityUsername is @unique) rather than checking
// existence first, avoiding a check-then-insert race between two
// concurrent first-time posters.
export async function getOrCreateCommunityUsername(userId: string): Promise<string> {
  const existing = await prisma.userProfile.findUnique({
    where: { userId },
    select: { communityUsername: true },
  });
  if (existing?.communityUsername) {
    return existing.communityUsername;
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const handle = randomHandle();
    try {
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: { communityUsername: handle },
        create: { userId, communityUsername: handle },
        select: { communityUsername: true },
      });
      return profile.communityUsername as string;
    } catch (err) {
      const isUniqueViolation =
        err !== null && typeof err === "object" && "code" in err && (err as { code: unknown }).code === "P2002";
      if (!isUniqueViolation) {
        throw err;
      }
      // Someone else grabbed this exact handle between our read and write —
      // loop and try a freshly-random one.
    }
  }
  throw new Error("Could not generate a unique community username — please try again");
}
