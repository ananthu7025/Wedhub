"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { getPublicMediaUrl } from "@/lib/media/url";
import {
  approveAdminVendor,
  deactivateAdminVendor,
  rejectAdminVendor,
  restoreAdminVendor,
  setAdminVendorVerification,
  suspendAdminVendor,
} from "@/lib/api/admin-client";
import type { AdminVendorDetail, AdminVendorStatusHistoryEntry } from "@/lib/api/admin.types";
import type { VerificationLevel } from "@/lib/api/vendor-self.types";

/**
 * Vendor detail page (Frontend Arch Phase 8), matching
 * wedhub-frontend/admin/vendor-detail.html. Real gaps vs. the mockup: no
 * "optional approval notes" (approve() takes no body — only reject/suspend
 * take a required reason, confirmed via schema read), no "Save as draft"
 * action (no backend equivalent), owner email now real (VENDOR_ADMIN_INCLUDE
 * backend addition, this phase). Status-transition buttons are only shown
 * for transitions the backend actually allows from the vendor's current
 * status (approve/reject only from PENDING_APPROVAL, suspend only from
 * APPROVED, restore only from SUSPENDED) — confirmed via
 * vendor-admin.service.ts's transitionStatus() allow-list.
 */

const VERIFICATION_LEVELS: VerificationLevel[] = ["UNVERIFIED", "IDENTITY_VERIFIED", "BUSINESS_VERIFIED", "PLATFORM_VERIFIED"];

function statusBadgeVariant(status: string): "green" | "amber" | "red" | "grey" {
  switch (status) {
    case "APPROVED":
      return "green";
    case "PENDING_APPROVAL":
    case "PENDING_VERIFICATION":
      return "amber";
    case "REJECTED":
    case "SUSPENDED":
      return "red";
    default:
      return "grey";
  }
}

