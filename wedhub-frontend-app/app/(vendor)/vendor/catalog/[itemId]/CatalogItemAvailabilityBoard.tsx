"use client";

import { useMemo, useState } from "react";
import {
  clearMyCatalogItemAvailability,
  getMyCatalogItemAvailability,
  setMyCatalogItemAvailability,
} from "@/lib/api/vendor-catalog-client";
import type { CatalogAvailabilityEntry, CatalogAvailabilityStatus, CatalogItem } from "@/lib/api/vendor-catalog.types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function CatalogItemAvailabilityBoard({
  item,
  initialAvailability,
}: {
  item: CatalogItem;
  initialAvailability: CatalogAvailabilityEntry[];
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<CatalogAvailabilityEntry[]>(initialAvailability);
  const [loading, setLoading] = useState(false);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, CatalogAvailabilityEntry>();
    for (const entry of availability) {
      if (entry.variantId === selectedVariantId) map.set(entry.date.slice(0, 10), entry);
    }
    return map;
  }, [availability, selectedVariantId]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

  function changeMonth(delta: number) {
    let nextMonth = month + delta;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setMonth(nextMonth);
    setYear(nextYear);
  }

  async function reload() {
    const res = await getMyCatalogItemAvailability(item.id);
    if (res.success) setAvailability(res.data);
  }

  async function handleDateClick(dateStr: string) {
    const existing = byDate.get(dateStr);
    setLoading(true);
    setPendingDate(dateStr);
    setError(null);

    try {
      let res;
      if (!existing) {
        res = await setMyCatalogItemAvailability(item.id, { variantId: selectedVariantId, dates: [dateStr], status: "BOOKED" });
      } else if (existing.status === "BOOKED") {
        res = await setMyCatalogItemAvailability(item.id, { variantId: selectedVariantId, dates: [dateStr], status: "BLOCKED" });
      } else {
        res = await clearMyCatalogItemAvailability(item.id, { variantId: selectedVariantId, dates: [dateStr] });
      }

      if (!res.success) {
        setError(typeof res.error === "string" ? res.error : res.error?.message || "Failed to update availability");
        return;
      }
      await reload();
    } finally {
      setLoading(false);
      setPendingDate(null);
    }
  }

  function statusFor(dateStr: string): CatalogAvailabilityStatus | null {
    return byDate.get(dateStr)?.status ?? null;
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4 sm:p-5">
      {item.variants.length > 0 && (
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold text-text-grey">Variant</label>
          <select
            value={selectedVariantId ?? ""}
            onChange={(e) => setSelectedVariantId(e.target.value || null)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-xs focus:border-brand-primary focus:outline-none"
          >
            <option value="">Whole item (all variants)</option>
            {item.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.sku || Object.values(v.attributes).filter(Boolean).join(", ") || v.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{error}</div>}

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-text-dark hover:bg-surface-input"
        >
          ← Prev
        </button>
        <h2 className="text-sm font-bold text-text-dark">
          {new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </h2>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-text-dark hover:bg-surface-input"
        >
          Next →
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-text-grey">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-border bg-white" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-indigo-200 bg-indigo-50" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-rose-200 bg-rose-50" /> Blocked
        </span>
        <span className="ml-auto">Click a date to cycle: Available → Booked → Blocked → Available</span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[11px] font-semibold uppercase tracking-wider text-text-muted py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[64px] rounded-lg border border-dashed border-border/60 opacity-40" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dateStr = formatDate(year, month, dayNum);
          const status = statusFor(dateStr);
          const isToday = dateStr === now.toISOString().slice(0, 10);
          const isPending = pendingDate === dateStr;

          return (
            <button
              type="button"
              key={dateStr}
              disabled={loading}
              onClick={() => handleDateClick(dateStr)}
              className={`min-h-[64px] rounded-lg border p-1.5 text-left transition disabled:cursor-wait ${
                status === "BOOKED"
                  ? "border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                  : status === "BLOCKED"
                    ? "border-rose-200 bg-rose-50 hover:bg-rose-100"
                    : "border-border bg-white hover:border-brand-primary hover:bg-surface-input"
              } ${isToday ? "ring-2 ring-brand-primary/30" : ""}`}
            >
              <span className="text-xs font-bold text-text-dark">{dayNum}</span>
              {isPending && <span className="mt-1 block text-[9px] text-text-grey">Saving…</span>}
              {!isPending && status && (
                <span
                  className={`mt-1 block text-[9px] font-semibold ${status === "BOOKED" ? "text-indigo-700" : "text-rose-700"}`}
                >
                  {status === "BOOKED" ? "Booked" : "Blocked"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
