"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { getMyLeadClient, updateMyLeadStatus, addMyLeadNote } from "@/lib/api/leads-client";
import type { LeadStatus } from "@/lib/api/account.types";
import { ALL_LEAD_STATUSES, TERMINAL_LEAD_STATUSES } from "@/lib/api/leads.types";
import type { LeadNote, VendorLead, VendorLeadDetail } from "@/lib/api/leads.types";
import { formatApiError } from "@/lib/utils/error";

/**
 * Master-detail leads board (Frontend Arch Phase 6), matching
 * wedhub-frontend/vendor/leads.html's .leads-layout. Deliberately omits the
 * mockup's "Set follow-up reminder" and live "Conversation" chat thread —
 * neither has any backing data on the real backend (Lead has no reminder
 * field; LeadNote is a flat, vendor-only note, not a two-way message with
 * the couple — see lib/api/leads.types.ts). Internal notes ARE real and
 * wired up below.
 */

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

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function LeadsBoard({ initialLeads }: { initialLeads: VendorLead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [selectedId, setSelectedId] = useState<string | null>(initialLeads[0]?.id ?? null);
  const [detail, setDetail] = useState<VendorLeadDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "ALL">("ALL");
  const [statusDraft, setStatusDraft] = useState<LeadStatus | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectLead(id: string) {
    setSelectedId(id);
    setDetail(null);
    setError(null);
    setLoadingDetail(true);
    const result = await getMyLeadClient(id);
    setLoadingDetail(false);
    if (result.success) {
      setDetail(result.data);
      setStatusDraft(result.data.status);
      setStatusReason("");
    }
  }

  async function handleUpdateStatus() {
    if (!detail || !statusDraft || statusDraft === detail.status) return;
    setSaving(true);
    setError(null);
    const result = await updateMyLeadStatus(detail.id, { status: statusDraft, reason: statusReason.trim() || undefined });
    setSaving(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setDetail({ ...detail, ...result.data, notes: detail.notes, statusHistory: detail.statusHistory });
    setLeads((prev) => prev.map((l) => (l.id === detail.id ? { ...l, status: result.data.status } : l)));
    setStatusReason("");
  }

  async function handleAddNote() {
    if (!detail || !noteDraft.trim()) return;
    setSaving(true);
    setError(null);
    const result = await addMyLeadNote(detail.id, noteDraft.trim());
    setSaving(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    const note: LeadNote = result.data;
    setDetail({ ...detail, notes: [note, ...detail.notes] });
    setNoteDraft("");
  }

  const visibleLeads = filterStatus === "ALL" ? leads : leads.filter((l) => l.status === filterStatus);
  const counts: Record<LeadStatus | "ALL", number> = {
    ALL: leads.length,
    NEW: 0,
    CONTACTED: 0,
    RESPONDED: 0,
    QUALIFIED: 0,
    MEETING: 0,
    QUOTED: 0,
    WON: 0,
    LOST: 0,
    SPAM: 0,
    CLOSED: 0,
  };
  for (const lead of leads) counts[lead.status]++;

  const isTerminal = detail ? TERMINAL_LEAD_STATUSES.includes(detail.status) : false;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-text-grey">Enquiries from couples looking for your services</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus("ALL")}
          className={`rounded-full px-4 py-2 text-[13px] font-bold ${
            filterStatus === "ALL" ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
          }`}
        >
          All ({counts.ALL})
        </button>
        {ALL_LEAD_STATUSES.filter((s) => counts[s] > 0).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`rounded-full px-4 py-2 text-[13px] font-bold ${
              filterStatus === status ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
            }`}
          >
            {formatStatusLabel(status)} ({counts[status]})
          </button>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
          <h3 className="mb-1.5 text-[15px] font-bold">No leads yet</h3>
          <p className="max-w-[320px] text-[13px] text-text-grey">
            Enquiries from couples interested in your services will show up here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[400px_1fr] gap-5 max-[1100px]:grid-cols-1">
          <div className="max-h-[calc(100vh-230px)] overflow-y-auto rounded-xl border border-border bg-white max-[1100px]:max-h-[420px]">
            {visibleLeads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => selectLead(lead.id)}
                className={`block w-full border-b border-neutral-grey-20 px-4.5 py-3.5 text-left last:border-b-0 ${
                  selectedId === lead.id ? "border-l-[3px] border-l-brand-primary bg-brand-primary-soft pl-4" : "hover:bg-anti-flash-white-30"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{lead.enquiry.contactName}</span>
                  <Badge variant={statusBadgeVariant(lead.status)}>{formatStatusLabel(lead.status)}</Badge>
                </div>
                <p className="my-0.5 text-xs text-text-grey">
                  Wedding: {formatDate(lead.enquiry.weddingDate)}
                  {lead.enquiry.budget && ` · Budget ₹${Number(lead.enquiry.budget).toLocaleString("en-IN")}`}
                </p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-text-grey">{lead.enquiry.source}</span>
                  <span className="text-[11px] text-paynes-grey-40">{formatRelativeTime(lead.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-5">
            {loadingDetail && (
              <div className="rounded-xl border border-border bg-white p-6 text-sm text-text-grey">Loading…</div>
            )}

            {!loadingDetail && detail && (
              <>
                {error && <div className="rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

                <div className="rounded-xl border border-border bg-white p-6">
                  <div className="mb-4.5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-xl font-bold">{detail.enquiry.contactName}</h2>
                        <Badge variant={statusBadgeVariant(detail.status)}>{formatStatusLabel(detail.status)}</Badge>
                        <Badge variant="blue">{detail.enquiry.source}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-text-grey">
                        Received {formatRelativeTime(detail.createdAt)} · {new Date(detail.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <Link
                      href={`/vendor/invoices/new?leadId=${detail.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-primary bg-brand-primary-soft px-3 py-1.5 text-xs font-semibold text-brand-primary transition hover:bg-brand-primary hover:text-white"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      Create Invoice
                    </Link>
                  </div>

                  <div className="mb-4.5 grid grid-cols-2 gap-3.5 text-[13px]">
                    <div>
                      <span className="mb-0.5 block text-text-grey">Phone</span>
                      <span className="font-semibold">{detail.enquiry.contactPhone ?? "—"}</span>
                    </div>
                    <div>
                      <span className="mb-0.5 block text-text-grey">Email</span>
                      <span className="font-semibold">{detail.enquiry.contactEmail}</span>
                    </div>
                  </div>

                  <div className="mb-4.5 grid grid-cols-2 gap-3.5 text-[13px]">
                    <div>
                      <span className="mb-0.5 block text-text-grey">Wedding date</span>
                      <span className="font-semibold">{formatDate(detail.enquiry.weddingDate)}</span>
                    </div>
                    <div>
                      <span className="mb-0.5 block text-text-grey">Budget</span>
                      <span className="font-semibold">
                        {detail.enquiry.budget ? `₹${Number(detail.enquiry.budget).toLocaleString("en-IN")}` : "Not specified"}
                      </span>
                    </div>
                    <div>
                      <span className="mb-0.5 block text-text-grey">Guest count</span>
                      <span className="font-semibold">{detail.enquiry.guestCount ?? "—"}</span>
                    </div>
                    <div>
                      <span className="mb-0.5 block text-text-grey">Location</span>
                      <span className="font-semibold">{detail.enquiry.weddingLocation ?? "—"}</span>
                    </div>
                  </div>

                  {detail.enquiry.message && (
                    <div>
                      <span className="mb-1 block text-[13px] text-text-grey">Original enquiry message</span>
                      <div className="rounded-md bg-surface-input p-3.5 text-[13px] italic leading-relaxed text-text-body">
                        &ldquo;{detail.enquiry.message}&rdquo;
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-white p-6">
                  <h3 className="mb-3.5 text-base font-bold">Update status</h3>
                  {isTerminal && (
                    <p className="mb-3 text-[13px] text-text-grey">
                      This lead is closed ({formatStatusLabel(detail.status)}). Status changes are locked; contact support if this needs to be reopened.
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={statusDraft ?? detail.status}
                      onChange={(e) => {
                        const next = e.target.value as LeadStatus;
                        setStatusDraft(next);
                        if (next !== "LOST" && next !== "SPAM") setStatusReason("");
                      }}
                      disabled={isTerminal}
                      className="max-w-[220px] rounded-md border border-border px-3 py-2 text-[13px] disabled:opacity-50"
                    >
                      {ALL_LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {formatStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleUpdateStatus}
                      disabled={saving || isTerminal || statusDraft === detail.status}
                      className="rounded-md bg-brand-primary px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                    >
                      Update status
                    </button>
                  </div>
                  {(statusDraft === "LOST" || statusDraft === "SPAM") && statusDraft !== detail.status && (
                    <textarea
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder={`Reason for marking as ${formatStatusLabel(statusDraft)} (optional)`}
                      maxLength={500}
                      className="mt-2.5 min-h-[60px] w-full rounded-md border border-border p-3 text-[13px]"
                    />
                  )}
                </div>

                <div className="rounded-xl border border-border bg-white p-6">
                  <div className="mb-3.5 flex items-center gap-2">
                    <h3 className="text-base font-bold">Internal notes</h3>
                    <span className="text-xs text-text-grey">(not visible to couple)</span>
                  </div>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add a note about this lead…"
                    maxLength={2000}
                    className="min-h-[80px] w-full rounded-md border border-border p-3 text-[13px]"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={saving || !noteDraft.trim()}
                    className="mt-3 rounded-md border border-border bg-white px-4 py-2 text-[13px] font-bold text-text-dark disabled:opacity-50"
                  >
                    Save note
                  </button>

                  {detail.notes.length > 0 && (
                    <div className="mt-4.5 flex flex-col gap-3 border-t border-neutral-grey-20 pt-4">
                      {detail.notes.map((note) => (
                        <div key={note.id} className="text-[13px]">
                          <p className="leading-relaxed text-text-body">{note.body}</p>
                          <p className="mt-1 text-xs text-text-grey">{formatRelativeTime(note.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
