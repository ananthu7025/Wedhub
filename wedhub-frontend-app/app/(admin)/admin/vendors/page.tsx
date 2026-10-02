import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminVendors, listAdminCategories, listAdminLocations } from "@/lib/api/admin";
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
  searchParams: Promise<{
    status?: string;
    search?: string;
    categoryId?: string;
    cityId?: string;
    isPremium?: string;
    isFeatured?: string;
  }>;
}

export default async function AdminVendorsPage({ searchParams }: VendorsPageProps) {
  await requireAdmin();
  const { status: statusParam, search, categoryId, cityId, isPremium, isFeatured } = await searchParams;
  const status = VALID_STATUSES.includes(statusParam as VendorStatus) ? (statusParam as VendorStatus) : undefined;

  const [{ data: vendors, meta }, categories, cities] = await Promise.all([
    listAdminVendors({
      status,
      search,
      categoryId,
      cityId,
      isPremium: isPremium === "true" ? true : undefined,
      isFeatured: isFeatured === "true" ? true : undefined,
      limit: 50,
    }),
    listAdminCategories(false).then((r) => r.data),
    listAdminLocations("CITY", undefined, false).then((r) => r.data),
  ]);

  return (
    <AdminShell activeHref="/admin/vendors">
      <VendorsTable
        initialVendors={vendors}
        total={meta?.total ?? vendors.length}
        activeStatus={status}
        activeSearch={search ?? ""}
        activeCategoryId={categoryId ?? ""}
        activeCityId={cityId ?? ""}
        activeIsPremium={isPremium === "true"}
        activeIsFeatured={isFeatured === "true"}
        categories={categories}
        cities={cities}
      />
    </AdminShell>
  );
}
