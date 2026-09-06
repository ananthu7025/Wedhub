import { PrismaClient, type AttributeDataType } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SYSTEM_PERMISSIONS: Array<{ resource: string; action: string; description: string }> = [
  { resource: "vendor", action: "read", description: "View vendor profiles" },
  { resource: "vendor", action: "create", description: "Create vendors on behalf of a business" },
  { resource: "vendor", action: "update", description: "Edit vendor profiles" },
  { resource: "vendor", action: "approve", description: "Approve pending vendor profiles" },
  { resource: "vendor", action: "suspend", description: "Suspend an approved vendor" },
  { resource: "subscription", action: "manage", description: "Manage plans and vendor subscriptions" },
  { resource: "profile", action: "read", description: "View a user's own profile" },
  { resource: "profile", action: "update", description: "Edit a user's own profile" },
  { resource: "leads", action: "read", description: "View leads" },
  { resource: "leads", action: "update", description: "Update lead status/notes" },
  { resource: "media", action: "manage", description: "Upload and manage portfolio media" },
  { resource: "favorites", action: "manage", description: "Manage favorited vendors" },
  { resource: "shortlist", action: "manage", description: "Manage shortlists" },
  { resource: "enquiry", action: "create", description: "Submit a vendor enquiry" },
];

const SYSTEM_ROLES: Array<{ name: string; description: string; permissions: "all" | string[] }> = [
  { name: "admin", description: "Full platform access", permissions: "all" },
  {
    name: "end_user",
    description: "Default role for couples using the platform",
    permissions: ["profile:read", "profile:update", "favorites:manage", "shortlist:manage", "enquiry:create"],
  },
  {
    name: "vendor",
    description: "Default role for vendor accounts",
    permissions: ["profile:read", "profile:update", "leads:read", "leads:update", "media:manage"],
  },
];

// Standalone Gallery Inspiration taxonomy (GalleryCategory model) — kept
// separate from WEDDING_CATEGORIES/Category above since INSPIRATION_PHOTO
// FeaturedMedia rows have no vendor to derive a Category from. WedMeGood's
// "Photos" mega-menu groupings.
const GALLERY_CATEGORIES: string[] = [
  "Outfit",
  "Jewellery & Accessories",
  "Mehndi",
  "Decor & Ideas",
  "Wedding Card Designs",
  "Wedding Photography",
  "Groom Wear",
  "Bridal Makeup & Hair",
];

const WEDDING_CATEGORIES: string[] = [
  "Photography",
  "Videography",
  "Venues",
  "Makeup Artists",
  "Mehndi Artists",
  "Wedding Planners",
  "Decorators",
  "Caterers",
  "DJs",
  "Choreographers",
  "Bridal Wear",
  "Groom Wear",
  "Jewellery",
  "Invitations",
  "Cakes",
  "Florists",
  "Rentals",
  "Transportation",
  "Honeymoon & Travel",
  "Destination Weddings",
];

interface AttributeSeed {
  key: string;
  label: string;
  dataType: AttributeDataType;
  options?: string[];
  isFilterable?: boolean;
  isComparable?: boolean;
}

const CATEGORY_ATTRIBUTES: Record<string, AttributeSeed[]> = {
  Photography: [
    {
      key: "photography_style",
      label: "Photography Style",
      dataType: "SELECT",
      options: ["Traditional", "Candid", "Documentary"],
      isFilterable: true,
      isComparable: true,
    },
    { key: "drone", label: "Drone Coverage", dataType: "BOOLEAN", isFilterable: true },
    { key: "pre_wedding", label: "Pre-Wedding Shoot", dataType: "BOOLEAN", isFilterable: true },
    { key: "number_of_photographers", label: "Number of Photographers", dataType: "NUMBER", isComparable: true },
    { key: "delivery_time", label: "Delivery Time", dataType: "TEXT", isComparable: true },
  ],
  Venues: [
    { key: "capacity", label: "Capacity", dataType: "NUMBER", isFilterable: true, isComparable: true },
    {
      key: "indoor_outdoor",
      label: "Indoor / Outdoor",
      dataType: "MULTI_SELECT",
      options: ["Indoor", "Outdoor"],
      isFilterable: true,
    },
    { key: "parking", label: "Parking", dataType: "BOOLEAN", isFilterable: true },
    { key: "rooms", label: "Rooms", dataType: "NUMBER", isComparable: true },
    { key: "catering", label: "Catering", dataType: "BOOLEAN", isFilterable: true, isComparable: true },
    { key: "accommodation", label: "Accommodation", dataType: "BOOLEAN", isFilterable: true, isComparable: true },
  ],
  "Makeup Artists": [
    { key: "bridal_makeup", label: "Bridal Makeup", dataType: "BOOLEAN", isFilterable: true },
    { key: "groom_makeup", label: "Groom Makeup", dataType: "BOOLEAN", isFilterable: true },
    { key: "trial", label: "Trial Available", dataType: "BOOLEAN", isFilterable: true },
    { key: "travel", label: "Travels to Venue", dataType: "BOOLEAN", isFilterable: true },
  ],
};

