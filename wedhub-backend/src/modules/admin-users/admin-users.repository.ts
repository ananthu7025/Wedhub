import type { Prisma, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../../config/database";

const LIST_SELECT = {
  id: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  createdAt: true,
  profile: { select: { firstName: true, lastName: true } },
} satisfies Prisma.UserSelect;

export function listUsers(filter: { status: UserStatus | undefined; role: UserRole | undefined; page: number; limit: number }) {
  const where: Prisma.UserWhereInput = {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.role ? { role: filter.role } : {}),
  };
  return prisma.user.findMany({
    where,
    select: LIST_SELECT,
    orderBy: { createdAt: "desc" },
    skip: (filter.page - 1) * filter.limit,
    take: filter.limit,
  });
}

export function countUsers(filter: { status: UserStatus | undefined; role: UserRole | undefined }) {
  const where: Prisma.UserWhereInput = {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.role ? { role: filter.role } : {}),
  };
  return prisma.user.count({ where });
}

export function findUserForAdmin(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      ...LIST_SELECT,
      lastLoginAt: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      vendor: { select: { id: true, businessName: true, slug: true, status: true } },
    },
  });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id }, select: { id: true, status: true } });
}
