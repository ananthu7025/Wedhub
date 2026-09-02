import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { CreateVendorForm } from "./CreateVendorForm";

export const metadata: Metadata = {
  title: "Create vendor",
};

export default async function AdminCreateVendorPage() {
  await requireAdmin();

  return (
    <AdminShell activeHref="/admin/vendors/create">
      <CreateVendorForm />
    </AdminShell>
  );
}
