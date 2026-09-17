import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { listCategoriesSelf } from "@/lib/api/vendor-self";
import { ProfileEditor } from "./ProfileEditor";

export const metadata: Metadata = {
  title: "My Profile",
};

export default async function VendorProfilePage() {
  const vendor = await requireVendorOwnership();
  const { data: categories } = await listCategoriesSelf();

  return (
    <VendorShell activeHref="/vendor/profile" vendorName={vendor.businessName}>
      <ProfileEditor vendor={vendor} categories={categories} />
    </VendorShell>
  );
}
