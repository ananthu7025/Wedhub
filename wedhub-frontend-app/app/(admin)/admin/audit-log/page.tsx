import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminAuditLogs } from "@/lib/api/admin";
import { AuditLogBoard } from "./AuditLogBoard";

export const metadata: Metadata = {
  title: "Audit log",
};

interface AuditLogPageProps {
  searchParams: Promise<{ entityType?: string; entityId?: string; actorId?: string; page?: string }>;
}

export default async function AdminAuditLogPage({ searchParams }: AuditLogPageProps) {
  await requireAdmin();
  const { entityType, entityId, actorId, page } = await searchParams;
  const pageNum = Number(page) > 0 ? Number(page) : 1;

  const { data: entries, meta } = await listAdminAuditLogs({
    entityType: entityType || undefined,
    entityId: entityId || undefined,
    actorId: actorId || undefined,
    page: pageNum,
    limit: 20,
  });

  return (
    <AdminShell activeHref="/admin/audit-log">
      <AuditLogBoard
        entries={entries}
        total={meta?.total ?? entries.length}
        totalPages={meta?.totalPages ?? 1}
        page={pageNum}
        filters={{ entityType, entityId, actorId }}
      />
    </AdminShell>
  );
}
