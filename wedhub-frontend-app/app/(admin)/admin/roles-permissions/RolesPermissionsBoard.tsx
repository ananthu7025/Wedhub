import { Badge } from "@/components/ui/Badge";
import type { AdminPermission, AdminRole, AdminUserRoleAssignment } from "@/lib/api/admin.types";

/**
 * Roles & permissions (Frontend Arch Phase 10), matching
 * wedhub-frontend/admin/roles-permissions.html. Genuinely real, read-only
 * data from GET /admin/roles, /admin/permissions, /admin/admin-users — but
 * confirmed via the backend's own repository comment that NONE of this is
 * enforced: authorize() only ever checks the coarse User.role='ADMIN'
 * enum. This screen is deliberately not interactive (no editable
 * checkboxes) — the mockup's warning banner is reproduced verbatim since
 * it accurately describes real backend behavior, not a hypothetical.
 */

const ROLE_BADGE_VARIANTS: Array<"crimson" | "blue" | "green" | "amber"> = ["crimson", "blue", "green", "amber"];

function roleBadgeVariant(roleName: string, allRoles: AdminRole[]): "crimson" | "blue" | "green" | "amber" {
  const index = allRoles.findIndex((r) => r.name === roleName);
  return ROLE_BADGE_VARIANTS[index % ROLE_BADGE_VARIANTS.length];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function RolesPermissionsBoard({
  roles,
  permissions,
  assignments,
}: {
  roles: AdminRole[];
  permissions: AdminPermission[];
  assignments: AdminUserRoleAssignment[];
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Roles & permissions</h1>
        <p className="text-sm text-text-grey">Visibility into admin role assignments and their intended permission sets.</p>
      </div>

      <div className="mb-6 flex gap-3 rounded-lg border border-amber-70 bg-amber-10 p-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0 text-amber-70">
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <p className="text-[13px] leading-relaxed text-amber-70">
          <strong className="block">This screen is read-only.</strong>
          Permission enforcement is not yet wired up — every admin account is currently gated only by the single
          <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs">User.role = ADMIN</code>
          flag. The roles, permissions and assignments shown below exist in the database and are informational
          only; nothing here changes what an admin can actually do until fine-grained RBAC enforcement ships in a
          later phase.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-white">
        <div className="border-b border-border p-5">
          <h3 className="text-[15px] font-bold">Admin users</h3>
          <p className="text-xs text-text-grey">Platform accounts with a fine-grained role assignment ({assignments.length}).</p>
        </div>
        {assignments.length === 0 ? (
          <p className="p-5 text-[13px] text-text-grey">
            No user currently has a row in the AdminUser table — the coarse User.role=&quot;ADMIN&quot; flag is all that
            gates access for every admin account in this environment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-grey">
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Assigned role</th>
                  <th className="px-5 py-3">Account status</th>
                  <th className="px-5 py-3">Added</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.userId} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">{a.user.email}</td>
                    <td className="px-5 py-3">
                      <Badge variant={roleBadgeVariant(a.role.name, roles)}>{a.role.name}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={a.user.status === "ACTIVE" ? "green" : "red"}>{a.user.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-text-grey">{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-white">
        <div className="border-b border-border p-5">
          <h3 className="text-[15px] font-bold">Role → permission matrix</h3>
          <p className="text-xs text-text-grey">
            Shown as read-only badges, not editable checkboxes — {permissions.length} permissions defined across {roles.length} roles.
          </p>
        </div>
        <div className="flex flex-col gap-5 p-5">
          {roles.map((role) => (
            <div key={role.id}>
              <p className="mb-2.5 flex items-center gap-2">
                <Badge variant={roleBadgeVariant(role.name, roles)}>{role.name}</Badge>
                {role.description && <span className="text-xs text-text-grey">{role.description}</span>}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {role.rolePermissions.length === 0 ? (
                  <span className="text-xs text-text-grey">No permissions assigned.</span>
                ) : (
                  role.rolePermissions.map((rp) => (
                    <Badge key={rp.permissionId} variant="grey">
                      {rp.permission.resource}:{rp.permission.action}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
