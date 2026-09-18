/**
 * Large realistic demo-data seed for the WedHub test server.
 *
 * Run standalone AFTER `npm run db:seed` (master data: categories, locations,
 * roles, plans) has already populated a freshly-wiped database:
 *
 *   npx tsx prisma/seed-demo-data.ts
 *
 * Creates:
 *  - ~150-200 APPROVED vendors, 10-15 per each of the 14 existing categories,
 *    each with a realistic distinct business name, description, pricing,
 *    a real city (from the existing Location CITY rows), and 4-5 real
 *    portfolio photos uploaded through the REAL R2 + BullMQ media pipeline
 *    (same object-key convention/DB-row shape as a genuine vendor upload —
 *    see media.service.ts's createUploadRequest/confirmUpload).
 *  - ~40 END_USER (couple) accounts, ACTIVE + email-verified.
 *  - ~120 reviews across vendors, varied ratings/text, authored by the
 *    couple accounts, with Vendor.averageRating/reviewCount recomputed
 *    exactly like review.repository.ts's recalculateVendorRating.
 *
 * Idempotency: NOT idempotent by design — intended to run once against a
 * freshly wiped+reseeded database, per server.md's wipe procedure. Re-running
 * against a non-empty DB will create duplicate vendors/users (emails are
 * unique so a second run will fail fast on the first couple-account insert
 * rather than silently duplicating).
 */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { hashPassword } from "../src/common/utils/password.util";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// R2 client — mirrors src/integrations/storage/r2.client.ts exactly (same
// endpoint/credential shape) since this script runs standalone, not inside
// the Express app, and can't import that module's env-validated singleton
// without pulling in the whole app config graph.
// ---------------------------------------------------------------------------
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name} — is this running with the server's .env loaded?`);
  }
  return value;
}

const R2_ACCOUNT_ID = requireEnv("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = requireEnv("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = requireEnv("R2_SECRET_ACCESS_KEY");
const R2_BUCKET = requireEnv("R2_BUCKET");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

async function uploadOriginal(objectKey: string, body: Buffer, mimeType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
      Body: body,
      ContentType: mimeType,
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    }),
  );
}

// Lightweight BullMQ producer — mirrors media-processing.queue.ts exactly
// (same queue name/job name/options) so the already-running wedhub-worker
// PM2 process picks these jobs up and generates real optimized/thumbnail/
// blur variants exactly as it would for a genuine vendor upload.
import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = requireEnv("REDIS_URL");
const redisConnection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const mediaQueue = new Queue<{ mediaId: string }>("media-processing", { connection: redisConnection });

async function enqueueMediaProcessing(mediaId: string): Promise<void> {
  await mediaQueue.add(
    "process",
    { mediaId },
    { attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: true, removeOnFail: false },
  );
}

// ---------------------------------------------------------------------------
// Verified-working Unsplash direct CDN photo IDs (images.unsplash.com/<id>).
// source.unsplash.com's random-redirect endpoint returns HTTP 503 (confirmed
// dead/deprecated at the time this script was written) — these are specific,
// individually curl-verified real photo IDs instead, spanning wedding
// photography, couples/portraits, venues/decor, florals, fashion/jewellery,
// food/cakes, and event/nightlife scenes, so a rotating subset per vendor
// looks like plausible real portfolio content for any of the 14 categories.
// ---------------------------------------------------------------------------
const PHOTO_IDS: string[] = [
  "photo-1414235077428-338989a2e8c0",
  "photo-1445510861639-5651173bc5d5",
  "photo-1464366400600-7168b8af9bc3",
  "photo-1465495976277-4387d4b0b4c6",
  "photo-1470309864661-68328b2cd0a5",
  "photo-1478146059778-26028b07395a",
  "photo-1478147427282-58a87a120781",
  "photo-1481349518771-20055b2a7b24",
  "photo-1483181957632-8bda974cbc91",
  "photo-1487412947147-5cebf100ffc2",
  "photo-1493723843671-1d655e66ac1c",
  "photo-1496843916299-590492c751f4",
  "photo-1497032628192-86f99bcd76bc",
  "photo-1503342217505-b0a15ec3261c",
  "photo-1508997449629-303059a039c0",
  "photo-1509927083803-4bd519298ac4",
  "photo-1511285560929-80b456fea0bc",
  "photo-1512909006721-3d6018887383",
  "photo-1516450360452-9312f5e86fc7",
  "photo-1517423440428-a5a00ad493e8",
  "photo-1517685352821-92cf88aee5a5",
  "photo-1519167758481-83f550bb49b3",
  "photo-1519225421980-715cb0215aed",
  "photo-1519671482749-fd09be7ccebf",
  "photo-1519689680058-324335c77eba",
  "photo-1519741497674-611481863552",
  "photo-1520854221256-17451cc331bf",
  "photo-1522413452208-996ff3f3e740",
  "photo-1522673607200-164d1b6ce486",
  "photo-1522748906645-95d8adfd52c7",
  "photo-1523438885200-e635ba2c371e",
  "photo-1523474253046-8cd2748b5fd2",
  "photo-1533090161767-e6ffed986c88",
  "photo-1533090368676-1fd25485db88",
  "photo-1533777857889-4be7c70b33f7",
  "photo-1543353071-873f17a7a088",
  "photo-1544005313-94ddf0286df2",
  "photo-1544078751-58fee2d8a03b",
  "photo-1546032996-6dfacbacbf3f",
  "photo-1546069901-ba9599a7e63c",
  "photo-1550005809-91ad75fb315f",
  "photo-1553653924-39b70295f8da",
  "photo-1560184897-ae75f418493e",
  "photo-1567696153798-9111f9cd3d0d",
  "photo-1571501679680-de32f1e7aad4",
  "photo-1573497491765-dccce02b29df",
  "photo-1583939003579-730e3918a45a",
  "photo-1585241645927-c7a8e5840c42",
  "photo-1594736797933-d0501ba2fe65",
  "photo-1600891964092-4316c288032e",
  "photo-1601924582970-9238bcb495d9",
  "photo-1602631985686-1bb0e6a8696e",
  "photo-1606216794074-735e91aa2c92",
  "photo-1606800052052-a08af7148866",
  "photo-1607190074257-dd4b7af0309f",
  "photo-1616423640778-28d1b53229bd",
];

function photoUrl(id: string): string {
  return `https://images.unsplash.com/${id}?w=1600&q=80&fm=jpg&fit=crop`;
}

