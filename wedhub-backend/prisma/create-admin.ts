import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../src/common/utils/password.util";

/**
 * One-off idempotent admin bootstrap for a fresh (unseeded) database.
 * Run via: npx tsx prisma/create-admin.ts <email> <password>
 * Safe to re-run — upserts the "admin" Role and the given User/AdminUser link.
 */
async function main(): Promise<void> {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: tsx prisma/create-admin.ts <email> <password>");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const role = await prisma.role.upsert({
      where: { name: "admin" },
      update: {},
      create: { name: "admin", description: "Full platform access", isSystem: true },
    });

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.upsert({
      where: { email },
      update: { role: UserRole.ADMIN, passwordHash, emailVerifiedAt: new Date() },
      create: {
        email,
        passwordHash,
        role: UserRole.ADMIN,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.adminUser.upsert({
      where: { userId: user.id },
      update: { roleId: role.id },
      create: { userId: user.id, roleId: role.id },
    });

    console.log(`Admin user ready: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
