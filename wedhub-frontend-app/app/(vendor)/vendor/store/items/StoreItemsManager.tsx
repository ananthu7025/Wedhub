"use client";

import { useState } from "react";
import { deleteMyStoreItem } from "@/lib/api/vendor-store-client";
import type { VendorStoreItem } from "@/lib/api/vendor-store.types";
import { StoreItemModal } from "./StoreItemModal";

export function StoreItemsManager({
  initialItems,
}: {
  initialItems: VendorStoreItem[];
}) {
  const [items, setItems] = useState<VendorStoreItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [filterAvailability, setFilterAvailability] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VendorStoreItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchTag = item.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchTag) return false;
    }
    if (filterAvailability === "AVAILABLE" && !item.isAvailable) return false;
    if (filterAvailability === "UNAVAILABLE" && item.isAvailable) return false;
    return true;
  });

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to remove this product from your store?")) {
      return;
    }

    setDeletingId(id);
    const res = await deleteMyStoreItem(id);
    setDeletingId(null);

    if (res.success) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      alert(
        typeof res.error === "string"
          ? res.error
          : res.error?.message || "Failed to delete item",
      );
    }
  }

  function handleSaved(savedItem: VendorStoreItem) {
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

  return (
    <div className="space-y-5">
      {/* Action and Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-text-grey"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products or tags…"
              className="w-full rounded-lg border border-border bg-white pl-9 pr-3 py-2 text-xs focus:border-brand-primary focus:outline-none"
            />
          </div>

          <select
            value={filterAvailability}
            onChange={(e) => setFilterAvailability(e.target.value)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-text-dark focus:border-brand-primary focus:outline-none"
          >
            <option value="ALL">All Items</option>
            <option value="AVAILABLE">Available Only</option>
            <option value="UNAVAILABLE">Draft / Hidden</option>
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
          Add Product
        </button>
      </div>

      {/* Items Table / Cards */}
      <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-surface-input flex items-center justify-center text-text-grey mb-3">
              🛍️
            </div>
            <h3 className="text-sm font-bold text-text-dark">No products found</h3>
            <p className="mt-1 text-xs text-text-grey max-w-sm mx-auto">
              {items.length === 0
                ? "You haven't listed any items in your store yet. Start adding products, wedding favors, or floral sets to take orders!"
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
                + Create Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-input/60 text-text-grey font-semibold">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Price & GST</th>
                  <th className="px-4 py-3">Stock / Min Qty</th>
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
                              <img src={imgUrl} alt={item.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-base">
                                🎁
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-text-dark line-clamp-1">{item.title}</div>
                            <div className="text-[11px] text-text-grey font-mono">/store/{item.slug}</div>
                            {item.tags.length > 0 && (
                              <div className="mt-1 flex gap-1 flex-wrap">
                                {item.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="rounded bg-surface-input px-1.5 py-0.2 text-[10px] text-text-grey">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-text-dark font-medium whitespace-nowrap">
                        <span className="inline-block rounded-md bg-surface-input px-2 py-1 text-[11px] text-text-body">
                          {item.itemType.replace("_", " ")}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-text-dark">₹{item.price.toLocaleString("en-IN")}</div>
                        {item.compareAtPrice && item.compareAtPrice > item.price && (
                          <div className="text-[11px] text-text-grey line-through">
                            ₹{item.compareAtPrice.toLocaleString("en-IN")}
                          </div>
                        )}
                        <div className="text-[10px] text-text-grey">{item.gstRate}% GST</div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-text-dark">
                          {item.stockQuantity !== null && item.stockQuantity !== undefined
                            ? `${item.stockQuantity} in stock`
                            : "Unlimited"}
                        </div>
                        <div className="text-[11px] text-text-grey">Min: {item.minOrderQuantity}</div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.isAvailable ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-surface-input px-2 py-0.5 text-[11px] font-semibold text-text-grey border border-border">
                            Hidden
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
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
        <StoreItemModal
          item={editingItem}
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
