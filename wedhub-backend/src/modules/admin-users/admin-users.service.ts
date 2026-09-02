import type { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { ConflictError, NotFoundError } from "../../common/errors";
import * as adminUsersRepository from "./admin-users.repository";

export function listUsers(filter: { status: UserStatus | undefined; role: UserRole | undefined; page: number; limit: number }) {
  return Promise.all([adminUsersRepository.listUsers(filter), adminUsersRepository.countUsers(filter)]);
}

export async function getUser(id: string) {
  const user = await adminUsersRepository.findUserForAdmin(id);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
}

// product.md §60's audit-log shape (admin ID, action, object, before/after
// status, timestamp, reason) — same transactional pattern as
// vendor-admin.service's transitionStatus.
async function transitionStatus(input: { userId: string; adminId: string; toStatus: UserStatus; reason: string | undefined; action: string }) {
  const user = await adminUsersRepository.findUserById(input.userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  if (user.status === input.toStatus) {
    throw new ConflictError(`User is already ${input.toStatus}`);
  }

  // A real bug caught live: prisma.user.update() with no `select` returns
  // every column, including passwordHash — the bcrypt hash was leaking
  // straight into the suspend/restore API response. Fixed by selecting
  // only safe fields.
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: input.userId },
      data: { status: input.toStatus },
      select: { id: true, email: true, phone: true, role: true, status: true, updatedAt: true },
    }),
    prisma.auditLog.create({
      data: {
        actorId: input.adminId,
        action: input.action,
        entityType: "user",
        entityId: input.userId,
        before: { status: user.status },
        after: { status: input.toStatus, reason: input.reason ?? null },
      },
    }),
  ]);

  return updated;
}

export function suspendUser(userId: string, adminId: string, reason: string) {
  return transitionStatus({ userId, adminId, toStatus: "SUSPENDED", reason, action: "ADMIN_SUSPENDED_USER" });
}

export function restoreUser(userId: string, adminId: string) {
  return transitionStatus({ userId, adminId, toStatus: "ACTIVE", reason: undefined, action: "ADMIN_RESTORED_USER" });
}
