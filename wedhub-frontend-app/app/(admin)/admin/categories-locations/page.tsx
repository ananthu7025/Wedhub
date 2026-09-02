import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminCategories, listAdminLocations } from "@/lib/api/admin";
import { CatalogBoard } from "./CatalogBoard";

export const metadata: Metadata = {
  title: "Categories & locations",
};

export default async function AdminCatalogPage() {
  await requireAdmin();
  const [{ data: categories }, { data: countries }] = await Promise.all([
    listAdminCategories(),
    listAdminLocations("COUNTRY"),
  ]);

  return (
    <AdminShell activeHref="/admin/categories-locations">
      <CatalogBoard initialCategories={categories} initialCountries={countries} />
    </AdminShell>
  );
}
