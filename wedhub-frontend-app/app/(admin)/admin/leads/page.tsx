import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminLeads } from "@/lib/api/admin";
import type { LeadStatus } from "@/lib/api/account.types";
import { AdminLeadsTable } from "./AdminLeadsTable";

export const metadata: Metadata = {
  title: "Leads",
};

const VALID_STATUSES: LeadStatus[] = [
  "NEW", "CONTACTED", "RESPONDED", "QUALIFIED", "MEETING", "QUOTED", "WON", "LOST", "SPAM", "CLOSED",
];

interface LeadsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminLeadsPage({ searchParams }: LeadsPageProps) {
  await requireAdmin();
  const { status: statusParam } = await searchParams;
  const status = VALID_STATUSES.includes(statusParam as LeadStatus) ? (statusParam as LeadStatus) : undefined;

  const { data: leads, meta } = await listAdminLeads({ status, limit: 50 });

  return (
    <AdminShell activeHref="/admin/leads">
      <AdminLeadsTable initialLeads={leads} total={meta?.total ?? leads.length} activeStatus={status} />
    </AdminShell>
  );
}
