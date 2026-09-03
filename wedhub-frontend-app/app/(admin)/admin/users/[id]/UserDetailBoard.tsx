"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { restoreAdminUser, suspendAdminUser } from "@/lib/api/admin-client";
import type { AdminUserDetail } from "@/lib/api/admin.types";

function roleLabel(role: string): string {
  if (role === "END_USER") return "End user";
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function statusLabel(status: string): string {
  if (status === "SUSPENDED") return "Restricted";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function statusBadgeVariant(status: string): "green" | "amber" | "grey" {
  switch (status) {
    case "ACTIVE":
      return "green";
    case "SUSPENDED":
      return "amber";
    default:
      return "grey";
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function UserDetailBoard({ initialUser }: { initialUser: AdminUserDetail }) {
  const [user, setUser] = useState(initialUser);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSuspend() {
    const reason = prompt("Reason for suspension:");
    if (!reason) return;
    if (reason.length > 500) {
      setError("Suspension reason must be 500 characters or fewer.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await suspendAdminUser(user.id, { reason });
    setPending(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setUser((prev) => ({ ...prev, status: result.data.status }));
  }

  async function handleRestore() {
    setPending(true);
    setError(null);
    const result = await restoreAdminUser(user.id);
    setPending(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setUser((prev) => ({ ...prev, status: result.data.status }));
  }

  const name = user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName ?? ""}`.trim() : user.email;

  return (
    <div>
      <p className="mb-2.5 text-[13px] text-text-grey">
        <Link href="/admin/users" className="text-text-grey no-underline hover:underline">
          Users
        </Link>{" "}
        / {name}
      </p>
      <div className="mb-6">
        <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-bold">
          {name}
          <Badge variant={statusBadgeVariant(user.status)}>{statusLabel(user.status)}</Badge>
          <Badge variant={user.role === "ADMIN" ? "crimson" : user.role === "VENDOR" ? "blue" : "grey"}>{roleLabel(user.role)}</Badge>
        </h1>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      <div className="grid grid-cols-2 gap-5 max-[800px]:grid-cols-1">
        <div className="rounded-xl border border-border bg-white p-6">
          <h3 className="mb-4 text-base font-bold">Account</h3>
          <div className="flex flex-col gap-2.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-text-grey">Email</span>
              <span className="font-semibold">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-grey">Phone</span>
              <span className="font-semibold">{user.phone ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-grey">Email verified</span>
              <span className="font-semibold">{user.emailVerifiedAt ? formatDateTime(user.emailVerifiedAt) : "Not verified"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-grey">Joined</span>
              <span className="font-semibold">{formatDateTime(user.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-grey">Last login</span>
              <span className="font-semibold">{formatDateTime(user.lastLoginAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-grey">Failed login attempts</span>
              <span className="font-semibold">{user.failedLoginAttempts}</span>
            </div>
            {user.lockedUntil && (
              <div className="flex justify-between">
                <span className="text-text-grey">Locked until</span>
                <span className="font-semibold">{formatDateTime(user.lockedUntil)}</span>
              </div>
            )}
          </div>

          {user.vendor && (
            <div className="mt-4 border-t border-neutral-grey-20 pt-4">
              <div className="mb-1 text-xs text-text-grey">Linked vendor</div>
              <Link href={`/admin/vendors/${user.vendor.id}`} className="text-[13px] font-bold text-brand-primary no-underline">
                {user.vendor.businessName}
              </Link>
              <span className="ml-2 text-xs text-text-grey">({user.vendor.status.replace(/_/g, " ")})</span>
            </div>
          )}

          <div className="mt-5 flex gap-2">
            {user.status === "ACTIVE" && (
              <button
                onClick={handleSuspend}
                disabled={pending}
                className="rounded-md bg-red px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                Suspend
              </button>
            )}
            {user.status === "SUSPENDED" && (
              <button
                onClick={handleRestore}
                disabled={pending}
                className="rounded-md bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                Restore
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
