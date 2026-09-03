import type { NextFunction, Request, Response } from "express";
import { AuthenticationError, AuthorizationError } from "../errors";
import { Role } from "../enums/roles.enum";
import { prisma } from "../../config/database";

// docs/bugs.md #2 — the Role/Permission/AdminUser tables (schema.prisma)
// were fully modeled and admin-viewable (admin-roles module) but never
// actually consulted for access control; every admin route just checked
// the coarse User.role enum below, so the roles/permissions an admin UI
// lets you inspect were purely decorative. Wired for real 2026-09-03 (user
// decision) — every existing ADMIN-role user was first backfilled with a
// real AdminUser -> "admin" Role link (that role carries all seeded
// permissions), so this changes nothing for current admins; it only starts
// mattering once a restricted, non-"admin" role can actually be created and
// assigned (no such endpoint exists yet — RolePermission/AdminUser mutation
// endpoints are a separate, not-yet-built piece).
//
// Scoped to the ADMIN case only: end_user/vendor roles are seeded in the
// same Role table for admin-UI visibility, but nothing in this codebase
// ever creates an AdminUser row for a non-admin, so there is no real
// per-request RBAC decision to make for those two roles today.
async function hasAdminAccess(userId: string): Promise<boolean> {
  const adminUser = await prisma.adminUser.findUnique({
    where: { userId },
    include: { role: { include: { rolePermissions: true } } },
  });
  return adminUser !== null && adminUser.role.rolePermissions.length > 0;
}

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AuthorizationError());
      return;
    }

    if (allowedRoles.includes(Role.ADMIN) && req.user.role === Role.ADMIN) {
      hasAdminAccess(req.user.id)
        .then((allowed) => {
          if (!allowed) {
            next(new AuthorizationError());
            return;
          }
          next();
        })
        .catch(next);
      return;
    }

    next();
  };
}