const CATEGORY_SERVICES: Record<string, string[]> = {
  Photography: ["Candid Photography", "Traditional Photography", "Drone Coverage", "Pre-Wedding Shoot"],
  Videography: ["Cinematic Videography", "Traditional Videography", "Drone Videography"],
  Venues: ["Indoor Hall", "Outdoor Lawn", "Banquet Hall", "Destination Venue"],
  "Makeup Artists": ["Bridal Makeup", "Groom Makeup", "Party Makeup", "Trial Session"],
  "Mehndi Artists": ["Bridal Mehndi", "Party Mehndi", "Arabic Mehndi"],
  "Wedding Planners": ["Full Wedding Planning", "Day-of Coordination", "Destination Wedding Planning"],
  Decorators: ["Stage Decoration", "Venue Decoration", "Floral Decoration"],
  Caterers: ["Multi-Cuisine Catering", "Live Counters", "Dessert Counters"],
  DJs: ["Wedding DJ", "Sangeet DJ", "Sound & Lighting"],
  Choreographers: ["Sangeet Choreography", "Couple Dance Choreography", "Group Dance Choreography"],
  "Bridal Wear": ["Bridal Lehenga", "Bridal Saree", "Bridal Gown"],
  "Groom Wear": ["Sherwani", "Groom Suit", "Groom Accessories"],
  Jewellery: ["Bridal Jewellery Sets", "Jewellery Rental", "Custom Jewellery Design"],
  Invitations: ["Printed Invitations", "Digital Invitations", "Custom Invitation Design"],
  Cakes: ["Wedding Cakes", "Custom Theme Cakes", "Dessert Tables"],
  Florists: ["Bridal Bouquets", "Venue Floral Arrangements", "Floral Jewellery"],
  Rentals: ["Furniture Rental", "Tent & Canopy Rental", "Decor Prop Rental"],
  Transportation: ["Wedding Car Rental", "Guest Shuttle Service", "Vintage Car Rental"],
  "Honeymoon & Travel": ["Domestic Honeymoon Packages", "International Honeymoon Packages", "Travel & Visa Assistance"],
  "Destination Weddings": ["Destination Wedding Planning", "Guest Travel Coordination", "Venue Sourcing Abroad"],
};

// Homepage carousel/bento-grid curation — same 7 categories the frontend's
// hardcoded design previously used, now real admin-editable data (see
// Category.isFeaturedOnHomepage/imageUrl/startingPriceLabel, added
// 2026-09-03; frontenddocs/10-risks-and-open-questions.md Open Question
// 21). imageUrl points at the bundled local design assets that ship with
// wedhub-frontend-app/public/images/capsules/ — an admin can override any
// of these via the category admin UI at any time.
const HOMEPAGE_FEATURED_CATEGORIES: Array<{ name: string; imageUrl: string; startingPriceLabel: string; sortOrder: number }> = [
  { name: "Photography", imageUrl: "/images/capsules/photo.jpg", startingPriceLabel: "₹ 50,000", sortOrder: 0 },
  { name: "Venues", imageUrl: "/images/capsules/venue.jpg", startingPriceLabel: "₹ 1,50,000", sortOrder: 1 },
  { name: "Makeup Artists", imageUrl: "/images/capsules/makeup.jpg", startingPriceLabel: "₹ 18,000", sortOrder: 2 },
  { name: "Mehndi Artists", imageUrl: "/images/capsules/mehndi.jpg", startingPriceLabel: "₹ 8,000", sortOrder: 3 },
  { name: "Decorators", imageUrl: "/images/capsules/decor.jpg", startingPriceLabel: "₹ 75,000", sortOrder: 4 },
  { name: "Bridal Wear", imageUrl: "/images/capsules/wear.jpg", startingPriceLabel: "₹ 45,000", sortOrder: 5 },
  { name: "Caterers", imageUrl: "/images/capsules/catering.jpg", startingPriceLabel: "₹ 800 / plate", sortOrder: 6 },
];

interface LocationSeed {
  name: string;
  cities?: string[];
}

// Kerala-only, all 14 districts — this platform currently operates only in
// Kerala, so no other state/city data is seeded (confirmed with the user
// 2026-09-06).
const INDIA_STATES: LocationSeed[] = [
  {
    name: "Kerala",
    cities: [
      "Thiruvananthapuram",
      "Kollam",
      "Pathanamthitta",
      "Alappuzha",
      "Kottayam",
      "Idukki",
      "Ernakulam",
      "Thrissur",
      "Palakkad",
      "Malappuram",
      "Kozhikode",
      "Wayanad",
      "Kannur",
      "Kasaragod",
    ],
  },
];

