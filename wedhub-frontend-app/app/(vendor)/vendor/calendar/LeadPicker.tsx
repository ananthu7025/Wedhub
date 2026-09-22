"use client";

import { useEffect, useRef, useState } from "react";
import { searchMyLeadsClient } from "@/lib/api/leads-client";
import type { VendorLead } from "@/lib/api/leads.types";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Searchable "fill from an existing lead" picker for BookingModal — item 10:
 * only surfaces contacts this vendor has actually exchanged enquiries with
 * on the platform (GET /leads?search=, matching enquiry.contactName/
 * contactEmail/message), not an open text field, since those are the only
 * contacts genuinely relevant to a booking. Picking a result fills the
 * modal's clientName/clientPhone/clientEmail from that lead's enquiry —
 * the vendor can still edit any of them afterward, this just saves re-typing
 * details already on file. Modeled on VendorSearchPicker.tsx's debounced
 * dropdown pattern (app/(couple)/reviews/write/).
 */
export function LeadPicker({ onPick }: { onPick: (lead: VendorLead) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VendorLead[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const keyword = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (keyword.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      const result = await searchMyLeadsClient(keyword, 8);
      setSearching(false);
      if (result.success) setResults(result.data);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function pick(lead: VendorLead) {
    onPick(lead);
    setQuery(lead.enquiry.contactName);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-semibold text-text-grey mb-1">
        Fill from an existing enquiry (optional)
      </label>
      <input
        type="text"
        placeholder="Search by name, email, or message…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        className="w-full rounded-lg border border-border px-3.5 py-2 text-sm text-text-dark bg-white focus:border-brand-primary focus:outline-none"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-white shadow-lg">
          {searching && <p className="px-3.5 py-2.5 text-xs text-text-grey">Searching…</p>}
          {!searching && results.length === 0 && (
            <p className="px-3.5 py-2.5 text-xs text-text-grey">No matching enquiries found.</p>
          )}
          {!searching &&
            results.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => pick(lead)}
                className="flex w-full flex-col items-start gap-0.5 border-b border-neutral-grey-20 px-3.5 py-2.5 text-left last:border-b-0 hover:bg-surface-input"
              >
                <span className="text-[13px] font-bold text-text-dark">{lead.enquiry.contactName}</span>
                <span className="text-xs text-text-grey">
                  {lead.enquiry.contactPhone ?? lead.enquiry.contactEmail}
                  {lead.enquiry.weddingDate ? ` · ${new Date(lead.enquiry.weddingDate).toLocaleDateString("en-IN")}` : ""}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
