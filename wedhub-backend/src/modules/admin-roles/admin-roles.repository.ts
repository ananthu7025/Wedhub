import { prisma } from "../../config/database";

// Read-only visibility only — confirmed with the user. authorize() gates
// every admin route on the coarse User.role="ADMIN" enum; nothing in this
// codebase consults these tables for real access-control decisions yet.
// Wiring fine-grained RBAC enforcement is a deliberate future decision, not
// a side effect of exposing these tables for viewing.
export function listRoles() {
  return prisma.role.findMany({
    include: { rolePermissions: { include: { permission: true } } },
    orderBy: { name: "asc" },
  });
}

export function listPermissions() {
  return prisma.permission.findMany({ orderBy: [{ resource: "asc" }, { action: "asc" }] });
}

export function listAdminUsers() {
  return prisma.adminUser.findMany({
    include: { user: { select: { id: true, email: true, role: true, status: true } }, role: true },
    orderBy: { createdAt: "asc" },
  });
}