export async function seedCategories(): Promise<void> {
  for (const [index, name] of WEDDING_CATEGORIES.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: { name, sortOrder: index },
      create: { name, slug: slugify(name), sortOrder: index },
    });

    const attributes = CATEGORY_ATTRIBUTES[name] ?? [];
    for (const [attrIndex, attr] of attributes.entries()) {
      await prisma.categoryAttribute.upsert({
        where: { categoryId_key: { categoryId: category.id, key: attr.key } },
        update: {
          label: attr.label,
          dataType: attr.dataType,
          options: attr.options,
          isFilterable: attr.isFilterable ?? false,
          isComparable: attr.isComparable ?? false,
          sortOrder: attrIndex,
        },
        create: {
          categoryId: category.id,
          key: attr.key,
          label: attr.label,
          dataType: attr.dataType,
          options: attr.options,
          isFilterable: attr.isFilterable ?? false,
          isComparable: attr.isComparable ?? false,
          sortOrder: attrIndex,
        },
      });
    }
  }

  console.info(`Seeded ${WEDDING_CATEGORIES.length} categories.`);
}

async function seedGalleryCategories(): Promise<void> {
  for (const [index, name] of GALLERY_CATEGORIES.entries()) {
    await prisma.galleryCategory.upsert({
      where: { slug: slugify(name) },
      update: { name, sortOrder: index },
      create: { name, slug: slugify(name), sortOrder: index },
    });
  }

  console.info(`Seeded ${GALLERY_CATEGORIES.length} gallery categories.`);
}

export async function seedHomepageFeaturedCategories(): Promise<void> {
  for (const featured of HOMEPAGE_FEATURED_CATEGORIES) {
    const category = await prisma.category.findUnique({ where: { slug: slugify(featured.name) } });
    if (!category) continue;

    await prisma.category.update({
      where: { id: category.id },
      data: {
        isFeaturedOnHomepage: true,
        imageUrl: featured.imageUrl,
        startingPriceLabel: featured.startingPriceLabel,
        homepageSortOrder: featured.sortOrder,
      },
    });
  }

  console.info(`Marked ${HOMEPAGE_FEATURED_CATEGORIES.length} categories as featured on homepage.`);
}

async function seedServices(): Promise<void> {
  let count = 0;

  for (const [categoryName, serviceNames] of Object.entries(CATEGORY_SERVICES)) {
    const category = await prisma.category.findUnique({ where: { slug: slugify(categoryName) } });
    if (!category) continue;

    for (const serviceName of serviceNames) {
      await prisma.service.upsert({
        where: { categoryId_slug: { categoryId: category.id, slug: slugify(serviceName) } },
        update: { name: serviceName },
        create: { categoryId: category.id, name: serviceName, slug: slugify(serviceName) },
      });
      count += 1;
    }
  }

  console.info(`Seeded ${count} services across ${Object.keys(CATEGORY_SERVICES).length} categories.`);
}

export async function seedLocations(): Promise<void> {
  // Prisma's compound-unique `where` clause rejects a literal `null` for parentId,
  // even though the underlying Postgres unique index treats it correctly — so the
  // one top-level (parent-less) row uses findFirst + conditional create instead of upsert.
  const indiaSlug = slugify("India");
  let india = await prisma.location.findFirst({ where: { parentId: null, slug: indiaSlug } });
  if (!india) {
    india = await prisma.location.create({ data: { type: "COUNTRY", name: "India", slug: indiaSlug } });
  }

  let cityCount = 0;

  for (const state of INDIA_STATES) {
    const stateRecord = await prisma.location.upsert({
      where: { parentId_slug: { parentId: india.id, slug: slugify(state.name) } },
      update: {},
      create: { type: "STATE", name: state.name, slug: slugify(state.name), parentId: india.id },
    });

    for (const cityName of state.cities ?? []) {
      await prisma.location.upsert({
        where: { parentId_slug: { parentId: stateRecord.id, slug: slugify(cityName) } },
        update: {},
        create: { type: "CITY", name: cityName, slug: slugify(cityName), parentId: stateRecord.id },
      });
      cityCount += 1;
    }
  }

  console.info(`Seeded India, ${INDIA_STATES.length} states, and ${cityCount} cities.`);
}

