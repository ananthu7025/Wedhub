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
  Venues: ["Indoor Hall", "Outdoor Lawn", "Banquet Hall", "Destination Venue"],
  "Makeup Artists": ["Bridal Makeup", "Groom Makeup", "Party Makeup", "Trial Session"],
};

interface LocationSeed {
  name: string;
  cities?: string[];
}

const INDIA_STATES: LocationSeed[] = [
  { name: "Maharashtra", cities: ["Mumbai", "Pune"] },
  { name: "Delhi NCR", cities: ["Delhi"] },
  { name: "Karnataka", cities: ["Bengaluru"] },
  { name: "Tamil Nadu", cities: ["Chennai"] },
  { name: "Telangana", cities: ["Hyderabad"] },
];

async function seedCategories(): Promise<void> {
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

async function seedLocations(): Promise<void> {
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

async function main(): Promise<void> {
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

  await seedCategories();
  await seedServices();
  await seedLocations();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
