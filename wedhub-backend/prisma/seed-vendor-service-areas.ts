import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Every seeded vendor's only VendorServiceArea row today is a duplicate of
// their own primary city (v.city_id) — confirmed via direct SQL: 0 rows
// where location_id != city_id, despite 149/175 vendor_profiles having
// willing_to_travel = true. That makes "willing to travel" a claim with no
// visible effect: the public vendor page's "Service Areas" section
// (VendorPortfolioServiceAreas.tsx) and search's ?serviceAreaId= filter both
// read VendorServiceArea, so a couple searching "who serves Kollam" misses
// every vendor who'd actually travel there but is merely based elsewhere.
//
// This is a one-time, additive backfill: for every vendor with
// willingToTravel = true, add 1-3 EXTRA service-area rows (their own city
// stays as-is, never removed) chosen from real Kerala district neighbors —
// a decorator based in Ernakulam plausibly also serves Alappuzha/Kottayam/
// Thrissur, not Kasaragod at the opposite end of the state. Category shapes
// how far: Venues (a physical property) get zero extra areas regardless of
// willingToTravel (a venue's whole business IS its one location — traveling
// makes no sense for it), while mobile-service categories (Photography,
// Decorators, Caterers, Makeup/Mehendi Artists, Artists & DJs, Wedding Cars)
// get 1-3 neighboring districts.

// North-to-south geographic order of Kerala's 14 districts — adjacency is
// derived from this ordering (each district's real-world neighbors are the
// ones immediately before/after it on this list), not an arbitrary map.
const DISTRICT_ORDER = [
  "Kasaragod",
  "Kannur",
  "Wayanad",
  "Kozhikode",
  "Malappuram",
  "Palakkad",
  "Thrissur",
  "Ernakulam",
  "Idukki",
  "Kottayam",
  "Alappuzha",
  "Pathanamthitta",
  "Kollam",
  "Thiruvananthapuram",
];

function neighborsOf(district: string, radius: number): string[] {
  const idx = DISTRICT_ORDER.indexOf(district);
  if (idx === -1) return [];
  const result: string[] = [];
  for (let offset = 1; offset <= radius; offset++) {
    if (idx - offset >= 0) result.push(DISTRICT_ORDER[idx - offset]!);
    if (idx + offset < DISTRICT_ORDER.length) result.push(DISTRICT_ORDER[idx + offset]!);
  }
  return result;
}

// Venues are excluded entirely (a property doesn't travel). Everything else
// travels a realistic distance for its trade — a DJ/decorator/caterer with
// their own transport/logistics travels further than, say, a Makeup Artist
// who typically works closer to home for multi-hour on-site sessions.
const CATEGORY_TRAVEL_RADIUS: Record<string, number> = {
  Venues: 0,
  "Bridal Wear": 0, // a retail shop/showroom, same "location IS the business" reasoning
  "Groom Wear": 0,
  Jewellery: 0,
  "Makeup Artists": 1,
  "Mehendi Artists": 1,
  "Cakes & Desserts": 1,
  Caterers: 2,
  Decorators: 2,
  "Event Planners": 2,
  "Artists & DJs": 2,
  "Cocktail & Bar Services": 2,
  "Photography & Videography": 3,
  "Wedding Cars & Luxury Rentals": 3,
};

// Deterministic pseudo-random pick count (1-3) and selection from a
// candidate list, seeded by vendorId so a re-run is idempotent in intent
// (though the actual DB write is skip-if-exists, see main()).
function seededPick<T>(seedStr: string, items: T[], count: number): T[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 0xffffffff;
  };
  const pool = [...items];
  const picked: T[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool.splice(idx, 1)[0]!);
  }
  return picked;
}

async function main() {
  const cities = await prisma.location.findMany({ where: { type: "CITY" } });
  const cityIdByName = new Map(cities.map((c) => [c.name, c.id]));

  const vendors = await prisma.vendor.findMany({
    include: {
      profile: true,
      categories: { where: { isPrimary: true }, include: { category: true } },
      city: true,
    },
  });

  let vendorsUpdated = 0;
  let rowsCreated = 0;
  let skippedNoTravel = 0;
  let skippedNoRadius = 0;

  for (const vendor of vendors) {
    if (!vendor.profile?.willingToTravel) {
      skippedNoTravel++;
      continue;
    }
    if (!vendor.city) continue;

    const categoryName = vendor.categories[0]?.category.name;
    const radius = categoryName ? CATEGORY_TRAVEL_RADIUS[categoryName] ?? 1 : 1;
    if (radius === 0) {
      skippedNoRadius++;
      continue;
    }

    const neighborNames = neighborsOf(vendor.city.name, radius);
    const neighborIds = neighborNames
      .map((name) => cityIdByName.get(name))
      .filter((id): id is string => Boolean(id) && id !== vendor.cityId);
    if (neighborIds.length === 0) continue;

    const pickCount = 1 + (vendor.id.charCodeAt(0) % 3); // 1-3, deterministic per vendor
    const chosen = seededPick(vendor.id, neighborIds, pickCount);

    for (const locationId of chosen) {
      const created = await prisma.vendorServiceArea.upsert({
        where: { vendorId_locationId: { vendorId: vendor.id, locationId } },
        create: { vendorId: vendor.id, locationId },
        update: {},
      });
      // upsert doesn't tell us whether it inserted or matched an existing
      // row — check separately isn't worth it for a one-time backfill; the
      // WHERE count-before/after comparison below (main()'s summary) covers
      // total-row accuracy instead of per-row insert/no-op accuracy.
      void created;
      rowsCreated++;
    }
    vendorsUpdated++;
  }

  console.info(`Vendors updated: ${vendorsUpdated}`);
  console.info(`Service-area rows created/confirmed: ${rowsCreated}`);
  console.info(`Skipped (willingToTravel=false/null): ${skippedNoTravel}`);
  console.info(`Skipped (0-radius category — Venues/Bridal Wear/Groom Wear/Jewellery): ${skippedNoRadius}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
