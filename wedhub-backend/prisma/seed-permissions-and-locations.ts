import { seedCategories, seedHomepageFeaturedCategories, seedLocations, seedPermissionsAndRoles } from "./seed";

/**
 * One-off targeted seed for a fresh (unseeded) database that only needs
 * permissions/roles (so the existing admin user's role actually grants
 * anything), locations (India -> Kerala -> districts), and categories
 * (including the 7 homepage-featured ones with their bundled capsule
 * images) — not the full seed.ts run, which also seeds services/plans not
 * wanted yet.
 * Run via: npx tsx prisma/seed-permissions-and-locations.ts
 */
async function main(): Promise<void> {
  await seedPermissionsAndRoles();
  await seedLocations();
  await seedCategories();
  await seedHomepageFeaturedCategories();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
