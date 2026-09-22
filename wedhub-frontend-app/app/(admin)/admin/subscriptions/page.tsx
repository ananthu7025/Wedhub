import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminPlans, getAdminPlanFeatureCatalog } from "@/lib/api/admin";
import { SubscriptionsBoard } from "./SubscriptionsBoard";

export const metadata: Metadata = {
  title: "Subscriptions & payments",
};

export default async function AdminSubscriptionsPage() {
  await requireAdmin();
  const [{ data: plans }, { data: featureCatalog }] = await Promise.all([listAdminPlans(), getAdminPlanFeatureCatalog()]);

  return (
    <AdminShell activeHref="/admin/subscriptions">
      <SubscriptionsBoard initialPlans={plans} featureCatalog={featureCatalog} />
    </AdminShell>
  );
}
