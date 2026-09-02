import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminPlans } from "@/lib/api/admin";
import { SubscriptionsBoard } from "./SubscriptionsBoard";

export const metadata: Metadata = {
  title: "Subscriptions & payments",
};

export default async function AdminSubscriptionsPage() {
  await requireAdmin();
  const { data: plans } = await listAdminPlans();

  return (
    <AdminShell activeHref="/admin/subscriptions">
      <SubscriptionsBoard initialPlans={plans} />
    </AdminShell>
  );
}
