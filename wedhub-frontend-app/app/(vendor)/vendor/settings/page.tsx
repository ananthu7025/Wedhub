import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { listMyNotificationPreferences } from "@/lib/api/notification-preferences";
import { getMe } from "@/lib/api/account";
import { SettingsBoard } from "./SettingsBoard";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function VendorSettingsPage() {
  const vendor = await requireVendorOwnership();
  const [{ data: preferences }, { data: me }] = await Promise.all([
    listMyNotificationPreferences(),
    getMe(),
  ]);

  return (
    <VendorShell activeHref="/vendor/settings" vendorName={vendor.businessName}>
      <SettingsBoard vendor={vendor} me={me} initialPreferences={preferences} />
    </VendorShell>
  );
}
