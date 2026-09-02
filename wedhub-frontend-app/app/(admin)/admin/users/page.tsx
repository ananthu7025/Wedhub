import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminUsers } from "@/lib/api/admin";
import type { UserStatus } from "@/lib/api/admin.types";
import { UsersTable } from "./UsersTable";

export const metadata: Metadata = {
  title: "Users",
};

const VALID_STATUSES: UserStatus[] = ["ACTIVE", "SUSPENDED", "DEACTIVATED"];

interface UsersPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  await requireAdmin();
  const { status: statusParam } = await searchParams;
  const status = VALID_STATUSES.includes(statusParam as UserStatus) ? (statusParam as UserStatus) : undefined;

  const { data: users, meta } = await listAdminUsers({ status, limit: 50 });

  return (
    <AdminShell activeHref="/admin/users">
      <UsersTable initialUsers={users} total={meta?.total ?? users.length} activeStatus={status} />
    </AdminShell>
  );
}
