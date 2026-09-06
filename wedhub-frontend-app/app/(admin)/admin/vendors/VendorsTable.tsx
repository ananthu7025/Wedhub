"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { approveAdminVendor, restoreAdminVendor, suspendAdminVendor } from "@/lib/api/admin-client";
import type { AdminVendorListItem } from "@/lib/api/admin.types";
import type { VendorStatus } from "@/lib/api/vendor-self.types";
import { formatApiError } from "@/lib/utils/error";

/**
 * Vendors list (Frontend Arch Phase 8), matching
 * wedhub-frontend/admin/vendors.html's pill-tabs + filter toolbar + table.
 * Real gaps vs. the mockup, confirmed via backend research (see
 * frontenddocs/10-risks-and-open-questions.md): no free-text search, no
 * Plan column/filter (no subscription join on this endpoint), no
 * "Verified"/"Featured" filter pills (no backing enum value or data
 * source) — all omitted rather than built against nothing. Reject is not
 * available from this table (mockup's inline reject needs a reason
 * textarea) — that action lives on the detail page.
 */

const STATUS_TABS: Array<{ value: VendorStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING_APPROVAL", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DRAFT", label: "Draft" },
  { value: "DEACTIVATED", label: "Deactivated" },
];

function statusBadgeVariant(status: string): "green" | "amber" | "grey" | "red" {
  switch (status) {
    case "APPROVED":
      return "green";
    case "PENDING_APPROVAL":
      return "amber";
    case "SUSPENDED":
      return "amber";
    case "REJECTED":
      return "red";
    default:
      return "grey";
  }
}

function verificationLabel(level: string): string {
  return level.charAt(0) + level.slice(1).toLowerCase().replace(/_/g, " ");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function VendorsTable({
  initialVendors,
  total,
  activeStatus,
}: {
  initialVendors: AdminVendorListItem[];
  total: number;
  activeStatus: VendorStatus | undefined;
}) {
  const [vendors, setVendors] = useState(initialVendors);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // initialVendors only seeds state on first mount — clicking a status
  // tab changes the URL and re-renders this same mounted component with a
  // new initialVendors prop (a new server fetch), which never touched
  // `vendors` on its own, so the table kept showing whatever filter was
  // active on first load while `total` (read straight from props, not
  // state) updated correctly. Re-sync whenever the server gives us a new
  // list for the newly selected filter.
  useEffect(() => {
    setVendors(initialVendors);
  }, [initialVendors]);

  async function handleApprove(id: string) {
    setPending(id);
    setError(null);
    const result = await approveAdminVendor(id);
    setPending(null);
    setOpenMenuId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, status: result.data.status } : v)));
  }

  async function handleSuspend(id: string) {
    const rawReason = prompt("Reason for suspension:");
    if (rawReason === null) return;
    const reason = rawReason.trim();
    if (!reason) {
      setError("A suspension reason is required.");
      return;
    }
    if (reason.length > 500) {
      setError("Suspension reason must be 500 characters or fewer.");
      return;
    }
    setPending(id);
    setError(null);
    const result = await suspendAdminVendor(id, { reason });
    setPending(null);
    setOpenMenuId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, status: result.data.status } : v)));
  }

  async function handleRestore(id: string) {
    setPending(id);
    setError(null);
    const result = await restoreAdminVendor(id);
    setPending(null);
    setOpenMenuId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, status: result.data.status } : v)));
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Vendors</h1>
          <p className="text-sm text-text-grey">{total.toLocaleString("en-IN")} vendors on the platform</p>
        </div>
        <Link
          href="/admin/vendors/create"
          className="rounded-md bg-brand-primary px-4 py-2.5 text-sm font-bold text-white no-underline"
        >
          Create vendor
        </Link>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = tab.value === "ALL" ? activeStatus === undefined : activeStatus === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.value === "ALL" ? "/admin/vendors" : `/admin/vendors?status=${tab.value}`}
              className={`rounded-full px-4 py-2 text-[13px] font-bold no-underline ${
                isActive ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {vendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
          <h3 className="text-[15px] font-bold">No vendors here</h3>
          <p className="mt-1.5 text-[13px] text-text-grey">Nothing matches this filter yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-xs text-text-grey">
                <th className="px-4 py-3 font-semibold">Business name</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Verification</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="border-b border-neutral-grey-20 last:border-b-0 hover:bg-anti-flash-white-30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-surface-input text-xs font-bold text-text-grey">
                        {vendor.businessName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-bold">{vendor.businessName}</div>
                        <div className="truncate text-xs text-text-grey">{vendor.profile?.email ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(vendor.status)}>{vendor.status.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={vendor.verificationLevel === "UNVERIFIED" ? "grey" : "blue"}>
                      {verificationLabel(vendor.verificationLevel)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{formatDate(vendor.submittedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      ref={(el) => {
                        if (el) triggerRefs.current.set(vendor.id, el);
                        else triggerRefs.current.delete(vendor.id);
                      }}
                      onClick={() => setOpenMenuId(openMenuId === vendor.id ? null : vendor.id)}
                      disabled={pending === vendor.id}
                      className="rounded-md border border-border bg-white px-3 py-1.5 text-[13px] font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
                    >
                      Actions ▾
                    </button>
                    <RowActionsMenu
                      open={openMenuId === vendor.id}
                      onClose={() => setOpenMenuId(null)}
                      triggerElement={triggerRefs.current.get(vendor.id) ?? null}
                    >
                      <Link
                        href={`/admin/vendors/${vendor.id}`}
                        className="block px-3.5 py-2.5 text-[13px] font-semibold text-text-dark no-underline hover:bg-surface-input"
                      >
                        View
                      </Link>
                      {vendor.status === "PENDING_APPROVAL" && (
                        <button
                          onClick={() => handleApprove(vendor.id)}
                          className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold text-text-dark hover:bg-surface-input"
                        >
                          Approve
                        </button>
                      )}
                      {vendor.status === "APPROVED" && (
                        <button
                          onClick={() => handleSuspend(vendor.id)}
                          className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold text-red hover:bg-surface-input"
                        >
                          Suspend
                        </button>
                      )}
                      {vendor.status === "SUSPENDED" && (
                        <button
                          onClick={() => handleRestore(vendor.id)}
                          className="block w-full px-3.5 py-2.5 text-left text-[13px] font-semibold text-text-dark hover:bg-surface-input"
                        >
                          Restore
                        </button>
                      )}
                    </RowActionsMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
