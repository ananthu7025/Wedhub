import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminDashboard, listAdminAuditLogs, listAdminVendors } from "@/lib/api/admin";
import { AuditActivityRow } from "@/components/admin/AuditActivityRow";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const [{ data: metrics }, { data: recentActivity }, { data: pendingVendors }] = await Promise.all([
    getAdminDashboard(),
    listAdminAuditLogs({ limit: 5 }),
    listAdminVendors({ status: "PENDING_APPROVAL", limit: 4 }),
  ]);

  return (
    <AdminShell activeHref="/admin/dashboard">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-text-grey">Marketplace overview</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/vendors?status=PENDING_APPROVAL"
            className="rounded-md border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-dark no-underline hover:bg-surface-input"
          >
            Review pending vendors
          </Link>
          <Link
            href="/admin/vendors/create"
            className="rounded-md bg-brand-primary px-4 py-2.5 text-sm font-bold text-white no-underline"
          >
            Create vendor
          </Link>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1">
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">Total users</p>
          <p className="text-2xl font-bold">{metrics.totalUsers.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">Total vendors</p>
          <p className="text-2xl font-bold">{metrics.totalVendors.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">Active vendors</p>
          <p className="text-2xl font-bold">{metrics.activeVendors.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-xs text-text-grey">
            {metrics.totalVendors > 0 ? `${((metrics.activeVendors / metrics.totalVendors) * 100).toFixed(1)}% of total` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">Paid vendors</p>
          <p className="text-2xl font-bold">{metrics.paidVendors.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-xs text-text-grey">active or trialing subscriptions</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[500px]:grid-cols-1">
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">Total leads</p>
          <p className="text-2xl font-bold">{metrics.totalLeads.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">Total enquiries</p>
          <p className="text-2xl font-bold">{metrics.totalEnquiries.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">Conversion rate</p>
          <p className="text-2xl font-bold">{(metrics.conversionRate * 100).toFixed(1)}%</p>
          <p className="mt-1 text-xs text-text-grey">won ÷ total leads</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">New registrations</p>
          <p className="text-2xl font-bold">{metrics.newRegistrations.count.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-xs text-text-grey">last {metrics.newRegistrations.windowDays} days</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">Revenue (this month)</p>
          <p className="text-2xl font-bold">{formatCurrency(metrics.revenue.thisMonth)}</p>
          <p className="mt-1 text-xs text-text-grey">{formatCurrency(metrics.revenue.total)} all-time</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="mb-1 text-xs font-semibold text-text-grey">MRR</p>
          <p className="text-2xl font-bold">{formatCurrency(metrics.mrr)}</p>
          <p className="mt-1 text-xs text-text-grey">from active subscriptions only</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Recent activity</h3>
              <p className="text-xs text-text-grey">Latest actions from the audit log</p>
            </div>
            <Link href="/admin/audit-log" className="text-[13px] font-bold text-brand-primary no-underline">
              View all
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-text-grey">No activity yet.</p>
          ) : (
            recentActivity.map((entry) => <AuditActivityRow key={entry.id} entry={entry} />)
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Pending approvals</h3>
              <p className="text-xs text-text-grey">Vendors awaiting review</p>
            </div>
            <Link href="/admin/vendors?status=PENDING_APPROVAL" className="text-[13px] font-bold text-brand-primary no-underline">
              View all
            </Link>
          </div>
          {pendingVendors.length === 0 ? (
            <p className="text-sm text-text-grey">Nothing pending review.</p>
          ) : (
            pendingVendors.map((vendor) => (
              <div key={vendor.id} className="flex items-center gap-3 border-b border-neutral-grey-20 py-3 last:border-b-0">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-surface-input text-xs font-bold text-text-grey">
                  {vendor.businessName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{vendor.businessName}</p>
                  <p className="text-xs text-text-grey">submitted {formatDate(vendor.submittedAt)}</p>
                </div>
                <Link
                  href={`/admin/vendors/${vendor.id}`}
                  className="flex-shrink-0 rounded-md border border-border bg-white px-3 py-1.5 text-[13px] font-bold text-text-dark no-underline hover:bg-surface-input"
                >
                  Review
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminShell>
  );
}
