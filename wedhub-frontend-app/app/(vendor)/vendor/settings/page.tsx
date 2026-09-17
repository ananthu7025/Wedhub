import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { listMyNotificationPreferences } from "@/lib/api/notification-preferences";
import { getMe } from "@/lib/api/account";
import { listCategoriesSelf, listLocationsSelf } from "@/lib/api/vendor-self";
import { SettingsBoard } from "./SettingsBoard";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function VendorSettingsPage() {
  const vendor = await requireVendorOwnership();
  // categories/cities added for item 12/21's restructure — Category &
  // Location now lives here instead of the Profile editor, which is now
  // category-attributes-only (see ../profile/ProfileEditor.tsx).
  const [{ data: preferences }, { data: me }, { data: categories }, { data: cities }] = await Promise.all([
    listMyNotificationPreferences(),
    getMe(),
    listCategoriesSelf(),
    listLocationsSelf("CITY"),
  ]);

  return (
    <VendorShell activeHref="/vendor/settings" vendorName={vendor.businessName}>
      <SettingsBoard vendor={vendor} me={me} categories={categories} cities={cities} initialPreferences={preferences} />
    </VendorShell>
  );
}