function verificationLabel(level: string): string {
  return level.charAt(0) + level.slice(1).toLowerCase().replace(/_/g, " ");
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function creationSourceLabel(source: string): string {
  return source
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("-");
}

export function VendorDetailBoard({
  initialVendor,
  statusHistory,
}: {
  initialVendor: AdminVendorDetail;
  statusHistory: AdminVendorStatusHistoryEntry[];
}) {
  const router = useRouter();
  const [vendor, setVendor] = useState(initialVendor);
  const [verificationDraft, setVerificationDraft] = useState<VerificationLevel>(initialVendor.verificationLevel);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const coverKey = vendor.profile?.coverMedia?.optimizedObjectKey ?? vendor.profile?.coverMedia?.originalObjectKey ?? null;
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category.name ?? vendor.categories[0]?.category.name ?? "—";

  async function handleUpdateVerification() {
    setPending("verify");
    setError(null);
    const result = await setAdminVendorVerification(vendor.id, { verificationLevel: verificationDraft });
    setPending(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    // Every admin write endpoint (verify/approve/reject/suspend/restore/
    // deactivate) returns a scalar-only Vendor row with no relations
    // included (confirmed via live curl) — merge into existing state
    // rather than replace, so profile/categories/owner aren't wiped from
    // the UI before router.refresh() re-fetches the full detail.
    setVendor((prev) => ({ ...prev, ...result.data }));
    router.refresh();
  }

  async function handleApprove() {
    setPending("approve");
    setError(null);
    const result = await approveAdminVendor(vendor.id);
    setPending(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    // Every admin write endpoint (verify/approve/reject/suspend/restore/
    // deactivate) returns a scalar-only Vendor row with no relations
    // included (confirmed via live curl) — merge into existing state
    // rather than replace, so profile/categories/owner aren't wiped from
    // the UI before router.refresh() re-fetches the full detail.
    setVendor((prev) => ({ ...prev, ...result.data }));
    router.refresh();
  }

  async function handleReject() {
    if (!reason.trim()) {
      setError("A reason is required to reject a vendor.");
      return;
    }
    setPending("reject");
    setError(null);
    const result = await rejectAdminVendor(vendor.id, { reason: reason.trim() });
    setPending(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    // Every admin write endpoint (verify/approve/reject/suspend/restore/
    // deactivate) returns a scalar-only Vendor row with no relations
    // included (confirmed via live curl) — merge into existing state
    // rather than replace, so profile/categories/owner aren't wiped from
    // the UI before router.refresh() re-fetches the full detail.
    setVendor((prev) => ({ ...prev, ...result.data }));
    router.refresh();
  }

  async function handleSuspend() {
    if (!reason.trim()) {
      setError("A reason is required to suspend a vendor.");
      return;
    }
    setPending("suspend");
    setError(null);
    const result = await suspendAdminVendor(vendor.id, { reason: reason.trim() });
    setPending(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    // Every admin write endpoint (verify/approve/reject/suspend/restore/
    // deactivate) returns a scalar-only Vendor row with no relations
    // included (confirmed via live curl) — merge into existing state
    // rather than replace, so profile/categories/owner aren't wiped from
    // the UI before router.refresh() re-fetches the full detail.
    setVendor((prev) => ({ ...prev, ...result.data }));
    router.refresh();
  }

  async function handleRestore() {
    setPending("restore");
    setError(null);
    const result = await restoreAdminVendor(vendor.id);
    setPending(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    // Every admin write endpoint (verify/approve/reject/suspend/restore/
    // deactivate) returns a scalar-only Vendor row with no relations
    // included (confirmed via live curl) — merge into existing state
    // rather than replace, so profile/categories/owner aren't wiped from
    // the UI before router.refresh() re-fetches the full detail.
    setVendor((prev) => ({ ...prev, ...result.data }));
    router.refresh();
  }

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${vendor.businessName}'s listing? This can be done from most statuses.`)) return;
    setPending("deactivate");
    setError(null);
    const result = await deactivateAdminVendor(vendor.id);
    setPending(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    // Every admin write endpoint (verify/approve/reject/suspend/restore/
    // deactivate) returns a scalar-only Vendor row with no relations
    // included (confirmed via live curl) — merge into existing state
    // rather than replace, so profile/categories/owner aren't wiped from
    // the UI before router.refresh() re-fetches the full detail.
    setVendor((prev) => ({ ...prev, ...result.data }));
    router.refresh();
  }

  return (
    <div>
      <p className="mb-2.5 text-[13px] text-text-grey">
        <Link href="/admin/vendors" className="text-text-grey no-underline hover:underline">
          Vendors
        </Link>{" "}
        / {vendor.businessName}
      </p>
      <div className="mb-6">
        <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-bold">
          {vendor.businessName}
          <Badge variant={statusBadgeVariant(vendor.status)}>{vendor.status.replace(/_/g, " ")}</Badge>
        </h1>
        <p className="text-sm text-text-grey">
          {primaryCategory} · {vendor.city?.name ?? "No city set"} · {creationSourceLabel(vendor.creationSource ?? "")}
        </p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      <div className="grid grid-cols-[1fr_340px] gap-5 max-[1000px]:grid-cols-1">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-white p-6">
            {coverKey && (
              <div className="relative mb-4 aspect-[16/6] w-full overflow-hidden rounded-lg bg-surface-input">
                <Image src={getPublicMediaUrl(coverKey)} alt="" fill className="object-cover" />
              </div>
            )}
            <h3 className="mb-4 text-base font-bold">Profile details</h3>
            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <div className="mb-0.5 text-text-grey">Business name</div>
                <div className="font-semibold">{vendor.businessName}</div>
              </div>
              <div>
                <div className="mb-0.5 text-text-grey">Category</div>
                <div className="font-semibold">{primaryCategory}</div>
              </div>
              <div>
                <div className="mb-0.5 text-text-grey">City</div>
                <div className="font-semibold">{vendor.city?.name ?? "—"}</div>
              </div>
              <div>
                <div className="mb-0.5 text-text-grey">Contact email</div>
                <div className="font-semibold">{vendor.profile?.email ?? "—"}</div>
              </div>
              <div>
                <div className="mb-0.5 text-text-grey">Contact phone</div>
                <div className="font-semibold">{vendor.profile?.phone ?? "—"}</div>
              </div>
              <div>
                <div className="mb-0.5 text-text-grey">Years of experience</div>
                <div className="font-semibold">{vendor.profile?.yearsExperience ?? "—"}</div>
              </div>
              <div>
                <div className="mb-0.5 text-text-grey">Team size</div>
                <div className="font-semibold">{vendor.profile?.teamSize ?? "—"}</div>
              </div>
              <div>
                <div className="mb-0.5 text-text-grey">Starting price</div>
                <div className="font-semibold">
                  {vendor.profile?.startingPrice ? `₹${Number(vendor.profile.startingPrice).toLocaleString("en-IN")} onwards` : "—"}
                </div>
              </div>
              <div>
                <div className="mb-0.5 text-text-grey">Profile completeness</div>
                <div className="font-semibold">{vendor.profileCompleteness}%</div>
              </div>
            </div>
            {vendor.profile?.description && (
              <div className="mt-4">
                <div className="mb-1.5 text-[13px] text-text-grey">About</div>
                <p className="text-[13px] leading-relaxed">{vendor.profile.description}</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-4 text-base font-bold">Verification level</h3>
            <div className="mb-4 flex items-center">
              {VERIFICATION_LEVELS.map((level, index) => {
                const currentIndex = VERIFICATION_LEVELS.indexOf(vendor.verificationLevel);
                const isDone = index <= currentIndex;
                const isCurrent = index === currentIndex;
                return (
                  <div key={level} className="flex flex-1 items-center">
                    {index > 0 && <span className={`h-0.5 flex-1 ${isDone ? "bg-emerald" : "bg-border"}`} />}
                    <div className="flex flex-col items-center gap-1.5 px-1">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                          isCurrent ? "bg-brand-primary text-white" : isDone ? "bg-emerald text-white" : "bg-surface-input text-text-grey"
                        }`}
                      >
                        {isDone && !isCurrent ? "✓" : index + 1}
                      </span>
                      <span className="whitespace-nowrap text-[11px] font-semibold text-text-grey">{verificationLabel(level)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-xs font-semibold text-text-grey">Set verification level</span>
              <select
                value={verificationDraft}
                onChange={(e) => setVerificationDraft(e.target.value as VerificationLevel)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              >
                {VERIFICATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {verificationLabel(level)}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={handleUpdateVerification}
              disabled={pending === "verify" || verificationDraft === vendor.verificationLevel}
              className="rounded-md border border-border bg-white px-4 py-2 text-[13px] font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
            >
              Update verification level
            </button>
          </div>

          {(vendor.status === "PENDING_APPROVAL" || vendor.status === "APPROVED" || vendor.status === "SUSPENDED") && (
            <div className="rounded-xl border border-border bg-white p-6">
              <h3 className="mb-4 text-base font-bold">
                {vendor.status === "PENDING_APPROVAL" ? "Approve or reject" : vendor.status === "APPROVED" ? "Suspend" : "Restore"}
              </h3>
              {vendor.status !== "SUSPENDED" && (
                <label className="mb-3 block">
                  <span className="mb-1.5 block text-xs font-semibold text-text-grey">
                    Reason {vendor.status === "PENDING_APPROVAL" ? "(required to reject)" : "(required to suspend)"}
                  </span>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Business documents incomplete, portfolio does not match category…"
                    maxLength={1000}
                    className="min-h-[70px] w-full rounded-md border border-border p-3 text-sm"
                  />
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                {vendor.status === "PENDING_APPROVAL" && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={pending === "approve"}
                      className="rounded-md bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                    >
                      Approve vendor
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={pending === "reject"}
                      className="rounded-md bg-red px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                    >
                      Reject vendor
                    </button>
                  </>
                )}
                {vendor.status === "APPROVED" && (
                  <button
                    onClick={handleSuspend}
                    disabled={pending === "suspend"}
                    className="rounded-md bg-red px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    Suspend vendor
                  </button>
                )}
                {vendor.status === "SUSPENDED" && (
                  <button
                    onClick={handleRestore}
                    disabled={pending === "restore"}
                    className="rounded-md bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    Restore vendor
                  </button>
                )}
              </div>
            </div>
          )}

          {vendor.status !== "DEACTIVATED" && (
            <div className="rounded-xl border border-red-10 bg-white p-6">
              <h3 className="mb-3 text-base font-bold text-red-70">Danger zone</h3>
              <p className="mb-4 text-[13px] text-text-grey">Deactivate this vendor&apos;s listing entirely.</p>
              <button
                onClick={handleDeactivate}
                disabled={pending === "deactivate"}
                className="rounded-md bg-red px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                Deactivate listing
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-3 text-base font-bold">Status</h3>
            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-text-grey">Status</span>
                <Badge variant={statusBadgeVariant(vendor.status)}>{vendor.status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-text-grey">Verification</span>
                <Badge variant={vendor.verificationLevel === "UNVERIFIED" ? "grey" : "blue"}>
                  {verificationLabel(vendor.verificationLevel)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-text-grey">Creation source</span>
                <span className="font-semibold">{creationSourceLabel(vendor.creationSource ?? "")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-grey">Submitted</span>
                <span className="font-semibold">{formatDateTime(vendor.submittedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-grey">Owner account</span>
                <span className="font-semibold">{vendor.owner?.email ?? "No owner (admin-created)"}</span>
              </div>
              {vendor.rejectionReason && (
                <div className="mt-2 rounded-md bg-red-10 p-3 text-red-70">
                  <strong className="block text-xs">Rejection reason</strong>
                  {vendor.rejectionReason}
                </div>
              )}
              {vendor.suspensionReason && (
                <div className="mt-2 rounded-md bg-red-10 p-3 text-red-70">
                  <strong className="block text-xs">Suspension reason</strong>
                  {vendor.suspensionReason}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-6">
            <h3 className="mb-3 text-base font-bold">Status history</h3>
            {statusHistory.length === 0 ? (
              <p className="text-[13px] text-text-grey">No status changes yet.</p>
            ) : (
              statusHistory.map((entry) => (
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
        </div>
      </div>
    </div>
  );
}
