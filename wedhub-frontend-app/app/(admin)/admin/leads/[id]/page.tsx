import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminLeadDetail } from "@/lib/api/admin";
import { AdminLeadDetailBoard } from "./AdminLeadDetailBoard";

export const metadata: Metadata = {
  title: "Lead detail",
};

export default async function AdminLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { data: lead } = await getAdminLeadDetail(id);

  return (
    <AdminShell activeHref="/admin/leads">
      <AdminLeadDetailBoard initialLead={lead} />
    </AdminShell>
  );
}
