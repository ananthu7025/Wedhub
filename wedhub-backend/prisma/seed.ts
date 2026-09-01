import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  { name: "super_admin", description: "Full platform access", permissions: "all" },
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
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
