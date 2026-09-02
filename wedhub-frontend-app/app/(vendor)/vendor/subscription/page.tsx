import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { listPlans, getMySubscription, listMyInvoices } from "@/lib/api/subscriptions";
import { SubscriptionBoard } from "./SubscriptionBoard";

export const metadata: Metadata = {
  title: "Subscription",
};

export default async function VendorSubscriptionPage() {
  const vendor = await requireVendorOwnership();
  const [{ data: plans }, { data: subscription }, { data: invoices }] = await Promise.all([
    listPlans(),
    getMySubscription(),
    listMyInvoices(),
  ]);

  return (
    <VendorShell activeHref="/vendor/subscription" vendorName={vendor.businessName}>
      <SubscriptionBoard initialPlans={plans} initialSubscription={subscription} invoices={invoices} />
    </VendorShell>
  );
}
