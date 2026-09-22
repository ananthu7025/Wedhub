import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// One-off, targeted companion to seed.ts's Event Planners CATEGORY_ATTRIBUTES
// entry (2026-09-22 request) — applied without re-running the full seed.ts,
// same reasoning as seed-caterer-pricing-negotiable.ts. Four fixes:
//   1. fee_model_billing_structure: SELECT -> MULTI_SELECT
//   2. inhouse_vs_vendor_sourcing: SELECT -> MULTI_SELECT
//   3. services_covered_in_planning: adds more everyday/layman options
//      (photography, catering, decoration, etc.)
//   4. Migrates any vendor's existing single valueText for the two fields
//      above into a one-item valueOptions array, so a vendor who already
//      picked a value before the dataType flip doesn't silently lose it
//      (the vendor form reads valueOptions for MULTI_SELECT, not valueText).
// Safe to run more than once — every write here is idempotent (dataType
// set to the same value on a second run; new options only appended if not
// already present; the valueText->valueOptions migration only touches rows
// that still have a non-null valueText, so a second run is a no-op).
async function main(): Promise<void> {
  const category = await prisma.category.findUnique({ where: { slug: "event-planners" } });
  if (!category) {
    throw new Error('Category "event-planners" not found — run the main seed first.');
  }

  const feeModel = await prisma.categoryAttribute.findUnique({
    where: { categoryId_key: { categoryId: category.id, key: "fee_model_billing_structure" } },
  });
  if (!feeModel) {
    throw new Error('Attribute "fee_model_billing_structure" not found under Event Planners.');
  }
  await prisma.categoryAttribute.update({
    where: { id: feeModel.id },
    data: { dataType: "MULTI_SELECT" },
  });

  const sourcing = await prisma.categoryAttribute.findUnique({
    where: { categoryId_key: { categoryId: category.id, key: "inhouse_vs_vendor_sourcing" } },
  });
  if (!sourcing) {
    throw new Error('Attribute "inhouse_vs_vendor_sourcing" not found under Event Planners.');
  }
  await prisma.categoryAttribute.update({
    where: { id: sourcing.id },
    data: { dataType: "MULTI_SELECT" },
  });

  // Migrate any vendor's existing single valueText for these two
  // now-MULTI_SELECT fields into a one-item valueOptions array.
  for (const attribute of [feeModel, sourcing]) {
    const staleRows = await prisma.vendorAttributeValue.findMany({
      where: { attributeId: attribute.id, valueText: { not: null } },
    });
    for (const row of staleRows) {
      await prisma.vendorAttributeValue.update({
        where: { vendorId_attributeId: { vendorId: row.vendorId, attributeId: attribute.id } },
        data: { valueOptions: [row.valueText as string], valueText: null },
      });
    }
    console.info(`Migrated ${staleRows.length} existing value(s) for "${attribute.label}" to the new array format.`);
  }

  const servicesCovered = await prisma.categoryAttribute.findUnique({
    where: { categoryId_key: { categoryId: category.id, key: "services_covered_in_planning" } },
  });
  if (!servicesCovered) {
    throw new Error('Attribute "services_covered_in_planning" not found under Event Planners.');
  }
  const existingOptions = (servicesCovered.options as string[] | null) ?? [];
  const newOptions = [
    "Photography & Videography",
    "Catering",
    "Decoration",
    "Light & Sound",
    "Artists & Performers",
    "Anchors / Emcees",
    "Wedding Cars & Transport Rentals",
    "Bouquet & Floral Arrangements",
  ];
  const mergedOptions = [
    ...existingOptions,
    ...newOptions.filter((o) => !existingOptions.some((e) => e.toLowerCase() === o.toLowerCase())),
  ];
  await prisma.categoryAttribute.update({
    where: { id: servicesCovered.id },
    data: { options: mergedOptions },
  });

  console.info("Event Planners fixes applied: fee_model_billing_structure and inhouse_vs_vendor_sourcing are now MULTI_SELECT; services_covered_in_planning has", mergedOptions.length, "options.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
