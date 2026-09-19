import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/config/database";
import { searchVendors } from "../../src/modules/search/search.repository";
import type { VendorSearchFilters } from "../../src/modules/search/search.types";

/**
 * Covers every example from the P0 search bug report verbatim: category
 * vs. city parsing, category-synonym recognition (so a confidently-named
 * category is a HARD filter and can never be outranked/replaced by a
 * description-text match on an unrelated category — this is what let
 * "bridal makeup kochi" return a BRIDAL WEAR vendor before this fix),
 * singular/plural, city aliases, and typo tolerance. Builds its own fixture
 * vendors (two categories x two cities, deliberately including a
 * bridal-wear vendor whose bio contains the word "bridal" as the trap case)
 * rather than depending on whatever the dev DB happens to already contain.
 */
describe("Search: category/location parsing and relevance", () => {
  const suffix = `${Date.now()}`;
  let photographyCategoryId: string;
  let makeupCategoryId: string;
  let bridalWearCategoryId: string;
  let venuesCategoryId: string;
  let ernakulamId: string;
  let thiruvananthapuramId: string;
  const vendorIds: string[] = [];

  async function createVendor(input: {
    businessName: string;
    categoryId: string;
    cityId: string;
    shortDescription?: string;
  }) {
    const vendor = await prisma.vendor.create({
      data: {
        businessName: input.businessName,
        slug: `${input.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${suffix}`,
        status: "APPROVED",
        creationSource: "SELF_REGISTERED",
        cityId: input.cityId,
        categories: { create: [{ categoryId: input.categoryId, isPrimary: true }] },
        profile: { create: { shortDescription: input.shortDescription } },
      },
    });
    vendorIds.push(vendor.id);
    return vendor;
  }

  beforeAll(async () => {
    // Uses the REAL, already-seeded production categories (photography-
    // videography, makeup-artists, bridal-wear, venues), not freshly
    // created test categories — CATEGORY_SYNONYMS in search.repository.ts
    // is keyed by the real Category.slug, so a synonym like "mua" or
    // "photographer" only resolves against these actual slugs. A fixture
    // category with an invented slug (e.g. "search-test-makeup-...") would
    // never match any synonym at all, which is a test-fixture bug, not a
    // search-logic one — confirmed by first writing this test against
    // invented categories and watching every synonym-dependent case fail.
    const [photography, makeup, bridalWear, venues] = await Promise.all([
      prisma.category.findFirstOrThrow({ where: { slug: "photography-videography" } }),
      prisma.category.findFirstOrThrow({ where: { slug: "makeup-artists" } }),
      prisma.category.findFirstOrThrow({ where: { slug: "bridal-wear" } }),
      prisma.category.findFirstOrThrow({ where: { slug: "venues" } }),
    ]);
    photographyCategoryId = photography.id;
    makeupCategoryId = makeup.id;
    bridalWearCategoryId = bridalWear.id;
    venuesCategoryId = venues.id;

    const [ernakulam, tvm] = await Promise.all([
      prisma.location.findFirst({ where: { name: "Ernakulam", type: "CITY" } }),
      prisma.location.findFirst({ where: { name: "Thiruvananthapuram", type: "CITY" } }),
    ]);
    if (!ernakulam || !tvm) {
      throw new Error("Fixture requires Ernakulam and Thiruvananthapuram CITY locations to already exist — run db:seed first");
    }
    ernakulamId = ernakulam.id;
    thiruvananthapuramId = tvm.id;

    await Promise.all([
      createVendor({ businessName: `Kochi Frame Studio ${suffix}`, categoryId: photographyCategoryId, cityId: ernakulamId }),
      createVendor({ businessName: `Trivandrum Lens Co ${suffix}`, categoryId: photographyCategoryId, cityId: thiruvananthapuramId }),
      createVendor({
        businessName: `Kochi Glow Makeup ${suffix}`,
        categoryId: makeupCategoryId,
        cityId: ernakulamId,
      }),
      // The trap case from the bug report: a BRIDAL WEAR vendor whose bio
      // text contains "bridal" and is based in the same city a makeup
      // search would target — this must NEVER appear for "bridal makeup
      // kochi", only a real Makeup Artists vendor should.
      createVendor({
        businessName: `Kochi Bridal Drapes ${suffix}`,
        categoryId: bridalWearCategoryId,
        cityId: ernakulamId,
        shortDescription: "Bridal Kanchipuram sarees and designer bridal lehengas with in-house tailoring.",
      }),
      createVendor({ businessName: `Trivandrum Grand Hall ${suffix}`, categoryId: venuesCategoryId, cityId: thiruvananthapuramId }),
    ]);
  });

  afterAll(async () => {
    // Only the fixture VENDORS get cleaned up — photographyCategoryId etc.
    // point at real, permanent production categories (see beforeAll's
    // comment) that must never be deleted by a test.
    await prisma.vendorProfile.deleteMany({ where: { vendorId: { in: vendorIds } } });
    await prisma.vendorCategory.deleteMany({ where: { vendorId: { in: vendorIds } } });
    await prisma.vendor.deleteMany({ where: { id: { in: vendorIds } } });
    await prisma.$disconnect();
  });

  const baseFilters: Omit<VendorSearchFilters, "keyword"> = {
    categoryId: undefined,
    cityId: undefined,
    serviceAreaId: undefined,
    priceMin: undefined,
    priceMax: undefined,
    verified: undefined,
    attributes: undefined,
    maxAvgResponseTimeMs: undefined,
    page: 1,
    limit: 20,
  };

  async function names(keyword: string): Promise<string[]> {
    const { rows } = await searchVendors({ ...baseFilters, keyword }, "relevance");
    return rows.map((r) => r.businessName).filter((n) => n.endsWith(suffix));
  }

  it('"photographer" matches the Photography category by synonym, both fixture photographers', async () => {
    const result = await names("photographer");
    expect(result).toContain(`Kochi Frame Studio ${suffix}`);
    expect(result).toContain(`Trivandrum Lens Co ${suffix}`);
  });

  it('"photographer kochi" narrows to only the Ernakulam photographer, not the Trivandrum one', async () => {
    const result = await names("photographer kochi");
    expect(result).toEqual([`Kochi Frame Studio ${suffix}`]);
  });

  it('"photographer ernakulam" (real district name, not the colloquial alias) resolves identically to "kochi"', async () => {
    const result = await names("photographer ernakulam");
    expect(result).toEqual([`Kochi Frame Studio ${suffix}`]);
  });

  it('"photographers" (plural) resolves the same as "photographer" via singularization', async () => {
    const result = await names("photographers kochi");
    expect(result).toEqual([`Kochi Frame Studio ${suffix}`]);
  });

  it('typo "photgrapher kochi" still resolves via typo tolerance', async () => {
    const result = await names("photgrapher kochi");
    expect(result).toEqual([`Kochi Frame Studio ${suffix}`]);
  });

  it('"bridal makeup kochi" returns ONLY the makeup vendor, never the bridal-wear vendor whose bio contains "bridal"', async () => {
    const result = await names("bridal makeup kochi");
    expect(result).toEqual([`Kochi Glow Makeup ${suffix}`]);
    expect(result).not.toContain(`Kochi Bridal Drapes ${suffix}`);
  });

  it('"mua" synonym resolves to Makeup Artists', async () => {
    const result = await names("mua kochi");
    expect(result).toEqual([`Kochi Glow Makeup ${suffix}`]);
  });

  it('"wedding venue trivandrum" maps the "trivandrum" alias to Thiruvananthapuram and finds the venue', async () => {
    const result = await names("wedding venue trivandrum");
    expect(result).toEqual([`Trivandrum Grand Hall ${suffix}`]);
  });

  it('"hall" synonym alone resolves to Venues', async () => {
    const result = await names("hall");
    expect(result).toContain(`Trivandrum Grand Hall ${suffix}`);
  });

  it("random unmatched text returns zero results (no forced fallback match)", async () => {
    const result = await names("qwjkzxpvbnmqqzz");
    expect(result).toEqual([]);
  });

  it("a category filter never lets a same-city, wrong-category vendor through", async () => {
    // Regression guard for the exact reported defect: searching a category
    // term scoped to a city must exclude a same-city vendor of a DIFFERENT
    // category even when that vendor's own bio text overlaps the query.
    const result = await names("makeup kochi");
    expect(result).not.toContain(`Kochi Bridal Drapes ${suffix}`);
  });
});
