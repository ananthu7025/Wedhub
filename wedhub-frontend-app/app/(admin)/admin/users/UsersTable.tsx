"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { restoreAdminUser, suspendAdminUser } from "@/lib/api/admin-client";
import type { AdminUserListItem, UserStatus } from "@/lib/api/admin.types";

/**
 * Users list (Frontend Arch Phase 8), matching wedhub-frontend/admin/users.html.
 * The mockup's "Restricted" pill maps to the real SUSPENDED status (no
 * distinct enum value exists); "Reported" is omitted entirely — confirmed
 * via research that ReviewReport ties a reporter to a review, not a user,
 * so there is no real "this user was reported" data source
 * (listUsersQuerySchema has an explicit code comment to this effect). No
 * free-text search either — GET /admin/users has no search param.
 */

const STATUS_TABS: Array<{ value: UserStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Restricted" },
  { value: "DEACTIVATED", label: "Deactivated" },
];

function roleBadgeVariant(role: string): "grey" | "blue" | "crimson" {
  switch (role) {
    case "VENDOR":
      return "blue";
    case "ADMIN":
      return "crimson";
    default:
      return "grey";
  }
}

function roleLabel(role: string): string {
  if (role === "END_USER") return "End user";
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function statusBadgeVariant(status: UserStatus): "green" | "amber" | "grey" {
  switch (status) {
    case "ACTIVE":
      return "green";
    case "SUSPENDED":
      return "amber";
    case "DEACTIVATED":
      return "grey";
  }
}

function statusLabel(status: UserStatus): string {
  if (status === "SUSPENDED") return "Restricted";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function UsersTable({
  initialUsers,
  total,
  activeStatus,
}: {
  initialUsers: AdminUserListItem[];
  total: number;
  activeStatus: UserStatus | undefined;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSuspend(id: string) {
    const reason = prompt("Reason for suspension:");
    if (!reason) return;
    setPending(id);
    setError(null);
    const result = await suspendAdminUser(id, { reason });
    setPending(null);
    setOpenMenuId(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: result.data.status } : u)));
  }

  async function handleRestore(id: string) {
    setPending(id);
    setError(null);
    const result = await restoreAdminUser(id);
    setPending(null);
    setOpenMenuId(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: result.data.status } : u)));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-text-grey">{total.toLocaleString("en-IN")} registered users</p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = tab.value === "ALL" ? activeStatus === undefined : activeStatus === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value === "ALL" ? "/admin/users" : `/admin/users?status=${tab.value}`}
              className={`rounded-full px-4 py-2 text-[13px] font-bold no-underline ${
                isActive ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
          <h3 className="text-[15px] font-bold">No users here</h3>
          <p className="mt-1.5 text-[13px] text-text-grey">Nothing matches this filter yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-xs text-text-grey">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const name = user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName ?? ""}`.trim() : user.email;
                return (
                  <tr key={user.id} className="border-b border-neutral-grey-20 last:border-b-0 hover:bg-anti-flash-white-30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-ink-soft text-xs font-bold text-white">
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold">{name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={roleBadgeVariant(user.role)}>{roleLabel(user.role)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(user.status)}>{statusLabel(user.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">{formatDate(user.createdAt)}</td>
                    <td className="relative px-4 py-3 text-right">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                        disabled={pending === user.id}
                        className="rounded-md border border-border bg-white px-3 py-1.5 text-[13px] font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
                      >
                        Actions ▾
                      </button>
                      {openMenuId === user.id && (
                        <div className="absolute right-4 top-11 z-20 min-w-[170px] overflow-hidden rounded-md border border-border bg-white shadow-lg">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="block px-3.5 py-2.5 text-[13px] font-semibold text-text-dark no-underline hover:bg-surface-input"
                          >
                            View profile
                          </Link>
                          {user.status === "ACTIVE" && (
                            <button
                              onClick={() => handleSuspend(user.id)}
                              className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold text-red hover:bg-surface-input"
                            >
                              Suspend
                            </button>
                          )}
                          {user.status === "SUSPENDED" && (
                            <button
                              onClick={() => handleRestore(user.id)}
                              className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold text-text-dark hover:bg-surface-input"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