// Deterministic-ish rotating picker so photos vary vendor-to-vendor without
// re-fetching a huge distinct pool per vendor (56 verified IDs is enough
// variety when combined with per-vendor offset rotation + shuffling).
function pickPhotosForVendor(globalIndex: number, count: number): string[] {
  const ids: string[] = [];
  const offset = (globalIndex * 7) % PHOTO_IDS.length; // 7 is coprime-ish spread
  for (let i = 0; i < count; i++) {
    const id = PHOTO_IDS[(offset + i * 3) % PHOTO_IDS.length];
    if (id) ids.push(id);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Utility: fetch with retry (Unsplash occasionally hiccups under burst load).
// ---------------------------------------------------------------------------
async function fetchImageBytes(url: string, retries = 3): Promise<Buffer> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const arrayBuffer = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      if (buf.length < 1000) throw new Error(`Suspiciously small response (${buf.length} bytes) for ${url}`);
      return buf;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  throw lastErr;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  const item = arr[Math.floor(rng() * arr.length)];
  if (item === undefined) {
    throw new Error("pick() called on an empty array");
  }
  return item;
}

function pickMany<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    const [removed] = copy.splice(idx, 1);
    if (removed !== undefined) {
      out.push(removed);
    }
  }
  return out;
}

// Simple seeded PRNG (mulberry32) for reproducible-but-varied output.
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
const rng = mulberry32(20260918);

// ---------------------------------------------------------------------------
// Business-name generation data — real-sounding Kerala/South-Indian wedding
// business names per category, built from name-part banks rather than one
// giant hardcoded list, so 10-15 per category all read as distinct real
// businesses instead of "Business Name 1".
// ---------------------------------------------------------------------------
interface CategorySeedConfig {
  name: string;
  namePatterns: Array<(city: string, rng: () => number) => string>;
  shortDescTemplates: Array<(businessName: string, city: string, rng: () => number) => string>;
  longDescTemplates: Array<(businessName: string, city: string, rng: () => number) => string>;
  priceRange: { starting: [number, number]; min: [number, number]; max: [number, number] };
  tags: string[];
  reviewSnippets: Array<(businessName: string, rng: () => number) => string>;
}

const MALAYALI_FIRST_NAMES_M = [
  "Arun", "Anoop", "Vishnu", "Sreejith", "Rahul", "Aravind", "Vinod", "Manu", "Nikhil", "Jithin",
  "Kiran", "Sujith", "Renjith", "Vipin", "Sandeep", "Ajmal", "Basil", "Alex", "Jerin", "Midhun",
];
const MALAYALI_FIRST_NAMES_F = [
  "Anjali", "Divya", "Sruthi", "Aiswarya", "Meera", "Nithya", "Athira", "Reshma", "Devika", "Anna",
  "Fathima", "Kavya", "Lekshmi", "Neha", "Parvathy", "Riya", "Sneha", "Swathi", "Teena", "Vidya",
];
const MALAYALI_SURNAMES = [
  "Nair", "Menon", "Pillai", "Varma", "Kurup", "Panicker", "Namboothiri", "Thomas", "George", "Mathew",
  "Jacob", "Varghese", "Abraham", "Kutty", "Iqbal", "Rahman", "Basheer", "Nazar",
];

const STUDIO_WORDS = ["Studio", "Studios", "Frames", "Films", "Photography", "Visuals", "Clicks", "Lens", "Moments", "Chronicles"];
const VENUE_WORDS = ["Convention Centre", "Grand", "Palace", "Gardens", "Resort", "Banquets", "Manor", "Courtyard", "Retreat"];
const DECOR_WORDS = ["Decors", "Decorations", "Events & Decor", "Florals", "Design Co.", "Creations"];
const CATERING_WORDS = ["Caterers", "Catering Services", "Kitchen", "Sadya Specialists", "Feasts", "Food Court"];
const BOUTIQUE_WORDS = ["Boutique", "Collections", "Couture", "Fashions", "Silks", "Designer Studio", "Bridal House"];
const JEWELLERY_WORDS = ["Jewellers", "Gold & Diamonds", "Jewellery", "Ornaments"];
const MAKEUP_WORDS = ["Makeovers", "Bridal Studio", "Makeup Artistry", "Beauty Lounge", "Glam Studio"];
const CAKE_WORDS = ["Cakes", "Bakery", "Patisserie", "Dessert Studio", "Cake Boutique"];
const PLANNER_WORDS = ["Events", "Event Planners", "Weddings", "Occasions", "Celebrations"];
const DJ_WORDS = ["Entertainment", "Sound & Light", "DJ Crew", "Live Events", "Music Co."];
const BAR_WORDS = ["Bar Co.", "Mixology", "Bar & Beverages", "Cocktail Crafters", "Spirits Co."];
const CAR_WORDS = ["Cars", "Luxury Rentals", "Wedding Cars", "Rides", "Classic Car Rentals"];

const KERALA_PLACE_FLAVOR = [
  "Backwater", "Spice", "Coconut Grove", "Malabar", "Kayal", "Munnar", "Vembanad", "Periyar",
  "Kovalam", "Fort", "Marine Drive", "Athirappilly", "Kuttanad", "Wayanad Hills",
];

function fullName(rng: () => number): { name: string; male: boolean } {
  const male = rng() > 0.5;
  const first = male ? pick(MALAYALI_FIRST_NAMES_M, rng) : pick(MALAYALI_FIRST_NAMES_F, rng);
  const surname = pick(MALAYALI_SURNAMES, rng);
  return { name: `${first} ${surname}`, male };
}

