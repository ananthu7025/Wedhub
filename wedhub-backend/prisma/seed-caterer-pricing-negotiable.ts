import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// One-off, targeted companion to seed.ts's Caterers CATEGORY_ATTRIBUTES
// entry (same key/label/dataType/helpText) — added so this single new
// attribute can be applied to test/production without re-running the full
// seed.ts (which would also re-touch every other category's attributes,
// permissions/roles, locations, blog posts, and subscription plans in the
// same run). Safe to run more than once: upsert keyed on categoryId_key,
// same idempotency seed.ts's own seedCategories() relies on.
async function main(): Promise<void> {
  const category = await prisma.category.findUnique({ where: { slug: "caterers" } });
  if (!category) {
    throw new Error('Category "caterers" not found — run the main seed first.');
  }

  const existingAttributes = await prisma.categoryAttribute.findMany({
    where: { categoryId: category.id },
    orderBy: { sortOrder: "asc" },
  });

  // Matches seed.ts's insertion point: right after per_plate_rate_non_veg,
  // before inclusions_in_per_plate_rate — so sortOrder lines up with what a
  // future full seed.ts run would produce, rather than appending at the end.
  const afterKey = "per_plate_rate_non_veg";
  const afterIndex = existingAttributes.findIndex((a) => a.key === afterKey);
  const sortOrder = afterIndex === -1 ? existingAttributes.length : afterIndex + 1;

  await prisma.categoryAttribute.upsert({
    where: { categoryId_key: { categoryId: category.id, key: "pricing_open_to_discussion" } },
    update: {
      label: "Pricing Is Open to Discussion",
      dataType: "BOOLEAN",
      helpText:
        "Turn this on if per-plate rates vary by menu/guest count and you're open to negotiating — advertises that your pricing is flexible and fully customizable.",
      sortOrder,
    },
    create: {
      categoryId: category.id,
      key: "pricing_open_to_discussion",
      label: "Pricing Is Open to Discussion",
      dataType: "BOOLEAN",
      helpText:
        "Turn this on if per-plate rates vary by menu/guest count and you're open to negotiating — advertises that your pricing is flexible and fully customizable.",
      isFilterable: false,
      isComparable: false,
      isRequired: false,
      sortOrder,
    },
  });

  // Shift every attribute that came after the insertion point down by one,
  // so display order matches seed.ts's array order exactly (no gap/overlap).
  for (const attr of existingAttributes.slice(afterIndex + 1)) {
    await prisma.categoryAttribute.update({
      where: { id: attr.id },
      data: { sortOrder: attr.sortOrder + 1 },
    });
  }

  console.info('Seeded Caterers attribute "pricing_open_to_discussion".');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
