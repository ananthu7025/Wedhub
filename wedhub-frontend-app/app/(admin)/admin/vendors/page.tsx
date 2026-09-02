import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminVendors } from "@/lib/api/admin";
import type { VendorStatus } from "@/lib/api/vendor-self.types";
import { VendorsTable } from "./VendorsTable";

export const metadata: Metadata = {
  title: "Vendors",
};

const VALID_STATUSES: VendorStatus[] = [
  "DRAFT",
  "PENDING_VERIFICATION",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "DEACTIVATED",
];

interface VendorsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminVendorsPage({ searchParams }: VendorsPageProps) {
  await requireAdmin();
  const { status: statusParam } = await searchParams;
  const status = VALID_STATUSES.includes(statusParam as VendorStatus) ? (statusParam as VendorStatus) : undefined;

  const { data: vendors, meta } = await listAdminVendors({ status, limit: 50 });

  return (
    <AdminShell activeHref="/admin/vendors">
      <VendorsTable initialVendors={vendors} total={meta?.total ?? vendors.length} activeStatus={status} />
    </AdminShell>
  );
}
