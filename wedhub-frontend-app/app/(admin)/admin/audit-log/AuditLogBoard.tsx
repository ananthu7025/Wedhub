"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminAuditLogEntry } from "@/lib/api/admin.types";

/**
 * Audit log (Frontend Arch Phase 10), matching
 * wedhub-frontend/admin/audit-log.html. Real filters only —
 * entityType/entityId/actorId are the only server-filterable fields
 * (confirmed via buildWhere() read of admin-audit-logs.repository.ts) —
 * the mockup's actor-name dropdown, date-range pickers and action-type
 * dropdown have no server-side equivalent, so this omits them rather than
 * building filters that silently do nothing; entityId/actorId are exact
 * UUID text inputs since the backend does exact match, not fuzzy search.
 * before/after are rendered as generic key/value JSON since each call
 * site hand-picks a different minimal snapshot shape (confirmed via
 * research) — there's no universal full-entity-diff convention to render
 * against.
 */

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function DiffValue({ value }: { value: Record<string, unknown> | null }) {
  if (!value) return <span className="text-text-grey">—</span>;
  return (
    <code className="rounded bg-surface-input px-1.5 py-0.5 text-[11px]">
      {Object.entries(value)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(", ")}
    </code>
  );
}

export function AuditLogBoard({
  entries,
  total,
  totalPages,
  page,
  filters,
}: {
  entries: AdminAuditLogEntry[];
  total: number;
  totalPages: number;
  page: number;
  filters: { entityType?: string; entityId?: string; actorId?: string };
}) {
  const router = useRouter();
  const [entityType, setEntityType] = useState(filters.entityType ?? "");
  const [entityId, setEntityId] = useState(filters.entityId ?? "");
  const [actorId, setActorId] = useState(filters.actorId ?? "");

  function applyFilters(nextPage = 1) {
    const params = new URLSearchParams();
    if (entityType) params.set("entityType", entityType);
    if (entityId) params.set("entityId", entityId);
    if (actorId) params.set("actorId", actorId);
    if (nextPage > 1) params.set("page", String(nextPage));
    router.push(`/admin/audit-log?${params.toString()}`);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit log</h1>
        <p className="text-sm text-text-grey">Every privileged admin action, recorded with actor, before/after state and timestamp.</p>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-white p-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-text-grey">Entity type</span>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="w-40 rounded-md border border-border px-3 py-2 text-sm">
            <option value="">All entity types</option>
            <option value="vendor">vendor</option>
            <option value="user">user</option>
            <option value="review">review</option>
            <option value="lead">lead</option>
            <option value="category">category</option>
            <option value="location">location</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-text-grey">Entity ID (UUID)</span>
          <input value={entityId} onChange={(e) => setEntityId(e.target.value)} className="w-64 rounded-md border border-border px-3 py-2 text-sm" placeholder="exact match" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-text-grey">Actor ID (UUID)</span>
          <input value={actorId} onChange={(e) => setActorId(e.target.value)} className="w-64 rounded-md border border-border px-3 py-2 text-sm" placeholder="exact match" />
        </label>
        <button onClick={() => applyFilters(1)} className="rounded-md border border-border bg-white px-4 py-2 text-sm font-bold text-text-dark">
          Apply
        </button>
      </div>
      <p className="mb-4 text-xs text-text-grey">
        Only entity type, exact entity ID, and exact actor ID are server-filterable — there is no action-type or date-range filter on this backend yet.
      </p>

      <div className="rounded-xl border border-border bg-white">
        {entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-grey">No audit entries match this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-grey">
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Before → After</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0 align-top">
                    <td className="whitespace-nowrap px-5 py-3">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-5 py-3">{entry.actor ? entry.actor.email : "System"}</td>
                    <td className="px-5 py-3">
                      <code className="rounded bg-surface-input px-1.5 py-0.5 text-[11px]">{entry.action}</code>
                    </td>
                    <td className="px-5 py-3 text-text-grey">
                      {entry.entityType} · {entry.entityId.slice(0, 8)}…
                    </td>
                    <td className="px-5 py-3 text-[12px]">
                      <DiffValue value={entry.before} /> → <DiffValue value={entry.after} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[13px] text-text-grey">
          Showing {entries.length} of {total} audit entries
        </p>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => applyFilters(page - 1)}
            className="rounded-md border border-border bg-white px-3.5 py-2 text-xs font-bold text-text-dark disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => applyFilters(page + 1)}
            className="rounded-md border border-border bg-white px-3.5 py-2 text-xs font-bold text-text-dark disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
