import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { listMyNotifications } from "@/lib/api/account";
import { NotificationsList } from "@/components/shared/NotificationsList";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function VendorNotificationsPage() {
  const vendor = await requireVendorOwnership();
  const { data: notifications } = await listMyNotifications(false, 1, 50);

  return (
    <VendorShell activeHref="/vendor/notifications" vendorName={vendor.businessName}>
      <NotificationsList initialNotifications={notifications} />
    </VendorShell>
  );
}
