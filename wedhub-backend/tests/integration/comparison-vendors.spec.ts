import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/database";
import { compareVendors } from "../../src/modules/comparison/comparison.service";

/**
 * Proves the vendor comparison flow end-to-end against a real Postgres
 * instance (not a mock): two APPROVED vendors sharing one primary category,
 * with real CategoryAttribute rows flagged isComparable=true (the exact gap
 * fixed in prisma/seed.ts — most seeded CategoryAttribute rows had
 * isComparable left at its false default, so comparisonRepository's
 * findComparableAttributes returned [] for almost every category and the
 * comparison table rendered zero category-specific rows even though the
 * feature itself worked). This test builds its own category/attributes
 * fixture rather than depending on the live seed data, so it stays valid
 * regardless of which attributes an admin later marks comparable.
 *
 * Requires DATABASE_URL loaded (see package.json's test:integration script,
 * which runs via `node --env-file=.env`) and a live Postgres reachable at
 * that URL — same requirement as the other tests in this directory.
 */
describe("compareVendors — two same-category vendors (photographers)", () => {
  let categoryId: string;
  let comparableMultiSelectAttrId: string;
  let comparableSelectAttrId: string;
  let nonComparableAttrId: string;
  let vendorAId: string;
  let vendorBId: string;

  beforeAll(async () => {
    const category = await prisma.category.create({
      data: {
        name: `Comparison Test Photography ${Date.now()}`,
        slug: `comparison-test-photography-${Date.now()}`,
        isActive: true,
      },
    });
    categoryId = category.id;

    const comparableMultiSelectAttr = await prisma.categoryAttribute.create({
      data: {
        categoryId,
        key: "services_offered",
        label: "Services Offered",
        dataType: "MULTI_SELECT",
        options: ["Candid Photography", "Cinematic Video", "Drone Coverage"],
        isComparable: true,
        sortOrder: 0,
      },
    });
    comparableMultiSelectAttrId = comparableMultiSelectAttr.id;

    const comparableSelectAttr = await prisma.categoryAttribute.create({
      data: {
        categoryId,
        key: "standard_delivery_time_photos",
        label: "Standard Delivery Time for Photos",
        dataType: "SELECT",
        options: ["2 Weeks", "4 Weeks", "6-8 Weeks"],
        isComparable: true,
        sortOrder: 1,
      },
    });
    comparableSelectAttrId = comparableSelectAttr.id;

    // A non-comparable attribute on the same category — must NOT show up in
    // the comparison result, proving findComparableAttributes' isComparable
    // filter is actually applied end-to-end, not just present in the schema.
    const nonComparableAttr = await prisma.categoryAttribute.create({
      data: {
        categoryId,
        key: "album_specs",
        label: "Album Page Count / Book Quality",
        dataType: "TEXT",
        isComparable: false,
        sortOrder: 2,
      },
    });
    nonComparableAttrId = nonComparableAttr.id;

    const vendorA = await prisma.vendor.create({
      data: {
        businessName: `Comparison Test Photographer A ${Date.now()}`,
        slug: `comparison-test-photographer-a-${Date.now()}`,
        status: "APPROVED",
        creationSource: "SELF_REGISTERED",
        categories: { create: [{ categoryId, isPrimary: true }] },
        profile: {
          create: {
            startingPrice: 50000,
            yearsExperience: 5,
          },
        },
        attributeValues: {
          create: [
            { attributeId: comparableMultiSelectAttrId, valueOptions: ["Candid Photography", "Drone Coverage"] },
            { attributeId: comparableSelectAttrId, valueText: "4 Weeks" },
            { attributeId: nonComparableAttrId, valueText: "2 Albums, 40 pages each" },
          ],
        },
      },
    });
    vendorAId = vendorA.id;

    const vendorB = await prisma.vendor.create({
      data: {
        businessName: `Comparison Test Photographer B ${Date.now()}`,
        slug: `comparison-test-photographer-b-${Date.now()}`,
        status: "APPROVED",
        creationSource: "SELF_REGISTERED",
        categories: { create: [{ categoryId, isPrimary: true }] },
        profile: {
          create: {
            startingPrice: 75000,
            yearsExperience: 8,
          },
        },
        attributeValues: {
          create: [
            { attributeId: comparableMultiSelectAttrId, valueOptions: ["Candid Photography", "Cinematic Video"] },
            { attributeId: comparableSelectAttrId, valueText: "2 Weeks" },
          ],
        },
      },
    });
    vendorBId = vendorB.id;
  });

  afterAll(async () => {
    await prisma.vendorAttributeValue.deleteMany({ where: { vendorId: { in: [vendorAId, vendorBId] } } });
    await prisma.vendorProfile.deleteMany({ where: { vendorId: { in: [vendorAId, vendorBId] } } });
    await prisma.vendorCategory.deleteMany({ where: { vendorId: { in: [vendorAId, vendorBId] } } });
    await prisma.vendor.deleteMany({ where: { id: { in: [vendorAId, vendorBId] } } });
    await prisma.categoryAttribute.deleteMany({ where: { categoryId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.$disconnect();
  });

  it("returns the shared category and both vendors with real pricing/experience data", async () => {
    const result = await compareVendors([vendorAId, vendorBId], undefined);

    expect(result.category?.id).toBe(categoryId);
    expect(result.vendors).toHaveLength(2);

    const vendorA = result.vendors.find((v) => v.id === vendorAId);
    const vendorB = result.vendors.find((v) => v.id === vendorBId);
    expect(vendorA?.yearsExperience).toBe(5);
    expect(vendorB?.yearsExperience).toBe(8);
    expect(Number(vendorA?.startingPrice)).toBe(50000);
    expect(Number(vendorB?.startingPrice)).toBe(75000);
  });

  it("includes only isComparable=true category attributes, with genuinely different per-vendor values (the fixed gap)", async () => {
    const result = await compareVendors([vendorAId, vendorBId], undefined);

    // The core regression this test guards: attributes must be non-empty.
    // Before the isComparable seed fix, almost every category's
    // findComparableAttributes() returned [] here.
    expect(result.attributes.length).toBeGreaterThan(0);

    const attributeKeys = result.attributes.map((a) => a.key);
    expect(attributeKeys).toContain("services_offered");
    expect(attributeKeys).toContain("standard_delivery_time_photos");
    // The non-comparable attribute must be excluded from the comparison set.
    expect(attributeKeys).not.toContain("album_specs");

    const vendorA = result.vendors.find((v) => v.id === vendorAId);
    const vendorB = result.vendors.find((v) => v.id === vendorBId);

    expect(vendorA?.attributeValues.services_offered).toEqual(["Candid Photography", "Drone Coverage"]);
    expect(vendorB?.attributeValues.services_offered).toEqual(["Candid Photography", "Cinematic Video"]);
    expect(vendorA?.attributeValues.standard_delivery_time_photos).toBe("4 Weeks");
    expect(vendorB?.attributeValues.standard_delivery_time_photos).toBe("2 Weeks");

    // Values genuinely differ between the two vendors — a couple comparing
    // them would actually learn something, not see two identical columns.
    expect(vendorA?.attributeValues.standard_delivery_time_photos).not.toBe(
      vendorB?.attributeValues.standard_delivery_time_photos,
    );
  });

  it("rejects comparing vendors that don't share a primary category", async () => {
    const otherCategory = await prisma.category.create({
      data: {
        name: `Comparison Test Other Category ${Date.now()}`,
        slug: `comparison-test-other-category-${Date.now()}`,
        isActive: true,
      },
    });
    const otherVendor = await prisma.vendor.create({
      data: {
        businessName: `Comparison Test Other Vendor ${Date.now()}`,
        slug: `comparison-test-other-vendor-${Date.now()}`,
        status: "APPROVED",
        creationSource: "SELF_REGISTERED",
        categories: { create: [{ categoryId: otherCategory.id, isPrimary: true }] },
      },
    });

    await expect(compareVendors([vendorAId, otherVendor.id], undefined)).rejects.toThrow(
      "All vendors being compared must share the same primary category",
    );

    await prisma.vendorCategory.deleteMany({ where: { vendorId: otherVendor.id } });
    await prisma.vendor.deleteMany({ where: { id: otherVendor.id } });
    await prisma.category.deleteMany({ where: { id: otherCategory.id } });
  });
});
