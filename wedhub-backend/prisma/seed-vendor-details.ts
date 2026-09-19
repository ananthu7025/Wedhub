/**
 * Fills in the confirmed data gaps left after the earlier demo-data seeding
 * pass (see seed-demo-data.ts): every vendor currently has 0 packages, and
 * vendor_profiles.website/business_hours/social_links are NULL for all 174
 * vendors, and vendor_attribute_values has 0 rows despite 93 real
 * CategoryAttribute definitions existing across the 14 categories.
 *
 * This is purely additive/update-only: it never touches short_description,
 * description, phone, email, years_experience, address, starting_price/
 * price_range_min/price_range_max, languages, or any already-populated
 * column. It only writes to the confirmed-empty targets:
 *   - packages (new rows, 2-3 per vendor)
 *   - vendor_profiles.website / business_hours / social_links (currently NULL)
 *   - vendor_attribute_values (new rows, one per CategoryAttribute in the
 *     vendor's primary category, skipping some optional ones for realism)
 *
 * Run standalone against an already-seeded database:
 *
 *   npx tsx prisma/seed-vendor-details.ts
 *
 * Idempotency: NOT idempotent by design (matches seed-demo-data.ts's
 * convention) — intended to run once. Re-running will create duplicate
 * package rows (packages has no natural unique key) though the
 * vendor_profiles update and vendor_attribute_values upsert are safe to
 * repeat (composite PK / plain column update).
 */
import { PrismaClient, Prisma, AttributeDataType } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Small deterministic-ish RNG helpers (seeded by vendor id) so re-reading the
// generated data is reproducible if this script is ever re-run in dry-run
// mode, and so variety is driven by the vendor rather than pure Math.random
// clumping repeats within a single process run.
// ---------------------------------------------------------------------------
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  const item = arr[Math.floor(rng() * arr.length)];
  if (item === undefined) throw new Error("pick() called on empty array");
  return item;
}

function pickN<T>(rng: () => number, arr: readonly T[], min: number, max: number): T[] {
  const count = Math.min(arr.length, Math.max(min, Math.floor(rng() * (max - min + 1)) + min));
  const pool = [...arr];
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * pool.length);
    result.push(pool.splice(idx, 1)[0] as T);
  }
  return result;
}

function round(n: number, nearest: number): number {
  return Math.round(n / nearest) * nearest;
}

function slugifyDomain(businessName: string): string {
  const cleaned = businessName
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "")
    .replace(/-+/g, "");
  return cleaned || "wedhubvendor";
}

