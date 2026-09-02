import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminUserDetail } from "@/lib/api/admin";
import { UserDetailBoard } from "./UserDetailBoard";

export const metadata: Metadata = {
  title: "User detail",
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { data: user } = await getAdminUserDetail(id);

  return (
    <AdminShell activeHref="/admin/users">
      <UserDetailBoard initialUser={user} />
    </AdminShell>
  );
}
