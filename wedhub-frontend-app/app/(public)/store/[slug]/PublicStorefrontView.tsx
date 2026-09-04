"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  PublicStoreData,
  StoreItemType,
  VendorStoreItem,
} from "@/lib/api/vendor-store.types";
import { PublicItemCard } from "./PublicItemCard";
import { CartDrawer, type CartItem } from "@/components/vendor-store/CartDrawer";

export function PublicStorefrontView({
  store,
  items,
}: {
  store: PublicStoreData;
  items: VendorStoreItem[];
}) {
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);

  const filteredItems = items.filter((item) => {
    if (selectedType !== "ALL" && item.itemType !== selectedType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q) ?? false;
      const matchTag = item.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTag) return false;
    }
    return true;
  });

  const cartTotalCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);
  const cartSubtotal = cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);

  function handleAddToCart(item: VendorStoreItem, quantity: number) {
    setCart((prev) => {
      const idx = prev.findIndex((ci) => ci.item.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + quantity,
        };
        return next;
      }
      return [...prev, { item, quantity }];
    });
  }

  function handleUpdateQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((ci) => (ci.item.id === itemId ? { ...ci, quantity } : ci)),
    );
  }

  function handleRemoveItem(itemId: string) {
    setCart((prev) => prev.filter((ci) => ci.item.id !== itemId));
  }

  function handleClearCart() {
    setCart([]);
  }

  return (
    <div className="min-h-screen bg-neutral-grey-10 pb-20">
      {/* Store Header Banner */}
      <div className="relative bg-white border-b border-border">
        {store.vendor.coverUrl ? (
          <div className="h-44 md:h-64 w-full overflow-hidden bg-surface-input">
            <img
              src={store.vendor.coverUrl}
              alt={store.storeName}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="h-32 md:h-48 w-full bg-gradient-to-r from-brand-primary/15 via-purple-100/40 to-pink-100/30" />
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative -mt-12 md:-mt-16 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6">
            <div className="flex items-start sm:items-end gap-4">
              <div className="h-24 w-24 md:h-32 md:w-32 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden flex-shrink-0">
                {store.vendor.logoUrl ? (
                  <img
                    src={store.vendor.logoUrl}
                    alt={store.vendor.businessName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-brand-primary text-white text-2xl font-bold">
                    {store.storeName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold text-text-dark">
                    {store.storeName}
                  </h1>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    ✓ Verified Vendor Store
                  </span>
                </div>

                {store.tagline && (
                  <p className="mt-1 text-xs md:text-sm text-text-grey max-w-xl">
                    {store.tagline}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-3 text-xs text-text-grey flex-wrap">
                  <span>By <strong>{store.vendor.businessName}</strong></span>
                  {store.vendor.address && <span>📍 {store.vendor.address}</span>}
                  <Link
                    href={`/vendors/${store.vendor.slug}`}
                    className="text-brand-primary font-bold hover:underline"
                  >
                    View Vendor Portfolio & Reviews →
                  </Link>
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              {(store.shippingPolicy || store.returnPolicy) && (
                <button
                  type="button"
                  onClick={() => setShowPolicies((v) => !v)}
                  className="rounded-lg border border-border bg-white px-3.5 py-2 text-xs font-bold text-text-dark hover:bg-surface-input transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4 text-text-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Store Policies
                </button>
              )}

              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover transition-colors flex items-center gap-2 shadow-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Cart ({cartTotalCount})</span>
                {cartSubtotal > 0 && <span>· ₹{cartSubtotal.toLocaleString("en-IN")}</span>}
              </button>
            </div>
          </div>

          {/* Store Policies Dropdown */}
          {showPolicies && (
            <div className="mb-6 rounded-xl border border-border bg-surface-input/50 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {store.shippingPolicy && (
                <div>
                  <h4 className="font-bold text-text-dark mb-1">🚚 Shipping & Delivery Policy</h4>
                  <p className="text-text-grey leading-relaxed">{store.shippingPolicy}</p>
                </div>
              )}
              {store.returnPolicy && (
                <div>
                  <h4 className="font-bold text-text-dark mb-1">🔄 Return & Cancellation Policy</h4>
                  <p className="text-text-grey leading-relaxed">{store.returnPolicy}</p>
                </div>
              )}
              {store.minOrderValue && (
                <div className="md:col-span-2 text-text-dark font-medium border-t border-border/70 pt-2">
                  Minimum Order Value: <strong>₹{store.minOrderValue.toLocaleString("en-IN")}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Storefront Catalog Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {[
              { id: "ALL", label: "All Items" },
              { id: "PHYSICAL_PRODUCT", label: "Products & Favors" },
              { id: "RENTAL_ITEM", label: "Rental Items" },
              { id: "SERVICE_TOKEN", label: "Services & Add-ons" },
              { id: "DIGITAL_DOWNLOAD", label: "Digital Assets" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedType === tab.id
                    ? "bg-text-dark text-white"
                    : "bg-white text-text-grey border border-border hover:bg-surface-input hover:text-text-dark"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
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
              placeholder="Search store items…"
              className="w-full rounded-full border border-border bg-white pl-9 pr-3 py-2 text-xs focus:border-brand-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Product Grid */}
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-16 text-center shadow-xs">
            <div className="mx-auto w-14 h-14 rounded-full bg-surface-input flex items-center justify-center text-2xl mb-3">
              🔍
            </div>
            <h3 className="text-base font-bold text-text-dark">No products found</h3>
            <p className="mt-1 text-xs text-text-grey max-w-sm mx-auto">
              {items.length === 0
                ? "This store hasn't published any items for sale yet. Check back soon!"
                : "No products matched your selected category filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredItems.map((item) => (
              <PublicItemCard
                key={item.id}
                item={item}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar (if items in cart) */}
      {cartTotalCount > 0 && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-40">
          <div className="rounded-2xl bg-text-dark text-white p-3.5 shadow-xl flex items-center justify-between gap-3 backdrop-blur-md">
            <div>
              <div className="text-xs text-neutral-grey-20">
                {cartTotalCount} item{cartTotalCount === 1 ? "" : "s"} selected
              </div>
              <div className="text-sm font-bold">
                ₹{cartSubtotal.toLocaleString("en-IN")}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>View Cart & Order</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        storeSlug={store.slug}
        storeName={store.storeName}
        minOrderValue={store.minOrderValue}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
      />
    </div>
  );
}