function slugifyHandle(businessName: string): string {
  const cleaned = businessName
    .toLowerCase()
    .replace(/&/g, "_")
    .replace(/[^a-z0-9\s_]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
  return cleaned || "wedhubvendor";
}

// ---------------------------------------------------------------------------
// Website / business hours / social links generators
// ---------------------------------------------------------------------------
const DOMAIN_TLDS = ["com", "in", "co.in"] as const;
const WEBSITE_STYLES = ["bare", "www"] as const;

function makeWebsite(rng: () => number, businessName: string): string {
  const domain = slugifyDomain(businessName);
  const tld = pick(rng, DOMAIN_TLDS);
  const style = pick(rng, WEBSITE_STYLES);
  const host = style === "www" ? `www.${domain}.${tld}` : `${domain}.${tld}`;
  return `https://${host}`;
}

function makeSocialLinks(rng: () => number, businessName: string): Prisma.InputJsonValue {
  const handle = slugifyHandle(businessName);
  const igVariants = [`@${handle}`, `@${handle}_official`, `${handle}_weddings`, `@${handle}.kerala`];
  const fbVariants = [handle, `${handle}official`, `${handle}.weddings`];
  return {
    instagram: pick(rng, igVariants),
    facebook: pick(rng, fbVariants),
  };
}

type HoursProfile = "appointment" | "daily-range" | "closed-day";

const HOURS_BY_CATEGORY: Record<string, HoursProfile[]> = {
  "photography-videography": ["appointment", "daily-range"],
  venues: ["daily-range", "appointment"],
  "makeup-artists": ["appointment"],
  "mehendi-artists": ["appointment", "daily-range"],
  decorators: ["appointment", "daily-range"],
  caterers: ["daily-range"],
  "bridal-wear": ["daily-range", "closed-day"],
  "groom-wear": ["daily-range", "closed-day"],
  jewellery: ["daily-range", "closed-day"],
  "cakes-desserts": ["daily-range", "closed-day"],
  "artists-djs": ["appointment"],
  "cocktail-bar-services": ["appointment"],
  "wedding-cars-luxury-rentals": ["daily-range", "appointment"],
  "event-planners": ["appointment", "daily-range"],
};

function makeBusinessHours(rng: () => number, categorySlug: string): Prisma.InputJsonValue {
  const profiles = HOURS_BY_CATEGORY[categorySlug] ?? ["daily-range"];
  const profile = pick(rng, profiles);
  let general: string;
  if (profile === "appointment") {
    general = pick(rng, [
      "By appointment only",
      "By appointment only, all days",
      "Prior appointment required, 10:00 AM - 7:00 PM",
    ]);
  } else if (profile === "closed-day") {
    const openTime = pick(rng, ["9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM"]);
    const closeTime = pick(rng, ["6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM"]);
    const closedDay = pick(rng, ["Mondays", "Tuesdays"]);
    general = `${openTime} - ${closeTime}, Closed ${closedDay}`;
  } else {
    const openTime = pick(rng, ["8:00 AM", "9:00 AM", "9:30 AM", "10:00 AM"]);
    const closeTime = pick(rng, ["7:00 PM", "8:00 PM", "8:30 PM", "9:00 PM"]);
    general = `${openTime} - ${closeTime}, all days`;
  }
  return { general };
}

// ---------------------------------------------------------------------------
// Package templates per category. Each category gets a pool of tier
// definitions (name + description template + inclusion pool) larger than 3
// so that vendors within the same category don't all get identical package
// names/inclusions verbatim.
// ---------------------------------------------------------------------------
type PackageTierPool = {
  name: string;
  description: string;
  inclusionPool: string[];
  priceFactor: number; // fraction of [priceRangeMin, priceRangeMax] band this tier centers on
};

type CategoryPackagePlan = {
  tierGroups: PackageTierPool[][]; // each inner array = alternative names/desc for that tier slot
};

const PACKAGE_PLANS: Record<string, CategoryPackagePlan> = {
  "photography-videography": {
    tierGroups: [
      [
        {
          name: "Candid Photography",
          description: "Single-day candid photo coverage with a lead photographer for your wedding ceremony.",
          inclusionPool: [
            "1 lead candid photographer",
            "300+ edited high-res photos",
            "Online gallery delivery",
            "8-hour event coverage",
            "Same-week sneak peek album",
          ],
          priceFactor: 0.22,
        },
        {
          name: "Essential Candid Coverage",
          description: "Focused candid-only coverage ideal for smaller, single-function weddings.",
          inclusionPool: [
            "1 candid photographer",
            "250+ edited digital photos",
            "Private online gallery",
            "6-hour coverage window",
          ],
          priceFactor: 0.2,
        },
      ],
      [
        {
          name: "Photo + Videography",
          description: "Combined photo and video team covering ceremony and reception with a cinematic teaser.",
          inclusionPool: [
            "2 photographers + 1 videographer",
            "500+ edited photos",
            "3-5 min cinematic teaser",
            "Drone coverage (weather permitting)",
            "Printed premium album (30 pages)",
          ],
          priceFactor: 0.5,
        },
        {
          name: "Complete Wedding Story",
          description: "Full photo and video documentation across two functions with a same-day highlight reel.",
          inclusionPool: [
            "2 photographers + 2 videographers",
            "600+ edited photos",
            "Same-day edit reel",
            "Full highlight film (15 min)",
            "Hardbound photo album",
          ],
          priceFactor: 0.55,
        },
      ],
      [
        {
          name: "Premium Cinematic",
          description: "Multi-day, multi-crew cinematic package with drone, full films, and premium album delivery.",
          inclusionPool: [
            "4-6 crew across photo and video",
            "1000+ edited photos, full resolution",
            "Full highlight film (25-30 min)",
            "Drone coverage across all functions",
            "Luxury leather-bound album",
            "Raw footage on hard drive",
          ],
          priceFactor: 0.85,
        },
        {
          name: "Signature Multi-Day Film",
          description: "Our top-tier offering for multi-function weddings needing a full cinematic documentary.",
          inclusionPool: [
            "6+ member crew",
            "Unlimited edited photos",
            "Cinematic feature film (30+ min)",
            "Drone + gimbal coverage",
            "Two premium albums",
            "Same-day teaser for social media",
          ],
          priceFactor: 0.9,
        },
      ],
    ],
  },
  venues: {
    tierGroups: [
      [
        {
          name: "Essential Venue Package",
          description: "Venue rental for a single-day function with basic seating and power backup.",
          inclusionPool: [
            "Full-day hall rental",
            "Basic seating for guests",
            "Power backup",
            "Parking for 50 cars",
            "Changing room access",
          ],
          priceFactor: 0.35,
        },
        {
          name: "Half-Day Function Package",
          description: "A half-day booking suited for smaller functions like engagement or reception-only events.",
          inclusionPool: [
            "Half-day hall access",
            "Basic seating setup",
            "Power backup",
            "Parking for 30 cars",
          ],
          priceFactor: 0.28,
        },
      ],
      [
        {
          name: "Classic Wedding Package",
          description: "Venue with in-house catering coordination and standard décor allowance for the main function.",
          inclusionPool: [
            "Full-day venue access",
            "In-house catering coordination",
            "Round tables and chairs setup",
            "Standard lighting",
            "Green room for bride and groom",
            "Ample parking",
          ],
          priceFactor: 0.6,
        },
        {
          name: "Signature Hall Package",
          description: "Full-day venue booking with flexible external catering allowance and standard AC hall access.",
          inclusionPool: [
            "Full-day venue access",
            "External caterers allowed",
            "Fully air-conditioned hall",
            "Standard lighting setup",
            "Ample parking",
          ],
          priceFactor: 0.65,
        },
      ],
      [
        {
          name: "Grand Celebration Package",
          description: "Premium multi-day booking with full AC halls, extended power backup, and priority slot booking.",
          inclusionPool: [
            "Multi-day hall booking",
            "Fully air-conditioned halls",
            "100% power backup",
            "Dedicated event coordinator",
            "Premium green rooms",
            "Valet parking assistance",
          ],
          priceFactor: 0.9,
        },
        {
          name: "Royal Multi-Hall Package",
          description: "Multiple halls booked together for multi-function weddings, with full backup and dedicated coordination.",
          inclusionPool: [
            "Multiple halls booked together",
            "100% power backup",
            "Dedicated event coordinator",
            "Premium green rooms with attached washrooms",
            "Valet parking assistance",
          ],
          priceFactor: 0.95,
        },
      ],
    ],
  },
  "makeup-artists": {
    tierGroups: [
      [
        {
          name: "Classic Bridal Makeup",
          description: "HD bridal makeup for the wedding day with basic hair styling included.",
          inclusionPool: [
            "HD bridal makeup",
            "Basic hair styling",
            "Saree draping",
            "False lashes",
            "Touch-up kit for the day",
          ],
          priceFactor: 0.3,
        },
        {
          name: "Essential Bridal Look",
          description: "A single-look HD bridal makeup package for the main ceremony day.",
          inclusionPool: [
            "HD bridal makeup, single look",
            "Basic hair styling",
            "False lashes",
          ],
          priceFactor: 0.26,
        },
      ],
      [
        {
          name: "Bridal + Reception Combo",
          description: "Two-look package covering both the wedding ceremony and reception with airbrush finish.",
          inclusionPool: [
            "Airbrush makeup, 2 looks",
            "Hair styling for both events",
            "Saree/dupatta draping",
            "Jewellery setting",
            "Complimentary trial session",
          ],
          priceFactor: 0.6,
        },
        {
          name: "Engagement + Wedding Duo",
          description: "Two-event makeup package covering engagement and wedding day looks with hair styling.",
          inclusionPool: [
            "Airbrush makeup, 2 events",
            "Hair styling for both events",
            "Draping assistance",
            "False lashes included",
          ],
          priceFactor: 0.58,
        },
      ],
      [
        {
          name: "Premium Bridal Experience",
          description: "Full bridal beauty package with trial, on-site touch-ups, and family makeup add-ons available.",
          inclusionPool: [
            "Airbrush HD makeup, multiple looks",
            "Complimentary trial makeup",
            "Hair styling and draping",
            "On-call touch-up artist for the day",
            "False lashes and premium products",
            "Family makeup add-on available",
          ],
          priceFactor: 0.9,
        },
        {
          name: "Signature Multi-Event Glam",
          description: "Complete multi-function makeup coverage (haldi, wedding, reception) with premium products throughout.",
          inclusionPool: [
            "Airbrush HD makeup across 3 functions",
            "Complimentary trial makeup",
            "Hair styling and draping for each event",
            "On-call touch-up artist",
            "Premium imported products",
          ],
          priceFactor: 0.95,
        },
      ],
    ],
  },
  "mehendi-artists": {
    tierGroups: [
      [
        {
          name: "Bridal Mehendi - Classic",
          description: "Traditional bridal mehendi design covering both hands up to the elbow.",
          inclusionPool: [
            "Both hands up to elbow",
            "Organic henna cones",
            "2-3 hours session",
            "Basic feet design included",
          ],
          priceFactor: 0.3,
        },
        {
          name: "Hands-Only Bridal Mehendi",
          description: "A focused bridal mehendi session covering both hands with traditional motifs.",
          inclusionPool: [
            "Both hands, wrist to fingertips",
            "Organic henna cones",
            "2 hours session",
          ],
          priceFactor: 0.24,
        },
      ],
      [
        {
          name: "Bridal Mehendi - Signature",
          description: "Detailed Arabic-Indo fusion bridal design for hands and feet with a personalized touch.",
          inclusionPool: [
            "Hands and feet, detailed coverage",
            "Personalized name/portrait hidden design",
            "Organic chemical-free henna",
            "3-4 hours session",
          ],
          priceFactor: 0.55,
        },
        {
          name: "Arabic Fusion Bridal Package",
          description: "Bold Arabic-style bridal mehendi for hands and feet with a modern geometric touch.",
          inclusionPool: [
            "Hands and feet, Arabic fusion design",
            "Organic chemical-free henna",
            "3 hours session",
            "Complimentary design consultation",
          ],
          priceFactor: 0.5,
        },
      ],
      [
        {
          name: "Bridal + Family Package",
          description: "Full bridal mehendi plus guest/family mehendi for a set number of people on the same day.",
          inclusionPool: [
            "Full bridal hands and feet coverage",
            "Mehendi for up to 15 family members",
            "Two artists on the day",
            "Organic henna for all",
            "Priority time slot",
          ],
          priceFactor: 0.85,
        },
        {
          name: "Grand Bridal & Guest Package",
          description: "Full bridal coverage plus mehendi for a larger guest list, with multiple artists on the day.",
          inclusionPool: [
            "Full bridal hands and feet coverage",
            "Mehendi for up to 25 guests",
            "Three artists on the day",
            "Organic henna for all",
            "Priority time slot",
          ],
          priceFactor: 0.95,
        },
      ],
    ],
  },
  decorators: {
    tierGroups: [
      [
        {
          name: "Essential Decor",
          description: "Simple stage and entrance decor using artificial flowers, ideal for intimate functions.",
          inclusionPool: [
            "Stage backdrop decor",
            "Entrance arch",
            "Artificial flower setup",
            "Basic ambient lighting",
          ],
          priceFactor: 0.3,
        },
        {
          name: "Basic Haldi/Mehendi Setup",
          description: "A simple, colorful decor setup for haldi or mehendi functions using artificial flowers and drapes.",
          inclusionPool: [
            "Haldi/mehendi theme setup",
            "Backdrop and seating decor",
            "Artificial flower setup",
          ],
          priceFactor: 0.24,
        },
      ],
      [
        {
          name: "Premium Decor",
          description: "Real-flower stage and mandap decor with themed lighting and a dedicated photo booth corner.",
          inclusionPool: [
            "Stage and mandap decor with real flowers",
            "Entrance and pathway styling",
            "Themed lighting effects",
            "Photo booth / backdrop corner",
            "Table centerpieces",
          ],
          priceFactor: 0.6,
        },
        {
          name: "Floral Fantasy Package",
          description: "A hybrid real-and-artificial flower theme with modern minimalist styling for stage and entrance.",
          inclusionPool: [
            "Stage decor with hybrid flower mix",
            "Entrance arch and pathway",
            "Ambient lighting effects",
            "Table and seating setup",
          ],
          priceFactor: 0.58,
        },
      ],
      [
        {
          name: "Luxury Theme Decor",
          description: "Full-venue transformation with a custom theme, premium florals, and complete lighting design.",
          inclusionPool: [
            "Full venue theme design",
            "Premium real flower installations",
            "Customized mandap with drapery",
            "Complete ambient and structural lighting",
            "Haldi/mehendi theme setup included",
            "Dedicated on-site decor team",
          ],
          priceFactor: 0.9,
        },
        {
          name: "Royal Palace Theme Decor",
          description: "A grand royal/palace-themed transformation with premium florals and structural lighting across the venue.",
          inclusionPool: [
            "Royal/palace theme design",
            "Premium real flower installations",
            "Customized mandap with heavy drapery",
            "Complete structural lighting design",
            "Dedicated on-site decor team",
          ],
          priceFactor: 0.95,
        },
      ],
    ],
  },
  caterers: {
    tierGroups: [
      [
        {
          name: "Classic Sadya",
          description: "Traditional Kerala sadya served on banana leaf with standard dish count.",
          inclusionPool: [
            "Traditional banana leaf sadya",
            "12-14 dish spread",
            "Uniformed serving staff",
            "Basic cutlery and water bottles",
          ],
          priceFactor: 0.3,
        },
        {
          name: "Traditional Feast Basic",
          description: "A traditional Kerala/Christian feast spread for a single function, plated or on banana leaf.",
          inclusionPool: [
            "Traditional feast, 10-12 dishes",
            "Uniformed serving staff",
            "Mineral water bottles",
          ],
          priceFactor: 0.28,
        },
      ],
      [
        {
          name: "Premium Multi-Cuisine Buffet",
          description: "Buffet spread combining Kerala favorites with North Indian and Chinese counters.",
          inclusionPool: [
            "Multi-cuisine buffet spread",
            "Live dosa/chat counter",
            "Uniformed service staff",
            "Welcome drinks",
            "Crockery and cutlery included",
          ],
          priceFactor: 0.55,
        },
        {
          name: "Fusion Buffet Experience",
          description: "A buffet mixing Continental and Pan-Asian counters alongside Kerala classics.",
          inclusionPool: [
            "Multi-cuisine buffet with fusion counters",
            "Live chat/BBQ counter",
            "Uniformed service staff",
            "Welcome drinks",
          ],
          priceFactor: 0.52,
        },
      ],
      [
        {
          name: "Luxury Feast Package",
          description: "Elaborate multi-cuisine spread with multiple live counters and premium service staff.",
          inclusionPool: [
            "Elaborate multi-cuisine spread",
            "3+ live counters (BBQ, dessert, mocktail)",
            "Premium uniformed staff",
            "Welcome drinks and mocktails",
            "Full crockery, cutlery, and cleanup",
            "Dedicated catering manager on-site",
          ],
          priceFactor: 0.9,
        },
        {
          name: "Grand Wedding Banquet",
          description: "Premium multi-cuisine banquet with extensive live counters and a dedicated on-site catering team.",
          inclusionPool: [
            "Grand multi-cuisine banquet spread",
            "4+ live counters",
            "Premium uniformed staff",
            "Mocktail bar and welcome drinks",
            "Dedicated catering manager on-site",
          ],
          priceFactor: 0.95,
        },
      ],
    ],
  },
  "bridal-wear": {
    tierGroups: [
      [
        {
          name: "Ready-to-Wear Collection",
          description: "Curated off-the-shelf bridal outfits available for immediate trial and purchase.",
          inclusionPool: [
            "Ready-to-wear bridal outfit",
            "Basic in-house alterations",
            "Styling consultation",
          ],
          priceFactor: 0.3,
        },
        {
          name: "Rental Bridal Collection",
          description: "Rental bridal lehengas and sarees for brides who prefer not to buy.",
          inclusionPool: [
            "Rental bridal outfit",
            "Basic alterations for fit",
            "Styling consultation",
          ],
          priceFactor: 0.24,
        },
      ],
      [
        {
          name: "Custom Bridal Tailoring",
          description: "Bespoke bridal lehenga or saree tailored to measurements with fitting sessions.",
          inclusionPool: [
            "Custom tailored bridal outfit",
            "2 fitting sessions",
            "In-house alterations",
            "Fabric and design consultation",
          ],
          priceFactor: 0.55,
        },
        {
          name: "Kanchipuram Bridal Saree Package",
          description: "Custom Kanchipuram bridal saree selection with draping guidance and matching blouse stitching.",
          inclusionPool: [
            "Kanchipuram bridal saree",
            "Matching blouse stitching",
            "Draping guidance session",
            "In-house alterations",
          ],
          priceFactor: 0.5,
        },
      ],
      [
        {
          name: "Signature Designer Bridal",
          description: "Fully bespoke designer bridal ensemble with premium fabric and hand embroidery work.",
          inclusionPool: [
            "Fully bespoke designer outfit",
            "Premium fabric and handwork",
            "Multiple fitting sessions",
            "Dedicated design consultation",
            "Complimentary minor alterations post-delivery",
          ],
          priceFactor: 0.9,
        },
        {
          name: "Couture Bridal Trousseau",
          description: "Multi-outfit bridal trousseau covering ceremony and reception looks with premium handwork.",
          inclusionPool: [
            "2-outfit bridal trousseau",
            "Premium fabric and hand embroidery",
            "Multiple fitting sessions",
            "Dedicated design consultation",
          ],
          priceFactor: 0.95,
        },
      ],
    ],
  },
  "groom-wear": {
    tierGroups: [
      [
        {
          name: "Off-the-Shelf Sherwani",
          description: "Ready-made sherwani or suit selection with in-house alterations.",
          inclusionPool: [
            "Ready-made sherwani/suit",
            "Basic alterations",
            "Styling consultation",
          ],
          priceFactor: 0.3,
        },
        {
          name: "Rental Sherwani Package",
          description: "Rental sherwani or suit for grooms who prefer not to buy, with fitting adjustments.",
          inclusionPool: [
            "Rental sherwani/suit",
            "Fitting adjustments",
            "Styling consultation",
          ],
          priceFactor: 0.24,
        },
      ],
      [
        {
          name: "Custom Tailored Set",
          description: "Bespoke tailored sherwani or suit with fabric selection and 2 fitting sessions.",
          inclusionPool: [
            "Custom tailored outfit",
            "Fabric selection",
            "2 fitting sessions",
            "Matching accessories included",
          ],
          priceFactor: 0.55,
        },
        {
          name: "Indo-Western Fusion Set",
          description: "Custom-tailored Indo-western fusion outfit with fabric and design consultation.",
          inclusionPool: [
            "Custom tailored fusion outfit",
            "Design consultation",
            "2 fitting sessions",
            "Pocket square and cufflinks included",
          ],
          priceFactor: 0.52,
        },
      ],
      [
        {
          name: "Premium Designer Groom Package",
          description: "Fully bespoke designer sherwani with premium fabric, accessories, and priority delivery.",
          inclusionPool: [
            "Bespoke designer sherwani",
            "Premium imported fabric",
            "Full accessory set (turban, mojaris, brooch)",
            "Multiple fittings",
            "Priority delivery timeline",
          ],
          priceFactor: 0.9,
        },
        {
          name: "Signature Kasavu Groom Ensemble",
          description: "Premium traditional Kasavu mundu and jubba set paired with designer accessories.",
          inclusionPool: [
            "Premium Kasavu mundu and jubba set",
            "Designer Nehru jacket",
            "Full accessory set (turban, mojaris)",
            "Multiple fittings",
            "Priority delivery timeline",
          ],
          priceFactor: 0.95,
        },
      ],
    ],
  },
  jewellery: {
    tierGroups: [
      [
        {
          name: "Bridal Rental Set",
          description: "Rental bridal jewellery set for the wedding day with deposit-based terms.",
          inclusionPool: [
            "Rental bridal jewellery set",
            "Necklace, earrings, and maang tikka",
            "Refundable deposit terms",
          ],
          priceFactor: 0.25,
        },
        {
          name: "Silver Bridal Starter Set",
          description: "Fine silver bridal jewellery set, a lighter-weight alternative to full gold sets.",
          inclusionPool: [
            "Fine silver bridal set",
            "Necklace and earrings pair",
            "Purity certification",
          ],
          priceFactor: 0.22,
        },
      ],
      [
        {
          name: "Classic Bridal Gold Set",
          description: "BIS hallmarked gold bridal set with matching earrings and bangles.",
          inclusionPool: [
            "BIS hallmarked gold set",
            "Matching earrings and bangles",
            "Certificate of purity",
          ],
          priceFactor: 0.55,
        },
        {
          name: "Designer Fashion Jewellery Set",
          description: "Designer imitation bridal set styled to look like traditional gold, at a fraction of the cost.",
          inclusionPool: [
            "Designer imitation bridal set",
            "Matching earrings and choker",
            "Gemstone consultation included",
          ],
          priceFactor: 0.5,
        },
      ],
      [
        {
          name: "Signature Antique Collection",
          description: "Premium antique/temple jewellery set with certified stones and custom design option.",
          inclusionPool: [
            "Antique temple-style set",
            "IGI/GIA certified stones",
            "Custom design consultation",
            "Complimentary resizing",
          ],
          priceFactor: 0.9,
        },
        {
          name: "Custom Diamond Bridal Set",
          description: "Fully custom-designed diamond bridal set with certified stones and a dedicated design consultation.",
          inclusionPool: [
            "Custom-designed diamond set",
            "IGI/GIA certified diamonds",
            "One-on-one design consultation",
            "Old gold exchange assistance",
          ],
          priceFactor: 0.95,
        },
      ],
    ],
  },
  "cakes-desserts": {
    tierGroups: [
      [
        {
          name: "Single Tier Delight",
          description: "A single-tier customized wedding cake with standard flavor options.",
          inclusionPool: [
            "Single-tier cake",
            "Standard flavor selection",
            "Basic fondant design",
            "Self pickup",
          ],
          priceFactor: 0.25,
        },
        {
          name: "Classic Cupcake Tower",
          description: "A tiered cupcake tower with standard flavors, ideal for smaller functions.",
          inclusionPool: [
            "3-tier cupcake tower",
            "Standard flavor selection",
            "Basic decoration",
            "Self pickup",
          ],
          priceFactor: 0.22,
        },
      ],
      [
        {
          name: "Multi-Tier Celebration Cake",
          description: "Two to three-tier themed wedding cake with custom flavors and on-site delivery.",
          inclusionPool: [
            "2-3 tier custom cake",
            "Choice of gourmet flavors",
            "Themed fondant decoration",
            "Refrigerated van delivery",
          ],
          priceFactor: 0.55,
        },
        {
          name: "Signature Flavor Celebration Cake",
          description: "Custom gourmet-flavored tiered cake with themed decoration and eggless/vegan options available.",
          inclusionPool: [
            "2-3 tier gourmet cake",
            "Eggless / vegan options",
            "Custom theme decoration",
            "On-site delivery",
          ],
          priceFactor: 0.5,
        },
      ],
      [
        {
          name: "Grand Dessert Table",
          description: "Multi-tier centerpiece cake plus a full dessert table with cupcakes and favors.",
          inclusionPool: [
            "Multi-tier centerpiece cake",
            "Dessert table with cupcake tower",
            "Custom favor boxes",
            "On-site delivery and setup",
            "Complimentary tasting session",
          ],
          priceFactor: 0.9,
        },
        {
          name: "Luxury Grazing & Cake Experience",
          description: "Showpiece tiered cake paired with a full grazing dessert table and personalized favors for every guest.",
          inclusionPool: [
            "Showpiece multi-tier cake",
            "Grazing dessert platter table",
            "Personalized favor boxes for guests",
            "Refrigerated delivery and on-site setup",
            "Complimentary tasting box",
          ],
          priceFactor: 0.95,
        },
      ],
    ],
  },
  "artists-djs": {
    tierGroups: [
      [
        {
          name: "Solo DJ Package",
          description: "Solo DJ performance with basic sound console for a single function.",
          inclusionPool: [
            "Solo DJ, 4-hour set",
            "Basic sound console",
            "Bollywood and regional mixes",
          ],
          priceFactor: 0.3,
        },
        {
          name: "Evening Reception DJ",
          description: "A 4-hour DJ set tailored for the reception, with a mix of retro and current hits.",
          inclusionPool: [
            "Solo DJ, 4-hour reception set",
            "Basic sound console",
            "Retro and current hit mixes",
          ],
          priceFactor: 0.28,
        },
      ],
      [
        {
          name: "DJ + Live Percussion",
          description: "DJ performance combined with live chenda melam or percussion for the baraat/entry.",
          inclusionPool: [
            "DJ, full event (up to 6 hours)",
            "Live percussion ensemble for entry",
            "Full sound and stage lights",
            "Emcee announcements",
          ],
          priceFactor: 0.6,
        },
        {
          name: "DJ + Anchor Combo",
          description: "DJ performance paired with a professional emcee to host and run the event flow.",
          inclusionPool: [
            "DJ, full event (up to 6 hours)",
            "Professional emcee/anchor",
            "Full sound and stage lights",
            "Multi-language announcements",
          ],
          priceFactor: 0.58,
        },
      ],
      [
        {
          name: "Full Entertainment Package",
          description: "DJ, live band, and emcee combo with full sound, lighting rig, and multi-genre playlists.",
          inclusionPool: [
            "DJ + live band ensemble",
            "Professional emcee/anchor",
            "Full sound + stage lighting rig",
            "Multi-genre custom playlist",
            "Dance floor lighting effects",
          ],
          priceFactor: 0.9,
        },
        {
          name: "Grand Sangeet Entertainment",
          description: "Full-scale entertainment lineup with DJ, dance troupe, and emcee for a high-energy sangeet or reception.",
          inclusionPool: [
            "DJ + choreographed dance troupe",
            "Professional emcee/anchor",
            "Full sound + stage lighting rig",
            "Custom multi-genre playlist",
            "Fog and dance floor effects",
          ],
          priceFactor: 0.95,
        },
      ],
    ],
  },
  "cocktail-bar-services": {
    tierGroups: [
      [
        {
          name: "Mocktail Bar Package",
          description: "Non-alcoholic mocktail bar setup with a bartender and custom menu.",
          inclusionPool: [
            "Mobile mocktail bar setup",
            "1 mixologist",
            "Custom mocktail menu",
            "Basic glassware included",
          ],
          priceFactor: 0.3,
        },
        {
          name: "Welcome Drinks Counter",
          description: "A dedicated mocktail counter for welcome drinks as guests arrive.",
          inclusionPool: [
            "Welcome mocktail counter",
            "1 mixologist",
            "2 signature mocktail flavors",
            "Basic glassware included",
          ],
          priceFactor: 0.26,
        },
      ],
      [
        {
          name: "Signature Cocktail Bar",
          description: "Professional bartending with a custom signature cocktail menu (client-supplied alcohol).",
          inclusionPool: [
            "2 professional bartenders",
            "Custom signature cocktail menu",
            "Fresh mixers and garnishes",
            "Full glassware and barware",
          ],
          priceFactor: 0.6,
        },
        {
          name: "Mobile Bar Experience",
          description: "Full mobile bar setup with professional bartenders and a curated cocktail menu.",
          inclusionPool: [
            "Mobile bar cart setup",
            "2 professional bartenders",
            "Curated cocktail menu",
            "Custom printed menu cards",
          ],
          priceFactor: 0.58,
        },
      ],
      [
        {
          name: "Premium Full Bar Experience",
          description: "Full bar package with flair bartending show, premium consumables, and license support.",
          inclusionPool: [
            "3+ bartenders with flair show",
            "Full package incl. mixers where permitted",
            "Premium ice and garnishes",
            "Custom printed menu cards",
            "Assistance with event liquor license",
          ],
          priceFactor: 0.9,
        },
        {
          name: "Grand Bar & Flair Show",
          description: "Multi-station bar with a flair bartending performance and full liquor license assistance.",
          inclusionPool: [
            "4+ bartenders across multiple stations",
            "Flair bartending performance",
            "Full package incl. mixers where permitted",
            "Premium glassware and garnishes",
            "One-day liquor license assistance",
          ],
          priceFactor: 0.95,
        },
      ],
    ],
  },
  "wedding-cars-luxury-rentals": {
    tierGroups: [
      [
        {
          name: "Classic Sedan Package",
          description: "Luxury sedan rental for the wedding day with a uniformed chauffeur.",
          inclusionPool: [
            "1 luxury sedan, 8-hour package",
            "Uniformed chauffeur",
            "Basic ribbon decoration",
            "Fuel included",
          ],
          priceFactor: 0.3,
        },
        {
          name: "Bridal Entry Car",
          description: "A single luxury car for the bride/groom's entry, decorated for the occasion.",
          inclusionPool: [
            "1 luxury sedan, 4-hour package",
            "Uniformed chauffeur",
            "Floral ribbon decoration",
          ],
          priceFactor: 0.26,
        },
      ],
      [
        {
          name: "Premium Convoy Package",
          description: "Lead luxury car plus SUV/van support for family, with full-day availability.",
          inclusionPool: [
            "1 luxury car + 1 SUV/van",
            "Full-day (24 hour) availability",
            "Uniformed chauffeurs",
            "Toll and permits included",
            "Floral decoration",
          ],
          priceFactor: 0.6,
        },
        {
          name: "Family Fleet Package",
          description: "A small convoy of SUVs and sedans to move the wedding party and close family together.",
          inclusionPool: [
            "1 luxury sedan + 2 SUVs/vans",
            "8-hour package",
            "Uniformed chauffeurs for all vehicles",
            "Basic decoration",
          ],
          priceFactor: 0.58,
        },
      ],
      [
        {
          name: "Signature Fleet Experience",
          description: "Vintage or supercar entry vehicle with a backup vehicle assurance and full-day convoy support.",
          inclusionPool: [
            "Vintage/supercar entry vehicle",
            "Backup vehicle assurance",
            "Multi-vehicle convoy for guests",
            "Uniformed chauffeurs for all vehicles",
            "Premium decoration package",
          ],
          priceFactor: 0.9,
        },
        {
          name: "Vintage Grand Entry Package",
          description: "A vintage or classic car centerpiece for the entry, backed by a full guest convoy.",
          inclusionPool: [
            "Vintage/classic car for entry",
            "Backup vehicle assurance",
            "Guest convoy (SUVs/vans)",
            "Toll and state permits included",
            "Premium decoration package",
          ],
          priceFactor: 0.95,
        },
      ],
    ],
  },
  "event-planners": {
    tierGroups: [
      [
        {
          name: "Day-of Coordination",
          description: "On-the-day execution management to run the event smoothly once plans are finalized.",
          inclusionPool: [
            "On-the-day execution management",
            "Vendor coordination on event day",
            "Timeline and itinerary management",
          ],
          priceFactor: 0.25,
        },
        {
          name: "Event-Day Management",
          description: "A dedicated coordinator to manage vendors and timelines on the wedding day itself.",
          inclusionPool: [
            "Dedicated on-site coordinator",
            "Vendor check-in and coordination",
            "Run-of-show timeline management",
          ],
          priceFactor: 0.22,
        },
      ],
      [
        {
          name: "Partial Planning & Styling",
          description: "Consultation and vendor scouting support combined with theme/aesthetic design guidance.",
          inclusionPool: [
            "Vendor scouting and negotiation",
            "Theme and aesthetic design",
            "Budget management support",
            "On-the-day coordination",
          ],
          priceFactor: 0.55,
        },
        {
          name: "Consultation & Vendor Sourcing",
          description: "Hands-on vendor sourcing and contract negotiation with periodic planning check-ins.",
          inclusionPool: [
            "Vendor scouting and contract negotiation",
            "Monthly planning check-ins",
            "Budget tracking support",
            "On-the-day coordination",
          ],
          priceFactor: 0.5,
        },
      ],
      [
        {
          name: "Full Wedding Planning",
          description: "End-to-end planning across all functions, including destination coordination if needed.",
          inclusionPool: [
            "Full end-to-end planning",
            "Complete vendor sourcing and contracts",
            "Guest hospitality and RSVP management",
            "Logistics and transport planning",
            "Stage management across all functions",
            "Destination wedding coordination",
          ],
          priceFactor: 0.9,
        },
        {
          name: "Signature Destination Wedding Planning",
          description: "Complete planning and on-ground execution for multi-day destination weddings.",
          inclusionPool: [
            "End-to-end destination wedding planning",
            "Travel and accommodation logistics for guests",
            "Complete vendor sourcing and contracts",
            "Multi-day itinerary and stage management",
            "On-ground execution team",
          ],
          priceFactor: 0.95,
        },
      ],
    ],
  },
};

function buildPackagesForVendor(
  rng: () => number,
  categorySlug: string,
  priceMin: number,
  priceMax: number,
): Array<{ name: string; description: string; price: number; inclusions: string[] }> {
  const plan = PACKAGE_PLANS[categorySlug];
  if (!plan) throw new Error(`No package plan defined for category ${categorySlug}`);

  const numTiers = plan.tierGroups.length >= 3 && rng() < 0.25 ? 2 : plan.tierGroups.length;
  const chosenGroups = numTiers === 2 ? [plan.tierGroups[0], plan.tierGroups[plan.tierGroups.length - 1]] : plan.tierGroups;

  const band = priceMax - priceMin;
  const roundNearest = priceMax >= 100000 ? 500 : 100;

  return chosenGroups.map((group) => {
    const tier = pick(rng, group as PackageTierPool[]);
    const rawPrice = priceMin + band * tier.priceFactor + (rng() - 0.5) * band * 0.08;
    const price = Math.max(roundNearest, round(rawPrice, roundNearest));
    const inclusions = pickN(rng, tier.inclusionPool, 3, Math.min(5, tier.inclusionPool.length));
    return { name: tier.name, description: tier.description, price, inclusions };
  });
}

// ---------------------------------------------------------------------------
// CategoryAttribute answer generators, keyed by attribute `key` per category.
// Falls back to a generic per-dataType answer if a key isn't special-cased,
// so the script never crashes on an unexpected attribute, but every
// category's real attributes below ARE special-cased for realism.
// ---------------------------------------------------------------------------
type AttrAnswerCtx = {
  rng: () => number;
  priceMin: number;
  priceMax: number;
  businessName: string;
};

type AttrDef = {
  id: string;
  key: string;
  label: string;
  dataType: keyof typeof AttributeDataType;
  options: string[] | null;
  isRequired: boolean;
};

// Returns the value in the *input* shape expected by the same switch as
// vendor.service.ts's setAttributeValues, which we then map to the correct
// column ourselves (mirroring that function's logic exactly).
function genericAnswer(ctx: AttrDef, actx: AttrEvalCtx): unknown {
  switch (ctx.dataType) {
    case "TEXT":
      return "Details available on request";
    case "TEXTAREA":
      return "Please contact us directly for full details.";
    case "SELECT":
      return pick(actx.rng, ctx.options ?? ["Yes"]);
    case "MULTI_SELECT":
      return pickN(actx.rng, ctx.options ?? ["Yes"], 1, Math.min(3, (ctx.options ?? ["Yes"]).length));
    case "NUMBER":
      return round(actx.priceMin * 0.05 + actx.rng() * actx.priceMin * 0.1, 50);
    case "NUMBER_RANGE": {
      const min = 50 + Math.floor(actx.rng() * 100);
      const max = min + 100 + Math.floor(actx.rng() * 200);
      return { min, max };
    }
    case "BOOLEAN":
      return actx.rng() > 0.4;
    case "TIME":
      return { time: pick(actx.rng, ["22:00", "22:30", "23:00", "23:30"]) };
    default:
      return null;
  }
}

type AttrEvalCtx = AttrAnswerCtx;

// Per-category, per-key special-cased answer generators. Each function
// receives the attribute (for its real `options` list) and context (rng,
// vendor price band) and returns a value in the same shape
// vendor.service.ts expects for that dataType.
const ATTRIBUTE_ANSWERS: Record<string, Record<string, (attr: AttrDef, ctx: AttrEvalCtx) => unknown>> = {
  "artists-djs": {
    performance_category: (a, c) => pickN(c.rng, a.options ?? [], 1, 3),
    music_genres_specialization: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    sound_lighting_equipment_included: (a, c) => pick(c.rng, a.options ?? []),
    performance_duration_per_event: (a, c) => pick(c.rng, a.options ?? []),
    language_fluency_emcees: (a, c) => pickN(c.rng, a.options ?? [], 1, 3),
  },
  "bridal-wear": {
    outfit_categories_offered: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    business_model: (a, c) => pickN(c.rng, a.options ?? [], 1, 2),
    customization_lead_time: (a, c) => pick(c.rng, a.options ?? []),
    fitting_alteration_support: (a, c) => pick(c.rng, a.options ?? []),
    appointment_policy: (a, c) => pick(c.rng, a.options ?? []),
    starting_price_bridal_lehenga_gown: (_a, c) => round(c.priceMin * 0.8 + c.rng() * c.priceMin * 0.3, 500),
    starting_price_kanchipuram_saree: (_a, c) => round(c.priceMin * 0.4 + c.rng() * c.priceMin * 0.3, 500),
  },
  "cakes-desserts": {
    specialties_offered: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    flavors_dietary_customizations: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    cake_tasting_session: (a, c) => pick(c.rng, a.options ?? []),
    delivery_venue_setup_service: (a, c) => pick(c.rng, a.options ?? []),
    notice_period_required: (a, c) => pick(c.rng, a.options ?? []),
    price_per_kg_tier_starting_rate: (_a, c) => `₹${round(700 + c.rng() * 500, 50)}/kg onwards`,
  },
  caterers: {
    catering_service_types: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    cuisine_specialties: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    dietary_options_offered: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    guest_count_range_handled: (_a, c) => {
      const min = 100 + Math.floor(c.rng() * 100);
      const max = min + 200 + Math.floor(c.rng() * 400);
      return { min, max };
    },
    per_plate_rate_veg_sadya: (_a, c) => round(350 + c.rng() * 400, 25),
    per_plate_rate_non_veg: (_a, c) => round(550 + c.rng() * 500, 25),
    inclusions_in_per_plate_rate: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    live_counters_offered: (a, c) => pickN(c.rng, a.options ?? [], 1, 3),
  },
  "cocktail-bar-services": {
    service_type_offered: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    liquor_license_support: (a, c) => pick(c.rng, a.options ?? []),
    consumables_included: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    alcohol_supply_policy: (a, c) => pick(c.rng, a.options ?? []),
    bartenders_per_100_guests: (_a, c) => Math.round(2 + c.rng() * 3),
  },
  decorators: {
    decor_services_offered: (a, c) => pickN(c.rng, a.options ?? [], 3, 5),
    decoration_style: (a, c) => pickN(c.rng, a.options ?? [], 1, 3),
    customization_availability: (a, c) => pick(c.rng, a.options ?? []),
    real_vs_artificial_flower_usage: (a, c) => pick(c.rng, a.options ?? []),
    inhouse_lighting_sound_support: (_a, c) => c.rng() > 0.35,
    minimum_event_budget_handled: (_a, c) => round(c.priceMin * 0.7, 500),
  },
  "event-planners": {
    planning_scope: (a, c) => pickN(c.rng, a.options ?? [], 1, 3),
    services_covered_in_planning: (a, c) => pickN(c.rng, a.options ?? [], 3, 5),
    fee_model_billing_structure: (a, c) => pick(c.rng, a.options ?? []),
    experience_destination_weddings: (a, c) => pickN(c.rng, a.options ?? [], 1, 3),
    inhouse_vs_vendor_sourcing: (a, c) => pick(c.rng, a.options ?? []),
  },
  "groom-wear": {
    groom_wear_offered: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    service_type: (a, c) => pickN(c.rng, a.options ?? [], 1, 2),
    accessories_available: (a, c) => pickN(c.rng, a.options ?? [], 1, 3),
    stitching_delivery_timeline: (a, c) => pick(c.rng, a.options ?? []),
    starting_price_suit_tuxedo: (_a, c) => round(c.priceMin * 0.7 + c.rng() * c.priceMin * 0.3, 500),
    starting_price_sherwani_set: (_a, c) => round(c.priceMin * 0.9 + c.rng() * c.priceMin * 0.4, 500),
  },
  jewellery: {
    jewellery_categories: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    services_provided: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    certifications_purity: (a, c) => pickN(c.rng, a.options ?? [], 1, 3),
    rental_deposit_terms: (_a, _c) =>
      "Refundable security deposit equal to 50% of item value, refunded within 3 working days of return in original condition.",
    custom_design_lead_time: (a, c) => pick(c.rng, a.options ?? []),
  },
  "makeup-artists": {
    makeup_specialization: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    service_location_flexibility: (a, c) => pick(c.rng, a.options ?? []),
    brands_products_used: (_a, c) => pick(c.rng, [
      "MAC, Huda Beauty, Kryolan",
      "NARS, Charlotte Tilbury, Huda Beauty",
      "Kryolan, Bobbi Brown, MAC",
      "Estee Lauder, MAC, Inglot",
    ]),
    trial_makeup_availability: (a, c) => pick(c.rng, a.options ?? []),
    hair_styling_draping_inclusions: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    family_guest_makeup_capacity: (_a, c) => pick(c.rng, ["Up to 5 guests per event", "Up to 8 guests per event", "Up to 10 guests per event"]),
    travel_outstation_charges_policy: (_a, _c) =>
      "Outstation travel charged at actuals plus accommodation for events beyond 25 km from the studio.",
  },
  "mehendi-artists": {
    mehendi_style_specialization: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    henna_material_used: (a, c) => pick(c.rng, a.options ?? []),
    bridal_mehendi_package_pricing: (_a, c) => round(c.priceMin * 0.6 + c.rng() * c.priceMin * 0.3, 100),
    guest_family_mehendi_pricing: (_a, c) => round(150 + c.rng() * 250, 25),
    speed_capacity_guests_per_hour: (_a, c) => pick(c.rng, ["8-10 guests per hour", "10-12 guests per hour", "6-8 guests per hour"]),
    minimum_order_value_outstation: (_a, c) => round(c.priceMin * 0.5, 500),
  },
  "photography-videography": {
    services_offered: (a, c) => pickN(c.rng, a.options ?? [], 3, 5),
    photography_style_specialty: (a, c) => pickN(c.rng, a.options ?? [], 1, 3),
    standard_delivery_time_photos: (a, c) => pick(c.rng, a.options ?? []),
    standard_delivery_time_video: (a, c) => pick(c.rng, a.options ?? []),
    deliverables_included: (a, c) => pickN(c.rng, a.options ?? [], 3, 5),
    team_size_standard: (a, c) => pick(c.rng, a.options ?? []),
    album_specs: (_a, c) => pick(c.rng, ["40-page hardbound album", "60-page premium album", "30-page leather album"]),
    equipment_backups: (a, c) => pickN(c.rng, a.options ?? [], 1, 3),
  },
  venues: {
    venue_type: (a, c) => pickN(c.rng, a.options ?? [], 1, 2),
    floating_guest_capacity: (_a, c) => round(300 + c.rng() * 700, 50),
    seating_guest_capacity: (_a, c) => round(150 + c.rng() * 350, 25),
    halls_spaces_count: (_a, c) => pick(c.rng, ["2 halls available", "3 halls available", "1 main hall + lawn", "4 halls available"]),
    ac_climate_control_status: (a, c) => pick(c.rng, a.options ?? []),
    catering_policy: (a, c) => pick(c.rng, a.options ?? []),
    alcohol_bar_policy: (a, c) => pick(c.rng, a.options ?? []),
    parking_capacity: (_a, c) => Math.round(50 + c.rng() * 150),
    changing_green_rooms: (_a, c) => pick(c.rng, ["2 green rooms", "3 green rooms with attached washrooms", "1 bridal suite + 1 groom room"]),
    power_backup: (a, c) => pick(c.rng, a.options ?? []),
    curfew_cutoff_time: (_a, c) => ({ time: pick(c.rng, ["22:00", "22:30", "23:00", "23:30"]) }),
    per_plate_cost_veg: (_a, c) => round(400 + c.rng() * 300, 25),
    per_plate_cost_non_veg: (_a, c) => round(600 + c.rng() * 400, 25),
    venue_rental_fee_per_day: (_a, c) => round(c.priceMin * 0.8 + c.rng() * c.priceMin * 0.4, 1000),
  },
  "wedding-cars-luxury-rentals": {
    fleet_categories_available: (a, c) => pickN(c.rng, a.options ?? [], 1, 3),
    rental_package_duration: (a, c) => pick(c.rng, a.options ?? []),
    inclusions_with_vehicle: (a, c) => pickN(c.rng, a.options ?? [], 2, 4),
    backup_vehicle_assurance: (_a, c) => c.rng() > 0.3,
    outstation_intercity_travel_allowed: (a, c) => pick(c.rng, a.options ?? []),
  },
};

// Converts a generated "input" value into the correct VendorAttributeValue
// column writes, mirroring vendor.service.ts's setAttributeValues switch
// exactly so seeded rows are indistinguishable from ones a real vendor saved
// through the app.
function toAttributeValueRow(
  vendorId: string,
  attribute: AttrDef,
  value: unknown,
): Prisma.VendorAttributeValueCreateManyInput {
  const base: Prisma.VendorAttributeValueCreateManyInput = {
    vendorId,
    attributeId: attribute.id,
  };
  switch (attribute.dataType) {
    case "TEXT":
    case "TEXTAREA":
    case "SELECT":
      return { ...base, valueText: value as string };
    case "NUMBER":
      return { ...base, valueNumber: new Prisma.Decimal(value as number) };
    case "NUMBER_RANGE":
    case "TIME":
    case "TIME_RANGE":
      return { ...base, valueJson: value as Prisma.InputJsonValue };
    case "BOOLEAN":
      return { ...base, valueBoolean: value as boolean };
    case "MULTI_SELECT":
      return { ...base, valueOptions: value as string[] };
    default:
      throw new Error(`Unhandled dataType ${String(attribute.dataType)}`);
  }
}

async function main() {
  console.log("Loading categories, attributes, and vendors...");

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });

  const attributesRaw = await prisma.categoryAttribute.findMany({
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
  });
  const attributesByCategoryId = new Map<string, AttrDef[]>();
  for (const attr of attributesRaw) {
    const def: AttrDef = {
      id: attr.id,
      key: attr.key,
      label: attr.label,
      dataType: attr.dataType,
      options: (attr.options as string[] | null) ?? null,
      isRequired: attr.isRequired,
    };
    const list = attributesByCategoryId.get(attr.categoryId) ?? [];
    list.push(def);
    attributesByCategoryId.set(attr.categoryId, list);
  }

  const vendors = await prisma.vendor.findMany({
    select: {
      id: true,
      businessName: true,
      profile: { select: { priceRangeMin: true, priceRangeMax: true, website: true, businessHours: true, socialLinks: true } },
      categories: { where: { isPrimary: true }, select: { categoryId: true } },
      media: { where: { status: "READY" }, select: { id: true }, orderBy: { sortOrder: "asc" }, take: 5 },
    },
  });

  console.log(`Loaded ${vendors.length} vendors, ${attributesRaw.length} attributes across ${categories.length} categories.`);

  let packagesCreated = 0;
  let attributeValuesCreated = 0;
  let vendorsUpdated = 0;
  let vendorsMissingCategory = 0;

  for (const vendor of vendors) {
    const primaryCategoryId = vendor.categories[0]?.categoryId;
    if (!primaryCategoryId) {
      vendorsMissingCategory++;
      console.warn(`Vendor ${vendor.id} (${vendor.businessName}) has no primary category — skipping.`);
      continue;
    }
    const category = categories.find((c) => c.id === primaryCategoryId);
    if (!category) {
      vendorsMissingCategory++;
      continue;
    }
    const categorySlug = category.slug;

    const priceMin = vendor.profile?.priceRangeMin ? Number(vendor.profile.priceRangeMin) : 20000;
    const priceMax = vendor.profile?.priceRangeMax ? Number(vendor.profile.priceRangeMax) : Math.max(priceMin * 3, 60000);

    const rng = mulberry32(hashSeed(vendor.id));

    // ---- 1. Packages ----
    const packageDefs = buildPackagesForVendor(rng, categorySlug, priceMin, priceMax);
    const mediaIds = vendor.media.map((m) => m.id);
    await prisma.package.createMany({
      data: packageDefs.map((pkg, idx) => ({
        vendorId: vendor.id,
        name: pkg.name,
        description: pkg.description,
        price: new Prisma.Decimal(pkg.price),
        currency: "INR",
        inclusions: pkg.inclusions,
        imageMediaId: mediaIds.length > 0 ? (mediaIds[idx % mediaIds.length] ?? null) : null,
        sortOrder: idx,
        isActive: true,
      })),
    });
    packagesCreated += packageDefs.length;

    // ---- 2. Profile fields: website, businessHours, socialLinks ----
    await prisma.vendorProfile.update({
      where: { vendorId: vendor.id },
      data: {
        website: makeWebsite(rng, vendor.businessName),
        businessHours: makeBusinessHours(rng, categorySlug),
        socialLinks: makeSocialLinks(rng, vendor.businessName),
      },
    });
    vendorsUpdated++;

    // ---- 3. CategoryAttribute answers ----
    const attrs = attributesByCategoryId.get(primaryCategoryId) ?? [];
    const answerFns = ATTRIBUTE_ANSWERS[categorySlug] ?? {};
    const ctx: AttrEvalCtx = { rng, priceMin, priceMax, businessName: vendor.businessName };

    const rows: Prisma.VendorAttributeValueCreateManyInput[] = [];
    for (const attr of attrs) {
      // Optional attributes: skip ~25% of the time for realism (mostly-filled
      // vs fully-filled profiles). Required attributes are always answered.
      if (!attr.isRequired && rng() < 0.25) continue;

      const fn = answerFns[attr.key];
      const value = fn ? fn(attr, ctx) : genericAnswer(attr, ctx);
      if (value === null || value === undefined) continue;
      rows.push(toAttributeValueRow(vendor.id, attr, value));
    }

    if (rows.length > 0) {
      await prisma.vendorAttributeValue.createMany({ data: rows, skipDuplicates: true });
      attributeValuesCreated += rows.length;
    }
  }

  console.log("\n=== Seed complete ===");
  console.log(`Vendors processed: ${vendors.length}`);
  console.log(`Vendors missing primary category (skipped): ${vendorsMissingCategory}`);
  console.log(`Vendor profiles updated (website/hours/social): ${vendorsUpdated}`);
  console.log(`Packages created: ${packagesCreated}`);
  console.log(`Vendor attribute values created: ${attributeValuesCreated}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
