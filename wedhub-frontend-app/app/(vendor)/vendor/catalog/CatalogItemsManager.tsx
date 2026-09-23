"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  deleteMyCatalogItem,
  downloadMyCatalogImportTemplate,
  getMyCatalogItems,
  importMyCatalogItems,
} from "@/lib/api/vendor-catalog-client";
import type { CatalogImportResult, CatalogItem, CatalogVariantField } from "@/lib/api/vendor-catalog.types";
import { CatalogItemModal } from "./CatalogItemModal";

export function CatalogItemsManager({
  initialItems,
  variantFields,
  vendorSlug,
  vendorName,
}: {
  initialItems: CatalogItem[];
  variantFields: CatalogVariantField[];
  vendorSlug?: string;
  vendorName?: string;
}) {
  const [items, setItems] = useState<CatalogItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<CatalogImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter((item) => {
    if (search.trim() && !item.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (filterActive === "ACTIVE" && !item.isActive) return false;
    if (filterActive === "INACTIVE" && item.isActive) return false;
    return true;
  });

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to remove this catalog item?")) return;

    setDeletingId(id);
    const res = await deleteMyCatalogItem(id);
    setDeletingId(null);

    if (res.success) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      alert(typeof res.error === "string" ? res.error : res.error?.message || "Failed to delete item");
    }
  }

  function handleSaved(savedItem: CatalogItem) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === savedItem.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedItem;
        return next;
      }
      return [savedItem, ...prev];
    });
    setModalOpen(false);
    setEditingItem(null);
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

  const publicCatalogUrl =
    typeof window !== "undefined" && vendorSlug
      ? `${window.location.origin}/catalog/${vendorSlug}`
      : `/catalog/${vendorSlug || ""}`;

  function handleCopyStorefrontLink() {
    if (typeof window !== "undefined" && vendorSlug) {
      const fullUrl = `${window.location.origin}/catalog/${vendorSlug}`;
      navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  }

  function handleShareStorefrontWhatsApp() {
    const fullUrl = typeof window !== "undefined" && vendorSlug ? `${window.location.origin}/catalog/${vendorSlug}` : "";
    const msg = `✨ Browse our exclusive bridal rental collection & jewelry sets on our WedHub Storefront:\n${fullUrl}\n\nBook direct with us on WhatsApp!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <div className="space-y-5">
      {/* Public Storefront Banner */}
      {vendorSlug && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
                🏪
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-neutral-900">Your Shopify-Style Public Storefront is Live</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Public Link
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-600 max-w-xl leading-relaxed">
                  Couples can browse your entire rental catalog, filter by collection and price, view pieces checklists,
                  and place rental orders directly to your WhatsApp with an itemized inquiry.
                </p>
                <div className="mt-2 text-xs font-mono text-emerald-800 font-semibold truncate max-w-md">
                  {publicCatalogUrl}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleShareStorefrontWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm"
              >
                <span>💬 Share on WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleCopyStorefrontLink}
                className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-800 text-xs font-bold hover:bg-neutral-50 transition flex items-center gap-1.5"
              >
                <span>{copiedLink ? "✓ Copied!" : "📋 Copy Link"}</span>
              </button>
              <Link
                href={`/catalog/${vendorSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl border border-neutral-900 bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition flex items-center gap-1"
              >
                <span>Preview Storefront ↗</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-4">
        <div>
          <p className="text-sm font-bold text-text-dark">Bulk import</p>
          <p className="text-xs text-text-grey">Download the template for your category, fill it in, and upload it here.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadMyCatalogImportTemplate()}
            className="rounded-lg border border-border bg-white px-3.5 py-2 text-xs font-bold text-text-dark hover:bg-surface-input"
          >
            Download template
          </button>
          <button
            type="button"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-border bg-white px-3.5 py-2 text-xs font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
          >
            {importing ? "Importing…" : "Import CSV"}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} className="sr-only" />
        </div>
      </div>

      {importError && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{importError}</div>}

      {importResult && (
        <div className="rounded-lg border border-border bg-white p-4">
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
              className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-xs focus:border-brand-primary focus:outline-none"
            />
          </div>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-text-dark focus:border-brand-primary focus:outline-none"
          >
            <option value="ALL">All Items</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setModalOpen(true);
          }}
          className="rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover transition-colors flex items-center justify-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </button>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-surface-input flex items-center justify-center text-text-grey mb-3">🗂️</div>
            <h3 className="text-sm font-bold text-text-dark">No catalog items found</h3>
            <p className="mt-1 text-xs text-text-grey max-w-sm mx-auto">
              {items.length === 0
                ? "You haven't added any catalog items yet. Start listing items with pricing, variants, and photos."
                : "No items match your search filter."}
            </p>
            {items.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setModalOpen(true);
                }}
                className="mt-4 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover"
              >
                + Create Your First Item
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-input/60 text-text-grey font-semibold">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Variants</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const primaryMedia = item.media && item.media[0];
                  const imgUrl = primaryMedia?.url ?? primaryMedia?.thumbnailUrl;

                  return (
                    <tr key={item.id} className="hover:bg-surface-input/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 flex-shrink-0 rounded-lg border border-border overflow-hidden bg-surface-input">
                            {imgUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={imgUrl} alt={item.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-base">🗂️</div>
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
                          <span className="inline-flex items-center rounded-full bg-surface-input px-2 py-0.5 text-[11px] font-semibold text-text-grey border border-border">
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
                                const msg = `✨ Check out *${item.title}* (${priceLabel(item)}) from our bridal rental collection:\n${fullUrl}\n\nContact us on WhatsApp for availability and booking!`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                              }}
                              className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                              title="Share item on WhatsApp"
                            >
                              <span>💬 Share</span>
                            </button>
                          )}
                          <Link
                            href={`/vendor/catalog/${item.id}`}
                            className="rounded border border-border bg-white px-2.5 py-1 text-xs font-bold text-text-dark hover:bg-surface-input transition-colors"
                          >
                            Calendar
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setModalOpen(true);
                            }}
                            className="rounded border border-border bg-white px-2.5 py-1 text-xs font-bold text-text-dark hover:bg-surface-input transition-colors"
                          >
                            Edit
                          </button>
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

      {modalOpen && (
        <CatalogItemModal
          item={editingItem}
          variantFields={variantFields}
          onClose={() => {
            setModalOpen(false);
            setEditingItem(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
