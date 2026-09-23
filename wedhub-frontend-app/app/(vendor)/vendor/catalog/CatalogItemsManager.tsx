"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

  // Storefront customization state
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [heroHeadline, setHeroHeadline] = useState("");
  const [heroTagline, setHeroTagline] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [trialButtonText, setTrialButtonText] = useState("");
  const [shopButtonText, setShopButtonText] = useState("");
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  // Load custom storefront settings from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && vendorSlug) {
      try {
        const raw = localStorage.getItem(`wedhub_storefront_${vendorSlug}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          setHeroHeadline(parsed.heroHeadline || "");
          setHeroTagline(parsed.heroTagline || "");
          setHeroSubtitle(parsed.heroSubtitle || "");
          setAnnouncementText(parsed.announcementText || "");
          setTrialButtonText(parsed.trialButtonText || "");
          setShopButtonText(parsed.shopButtonText || "");
        }
      } catch {
        // Fallback
      }
    }
  }, [vendorSlug]);

  function handleSaveStorefrontConfig() {
    if (typeof window !== "undefined" && vendorSlug) {
      const config = {
        heroHeadline: heroHeadline.trim(),
        heroTagline: heroTagline.trim(),
        heroSubtitle: heroSubtitle.trim(),
        announcementText: announcementText.trim(),
        trialButtonText: trialButtonText.trim(),
        shopButtonText: shopButtonText.trim(),
      };
      localStorage.setItem(`wedhub_storefront_${vendorSlug}`, JSON.stringify(config));
      setSavedSettingsNotice(true);
      setTimeout(() => {
        setSavedSettingsNotice(false);
        setCustomizerOpen(false);
      }, 1500);
    }
  }

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
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <svg className="w-5 h-5 fill-none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009 9.35c.663 0 1.285-.216 1.79-.582a3.003 3.003 0 004.42 0c.505.366 1.127.582 1.79.582a2.993 2.993 0 002.46-1.214 3.001 3.001 0 003.75.614m-16.5 0v-4.5a3 3 0 013-3h10.5a3 3 0 013 3v4.5" />
                </svg>
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
                onClick={() => setCustomizerOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-800 text-xs font-bold hover:bg-neutral-50 transition flex items-center gap-1.5 shadow-xs"
              >
                <svg className="w-3.5 h-3.5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                </svg>
                <span>Customize Storefront</span>
              </button>
              <button
                type="button"
                onClick={handleShareStorefrontWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.073-2.112-.513-1.636-.68-2.69-2.339-2.772-2.449-.082-.11-1.391-1.85-1.391-3.529 0-1.678.877-2.503 1.189-2.846.312-.343.681-.43 1.093-.43.136 0 .257.007.366.015.318.016.478.038.687.542.261.626.892 2.176.97 2.335.078.16.13.348.026.557-.104.209-.156.339-.312.521-.156.183-.328.409-.469.549-.156.157-.319.327-.137.64.182.313.809 1.334 1.735 2.16 1.191 1.061 2.195 1.389 2.508 1.545.313.156.496.13.679-.079.183-.209.782-.913.991-1.226.209-.313.418-.261.698-.157.28.104 1.776.837 2.081.989.305.153.508.228.583.355.074.128.074.743-.07 1.148z" />
                </svg>
                <span>Share WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleCopyStorefrontLink}
                className="px-3.5 py-2 rounded-xl border border-neutral-300 bg-white text-neutral-800 text-xs font-bold hover:bg-neutral-50 transition flex items-center gap-1.5"
              >
                <span>{copiedLink ? "✓ Copied!" : "Copy Link"}</span>
              </button>
              <Link
                href={`/catalog/${vendorSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl border border-neutral-900 bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition flex items-center gap-1"
              >
                <span>View Storefront</span>
                <span className="text-[10px]">↗</span>
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

      {/* Storefront Customizer Modal */}
      {customizerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-neutral-900">Customize Storefront</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Update the headline, description, and announcements displayed on your public catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomizerOpen(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Hero Main Headline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Exquisite Bridal Suites for Your Special Day"
                  value={heroHeadline}
                  onChange={(e) => setHeroHeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Pre-Heading Tagline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tradition Meets Timeless Beauty"
                  value={heroTagline}
                  onChange={(e) => setHeroTagline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Hero Description / Subtitle
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Handcrafted rental pieces curated for unforgettable moments."
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Top Announcement Ticker
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100% Sanitized & Handcrafted Suites · Studio Trials Available · Flexible Rental Dates"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">
                    Shop CTA Button Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shop Collection"
                    value={shopButtonText}
                    onChange={(e) => setShopButtonText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">
                    Trial CTA Button Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Book a Studio Trial"
                    value={trialButtonText}
                    onChange={(e) => setTrialButtonText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600">
                {savedSettingsNotice ? "✓ Saved successfully! Refreshing storefront." : ""}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCustomizerOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStorefrontConfig}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-sm"
                >
                  Save Storefront Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
