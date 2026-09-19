/**
 * Item 7 follow-up: report-only script that finds existing customer
 * accounts with no real first name on file, so the team can follow up
 * manually (email nudge, support outreach, etc.).
 *
 * Deliberately NOT a schema migration. A new "needsNameCompletion" boolean
 * column would need to be kept in sync forever (cleared the moment a user
 * fills in their name, which item 7's SignupWizard.tsx fix plus the
 * account-page edit flow already both do via updateMyProfile) for a signal
 * that a one-off query already derives correctly and cheaply from
 * UserProfile.firstName IS NULL. There's no existing "flag for follow-up"
 * column convention anywhere else in prisma/schema.prisma to extend either
 * — the smaller, proportionate fix is a read-only report, not a migration.
 * Going forward this pool should only shrink: SignupWizard.tsx now requires
 * firstName at signup, so this is a snapshot of pre-existing accounts, not
 * an ongoing gap.
 *
 * Reports two groups, since they need different follow-up:
 *   1. firstName IS NULL — genuinely never set (pre-dates this fix, or the
 *      user is mid-onboarding and hasn't reached profile-setup yet).
 *   2. firstName looks like an obvious test value ("test", "asdf", etc.) —
 *      a real name was entered, just not a usable one.
 *
 * Read-only: never writes to the database.
 *
 * Usage (from wedhub-backend/):
 *   npx tsx --env-file=.env scripts/report-incomplete-profiles.ts
 *   npx tsx --env-file=.env scripts/report-incomplete-profiles.ts --limit=200
 */
import { prisma } from "../src/config/database";

const TEST_NAME_PATTERN = /^(test|asdf|abc|xyz|foo|bar|qwerty|na|n\/a|none|xx+)$/i;

function parseLimit(): number {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  return arg ? Number(arg.split("=")[1]) : 500;
}

async function main() {
  const limit = parseLimit();

  const missingName = await prisma.user.findMany({
    where: {
      role: "END_USER",
      profile: { firstName: null },
    },
    select: {
      id: true,
      email: true,
      phone: true,
      createdAt: true,
      profile: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const withName = await prisma.user.findMany({
    where: {
      role: "END_USER",
      profile: { firstName: { not: null } },
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      profile: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 5000,
  });
  const testLooking = withName.filter((u) => u.profile?.firstName && TEST_NAME_PATTERN.test(u.profile.firstName.trim()));

  console.info("=== Accounts with no first name on file (firstName IS NULL) ===");
  console.info(`Total: ${missingName.length}${missingName.length === limit ? " (limit reached, more may exist)" : ""}`);
  for (const u of missingName) {
    console.info(`${u.id}\t${u.email}\t${u.phone ?? "-"}\tsignedUp=${u.createdAt.toISOString()}`);
  }

  console.info("\n=== Accounts with an obviously placeholder-looking first name ===");
  console.info(`Total: ${testLooking.length}`);
  for (const u of testLooking) {
    console.info(`${u.id}\t${u.email}\tname="${u.profile?.firstName} ${u.profile?.lastName ?? ""}".trim()`);
  }

  console.info("\n=== Summary ===");
  console.info(`Missing first name entirely: ${missingName.length}`);
  console.info(`Placeholder-looking first name: ${testLooking.length}`);
  console.info(
    "\nThese accounts pre-date the signup-form fix requiring a first name (item 7) — this list will not grow from new signups.",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