const CATEGORY_CONFIGS: CategorySeedConfig[] = [
  {
    name: "Photography & Videography",
    namePatterns: [
      (city, r) => `${pick(KERALA_PLACE_FLAVOR, r)} ${pick(STUDIO_WORDS, r)}`,
      (city, r) => `${fullName(r).name.split(" ")[0]} ${pick(STUDIO_WORDS, r)}`,
      (city, r) => `${city} ${pick(STUDIO_WORDS, r)}`,
      (city, r) => `Frame${r() > 0.5 ? "works" : "story"} by ${fullName(r).name.split(" ")[0]}`,
    ],
    shortDescTemplates: [
      (b, c) => `Candid and traditional wedding photography & cinematography based in ${c}, specialising in Kerala Christian and Hindu weddings.`,
      (b, c) => `Full-service wedding photo and film team covering ${c} and nearby destination venues across Kerala's backwaters.`,
      (b, c) => `Story-driven wedding films and editorial-style photography for couples across ${c} and Kerala.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} is a ${c}-based wedding photography and cinematography team that has covered weddings across Kerala, from intimate church ceremonies in ${c} to multi-day celebrations at backwater resorts. Our crew blends candid photojournalism with traditional posed coverage, and every wedding is delivered with a cinematic highlight film, a full-length documentary edit, and premium printed albums. We carry full-frame dual-card cameras with on-site backup, so nothing is ever left to chance on the one day it matters most.`,
      (b, c) =>
        `Founded by a small team of ${c} natives, ${b} has grown into one of the region's trusted names for candid wedding photography and drone cinematography. We specialise in capturing the small unscripted moments — a mother adjusting a mundu, a grandfather's tears during the thaali ceremony — alongside the grand stage shots families expect. Packages include same-day teaser edits, full highlight films, and raw footage on request.`,
    ],
    priceRange: { starting: [50000, 90000], min: [50000, 90000], max: [150000, 300000] },
    tags: ["candid photography", "cinematic films", "drone coverage", "pre-wedding shoot"],
    reviewSnippets: [
      (b) => `${b} captured our wedding beautifully — the candid shots from the muhurtham felt so natural, not posed at all.`,
      (b) => `The drone shots of our backwater venue came out stunning. Delivery took a little longer than promised but worth the wait.`,
      (b) => `Loved the cinematic teaser video they sent within a week. The full film had a couple of shaky handheld shots but overall very happy.`,
      (b) => `Professional team, showed up on time for both the haldi and the wedding day. Albums were premium quality.`,
    ],
  },
  {
    name: "Venues",
    namePatterns: [
      (city, r) => `The ${pick(KERALA_PLACE_FLAVOR, r)} ${pick(VENUE_WORDS, r)}`,
      (city, r) => `${city} ${pick(VENUE_WORDS, r)}`,
      (city, r) => `${pick(["Royal", "Grand", "Green", "Golden", "Silver"], r)} ${pick(VENUE_WORDS, r)}, ${city}`,
    ],
    shortDescTemplates: [
      (b, c, r) => `A ${pick(["banquet hall", "convention centre", "riverside lawn venue", "heritage property"], r)} in ${c} hosting weddings, receptions and sangeet functions.`,
      (b, c) => `Air-conditioned wedding venue in ${c} with in-house catering options and dedicated bridal suites.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} is a full-service wedding venue in ${c} with multiple halls and an open-air lawn, suited for everything from a 150-guest reception to a 1500-guest grand wedding. The property offers 100% power backup, ample parking, air-conditioned changing rooms for the bride and groom, and flexible catering policies — couples can choose our in-house caterers or bring in their own. Our events team has hosted hundreds of Kerala Christian, Hindu and Muslim weddings and coordinates closely with your decorator and photographer on the day.`,
      (b, c) =>
        `Set in ${c}, ${b} combines a traditional Kerala aesthetic — laterite stone, sloped tiled roofs, courtyard mandapams — with modern event infrastructure. We host two to three weddings a week during the season and our in-house team manages everything from valet parking to backup generators, so families can focus on the celebration rather than logistics.`,
    ],
    priceRange: { starting: [200000, 400000], min: [200000, 400000], max: [800000, 1500000] },
    tags: ["banquet hall", "wedding lawn", "AC venue", "in-house catering"],
    reviewSnippets: [
      (b) => `${b} handled a 600-guest wedding for us without a hitch — parking and power backup were exactly as promised.`,
      (b) => `Beautiful lawn area for the reception but the AC in one of the smaller halls was a bit weak during peak afternoon heat.`,
      (b) => `The staff were incredibly accommodating with our last-minute guest count changes. Highly recommend for a Kerala Christian wedding.`,
      (b) => `Good location and spacious, though we had to arrange external catering ourselves since their in-house menu was limited for vegetarian guests.`,
    ],
  },
  {
    name: "Bridal Wear",
    namePatterns: [
      (city, r) => `${pick(["Vastra", "Kanjivaram", "Pattu", "Silk Route", "Radiance", "Manepally"], r)} ${pick(BOUTIQUE_WORDS, r)}`,
      (city, r) => `${fullName(r).name.split(" ")[0]}'s Bridal ${pick(BOUTIQUE_WORDS, r)}`,
      (city, r) => `${city} Bridal ${pick(BOUTIQUE_WORDS, r)}`,
    ],
    shortDescTemplates: [
      (b, c) => `Bridal Kanchipuram sarees, designer lehengas and Christian wedding gowns, with in-house tailoring in ${c}.`,
      (b, c) => `Custom bridal couture boutique in ${c} offering bespoke lehengas, sarees and reception outfits.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} is a bridal fashion boutique in ${c} carrying an extensive collection of Kanchipuram silk sarees, designer lehengas and Christian wedding gowns. Our in-house tailoring unit handles custom embroidery and fittings, with most bespoke orders ready within four to six weeks. We also stock ready-to-wear engagement gowns and reception sarees, and our stylists offer full draping and styling on the wedding day itself.`,
      (b, c) =>
        `Run by a family of textile traders with three decades in ${c}'s silk trade, ${b} now specialises in bridal couture — from traditional Kasavu-bordered mundum neriyathum to contemporary fusion lehengas. Every bride gets a personal styling consultation, and alterations are handled in-house so fittings never need a second vendor.`,
    ],
    priceRange: { starting: [25000, 45000], min: [25000, 45000], max: [150000, 350000] },
    tags: ["bridal lehenga", "kanchipuram saree", "wedding gown", "custom tailoring"],
    reviewSnippets: [
      (b) => `${b} had the most beautiful collection of Kanchipuram sarees — the staff were patient through three fittings.`,
      (b) => `Our lehenga was gorgeous, though the delivery was cut close to the wedding date. Would book earlier next time.`,
      (b) => `Excellent tailoring and alteration service, the blouse fit perfectly on the first try.`,
    ],
  },
  {
    name: "Groom Wear",
    namePatterns: [
      (city, r) => `${pick(["Kalyanam", "Mantra", "Prince", "Nawab", "Royal Groom", "Kasavu"], r)} ${pick(["Menswear", "Groom Couture", "Tailors", "Collections"], r)}`,
      (city, r) => `${city} Groom ${pick(["Studio", "Wear", "Collections"], r)}`,
    ],
    shortDescTemplates: [
      (b, c) => `Sherwanis, tuxedos and traditional Kasavu mundu sets tailored in ${c} for grooms and groomsmen.`,
      (b, c) => `Bespoke and rental menswear for weddings, based in ${c}, from Indo-western suits to Kasavu jubba sets.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} outfits grooms across ${c} for every wedding function, from the traditional Kasavu mundu and jubba worn at a Kerala Hindu wedding to sharp Indo-western sherwanis for the reception. We offer both bespoke tailoring — typically ready in ten to twenty days — and rental options for grooms who want variety across functions without the full custom-tailoring cost. Turban draping, mojaris and accessories are all handled in-house on the wedding day.`,
      (b, c) =>
        `${b} is a ${c} menswear house trusted for groom and groomsmen styling. We stock everything from classic three-piece tuxedos to contemporary Nehru jackets, and our master tailors handle same-week alterations during the wedding season rush.`,
    ],
    priceRange: { starting: [12000, 20000], min: [12000, 20000], max: [60000, 120000] },
    tags: ["sherwani", "groom suit", "kasavu mundu", "rental menswear"],
    reviewSnippets: [
      (b) => `${b} tailored a sherwani for my brother in just twelve days and the fit was perfect.`,
      (b) => `Good range of Kasavu sets, staff helped us pick something that matched the bride's saree colour.`,
      (b) => `Rental process was smooth, though we had to visit twice for alterations.`,
    ],
  },
  {
    name: "Jewellery",
    namePatterns: [
      (city, r) => `${pick(["Lakshmi", "Sree", "Kalyan", "Malabar", "Bhima", "Thangamayil"], r)} ${pick(JEWELLERY_WORDS, r)}`,
      (city, r) => `${city} ${pick(JEWELLERY_WORDS, r)}`,
    ],
    shortDescTemplates: [
      (b, c) => `BIS Hallmarked gold and diamond jewellery showroom in ${c}, with bridal jewellery rental and old gold exchange.`,
      (b, c) => `Traditional temple jewellery and custom bridal sets crafted and sold in ${c}.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} has served ${c} families for generations with certified gold, diamond and antique temple jewellery. Every piece is BIS Hallmarked and diamonds come with IGI/GIA certification. Beyond outright purchase, we offer bridal jewellery rental packages for brides who want a heavier look for the wedding day without a permanent investment, along with an old-gold exchange scheme that many returning families use to upgrade sets across generations.`,
      (b, c) =>
        `${b} is a ${c}-based jewellery house specialising in custom bridal sets — necklaces, jhumkas, vanki and nose rings designed to match a bride's saree and blouse work. Our design team turns around bespoke pieces in three to six weeks, and our in-house gemologists certify every diamond and precious stone sold.`,
    ],
    priceRange: { starting: [15000, 40000], min: [15000, 40000], max: [500000, 2000000] },
    tags: ["bridal jewellery", "gold jewellery", "temple jewellery", "jewellery rental"],
    reviewSnippets: [
      (b) => `${b} has genuinely certified pieces — we compared hallmarks with two other showrooms before buying here.`,
      (b) => `The rental jewellery set looked stunning in photos, though the deposit process took longer than expected.`,
      (b) => `Excellent temple jewellery collection, the staff were transparent about making charges.`,
    ],
  },
  {
    name: "Makeup Artists",
    namePatterns: [
      (city, r) => `${fullName(r).name.split(" ")[0]} ${pick(MAKEUP_WORDS, r)}`,
      (city, r) => `${city} Bridal ${pick(MAKEUP_WORDS, r)}`,
      (city, r) => `Glow by ${fullName(r).name.split(" ")[0]}`,
    ],
    shortDescTemplates: [
      (b, c) => `HD and airbrush bridal makeup artist based in ${c}, travelling to venues across Kerala for weddings and engagements.`,
      (b, c) => `Traditional South Indian bridal makeup specialist in ${c}, with hair styling and draping included.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} is a bridal makeup studio in ${c} offering HD and airbrush makeup for weddings, engagements and receptions. Our packages include hair styling, saree draping and jewellery setting, and we carry premium products from MAC, Huda Beauty and Charlotte Tilbury. A complimentary trial session is included with every booking so brides know exactly what to expect on the big day, and we travel to venues across Kerala with our full kit and an assistant.`,
      (b, c) =>
        `Led by a certified makeup artist trained in HD and airbrush techniques, ${b} has done bridal makeup for weddings across ${c} and beyond. We specialise in traditional South Indian bridal looks as well as contemporary Indo-western styles for the reception, and can accommodate family and guest makeup alongside the bride on request.`,
    ],
    priceRange: { starting: [12000, 20000], min: [12000, 20000], max: [45000, 90000] },
    tags: ["bridal makeup", "HD makeup", "airbrush makeup", "hair styling"],
    reviewSnippets: [
      (b) => `${b} did my bridal makeup and it lasted through a six-hour ceremony without touch-ups. Highly recommend the trial session.`,
      (b) => `Lovely, soft makeup that photographed beautifully, though I wish the artist had arrived a bit earlier to avoid the rush.`,
      (b) => `My mother and sister also got their makeup done here for the reception — everyone looked great.`,
    ],
  },
  {
    name: "Mehendi Artists",
    namePatterns: [
      (city, r) => `${pick(["Heena", "Mehendi", "Henna", "Rangoli"], r)} ${pick(["Art by", "Designs by", "Studio -"], r)} ${fullName(r).name.split(" ")[0]}`,
      (city, r) => `${city} Mehendi ${pick(["Artistry", "Studio", "Designs"], r)}`,
    ],
    shortDescTemplates: [
      (b, c) => `Bridal Arabic and traditional mehendi artist in ${c}, also available for guest and family mehendi at events.`,
      (b, c) => `Custom bridal mehendi designs in ${c}, using organic henna cones with a team for large guest gatherings.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} is a mehendi studio based in ${c} known for intricate bridal designs that blend Arabic patterns with fine Rajasthani detailing. We use 100% organic, chemical-free henna cones prepared in-house, so the bridal stain develops rich and dark without any skin irritation. For large weddings we bring a team of artists who can handle eight to ten guests an hour, so the whole mehendi function keeps moving even with a big guest list.`,
      (b, c) =>
        `${b} specialises in bridal mehendi with customised storytelling elements — a couple's initials hidden in the pattern, or a small portrait worked into the palm. Beyond the bride, we take group bookings for the full mehendi ceremony and can travel outstation for a minimum order value.`,
    ],
    priceRange: { starting: [5000, 8000], min: [5000, 8000], max: [25000, 45000] },
    tags: ["bridal mehendi", "arabic mehendi", "guest mehendi", "organic henna"],
    reviewSnippets: [
      (b) => `${b} gave me the most detailed bridal mehendi I've seen — the stain was dark and lasted almost three weeks.`,
      (b) => `Booked them for the whole mehendi function, the team was fast and friendly with all the guests.`,
      (b) => `Beautiful design work, though they arrived about 30 minutes late on the day.`,
    ],
  },
  {
    name: "Decorators",
    namePatterns: [
      (city, r) => `${pick(["Petal", "Bloom", "Mandap", "Canopy", "Marigold", "Orchid"], r)} ${pick(DECOR_WORDS, r)}`,
      (city, r) => `${city} Wedding ${pick(DECOR_WORDS, r)}`,
    ],
    shortDescTemplates: [
      (b, c) => `Stage, mandap and entrance decor specialists in ${c}, working with real and artificial florals.`,
      (b, c) => `Full wedding decor and lighting team based in ${c}, from haldi setups to grand reception stages.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} designs and executes wedding decor across ${c} — stage and mandap setups, entrance arches, photo-booth backdrops and full floral installations. We work with both fresh flowers and premium artificial silk florals depending on budget and season, and our in-house lighting and sound team can handle ambient uplighting alongside the decor so couples don't need a separate vendor for stage lighting.`,
      (b, c) =>
        `From traditional South Indian banana-leaf-and-marigold mandaps to modern minimalist floral walls, ${b} has decorated weddings of every scale across ${c}. Our design team builds a custom mood board for every couple before finalising a theme, and we handle everything from the haldi function backdrop to the final reception stage teardown.`,
    ],
    priceRange: { starting: [40000, 80000], min: [40000, 80000], max: [300000, 700000] },
    tags: ["stage decor", "mandap decor", "floral decor", "wedding lighting"],
    reviewSnippets: [
      (b) => `${b} transformed our hall completely — the floral mandap looked even better in person than in the mood board.`,
      (b) => `Great lighting setup for our reception stage, though the marigold garlands wilted a bit by evening in the heat.`,
      (b) => `Very responsive team, made last-minute changes to our colour theme without any extra fuss.`,
    ],
  },
  {
    name: "Caterers",
    namePatterns: [
      (city, r) => `${pick(["Kerala", "Malabar", "Nadan", "Grand", "Royal", "Spice Route"], r)} ${pick(CATERING_WORDS, r)}`,
      (city, r) => `${city} ${pick(CATERING_WORDS, r)}`,
    ],
    shortDescTemplates: [
      (b, c) => `Traditional Kerala Sadya and multi-cuisine wedding catering based in ${c}, serving events of every size.`,
      (b, c) => `Wedding catering team in ${c} offering banana-leaf sadya, live counters and buffet service.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} has catered weddings across ${c} for over a decade, known especially for a traditional banana-leaf Sadya served the authentic way — starting with the first round of parippu and ending with payasam. Alongside the classic Onam-style sadya, we run live counters (dosa, chaat, barbeque) and a full multi-cuisine buffet for mixed-guest weddings. Our uniformed service staff, crockery and cleanup are all included in the per-plate rate.`,
      (b, c) =>
        `${b} is a ${c}-based catering house serving Kerala, North Indian and Continental menus for weddings ranging from a 100-guest engagement to a 3000-guest reception. We offer pure veg, Jain and halal-certified menu lines on request, and our live counters are consistently one of the most photographed parts of the reception.`,
    ],
    priceRange: { starting: [400, 700], min: [400, 700], max: [1200, 2200] },
    tags: ["kerala sadya", "wedding catering", "live counters", "multi cuisine"],
    reviewSnippets: [
      (b) => `${b} served the most authentic sadya I've had outside my grandmother's kitchen — guests kept asking for seconds.`,
      (b) => `The live dosa counter was a huge hit at our reception. Service staff were polite and quick to refill.`,
      (b) => `Food was good overall, though the non-veg counter ran a little short towards the end of dinner service.`,
    ],
  },
  {
    name: "Cakes & Desserts",
    namePatterns: [
      (city, r) => `${pick(["Sugar & Spice", "Sweet Nothings", "The Cake Studio", "Frosted", "Velvet Crumb"], r)} ${city}`,
      (city, r) => `${fullName(r).name.split(" ")[0]}'s ${pick(CAKE_WORDS, r)}`,
    ],
    shortDescTemplates: [
      (b, c) => `Multi-tier wedding cakes and dessert tables based in ${c}, with eggless and gluten-free options.`,
      (b, c) => `Custom themed wedding cakes and cupcake towers from a home-grown bakery in ${c}.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} designs and bakes custom multi-tier wedding cakes out of ${c}, alongside dessert tables and grazing platters for the reception. We offer eggless, gluten-free and vegan options on every flavour, from classic vanilla to Belgian chocolate and lotus biscoff. Cakes are delivered in a refrigerated van with on-site setup included, so nothing arrives melted or lopsided even in Kerala's humidity.`,
      (b, c) =>
        `Started as a home bakery, ${b} now supplies wedding cakes to venues across ${c}. We offer a complimentary tasting session on booking so couples can choose flavours confidently, and our design team can replicate a Pinterest reference or build something fully custom around the couple's wedding theme.`,
    ],
    priceRange: { starting: [4000, 8000], min: [4000, 8000], max: [40000, 90000] },
    tags: ["wedding cake", "dessert table", "eggless cake", "custom cake design"],
    reviewSnippets: [
      (b) => `${b} baked us a three-tier cake that tasted as good as it looked — the eggless chocolate layer was a favourite.`,
      (b) => `Beautiful cake design, exactly like the reference photo we sent. Delivery was right on time.`,
      (b) => `Good cake overall, though it was slightly sweeter than we expected for the fondant layer.`,
    ],
  },
  {
    name: "Event Planners",
    namePatterns: [
      (city, r) => `${pick(["Knot", "Vow", "Aisle", "Forever", "Confetti", "Big Day"], r)} ${pick(PLANNER_WORDS, r)}`,
      (city, r) => `${city} Wedding ${pick(PLANNER_WORDS, r)}`,
    ],
    shortDescTemplates: [
      (b, c) => `End-to-end wedding planning team based in ${c}, handling vendor coordination and on-the-day execution.`,
      (b, c) => `Destination and full-service wedding planners in ${c}, coordinating Kerala backwater and resort weddings.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} plans weddings end-to-end for couples across ${c} — from initial budgeting and vendor scouting through to stage management on the wedding day itself. Our team has coordinated everything from intimate 80-guest weddings to large multi-day celebrations spanning haldi, sangeet and reception, and we work on either a fixed flat fee or a percentage of the total wedding budget, whichever the couple prefers.`,
      (b, c) =>
        `${b} specialises in destination weddings across Kerala's backwaters and resort properties, alongside full-service planning within ${c}. We manage vendor contracts, guest logistics and a detailed day-of itinerary so couples can actually enjoy their own wedding instead of managing it.`,
    ],
    priceRange: { starting: [80000, 150000], min: [80000, 150000], max: [500000, 1200000] },
    tags: ["wedding planning", "destination wedding", "event coordination", "vendor management"],
    reviewSnippets: [
      (b) => `${b} made our three-day wedding feel effortless — every vendor showed up on schedule because of their coordination.`,
      (b) => `Great budget management, they negotiated better rates with our caterer than we could have on our own.`,
      (b) => `Solid planning overall, though communication slowed down a bit in the final week before the wedding.`,
    ],
  },
  {
    name: "Artists & DJs",
    namePatterns: [
      (city, r) => `DJ ${fullName(r).name.split(" ")[0]}`,
      (city, r) => `${city} ${pick(DJ_WORDS, r)}`,
      (city, r) => `${pick(["Beat", "Rhythm", "Encore", "Vibe"], r)} ${pick(DJ_WORDS, r)}`,
    ],
    shortDescTemplates: [
      (b, c) => `Wedding DJ and live band services in ${c}, covering Bollywood, Malayalam and EDM sets.`,
      (b, c) => `Sound, lighting and emcee services for weddings based in ${c}.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} provides DJ, live band and emcee services for weddings across ${c}. Our sets blend Bollywood and Malayalam hits with EDM remixes to keep the dance floor full through the reception, and every package includes a full sound console and stage lighting so venues don't need a separate AV vendor. We also offer bilingual emcee services for couples who want a host fluent in both Malayalam and English.`,
      (b, c) =>
        `${b} is a ${c}-based entertainment crew covering everything from the sangeet dance floor to the reception's grand entry music. Our team includes a resident DJ, a live percussion ensemble for the baraat, and an emcee who keeps the evening's schedule moving smoothly.`,
    ],
    priceRange: { starting: [15000, 30000], min: [15000, 30000], max: [80000, 180000] },
    tags: ["wedding dj", "live band", "sound and lighting", "emcee services"],
    reviewSnippets: [
      (b) => `${b} kept the dance floor packed all night at our sangeet — great mix of Malayalam and Bollywood tracks.`,
      (b) => `Sound quality was excellent, though the lighting rig took a while to set up before the event started.`,
      (b) => `Our emcee was fantastic, kept the crowd engaged between every ritual without dragging the schedule.`,
    ],
  },
  {
    name: "Cocktail & Bar Services",
    namePatterns: [
      (city, r) => `${pick(["Shaken", "Stirred", "The Gin Trail", "Barrel & Bar", "Mixology Co"], r)} ${city}`,
      (city, r) => `${city} ${pick(BAR_WORDS, r)}`,
    ],
    shortDescTemplates: [
      (b, c) => `Mobile bar and flair bartending service for weddings in ${c}, with custom signature cocktail menus.`,
      (b, c) => `Professional bartenders and mocktail bar setup for wedding receptions across ${c}.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} runs mobile bar setups for wedding receptions across ${c}, staffed by professional bartenders who design a custom signature cocktail menu around the couple's love story. We also offer a non-alcoholic mocktail bar for functions where liquor isn't served, complete with printed menu cards, premium ice and fresh garnishes. Our team can assist with one-day event liquor licensing where required.`,
      (b, c) =>
        `${b} brings flair bartending and curated cocktail menus to weddings in ${c}. Packages include glassware, mixers and a bartender-to-guest ratio built for smooth service even at large receptions, with an optional flair show that's become a favourite reception photo moment for many of our couples.`,
    ],
    priceRange: { starting: [25000, 45000], min: [25000, 45000], max: [150000, 350000] },
    tags: ["mobile bar", "flair bartending", "signature cocktails", "mocktail bar"],
    reviewSnippets: [
      (b) => `${b} designed two signature cocktails named after us — such a nice personal touch at the reception.`,
      (b) => `Great mocktail bar for our dry wedding, guests loved the mint-lime cooler.`,
      (b) => `Bartenders were skilled and fast, though we ran slightly short on ice towards the end of the night.`,
    ],
  },
  {
    name: "Wedding Cars & Luxury Rentals",
    namePatterns: [
      (city, r) => `${city} Luxury ${pick(CAR_WORDS, r)}`,
      (city, r) => `${pick(["Royal Ride", "Elite", "Premier", "Vintage Drive"], r)} ${pick(CAR_WORDS, r)}`,
    ],
    shortDescTemplates: [
      (b, c) => `Luxury sedan and vintage car rentals for weddings in ${c}, with uniformed chauffeurs included.`,
      (b, c) => `Wedding car fleet in ${c} ranging from vintage classics to modern luxury sedans and guest vans.`,
    ],
    longDescTemplates: [
      (b, c) =>
        `${b} rents out a fleet of luxury sedans, vintage classic cars and guest shuttle vans for weddings in and around ${c}. Every booking includes a uniformed chauffeur, fuel and basic ribbon-and-flower decoration, with a backup vehicle always on standby in case of a breakdown. We also arrange horse carriages for couples who want a traditional grand entry.`,
      (b, c) =>
        `${b} has been ${c}'s go-to wedding car rental service for over a decade, with a fleet spanning vintage Ambassadors to modern Mercedes sedans. Packages are billed by duration or kilometre slab, and outstation travel across Kerala can be arranged with advance notice.`,
    ],
    priceRange: { starting: [8000, 15000], min: [8000, 15000], max: [60000, 150000] },
    tags: ["wedding car rental", "vintage car", "luxury sedan", "chauffeur service"],
    reviewSnippets: [
      (b) => `${b} provided a beautifully maintained vintage car for our entry — the chauffeur was punctual and professional.`,
      (b) => `Great fleet options, we rented three cars for the family and all arrived decorated as promised.`,
      (b) => `Smooth booking process, though the AC in one of the guest vans wasn't as strong as expected.`,
    ],
  },
];

