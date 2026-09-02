import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { listCategoriesSelf, listLocationsSelf } from "@/lib/api/vendor-self";
import { ProfileEditor } from "./ProfileEditor";

export const metadata: Metadata = {
  title: "My Profile",
};

export default async function VendorProfilePage() {
  const vendor = await requireVendorOwnership();
  const [{ data: categories }, { data: cities }] = await Promise.all([
    listCategoriesSelf(),
    listLocationsSelf("CITY"),
  ]);

  return (
    <VendorShell activeHref="/vendor/profile" vendorName={vendor.businessName}>
      <ProfileEditor vendor={vendor} categories={categories} cities={cities} />
    </VendorShell>
  );
}
