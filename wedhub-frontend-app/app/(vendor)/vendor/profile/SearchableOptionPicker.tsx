"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addMyAttributeOption } from "@/lib/api/vendor-self-client";
import { formatApiError } from "@/lib/utils/error";
import { useToast } from "@/components/ui/Toast";

/**
 * Item 3 (2026-09-22 request): replaces the plain <select>/checkbox-list
 * rendering for every category-attribute SELECT/MULTI_SELECT field with a
 * search box + an "Add ..." affordance for options that don't exist yet.
 * Adding a new option calls POST /vendors/me/attributes/:id/options, which
 * appends it to that CategoryAttribute's *shared* options list server-side
 * (see vendor.service.ts's addCategoryAttributeOption) — so it becomes
 * available to every other vendor in the same category immediately, not
 * just saved as this vendor's own value. `onOptionsChange` lets the parent
 * (AttributesSection) merge the newly-added option into its own local
 * `attribute.options` copy without a full page reload.
 */
export function SearchableOptionPicker({
  attributeId,
  options,
  selected,
  multiple,
  onSelectionChange,
  onOptionsChange,
}: {
  attributeId: string;
  options: string[];
  selected: string[];
  multiple: boolean;
  onSelectionChange: (next: string[]) => void;
  onOptionsChange: (next: string[]) => void;
}) {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmedQuery = query.trim();
  const filteredOptions = useMemo(() => {
    if (!trimmedQuery) return options;
    const lower = trimmedQuery.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(lower));
  }, [options, trimmedQuery]);

  const exactMatchExists = options.some((o) => o.toLowerCase() === trimmedQuery.toLowerCase());
  const canAddNew = trimmedQuery.length > 0 && !exactMatchExists;

  function toggleOption(option: string) {
    if (multiple) {
      const next = selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option];
      onSelectionChange(next);
    } else {
      onSelectionChange(selected.includes(option) ? [] : [option]);
      setOpen(false);
    }
  }

  function removeSelected(option: string) {
    onSelectionChange(selected.filter((o) => o !== option));
  }

  async function handleAddNew() {
    if (!canAddNew) return;
    setAdding(true);
    const result = await addMyAttributeOption(attributeId, trimmedQuery);
    setAdding(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    const updatedOptions = (result.data.options ?? []).length > 0 ? result.data.options! : [...options, trimmedQuery];
    onOptionsChange(updatedOptions);
    // The option we just typed may already have existed case-insensitively
    // under different casing — select whichever form the server actually
    // stored, not necessarily what was typed.
    const storedForm = updatedOptions.find((o) => o.toLowerCase() === trimmedQuery.toLowerCase()) ?? trimmedQuery;
    if (multiple) {
      if (!selected.includes(storedForm)) onSelectionChange([...selected, storedForm]);
    } else {
      onSelectionChange([storedForm]);
      setOpen(false);
    }
    setQuery("");
    showToast(`Added "${storedForm}" — now available for other vendors in your category too.`, "success");
  }

  return (
    <div ref={containerRef} className="relative">
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((option) => (
            <span
              key={option}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary-soft px-2.5 py-1 text-xs font-semibold text-brand-primary"
            >
              {option}
              <button
                type="button"
                onClick={() => removeSelected(option)}
                aria-label={`Remove ${option}`}
                className="text-brand-primary hover:text-brand-primary-hover"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={multiple ? "Search or add an option…" : "Search or type to add…"}
        autoComplete="off"
        className="w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-brand-primary focus:outline-none"
      />

      {open && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
          {filteredOptions.length === 0 && !canAddNew && (
            <p className="px-3.5 py-2.5 text-xs text-text-grey">No matching options.</p>
          )}
          {filteredOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              className="flex w-full items-center justify-between gap-2 border-b border-neutral-grey-20 px-3.5 py-2.5 text-left text-[13px] last:border-b-0 hover:bg-surface-input"
            >
              <span>{option}</span>
              {selected.includes(option) && <span className="text-brand-primary">✓</span>}
            </button>
          ))}
          {canAddNew && (
            <button
              type="button"
              onClick={handleAddNew}
              disabled={adding}
              className="flex w-full items-center gap-2 border-t border-neutral-grey-20 px-3.5 py-2.5 text-left text-[13px] font-semibold text-brand-primary hover:bg-brand-primary-soft/40 disabled:opacity-60"
            >
              {adding ? "Adding…" : `+ Add "${trimmedQuery}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
