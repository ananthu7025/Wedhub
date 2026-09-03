import { PrismaClient } from "@prisma/client";

/**
 * One-off idempotent Service seeding for categories that have none.
 * Run via: npx tsx prisma/seed-services.ts
 * Safe to re-run — upserts on (categoryId, slug), matching seed.ts's own
 * seedServices() pattern, extended to cover all 7 categories (seed.ts's
 * CATEGORY_SERVICES only covers Photography/Venues/Makeup Artists).
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORY_SERVICES: Record<string, string[]> = {
  Photography: ["Candid Photography", "Traditional Photography", "Drone Coverage", "Pre-Wedding Shoot"],
  Venues: ["Indoor Hall", "Outdoor Lawn", "Banquet Hall", "Destination Venue"],
  "Makeup Artists": ["Bridal Makeup", "Groom Makeup", "Party Makeup", "Trial Session"],
  "Mehndi Artists": ["Bridal Mehndi", "Arabic Mehndi", "Party Mehndi", "Guest Mehndi"],
  Decorators: ["Theme Decor", "Floral Decor", "Stage Decor", "Entrance Decor"],
  Caterers: ["North Indian Catering", "South Indian Catering", "Live Counters", "Dessert Counters"],
  "Bridal Wear": ["Bridal Lehenga", "Saree Rental", "Custom Stitching", "Groom Sherwani"],
};

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  let count = 0;
  try {
    for (const [categoryName, serviceNames] of Object.entries(CATEGORY_SERVICES)) {
      const category = await prisma.category.findUnique({ where: { slug: slugify(categoryName) } });
      if (!category) {
        console.warn(`Category not found, skipping: ${categoryName}`);
        continue;
      }

      for (const serviceName of serviceNames) {
        await prisma.service.upsert({
          where: { categoryId_slug: { categoryId: category.id, slug: slugify(serviceName) } },
          update: { name: serviceName },
          create: { categoryId: category.id, name: serviceName, slug: slugify(serviceName) },
        });
        count += 1;
      }
      console.log(`${categoryName}: ${serviceNames.length} services`);
    }
    console.log(`Done. Seeded ${count} services across ${Object.keys(CATEGORY_SERVICES).length} categories.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