// Sanity check: every WEDDING_CATEGORIES entry from prisma/seed.ts must have a config here.
const EXPECTED_CATEGORY_NAMES = [
  "Photography & Videography",
  "Venues",
  "Makeup Artists",
  "Mehendi Artists",
  "Decorators",
  "Caterers",
  "Bridal Wear",
  "Groom Wear",
  "Jewellery",
  "Cakes & Desserts",
  "Artists & DJs",
  "Cocktail & Bar Services",
  "Wedding Cars & Luxury Rentals",
  "Event Planners",
];

// ---------------------------------------------------------------------------
// Couple (end-user) name pool for review authors + standalone couple accounts.
// ---------------------------------------------------------------------------
const COUPLE_FIRST_NAMES = [
  "Anjali", "Arjun", "Divya", "Rahul", "Meera", "Vishnu", "Sruthi", "Kiran", "Aiswarya", "Nikhil",
  "Athira", "Sandeep", "Reshma", "Manu", "Devika", "Jithin", "Neha", "Vipin", "Parvathy", "Ajmal",
  "Fathima", "Basil", "Kavya", "Jerin", "Lekshmi", "Midhun", "Riya", "Renjith", "Sneha", "Sujith",
  "Swathi", "Vinod", "Teena", "Alex", "Vidya", "Anoop", "Nithya", "Aravind", "Anna", "Rohan",
];
const COUPLE_SURNAMES = [
  "Nair", "Menon", "Pillai", "Varma", "Kurup", "Thomas", "George", "Mathew", "Jacob", "Varghese",
  "Abraham", "Iqbal", "Rahman", "Basheer", "Panicker", "Kutty", "Chacko", "Joseph", "Sebastian", "Paul",
];

