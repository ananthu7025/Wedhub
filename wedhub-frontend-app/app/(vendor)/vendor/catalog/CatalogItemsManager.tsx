"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteMyCatalogItem,
  downloadMyCatalogImportTemplate,
  getMyCatalogItems,
  importMyCatalogItems,
  updateMyCatalogItem,
} from "@/lib/api/vendor-catalog-client";
import type { CatalogImportResult, CatalogItem } from "@/lib/api/vendor-catalog.types";
import { CheckIcon } from "@/components/portfolio/icons";
import { CatalogSectionShell } from "./CatalogSectionShell";

export function CatalogItemsManager({
  initialItems,
  vendorSlug,
}: {
  initialItems: CatalogItem[];
  vendorSlug?: string;
}) {
  const [items, setItems] = useState<CatalogItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<CatalogImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (search.trim() && !item.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
        if (filterActive === "ACTIVE" && !item.isActive) return false;
        if (filterActive === "INACTIVE" && item.isActive) return false;
        return true;
      }),
    [items, search, filterActive],
  );

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id));

  function toggleSelectAll() {
    setSelectedIds(allFilteredSelected ? new Set() : new Set(filteredItems.map((i) => i.id)));
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to remove this catalog item?")) return;

    setDeletingId(id);
    const res = await deleteMyCatalogItem(id);
    setDeletingId(null);

    if (res.success) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      alert(typeof res.error === "string" ? res.error : res.error?.message || "Failed to delete item");
    }
  }

  async function handleBulkSetActive(active: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkWorking(true);
    await Promise.all(ids.map((id) => updateMyCatalogItem(id, { isActive: active })));
    setBulkWorking(false);
    setItems((prev) => prev.map((item) => (ids.includes(item.id) ? { ...item, isActive: active } : item)));
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Remove ${ids.length} selected item${ids.length === 1 ? "" : "s"}? This can't be undone.`)) return;

    setBulkWorking(true);
    await Promise.all(ids.map((id) => deleteMyCatalogItem(id)));
    setBulkWorking(false);
    setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
    setSelectedIds(new Set());
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const csvContent = await file.text();
      const res = await importMyCatalogItems(csvContent);
      if (!res.success) {
        throw new Error(typeof res.error === "string" ? res.error : res.error?.message || "Import failed");
      }
      setImportResult(res.data);
      if (res.data.created > 0) {
        const refreshed = await getMyCatalogItems();
        if (refreshed.success) setItems(refreshed.data);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  function priceLabel(item: CatalogItem): string {
    if (item.variants.length > 0) {
      const prices = item.variants.map((v) => v.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return min === max ? `₹${min.toLocaleString("en-IN")}` : `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString("en-IN")}`;
    }
    if (item.basePrice != null) return `₹${item.basePrice.toLocaleString("en-IN")}`;
    return "—";
  }

  // Server and first client render both use the relative path, so hydration
  // matches; the full origin-qualified URL is filled in after mount, once
  // window.location is safe to read on the client only.
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const publicCatalogUrl = `${origin}/catalog/${vendorSlug || ""}`;

  function handleCopyStorefrontLink() {
    if (typeof window !== "undefined" && vendorSlug) {
      const fullUrl = `${window.location.origin}/catalog/${vendorSlug}`;
      navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  }

  return (
    <CatalogSectionShell>
      <div className="space-y-5">
        {/* Compact storefront-link row — replaces an earlier wide banner
            card whose action buttons overflowed on smaller viewports and
            forced the whole page to scroll horizontally. */}
        {vendorSlug && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-grey-40 bg-white px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
              <span className="text-xs font-mono text-text-dark truncate">{publicCatalogUrl}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyStorefrontLink}
                className="px-3 py-1.5 rounded-lg border border-neutral-grey-40 bg-white text-text-dark text-xs font-bold hover:bg-surface-input transition"
              >
                {copiedLink ? <><CheckIcon className="inline h-3 w-3" /> Copied!</> : "Copy Link"}
              </button>
              <Link
                href={`/catalog/${vendorSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-text-dark bg-text-dark text-white text-xs font-bold hover:bg-black transition no-underline"
              >
                View Storefront ↗
              </Link>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-grey-40 bg-white p-4">
          <div>
            <p className="text-sm font-bold text-text-dark">Bulk import</p>
            <p className="text-xs text-text-grey">Download the template for your category, fill it in, and upload it here.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadMyCatalogImportTemplate()}
              className="rounded-lg border border-neutral-grey-40 bg-white px-3.5 py-2 text-xs font-bold text-text-dark hover:bg-surface-input"
            >
              Download template
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-neutral-grey-40 bg-white px-3.5 py-2 text-xs font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
            >
              {importing ? "Importing…" : "Import CSV"}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} className="sr-only" />
          </div>
        </div>

        {importError && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{importError}</div>}

        {importResult && (
          <div className="rounded-lg border border-neutral-grey-40 bg-white p-4">
            <p className="text-xs font-bold text-text-dark">
              Imported {importResult.created} of {importResult.totalGroups} item{importResult.totalGroups === 1 ? "" : "s"}
              {importResult.failed > 0 && <span className="text-red-600"> — {importResult.failed} failed</span>}
            </p>
            {importResult.failed > 0 && (
              <ul className="mt-2 space-y-1 text-[11px] text-text-grey">
                {importResult.results
                  .filter((r) => r.status === "error")
                  .map((r) => (
                    <li key={r.row}>
                      Row {r.row} ({r.title || "untitled"}): {r.error}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-text-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items…"
                className="w-full rounded-lg border border-neutral-grey-40 bg-white pl-9 pr-3 py-2 text-xs focus:border-brand-primary focus:outline-none"
              />
            </div>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="rounded-lg border border-neutral-grey-40 bg-white px-3 py-2 text-xs text-text-dark focus:border-brand-primary focus:outline-none"
            >
              <option value="ALL">All Items</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <Link
            href="/vendor/catalog/new"
            className="rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto no-underline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </Link>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-primary/30 bg-brand-primary-soft px-4 py-2.5">
            <span className="text-xs font-bold text-text-dark">
              {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"} selected
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={bulkWorking}
                onClick={() => handleBulkSetActive(true)}
                className="rounded-lg border border-neutral-grey-40 bg-white px-3 py-1.5 text-xs font-bold text-text-dark hover:bg-surface-input disabled:opacity-50"
              >
                Set active
              </button>
              <button
                type="button"
                disabled={bulkWorking}
                onClick={() => handleBulkSetActive(false)}
                className="rounded-lg border border-neutral-grey-40 bg-white px-3 py-1.5 text-xs font-bold text-text-dark hover:bg-surface-input disabled:opacity-50"
              >
                Set inactive
              </button>
              <button
                type="button"
                disabled={bulkWorking}
                onClick={handleBulkDelete}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-neutral-grey-40 bg-white overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-surface-input flex items-center justify-center text-text-grey mb-3">
                <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-text-dark">No catalog items found</h3>
              <p className="mt-1 text-xs text-text-grey max-w-sm mx-auto">
                {items.length === 0
                  ? "You haven't added any catalog items yet. Start listing items with pricing, variants, and photos."
                  : "No items match your search filter."}
              </p>
              {items.length === 0 && (
                <Link
                  href="/vendor/catalog/new"
                  className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover no-underline"
                >
                  + Create Your First Item
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-grey-40 bg-surface-input/60 text-text-grey font-semibold">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        className="accent-brand-primary"
                        aria-label="Select all items"
                      />
                    </th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Variants</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-grey-40">
                  {filteredItems.map((item) => {
                    const primaryMedia = item.media && item.media[0];
                    const imgUrl = primaryMedia?.url ?? primaryMedia?.thumbnailUrl;
                    const isSelected = selectedIds.has(item.id);

                    return (
                      <tr key={item.id} className={`transition-colors ${isSelected ? "bg-brand-primary-soft/40" : "hover:bg-surface-input/30"}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(item.id)}
                            className="accent-brand-primary"
                            aria-label={`Select ${item.title}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 flex-shrink-0 rounded-lg border border-neutral-grey-40 overflow-hidden bg-surface-input">
                              {imgUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={imgUrl} alt={item.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-neutral-400">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-text-dark line-clamp-1">{item.title}</div>
                              {item.isCustomizable && (
                                <span className="mt-1 inline-block rounded bg-brand-primary-soft px-1.5 py-0.2 text-[10px] font-semibold text-brand-primary">
                                  Customizable package
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-dark font-medium whitespace-nowrap">
                          {item.variants.length > 0 ? `${item.variants.length} variant${item.variants.length === 1 ? "" : "s"}` : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-text-dark">{priceLabel(item)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.isActive ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-surface-input px-2 py-0.5 text-[11px] font-semibold text-text-grey border border-neutral-grey-40">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {vendorSlug && (
                              <button
                                type="button"
                                onClick={() => {
                                  const fullUrl = `${window.location.origin}/catalog/${vendorSlug}`;
                                  const msg = `Check out *${item.title}* (${priceLabel(item)}) from our rental collection:\n${fullUrl}\n\nContact us on WhatsApp for availability and booking!`;
                                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                                }}
                                className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                                title="Share item on WhatsApp"
                              >
                                <svg className="w-3 h-3 fill-current text-emerald-600" viewBox="0 0 24 24">
                                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.073-2.112-.513-1.636-.68-2.69-2.339-2.772-2.449-.082-.11-1.391-1.85-1.391-3.529 0-1.678.877-2.503 1.189-2.846.312-.343.681-.43 1.093-.43.136 0 .257.007.366.015.318.016.478.038.687.542.261.626.892 2.176.97 2.335.078.16.13.348.026.557-.104.209-.156.339-.312.521-.156.183-.328.409-.469.549-.156.157-.319.327-.137.64.182.313.809 1.334 1.735 2.16 1.191 1.061 2.195 1.389 2.508 1.545.313.156.496.13.679-.079.183-.209.782-.913.991-1.226.209-.313.418-.261.698-.157.28.104 1.776.837 2.081.989.305.153.508.228.583.355.074.128.074.743-.07 1.148z" />
                                </svg>
                                <span>WhatsApp</span>
                              </button>
                            )}
                            <Link
                              href={`/vendor/catalog/${item.id}`}
                              className="rounded border border-neutral-grey-40 bg-white px-2.5 py-1 text-xs font-bold text-text-dark hover:bg-surface-input transition-colors no-underline"
                            >
                              Calendar
                            </Link>
                            <Link
                              href={`/vendor/catalog/${item.id}/edit`}
                              className="rounded border border-neutral-grey-40 bg-white px-2.5 py-1 text-xs font-bold text-text-dark hover:bg-surface-input transition-colors no-underline"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              disabled={deletingId === item.id}
                              onClick={() => handleDelete(item.id)}
                              className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {deletingId === item.id ? "…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </CatalogSectionShell>
  );
}
