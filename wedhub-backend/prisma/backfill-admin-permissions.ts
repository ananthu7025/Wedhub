import { PrismaClient } from "@prisma/client";

/**
 * One-off idempotent backfill for docs/bugs.md #2's RBAC enforcement
 * (authorize.middleware.ts's hasAdminAccess): grants the "admin" Role all
 * SYSTEM_PERMISSIONS, matching what prisma/seed.ts's main() does for a
 * from-empty database. Needed on any database where "admin" Role rows
 * exist without their RolePermission grants (e.g. created via
 * create-admin.ts, which only links AdminUser -> Role and never touches
 * permissions). Safe to re-run.
 * Run via: npx tsx prisma/backfill-admin-permissions.ts
 */
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

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const permissionRecords = await Promise.all(
      SYSTEM_PERMISSIONS.map((p) =>
        prisma.permission.upsert({
          where: { resource_action: { resource: p.resource, action: p.action } },
          update: { description: p.description },
          create: p,
        }),
      ),
    );

    const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
    if (!adminRole) {
      console.error('No "admin" Role found — nothing to backfill.');
      process.exit(1);
    }

    await Promise.all(
      permissionRecords.map((permission) =>
        prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
          update: {},
          create: { roleId: adminRole.id, permissionId: permission.id },
        }),
      ),
    );

    console.log(`Granted ${permissionRecords.length} permissions to the "admin" role.`);

    const adminsWithoutLink = await prisma.user.findMany({
      where: { role: "ADMIN", adminUser: null },
    });
    for (const user of adminsWithoutLink) {
      await prisma.adminUser.create({ data: { userId: user.id, roleId: adminRole.id } });
      console.log(`Linked ${user.email} to the "admin" role (had no AdminUser row).`);
    }

    if (adminsWithoutLink.length === 0) {
      console.log("Every ADMIN-role user already had an AdminUser row.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