function makeEmail(first: string, last: string, index: number): string {
  const cleaned = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "");
  return `${cleaned}${index}@gmail.com`;
}

// ---------------------------------------------------------------------------
// Main seeding logic
// ---------------------------------------------------------------------------

interface SeededVendor {
  id: string;
  businessName: string;
  categoryName: string;
}

async function main(): Promise<void> {
  console.info("=== WedHub demo data seed starting ===");

  const categories = await prisma.category.findMany({ where: { isActive: true } });
  const categoryByName = new Map(categories.map((c) => [c.name, c]));
  for (const name of EXPECTED_CATEGORY_NAMES) {
    if (!categoryByName.has(name)) {
      throw new Error(`Expected category "${name}" not found — did you run npm run db:seed first?`);
    }
  }

  const cities = await prisma.location.findMany({ where: { type: "CITY" } });
  if (cities.length === 0) {
    throw new Error("No CITY locations found — did you run npm run db:seed first?");
  }
  console.info(`Found ${categories.length} categories and ${cities.length} cities.`);

  // -------------------------------------------------------------------
  // 1. Couple (END_USER) accounts
  // -------------------------------------------------------------------
  const COUPLE_COUNT = 40;
  const couplePassword = await hashPassword("Wedding@2026Demo!");
  const coupleUserIds: string[] = [];
  const usedEmails = new Set<string>();

  console.info(`Creating ${COUPLE_COUNT} couple (end-user) accounts...`);
  for (let i = 0; i < COUPLE_COUNT; i++) {
    const first = pick(COUPLE_FIRST_NAMES, rng);
    const last = pick(COUPLE_SURNAMES, rng);
    let email = makeEmail(first, last, i);
    let suffix = i;
    while (usedEmails.has(email)) {
      suffix += 100;
      email = makeEmail(first, last, suffix);
    }
    usedEmails.add(email);

    const city = pick(cities, rng);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: couplePassword,
        role: "END_USER",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            firstName: first,
            lastName: last,
            cityId: city.id,
          },
        },
      },
    });
    coupleUserIds.push(user.id);
  }
  console.info(`Created ${coupleUserIds.length} couple accounts.`);

  // -------------------------------------------------------------------
  // 2. Vendors, 10-15 per category, with profile + media
  // -------------------------------------------------------------------
  const seededVendors: SeededVendor[] = [];
  let globalVendorIndex = 0;
  let totalMediaCreated = 0;

  for (const config of CATEGORY_CONFIGS) {
    const category = categoryByName.get(config.name)!;
    const vendorCount = 10 + Math.floor(rng() * 6); // 10-15
    console.info(`\n--- Category "${config.name}": creating ${vendorCount} vendors ---`);

    const usedNamesInCategory = new Set<string>();

    for (let i = 0; i < vendorCount; i++) {
      const city = pick(cities, rng);

      // Generate a distinct business name (retry on collision within category).
      let businessName = "";
      for (let attempt = 0; attempt < 10; attempt++) {
        const pattern = pick(config.namePatterns, rng);
        const candidate = pattern(city.name, rng).replace(/\s+/g, " ").trim();
        if (!usedNamesInCategory.has(candidate)) {
          businessName = candidate;
          usedNamesInCategory.add(candidate);
          break;
        }
      }
      if (!businessName) {
        businessName = `${config.name} House ${city.name} ${globalVendorIndex}`;
      }

      const slugBase = slugify(businessName);
      let slug = slugBase;
      let slugSuffix = 1;
      // Ensure global slug uniqueness across all categories/vendors.
      while (await prisma.vendor.findUnique({ where: { slug } })) {
        slugSuffix += 1;
        slug = `${slugBase}-${slugSuffix}`;
      }

      const shortDescription = pick(config.shortDescTemplates, rng)(businessName, city.name, rng);
      const description = pick(config.longDescTemplates, rng)(businessName, city.name, rng);

      const priceMin = Math.round(
        (config.priceRange.min[0] + rng() * (config.priceRange.min[1] - config.priceRange.min[0])) / 500,
      ) * 500;
      let priceMax = Math.round(
        (config.priceRange.max[0] + rng() * (config.priceRange.max[1] - config.priceRange.max[0])) / 500,
      ) * 500;
      if (priceMax <= priceMin) priceMax = priceMin + Math.round(priceMin * 0.5);
      // startingPrice is drawn from its own (lower) range but must never read
      // as cheaper than the vendor's own advertised price-range floor — a
      // real vendor card would look broken showing "Starting at ₹50,500"
      // above a "₹58,000 - ₹1,70,000" range, so floor it at priceMin.
      const startingPriceRaw = Math.round(
        (config.priceRange.starting[0] + rng() * (config.priceRange.starting[1] - config.priceRange.starting[0])) / 500,
      ) * 500;
      const startingPrice = Math.max(startingPriceRaw, priceMin);

      const yearsExperience = 2 + Math.floor(rng() * 18);
      const teamSize = 2 + Math.floor(rng() * 15);
      const now = new Date();
      const submittedAt = new Date(now.getTime() - (30 + Math.floor(rng() * 300)) * 24 * 60 * 60 * 1000);
      const approvedAt = new Date(submittedAt.getTime() + (1 + Math.floor(rng() * 5)) * 24 * 60 * 60 * 1000);

      const vendor = await prisma.vendor.create({
        data: {
          businessName,
          slug,
          status: "APPROVED",
          creationSource: "ADMIN_CREATED",
          verificationLevel: rng() > 0.4 ? "BUSINESS_VERIFIED" : "IDENTITY_VERIFIED",
          cityId: city.id,
          approvedAt,
          submittedAt,
          profileCompleteness: 90 + Math.floor(rng() * 11), // 90-100, realistic "approved" vendor
          createdAt: submittedAt,
          categories: {
            create: { categoryId: category.id, isPrimary: true },
          },
          serviceAreas: {
            create: { locationId: city.id },
          },
          profile: {
            create: {
              shortDescription,
              description,
              vendorType: config.name,
              tags: pickMany(config.tags, Math.min(3, config.tags.length), rng),
              address: `${city.name}, Kerala`,
              startingPrice,
              priceRangeMin: priceMin,
              priceRangeMax: priceMax,
              currency: "INR",
              customQuoteAvailable: rng() > 0.5,
              yearsExperience,
              teamSize,
              languages: rng() > 0.3 ? ["Malayalam", "English"] : ["Malayalam", "English", "Hindi"],
              travelPolicy: rng() > 0.5 ? "Travels across Kerala with prior notice" : "Travels statewide; outstation charges apply",
              phone: `9${Math.floor(100000000 + rng() * 899999999)}`,
              email: `contact@${slug.replace(/-/g, "")}.example.com`,
              willingToTravel: rng() > 0.2,
              advanceBookingPercent: pick([20, 25, 30, 50], rng),
              cancellationPolicy: "Advance booking amount is non-refundable within 30 days of the event; full refund otherwise minus processing fees.",
              eventsCompletedRange: pick(["50-100 events", "100-250 events", "250-500 events", "500+ events"], rng),
            },
          },
          statusHistory: {
            create: [
              { fromStatus: null, toStatus: "PENDING_APPROVAL", reason: "Seed: submitted for review", createdAt: submittedAt },
              { fromStatus: "PENDING_APPROVAL", toStatus: "APPROVED", reason: "Seed: demo data approval", createdAt: approvedAt },
            ],
          },
        },
      });

      seededVendors.push({ id: vendor.id, businessName, categoryName: config.name });

      // ---- Portfolio media: 4-5 real photos through the real R2+BullMQ pipeline ----
      const photoCount = 4 + (rng() > 0.5 ? 1 : 0);
      const photoIds = pickPhotosForVendor(globalVendorIndex, photoCount);

      for (let p = 0; p < photoIds.length; p++) {
        const photoId = photoIds[p];
        if (!photoId) continue;
        const url = photoUrl(photoId);
        try {
          const bytes = await fetchImageBytes(url);
          const objectKey = `vendors/${vendor.id}/${randomUUID()}.jpg`;
          await uploadOriginal(objectKey, bytes, "image/jpeg");

          const media = await prisma.media.create({
            data: {
              vendorId: vendor.id,
              mediaType: "PORTFOLIO",
              storageProvider: "cloudflare_r2",
              originalObjectKey: objectKey,
              mimeType: "image/jpeg",
              fileSize: bytes.length,
              status: "PROCESSING",
              moderationStatus: "APPROVED",
              sortOrder: p,
              altText: `${businessName} portfolio photo ${p + 1}`,
            },
          });

          await enqueueMediaProcessing(media.id);
          totalMediaCreated += 1;
        } catch (err) {
          console.error(`  ! Failed to upload photo for ${businessName} (${photoId}):`, (err as Error).message);
        }
      }

      globalVendorIndex += 1;
      if ((globalVendorIndex % 10) === 0) {
        console.info(`  ...${globalVendorIndex} vendors created so far (${totalMediaCreated} media rows queued)`);
      }
    }
  }

  console.info(`\nCreated ${seededVendors.length} vendors total, queued ${totalMediaCreated} media processing jobs.`);

  // -------------------------------------------------------------------
  // 3. Reviews — ~120 across vendors, varied ratings/text
  // -------------------------------------------------------------------
  const REVIEW_TARGET = 120;
  console.info(`\nCreating ~${REVIEW_TARGET} reviews...`);

  // Weighted rating distribution: mostly 4-5 stars, some 3s, rare 2s.
  function randomRating(): number {
    const roll = rng();
    if (roll < 0.45) return 5;
    if (roll < 0.8) return 4;
    if (roll < 0.95) return 3;
    return 2;
  }

  const reviewTitlesByRating: Record<number, string[]> = {
    5: ["Absolutely wonderful experience", "Exceeded our expectations", "Made our wedding day perfect", "Highly recommend to every couple", "Worth every rupee"],
    4: ["Really happy with the service", "Great experience overall", "Would book again", "Very professional team", "Good value for money"],
    3: ["Decent experience, a few hiccups", "Good but room for improvement", "Mixed feelings overall", "Average experience"],
    2: ["Some issues we didn't expect", "Not quite what we planned for"],
  };

  // Build a weighted vendor pool so most vendors get 1 review, some get 2-3.
  const reviewAssignments: SeededVendor[] = [];
  const shuffledVendors = [...seededVendors].sort(() => rng() - 0.5);
  for (const v of shuffledVendors) {
    reviewAssignments.push(v); // first pass: everyone gets at least 1
  }
  let extraNeeded = REVIEW_TARGET - reviewAssignments.length;
  let extraIdx = 0;
  while (extraNeeded > 0 && shuffledVendors.length > 0) {
    const v = shuffledVendors[extraIdx % shuffledVendors.length];
    // ~60% chance a vendor gets an additional review, capped at 3 total.
    if (v && rng() < 0.6) {
      reviewAssignments.push(v);
      extraNeeded -= 1;
    }
    extraIdx += 1;
    if (extraIdx > shuffledVendors.length * 4) break; // safety valve
  }

  // Cap any vendor at 3 reviews and track which couple already reviewed which vendor
  // (Review has a unique [userId, vendorId] constraint).
  const reviewCountByVendor = new Map<string, number>();
  const reviewedPairs = new Set<string>();
  let reviewsCreated = 0;

  for (const vendor of reviewAssignments) {
    if (reviewsCreated >= REVIEW_TARGET + 15) break; // hard safety cap
    const currentCount = reviewCountByVendor.get(vendor.id) ?? 0;
    if (currentCount >= 3) continue;

    // Find a couple who hasn't reviewed this vendor yet.
    let couple: string | undefined;
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = pick(coupleUserIds, rng);
      const pairKey = `${candidate}:${vendor.id}`;
      if (!reviewedPairs.has(pairKey)) {
        couple = candidate;
        reviewedPairs.add(pairKey);
        break;
      }
    }
    if (!couple) continue;

    const rating = randomRating();
    const config = CATEGORY_CONFIGS.find((c) => c.name === vendor.categoryName);
    if (!config) continue;
    const content = pick(config.reviewSnippets, rng)(vendor.businessName, rng);
    const titles = reviewTitlesByRating[rating] ?? reviewTitlesByRating[4]!;
    const title = pick(titles, rng);
    const daysAgo = 5 + Math.floor(rng() * 400);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    await prisma.review.create({
      data: {
        userId: couple,
        vendorId: vendor.id,
        rating,
        title,
        content,
        verifiedInteraction: rng() > 0.3,
        status: "APPROVED",
        createdAt,
        updatedAt: createdAt,
      },
    });

    reviewCountByVendor.set(vendor.id, currentCount + 1);
    reviewsCreated += 1;
  }

  console.info(`Created ${reviewsCreated} reviews across ${reviewCountByVendor.size} vendors.`);

  // -------------------------------------------------------------------
  // 4. Recompute Vendor.averageRating / reviewCount — same aggregate
  //    approach as review.repository.ts's recalculateVendorRating.
  // -------------------------------------------------------------------
  console.info("Recomputing vendor averageRating/reviewCount...");
  for (const vendorId of reviewCountByVendor.keys()) {
    const result = await prisma.review.aggregate({
      where: { vendorId, status: "APPROVED" },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        averageRating: result._avg.rating ?? 0,
        reviewCount: result._count.rating,
      },
    });
  }

  console.info("\n=== Seed data summary ===");
  console.info(`Couples: ${coupleUserIds.length}`);
  console.info(`Vendors: ${seededVendors.length}`);
  console.info(`Media jobs queued: ${totalMediaCreated}`);
  console.info(`Reviews: ${reviewsCreated}`);
  console.info("=== Done. Media processing happens asynchronously via wedhub-worker. ===");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await mediaQueue.close();
    redisConnection.disconnect();
  });
