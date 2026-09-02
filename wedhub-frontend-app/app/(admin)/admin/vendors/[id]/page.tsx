import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminVendorDetail, getAdminVendorStatusHistory } from "@/lib/api/admin";
import { VendorDetailBoard } from "./VendorDetailBoard";

export const metadata: Metadata = {
  title: "Vendor detail",
};

export default async function AdminVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [{ data: vendor }, { data: statusHistory }] = await Promise.all([
    getAdminVendorDetail(id),
    getAdminVendorStatusHistory(id),
  ]);

  return (
    <AdminShell activeHref="/admin/vendors">
      <VendorDetailBoard initialVendor={vendor} statusHistory={statusHistory} />
    </AdminShell>
  );
}
