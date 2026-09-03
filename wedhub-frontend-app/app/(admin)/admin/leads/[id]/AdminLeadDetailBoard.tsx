"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { updateAdminLeadStatus } from "@/lib/api/admin-client";
import { ALL_LEAD_STATUSES } from "@/lib/api/leads.types";
import type { AdminLeadDetail } from "@/lib/api/admin.types";
import type { LeadStatus } from "@/lib/api/account.types";

/**
 * Admin lead detail (Frontend Arch Phase 9). Unlike the vendor leads board
 * (Frontend Arch Phase 6), the admin status control is never disabled —
 * confirmed via research that updateStatusAdmin bypasses the
 * terminal-status lock server-side entirely (an admin can reopen a WON/
 * LOST/SPAM/CLOSED lead, unlike a vendor). No vendor field on this
 * response (confirmed via live curl) — vendorId is shown as a plain id
 * rather than a resolved business name, since the detail endpoint doesn't
 * join it and the list page (where the name WAS available) isn't
 * guaranteed to be where this page was navigated from.
 */

function formatStatusLabel(status: LeadStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function AdminLeadDetailBoard({ initialLead }: { initialLead: AdminLeadDetail }) {
  const [lead, setLead] = useState(initialLead);
  const [statusDraft, setStatusDraft] = useState<LeadStatus>(initialLead.status);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdateStatus() {
    if (statusDraft === lead.status) return;
    setSaving(true);
    setError(null);
    const result = await updateAdminLeadStatus(lead.id, { status: statusDraft, reason: reason.trim() || undefined });
    setSaving(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setLead((prev) => ({ ...prev, status: result.data.status, isSpam: result.data.isSpam }));
    setReason("");
  }

  return (
    <div>
      <p className="mb-2.5 text-[13px] text-text-grey">
        <Link href="/admin/leads" className="text-text-grey no-underline hover:underline">
          Leads
        </Link>{" "}
        / {lead.enquiry.contactName}
      </p>
      <div className="mb-6">
        <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-bold">
          {lead.enquiry.contactName}
          <Badge variant="grey">{formatStatusLabel(lead.status)}</Badge>
        </h1>
        <p className="text-sm text-text-grey">Received {formatDateTime(lead.createdAt)}</p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      <div className="grid grid-cols-[1fr_340px] gap-5 max-[900px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Enquiry details</h3>
            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <div className="mb-0.5 text-text-grey">Contact email</div>
                <div className="font-semibold">{lead.enquiry.contactEmail}</div>
              </div>
              <div>
                <div className="mb-0.5 text-text-grey">Contact phone</div>
                <div className="font-semibold">{lead.enquiry.contactPhone ?? "—"}</div>
              </div>
              <div>
                <div className="mb-0.5 text-text-grey">Wedding date</div>
                <div className="font-semibold">{lead.enquiry.weddingDate ? formatDateTime(lead.enquiry.weddingDate) : "—"}</div>
              </div>
              <div>
                <div className="mb-0.5 text-text-grey">Budget</div>
                <div className="font-semibold">{lead.enquiry.budget ? `₹${Number(lead.enquiry.budget).toLocaleString("en-IN")}` : "—"}</div>
              </div>
              <div>
                <div className="mb-0.5 text-text-grey">Source</div>
                <div className="font-semibold">{lead.enquiry.source}</div>
              </div>
              <div>
                <div className="mb-0.5 text-text-grey">Vendor id</div>
                <div className="font-mono text-xs font-semibold">{lead.vendorId}</div>
              </div>
            </div>
            {lead.enquiry.message && (
              <div className="mt-4">
                <div className="mb-1.5 text-[13px] text-text-grey">Original enquiry message</div>
                <div className="rounded-md bg-surface-input p-3.5 text-[13px] italic leading-relaxed">&ldquo;{lead.enquiry.message}&rdquo;</div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-1 text-base font-bold">Override status</h3>
            <p className="mb-4 text-[13px] text-text-grey">
              Admin overrides bypass the terminal-status lock — a WON/LOST/SPAM/CLOSED lead can be reopened here,
              unlike from the vendor&apos;s own dashboard.
            </p>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value as LeadStatus)}
                className="max-w-[220px] rounded-md border border-border px-3 py-2 text-[13px]"
              >
                {ALL_LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleUpdateStatus}
                disabled={saving || statusDraft === lead.status}
                className="rounded-md bg-brand-primary px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
              >
                Update status
              </button>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-text-grey">Reason (optional, recorded in status history)</span>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Confirmed spam pattern with 3 other vendors"
                maxLength={500}
                className="w-full rounded-md border border-border px-3 py-2 text-[13px]"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-3 text-base font-bold">Status history</h3>
            {lead.statusHistory.length === 0 ? (
              <p className="text-[13px] text-text-grey">No status changes yet.</p>
            ) : (
              lead.statusHistory.map((entry) => (
                <div key={entry.id} className="flex gap-2.5 border-b border-neutral-grey-20 py-3 text-[13px] last:border-b-0">
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-paynes-grey-30" />
                  <div>
                    <div>
                      {entry.fromStatus ? (
                        <>
                          <code className="rounded bg-surface-input px-1.5 py-0.5 text-[11px]">{entry.fromStatus}</code> →{" "}
                        </>
                      ) : (
                        "created as "
                      )}
                      <code className="rounded bg-surface-input px-1.5 py-0.5 text-[11px]">{entry.toStatus}</code>
                    </div>
                    {entry.reason && <div className="mt-1 text-text-grey">{entry.reason}</div>}
                    <div className="mt-1 text-xs text-text-grey">{formatDateTime(entry.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {lead.notes.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-6">
              <h3 className="mb-3 text-base font-bold">Vendor notes</h3>
              <p className="mb-3 text-xs text-text-grey">Internal notes left by the vendor working this lead.</p>
              {lead.notes.map((note) => (
                <div key={note.id} className="border-b border-neutral-grey-20 py-2.5 text-[13px] last:border-b-0">
                  <p className="leading-relaxed text-text-body">{note.body}</p>
                  <p className="mt-1 text-xs text-text-grey">{formatDateTime(note.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
