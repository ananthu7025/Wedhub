import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminRoles, listAdminPermissions, listAdminUserRoleAssignments } from "@/lib/api/admin";
import { RolesPermissionsBoard } from "./RolesPermissionsBoard";

export const metadata: Metadata = {
  title: "Roles & permissions",
};

export default async function AdminRolesPermissionsPage() {
  await requireAdmin();
  const [{ data: roles }, { data: permissions }, { data: assignments }] = await Promise.all([
    listAdminRoles(),
    listAdminPermissions(),
    listAdminUserRoleAssignments(),
  ]);

  return (
    <AdminShell activeHref="/admin/roles-permissions">
      <RolesPermissionsBoard roles={roles} permissions={permissions} assignments={assignments} />
    </AdminShell>
  );
}
