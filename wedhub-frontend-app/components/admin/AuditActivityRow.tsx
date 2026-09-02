import type { AdminAuditLogEntry } from "@/lib/api/admin.types";

/**
 * Renders one real audit-log row as human-readable text, matching
 * wedhub-frontend/admin/dashboard.html's "Recent activity" card. Shared
 * with the Frontend Arch Phase 10 audit-log page. Real fields only —
 * `action` is a real enum (ADMIN_APPROVED_VENDOR, ADMIN_REJECTED_VENDOR,
 * ADMIN_SUSPENDED_VENDOR, ADMIN_RESTORED_VENDOR, ADMIN_DEACTIVATED_VENDOR,
 * ADMIN_SET_VENDOR_VERIFICATION, ADMIN_SUSPENDED_USER, ADMIN_RESTORED_USER
 * confirmed via research), `before`/`after` are real JSON snapshots.
 */

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function describeAction(entry: AdminAuditLogEntry): string {
  const target = entry.entityType === "vendor" ? "vendor" : entry.entityType === "user" ? "user" : entry.entityType;
  switch (entry.action) {
    case "ADMIN_APPROVED_VENDOR":
      return `approved ${target}`;
    case "ADMIN_REJECTED_VENDOR":
      return `rejected ${target}`;
    case "ADMIN_SUSPENDED_VENDOR":
      return `suspended ${target}`;
    case "ADMIN_RESTORED_VENDOR":
      return `restored ${target}`;
    case "ADMIN_DEACTIVATED_VENDOR":
      return `deactivated ${target}`;
    case "ADMIN_SET_VENDOR_VERIFICATION": {
      const level = (entry.after as { verificationLevel?: string } | null)?.verificationLevel;
      return `set verification level of ${target}${level ? ` to ${level}` : ""}`;
    }
    case "ADMIN_SUSPENDED_USER":
      return `suspended user`;
    case "ADMIN_RESTORED_USER":
      return `restored user`;
    default:
      return entry.action.toLowerCase().replace(/_/g, " ");
  }
}

export function AuditActivityRow({ entry }: { entry: AdminAuditLogEntry }) {
  return (
    <div className="flex gap-3 border-b border-neutral-grey-20 py-3 last:border-b-0">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-input text-text-grey">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <div>
        <p className="text-[13px] leading-relaxed">
          <strong>{entry.actor ? entry.actor.email : "System"}</strong> {describeAction(entry)}
        </p>
        <p className="mt-0.5 text-xs text-text-grey">{formatRelativeTime(entry.createdAt)}</p>
      </div>
    </div>
  );
}
