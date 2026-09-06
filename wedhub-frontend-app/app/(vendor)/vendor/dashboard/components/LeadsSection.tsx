"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import type { LeadStatus } from "@/lib/api/account.types";
import type { VendorLead } from "@/lib/api/leads.types";

interface LeadsSectionProps {
  leads: VendorLead[];
  isProfileComplete: boolean;
}

function statusBadgeVariant(status: LeadStatus): "blue" | "amber" | "green" | "grey" | "crimson" | "red" {
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatBudget(budget: string | null): string {
  if (!budget) return "Custom quote";
  const num = Number(budget);
  if (isNaN(num)) return budget;
  return `₹${num.toLocaleString("en-IN")}`;
}

export function LeadsSection({ leads, isProfileComplete }: LeadsSectionProps) {
  const [filterTab, setFilterTab] = useState<"all" | "new">("all");

  const newEnquiries = leads.filter((l) => l.status === "NEW" || l.status === "CONTACTED");
  const displayedLeads = filterTab === "new" ? newEnquiries : leads;

  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary-soft text-brand-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <h2 className="text-sm sm:text-base font-bold text-text-dark">
            Leads & Enquiries
          </h2>
          <span className="rounded-full bg-surface-input px-2 py-0.5 text-xs font-bold text-text-dark border border-border">
            {newEnquiries.length} new
          </span>
        </div>

        <div className="flex items-center gap-2">
          {leads.length > 0 && (
            <div className="flex items-center rounded-full bg-surface-input p-0.5 border border-border">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold transition-all",
                  filterTab === "all" ? "bg-white text-text-dark shadow-xs" : "text-text-grey hover:text-text-dark",
                )}
              >
                All ({leads.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("new")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold transition-all",
                  filterTab === "new" ? "bg-white text-brand-primary shadow-xs" : "text-text-grey hover:text-text-dark",
                )}
              >
                New ({newEnquiries.length})
              </button>
            </div>
          )}

          <Link
            href="/vendor/leads"
            className="group flex items-center gap-1 text-xs font-bold text-text-grey transition-colors hover:text-brand-primary whitespace-nowrap ml-1"
          >
            <span>View all</span>
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mt-3.5">
        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-page p-6 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-text-grey shadow-xs border border-border">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-bold text-text-dark">No enquiries yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-text-grey">
              {!isProfileComplete
                ? "Complete your profile to start appearing in couple searches and receive high-intent wedding requests."
                : "Add more portfolio work, services and packages to improve your search rank and attract more couples."}
            </p>
            <div className="mt-4">
              {!isProfileComplete ? (
                <Link
                  href="/vendor/profile"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-primary-hover"
                >
                  <span>Complete Profile</span>
                  <span>→</span>
                </Link>
              ) : (
                <Link
                  href="/vendor/portfolio"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-primary-hover"
                >
                  <span>Improve Portfolio & Services</span>
                  <span>→</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Card List */}
            <div className="flex flex-col gap-2.5 sm:hidden">
              {displayedLeads.slice(0, 5).map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-xl border border-border bg-surface-page p-3 text-xs transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-text-dark text-sm truncate">
                        {lead.enquiry?.contactName || "Prospective Couple"}
                      </p>
                      <p className="text-[11px] text-text-grey mt-0.5 truncate">
                        {lead.enquiry?.weddingLocation || "Location not specified"}
                      </p>
                    </div>
                    <Badge variant={statusBadgeVariant(lead.status)}>
                      {formatStatusLabel(lead.status)}
                    </Badge>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-border/70 pt-2 text-[11px]">
                    <span className="font-semibold text-text-body">
                      {formatBudget(lead.enquiry?.budget)}
                    </span>
                    <Link
                      href="/vendor/leads"
                      className="flex items-center gap-1 font-bold text-emerald-70 hover:underline"
                    >
                      <span>View details</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold tracking-wider text-text-muted">
                    <th className="pb-2.5 pl-1">Couple Name</th>
                    <th className="pb-2.5">Location</th>
                    <th className="pb-2.5">Event Date</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5">Budget</th>
                    <th className="pb-2.5 pr-1 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-grey-20 text-[13px]">
                  {displayedLeads.slice(0, 6).map((lead) => (
                    <tr key={lead.id} className="group transition-colors hover:bg-surface-page">
                      <td className="py-2.5 pl-1 font-semibold text-text-dark">
                        {lead.enquiry?.contactName || "Prospective Couple"}
                      </td>
                      <td className="py-2.5 text-text-grey">
                        {lead.enquiry?.weddingLocation || "Not specified"}
                      </td>
                      <td className="py-2.5 text-text-grey">
                        {formatDate(lead.enquiry?.weddingDate || lead.createdAt)}
                      </td>
                      <td className="py-2.5">
                        <Badge variant={statusBadgeVariant(lead.status)}>
                          {formatStatusLabel(lead.status)}
                        </Badge>
                      </td>
                      <td className="py-2.5 font-semibold text-text-body">
                        {formatBudget(lead.enquiry?.budget)}
                      </td>
                      <td className="py-2.5 pr-1 text-right">
                        <Link
                          href="/vendor/leads"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-emerald-70 hover:bg-emerald-10"
                        >
                          <span>Manage</span>
                          <span>→</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
