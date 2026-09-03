"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { AdminLeadListItem } from "@/lib/api/admin.types";
import type { LeadStatus } from "@/lib/api/account.types";

/**
 * Admin leads list (Frontend Arch Phase 9), matching
 * wedhub-frontend/admin/leads.html reduced to what's real.
 * `search` (contact name/email, message, vendor business name) is now wired
 * end-to-end (docs/bugs.md #1 — GET /admin/leads used to validate `search`
 * and then silently drop it). There is still no source/category
 * server-side filter (Source IS a real column from the enquiry, shown for
 * reference, just not filterable server-side), no reassignment endpoint
 * exists (Open Question 3), and no "Disputed" status exists in the real
 * 10-value LeadStatus enum (omitted entirely, not relabeled — there's no
 * real equivalent to map it to, unlike reviews' Remove→Hidden mapping).
 */

const STATUS_TABS: Array<{ value: LeadStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "NEW", label: "New" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "SPAM", label: "Spam" },
];

function statusBadgeVariant(status: LeadStatus): "crimson" | "blue" | "amber" | "green" | "grey" | "red" {
  switch (status) {
    case "NEW":
      return "crimson";
    case "CONTACTED":
    case "RESPONDED":
      return "blue";
    case "QUALIFIED":
    case "MEETING":
    case "QUOTED":
      return "amber";
    case "WON":
      return "green";
    case "LOST":
    case "CLOSED":
      return "grey";
    case "SPAM":
      return "red";
  }
}

function formatStatusLabel(status: LeadStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function AdminLeadsTable({
  initialLeads,
  total,
  activeStatus,
  activeSearch,
}: {
  initialLeads: AdminLeadListItem[];
  total: number;
  activeStatus: LeadStatus | undefined;
  activeSearch: string;
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-text-grey">
          {total.toLocaleString("en-IN")} leads across the platform · admins view and intervene, vendors work leads directly
        </p>
      </div>

      <div className="mb-5 rounded-md bg-brand-primary-soft p-3.5 text-[13px] text-brand-ink">
        Lead status is managed by vendors as they work each enquiry. Admin intervention (e.g. marking spam) goes
        through the same status field — there is no separate reassign-to-another-vendor workflow.
      </div>

      <form method="get" className="mb-5 max-w-sm">
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        <input
          type="search"
          name="search"
          defaultValue={activeSearch}
          placeholder="Search contact, email, message, or vendor"
          className="w-full rounded-md border border-border bg-white px-3.5 py-2 text-[13px]"
        />
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = tab.value === "ALL" ? activeStatus === undefined : activeStatus === tab.value;
          const tabParams = new URLSearchParams();
          if (tab.value !== "ALL") tabParams.set("status", tab.value);
          if (activeSearch) tabParams.set("search", activeSearch);
          const tabQuery = tabParams.toString();
          return (
            <Link
              key={tab.value}
              href={tabQuery ? `/admin/leads?${tabQuery}` : "/admin/leads"}
              className={`rounded-full px-4 py-2 text-[13px] font-bold no-underline ${
                isActive ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {initialLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
          <h3 className="text-[15px] font-bold">No leads here</h3>
          <p className="mt-1.5 text-[13px] text-text-grey">Nothing matches this filter yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-xs text-text-grey">
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {initialLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-neutral-grey-20 last:border-b-0 hover:bg-anti-flash-white-30">
                  <td className="px-4 py-3">
                    <div className="font-bold">{lead.enquiry.contactName}</div>
                    <div className="text-xs text-text-grey">{lead.enquiry.contactEmail}</div>
                  </td>
                  <td className="px-4 py-3">{lead.vendor.businessName}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(lead.status)}>{formatStatusLabel(lead.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">{lead.enquiry.source}</td>
                  <td className="px-4 py-3">{formatDate(lead.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="rounded-md border border-border bg-white px-3 py-1.5 text-[13px] font-bold text-text-dark no-underline hover:bg-surface-input"
                    >
                      View
                    </Link>
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
