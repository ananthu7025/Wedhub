import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminCategories, listAdminLocations, listAdminSeoOverrides } from "@/lib/api/admin";
import { SeoOverridesBoard } from "./SeoOverridesBoard";

export const metadata: Metadata = {
  title: "SEO",
};

/**
 * SEO (Arch Phase 17, added 2026-09-03). Category/City/Category+City
 * landing pages are generated automatically from a template (real
 * category/location names + live vendor count) — there is no per-page
 * authoring step. This screen only lets an admin override the computed
 * title/description/OG image for one specific combination, or force a
 * page non-indexable regardless of vendor count.
 */
export default async function AdminSeoPage() {
  await requireAdmin();

  const [{ data: overrides }, { data: categories }, { data: cities }] = await Promise.all([
    listAdminSeoOverrides(),
    listAdminCategories(false),
    listAdminLocations("CITY", undefined, false),
  ]);

  return (
    <AdminShell activeHref="/admin/seo">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">SEO</h1>
        <p className="text-sm text-text-grey">
          Category, city, and category+city landing pages are generated automatically from real vendor inventory.
          Override a specific page&apos;s title, description, or indexability here when needed.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <SeoOverridesBoard initialOverrides={overrides} categories={categories} cities={cities} />
      </div>
    </AdminShell>
  );
}