// product.md §26's three initial plans, with real prices and the
// entitlement keys Arch Phase 12's EntitlementService reads (see
// entitlement.constants.ts) — never hardcoded in application code, only
// here as seed data admins can subsequently edit via /admin/plans.
interface PlanSeed {
  tier: "FREE" | "PRO" | "PREMIUM";
  billingInterval: "MONTHLY" | "YEARLY";
  name: string;
  price: number;
  trialDays: number;
  limits: Record<string, number>;
  features: Record<string, unknown>;
}

const SUBSCRIPTION_PLANS: PlanSeed[] = [
  {
    tier: "FREE",
    billingInterval: "MONTHLY",
    name: "Free",
    price: 0,
    trialDays: 0,
    limits: { portfolio_limit: 10, video_limit: 1 },
    features: {
      analytics_level: "basic",
      lead_access: true,
      featured_eligibility: false,
      promotional_placement: false,
      response_tools: false,
      priority_support: false,
    },
  },
  {
    tier: "PRO",
    billingInterval: "MONTHLY",
    name: "Pro",
    price: 5999,
    trialDays: 14,
    limits: { portfolio_limit: 100, video_limit: 10 },
    features: {
      analytics_level: "advanced",
      lead_access: true,
      featured_eligibility: false,
      promotional_placement: false,
      response_tools: true,
      priority_support: false,
    },
  },
  {
    tier: "PRO",
    billingInterval: "YEARLY",
    name: "Pro (Yearly)",
    price: 59990,
    trialDays: 14,
    limits: { portfolio_limit: 100, video_limit: 10 },
    features: {
      analytics_level: "advanced",
      lead_access: true,
      featured_eligibility: false,
      promotional_placement: false,
      response_tools: true,
      priority_support: false,
    },
  },
  {
    tier: "PREMIUM",
    billingInterval: "MONTHLY",
    name: "Premium",
    price: 12999,
    trialDays: 14,
    limits: { portfolio_limit: 500, video_limit: 50 },
    features: {
      analytics_level: "advanced",
      lead_access: true,
      featured_eligibility: true,
      promotional_placement: true,
      response_tools: true,
      priority_support: true,
    },
  },
  {
    tier: "PREMIUM",
    billingInterval: "YEARLY",
    name: "Premium (Yearly)",
    price: 129990,
    trialDays: 14,
    limits: { portfolio_limit: 500, video_limit: 50 },
    features: {
      analytics_level: "advanced",
      lead_access: true,
      featured_eligibility: true,
      promotional_placement: true,
      response_tools: true,
      priority_support: true,
    },
  },
];

async function seedSubscriptionPlans(): Promise<void> {
  for (const plan of SUBSCRIPTION_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { tier_billingInterval: { tier: plan.tier, billingInterval: plan.billingInterval } },
      update: {
        name: plan.name,
        price: plan.price,
        trialDays: plan.trialDays,
        limits: plan.limits,
        features: plan.features,
      },
      create: {
        tier: plan.tier,
        billingInterval: plan.billingInterval,
        name: plan.name,
        price: plan.price,
        currency: "INR",
        trialDays: plan.trialDays,
        limits: plan.limits,
        features: plan.features,
      },
    });
  }

  console.info(`Seeded ${SUBSCRIPTION_PLANS.length} subscription plans.`);
}

export async function seedPermissionsAndRoles(): Promise<void> {
  const permissionRecords = await Promise.all(
    SYSTEM_PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { resource_action: { resource: p.resource, action: p.action } },
        update: { description: p.description },
        create: p,
      }),
    ),
  );

  const permissionsByKey = new Map(permissionRecords.map((p) => [`${p.resource}:${p.action}`, p]));

  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description, isSystem: true },
      create: { name: roleDef.name, description: roleDef.description, isSystem: true },
    });

    const grantedPermissions =
      roleDef.permissions === "all"
        ? permissionRecords
        : roleDef.permissions.map((key) => {
            const permission = permissionsByKey.get(key);
            if (!permission) {
              throw new Error(`Seed error: unknown permission key "${key}" for role "${roleDef.name}"`);
            }
            return permission;
          });

    await Promise.all(
      grantedPermissions.map((permission) =>
        prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        }),
      ),
    );
  }

  console.info(`Seeded ${permissionRecords.length} permissions and ${SYSTEM_ROLES.length} roles.`);
}

async function main(): Promise<void> {
  await seedPermissionsAndRoles();
  await seedCategories();
  await seedGalleryCategories();
  await seedHomepageFeaturedCategories();
  await seedServices();
  await seedLocations();
  await seedSubscriptionPlans();
}

// Only auto-run when executed directly (`npx tsx prisma/seed.ts` or `prisma
// db seed`) — NOT when another script imports this module's exported
// functions (e.g. seed-permissions-and-locations.ts), which would otherwise
// trigger this full seed as an unwanted side effect of the import itself.
if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
