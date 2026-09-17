import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminFlaggedCommunityPosts } from "@/lib/api/admin";
import { AdminCommunityBoard } from "./AdminCommunityBoard";

export const metadata: Metadata = {
  title: "Community",
};

export default async function AdminCommunityPage() {
  await requireAdmin();
  const { data: posts, meta } = await listAdminFlaggedCommunityPosts({ limit: 50 });

  return (
    <AdminShell activeHref="/admin/community">
      <AdminCommunityBoard initialPosts={posts} total={meta?.total ?? posts.length} />
    </AdminShell>
  );
}
