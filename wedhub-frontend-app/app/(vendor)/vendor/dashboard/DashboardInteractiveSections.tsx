"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import type { LeadStatus } from "@/lib/api/account.types";
import type { VendorLead } from "@/lib/api/leads.types";
import type { VendorAnalytics } from "@/lib/api/vendor-self.types";
import type { NotificationItem } from "@/lib/api/account.types";
import type { VendorReview } from "@/lib/api/vendors.types";

/**
 * Interactive tabs & tables for the Vendor Dashboard (Frontend Arch Phase 7 / UI Redesign).
 * Uses the canonical Badge component, design tokens (border-border, text-text-grey,
 * text-text-dark), and real-time backend data for leads, inquiries, notifications,
 * and reviews.
 */

interface DashboardInteractiveSectionsProps {
  leads: VendorLead[];
  notifications: NotificationItem[];
  reviews: VendorReview[];
  vendor: {
    businessName: string;
    status: string;
    verificationLevel: string;
    profileCompleteness: number;
    rejectionReason?: string | null;
    slug?: string;
  };
  analytics: VendorAnalytics | null;
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

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
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

export function DashboardInteractiveSections({
  leads,
  notifications,
  reviews,
  vendor,
  analytics,
}: DashboardInteractiveSectionsProps) {
  const [leadsTab, setLeadsTab] = useState<"leads" | "inquiries">("leads");
  const [activityTab, setActivityTab] = useState<"activity" | "feedbacks">("activity");

  const inquiries = leads.filter((l) => l.status === "NEW" || l.status === "CONTACTED");
  const displayedLeads = leadsTab === "leads" ? leads : inquiries;

  const activeProspects = leads.filter(
    (l) => !["CLOSED", "LOST", "SPAM"].includes(l.status),
  );

  return (
    <div className="grid grid-cols-12 gap-5 min-w-0">
      {/* Left Column (~65%) */}
      <div className="col-span-12 flex min-w-0 flex-col gap-5 lg:col-span-8">
        {/* Card 1: Leads & Inquiries Table */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm">
          {/* Card Header with Tabs & View All */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setLeadsTab("leads")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0",
                  leadsTab === "leads"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-text-grey hover:bg-surface-input hover:text-text-dark",
                )}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                Leads ({leads.length})
              </button>
              <button
                type="button"
                onClick={() => setLeadsTab("inquiries")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0",
                  leadsTab === "inquiries"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-text-grey hover:bg-surface-input hover:text-text-dark",
                )}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Inquiries Received ({inquiries.length})
              </button>
            </div>

            <Link
              href="/vendor/leads"
              className="group flex items-center gap-1 text-xs font-bold text-text-grey transition-colors hover:text-brand-primary whitespace-nowrap shrink-0"
            >
              <span>View all</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {/* Mobile Card List (visible on sm:hidden) */}
          <div className="flex flex-col gap-2.5 sm:hidden">
            {displayedLeads.length === 0 ? (
              <div className="py-6 text-center text-text-grey">
                <p className="font-semibold text-text-dark text-xs">No leads recorded in this view</p>
                <Link
                  href="/vendor/profile"
                  className="mt-2.5 inline-block rounded-full bg-surface-input px-3.5 py-1 text-xs font-bold text-text-dark"
                >
                  Complete Profile to Get Leads
                </Link>
              </div>
            ) : (
              displayedLeads.map((lead) => (
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
                    <span className="shrink-0 font-bold text-brand-primary text-xs bg-brand-primary-soft/40 px-2 py-0.5 rounded-md">
                      {formatBudget(lead.enquiry?.budget)}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-border/70 pt-2 text-[11px]">
                    <span className="text-text-muted">
                      {formatDate(lead.enquiry?.weddingDate || lead.createdAt)}
                    </span>
                    <Link
                      href="/vendor/leads"
                      className="flex items-center gap-1 font-bold text-emerald-70 hover:underline"
                    >
                      <span>View details</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table Container (hidden on sm:hidden) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold tracking-wider text-text-muted">
                  <th className="pb-2.5 pl-1">Client Name</th>
                  <th className="pb-2.5">Location</th>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Price Range</th>
                  <th className="pb-2.5 pr-1 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-grey-20 text-[13px]">
                {displayedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-text-grey">
                      <p className="font-semibold text-text-dark">No leads recorded in this view</p>
                      <p className="mt-1 text-xs text-text-grey">
                        When couples contact your business or request quotes, their details appear here in real-time.
                      </p>
                      <Link
                        href="/vendor/profile"
                        className="mt-3 inline-block rounded-full bg-surface-input px-4 py-1.5 text-xs font-bold text-text-dark hover:bg-neutral-grey-20"
                      >
                        Complete Profile to Get Leads
                      </Link>
                    </td>
                  </tr>
                ) : (
                  displayedLeads.map((lead) => (
                    <tr key={lead.id} className="group transition-colors hover:bg-surface-page">
                      <td className="py-3 pl-1 font-semibold text-text-dark">
                        {lead.enquiry?.contactName || "Prospective Couple"}
                      </td>
                      <td className="py-3 text-text-grey">
                        {lead.enquiry?.weddingLocation || "Not specified"}
                      </td>
                      <td className="py-3 text-text-grey">
                        {formatDate(lead.enquiry?.weddingDate || lead.createdAt)}
                      </td>
                      <td className="py-3 font-semibold text-text-body">
                        {formatBudget(lead.enquiry?.budget)}
                      </td>
                      <td className="py-3 pr-1 text-right">
                        <Link
                          href={`/vendor/leads`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-emerald-700 hover:bg-emerald-10"
                          title="View lead details"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M7 17l9.2-9.2M17 17V7H7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 2: Manage Prospects & Visibility */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-input text-text-dark">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <h3 className="text-sm font-bold text-text-dark">Manage Prospects & Visibility</h3>
            </div>
            <Link
              href="/vendor/leads"
              className="group flex items-center gap-1 text-xs font-bold text-text-grey transition-colors hover:text-brand-primary"
            >
              <span>View all</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {/* Listing Status Details */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-page p-3.5 border border-border">
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  vendor.status === "APPROVED"
                    ? "green"
                    : vendor.status === "PENDING_VERIFICATION"
                    ? "amber"
                    : vendor.status === "REJECTED"
                    ? "red"
                    : "grey"
                }
              >
                {vendor.status.replace(/_/g, " ")}
              </Badge>

              {vendor.verificationLevel !== "UNVERIFIED" && (
                <Badge variant="blue">
                  {vendor.verificationLevel.replace(/_/g, " ")}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/vendor/profile"
                className="rounded-md border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-text-dark shadow-sm hover:bg-surface-input"
              >
                Edit Profile
              </Link>
              {vendor.slug && (
                <Link
                  href={`/vendors/${vendor.slug}`}
                  target="_blank"
                  className="rounded-md bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-primary-hover"
                >
                  View Public Profile ↗
                </Link>
              )}
            </div>
          </div>

          {vendor.rejectionReason && (
            <div className="mb-4 rounded-xl border border-red-10 bg-red-10/40 p-3.5 text-xs text-red-70">
              <strong className="font-bold">Review Feedback:</strong> {vendor.rejectionReason}
            </div>
          )}

          {/* Mobile Active Prospects Cards (visible on sm:hidden) */}
          <div className="flex flex-col gap-2.5 sm:hidden">
            {activeProspects.length === 0 ? (
              <p className="py-3 text-center text-xs text-text-grey">
                No active prospects currently. Complete your packages to start receiving leads!
              </p>
            ) : (
              activeProspects.slice(0, 4).map((lead) => (
                <div
                  key={`mp-${lead.id}`}
                  className="rounded-xl border border-border bg-surface-page p-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-text-dark text-sm truncate">
                        {lead.enquiry?.contactName || "Prospective Couple"}
                      </p>
                      <p className="text-[11px] text-text-grey mt-0.5 truncate">
                        {lead.enquiry?.weddingLocation || "Not specified"}
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
                      <span>Manage</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Active Prospects Table (hidden on sm:hidden) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold tracking-wider text-text-muted">
                  <th className="pb-2 pl-1">Client Name</th>
                  <th className="pb-2">Location</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Price Range</th>
                  <th className="pb-2 pr-1 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-grey-20 text-[13px]">
                {activeProspects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-xs text-text-grey">
                      No active prospects currently. Complete your packages to start receiving leads!
                    </td>
                  </tr>
                ) : (
                  activeProspects.slice(0, 4).map((lead) => (
                    <tr key={`p-${lead.id}`} className="hover:bg-surface-page">
                      <td className="py-2.5 pl-1 font-semibold text-text-dark">
                        {lead.enquiry?.contactName || "Prospective Couple"}
                      </td>
                      <td className="py-2.5 text-text-grey">
                        {lead.enquiry?.weddingLocation || "Not specified"}
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
                          className="inline-flex items-center text-emerald-700 hover:text-emerald"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M7 17l9.2-9.2M17 17V7H7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Column (~35%) */}
      <div className="col-span-12 flex min-w-0 flex-col gap-5 lg:col-span-4">
        {/* Recent Activity Card */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm">
          {/* Tabs */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setActivityTab("activity")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0",
                  activityTab === "activity"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-text-grey hover:bg-surface-input hover:text-text-dark",
                )}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Recent Activity ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActivityTab("feedbacks")}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0",
                  activityTab === "feedbacks"
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-text-grey hover:bg-surface-input hover:text-text-dark",
                )}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Feedbacks ({reviews.length})
              </button>
            </div>

            <Link
              href={activityTab === "feedbacks" ? "/vendor/reviews" : "/vendor/leads"}
              className="group flex items-center gap-1 text-xs font-bold text-text-grey transition-colors hover:text-brand-primary whitespace-nowrap shrink-0"
            >
              <span>View all</span>
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {/* Feed Content */}
          {activityTab === "activity" ? (
            <div className="flex flex-col gap-3.5">
              {notifications.length > 0 ? (
                notifications.slice(0, 6).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold leading-tight text-text-dark">{item.title}</p>
                        <p className="mt-0.5 text-[11px] text-text-grey line-clamp-1">{item.body}</p>
                        <p className="mt-0.5 text-[10px] text-text-muted">{formatRelativeTime(item.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : leads.length > 0 ? (
                leads.slice(0, 5).map((l) => (
                  <div key={`lead-act-${l.id}`} className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-10 text-emerald-70">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold leading-tight text-text-dark">
                          Enquiry from @{l.enquiry?.contactName?.replace(/\s+/g, "_") || "couple"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-grey">
                          {l.enquiry?.weddingLocation ? `Wedding in ${l.enquiry.weddingLocation}` : "New wedding inquiry"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-text-muted">{formatRelativeTime(l.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-text-grey">
                  <p className="font-semibold text-text-dark">No recent activity</p>
                  <p className="mt-1 text-[11px] text-text-grey">
                    Notifications for newly received inquiries and listing milestones will appear here.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.length > 0 ? (
                reviews.slice(0, 5).map((rev) => (
                  <div key={rev.id} className="rounded-xl border border-border bg-surface-page p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs font-bold text-amber">
                        {"★".repeat(rev.rating)}
                        {"☆".repeat(5 - rev.rating)}
                      </span>
                      <span className="text-[10px] text-text-muted">{formatRelativeTime(rev.createdAt)}</span>
                    </div>
                    {rev.title && <p className="mt-1 text-xs font-bold text-text-dark">{rev.title}</p>}
                    {rev.content && <p className="mt-0.5 text-[11px] text-text-body line-clamp-2">{rev.content}</p>}
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-text-grey">
                  <p className="font-semibold text-text-dark">
                    {analytics?.reviews ? `${analytics.reviews} Approved Reviews` : "No reviews yet"}
                  </p>
                  <p className="mt-1 text-[11px] text-text-grey">
                    Verified reviews from couples who book your services will display here.
                  </p>
                  <Link
                    href="/vendor/reviews"
                    className="mt-3 inline-block rounded-full bg-surface-input px-4 py-1.5 text-xs font-bold text-text-dark hover:bg-neutral-grey-20"
                  >
                    Go to Reviews
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
