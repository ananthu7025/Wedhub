"use client";

import { useState } from "react";
import type { VendorStoreItem } from "@/lib/api/vendor-store.types";

export function PublicItemCard({
  item,
  onAddToCart,
}: {
  item: VendorStoreItem;
  onAddToCart: (item: VendorStoreItem, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(item.minOrderQuantity || 1);
  const [justAdded, setJustAdded] = useState(false);

  const primaryMedia = item.media && item.media[0];
  const imgUrl = primaryMedia?.url ?? primaryMedia?.thumbnailUrl;

  const hasDiscount =
    item.compareAtPrice && item.compareAtPrice > item.price;
  const discountPercent = hasDiscount
    ? Math.round(((item.compareAtPrice! - item.price) / item.compareAtPrice!) * 100)
    : 0;

  function handleAdd() {
    onAddToCart(item, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-white overflow-hidden shadow-xs hover:shadow-md transition-shadow">
      {/* Product Image Area */}
      <div className="relative aspect-4/3 w-full bg-surface-input overflow-hidden group">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={item.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-4xl bg-surface-input/80">
            🎁
          </div>
        )}

        {hasDiscount && (
          <span className="absolute top-2 left-2 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
            {discountPercent}% OFF
          </span>
        )}

        <span className="absolute top-2 right-2 rounded-full bg-white/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-semibold text-text-dark border border-border/50">
          {item.itemType.replace("_", " ")}
        </span>
      </div>

      {/* Content Area */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="text-sm font-bold text-text-dark line-clamp-2 leading-snug">
          {item.title}
        </h3>

        {item.description && (
          <p className="mt-1 text-xs text-text-grey line-clamp-2 leading-relaxed flex-1">
            {item.description}
          </p>
        )}

        {item.tags.length > 0 && (
          <div className="mt-2 flex gap-1 flex-wrap">
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded bg-surface-input px-1.5 py-0.5 text-[10px] text-text-grey">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Pricing */}
        <div className="mt-3 pt-3 border-t border-border flex items-baseline gap-2">
          <span className="text-base font-bold text-text-dark">
            ₹{item.price.toLocaleString("en-IN")}
          </span>
          {hasDiscount && (
            <span className="text-xs text-text-grey line-through">
              ₹{item.compareAtPrice!.toLocaleString("en-IN")}
            </span>
          )}
          <span className="text-[10px] text-text-grey ml-auto">
            +{item.gstRate}% GST
          </span>
        </div>

        {/* Quantity & Add to Cart Action */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-surface-input">
            <button
              type="button"
              disabled={quantity <= (item.minOrderQuantity || 1)}
              onClick={() => setQuantity((q) => Math.max(item.minOrderQuantity || 1, q - 1))}
              className="px-2.5 py-1.5 text-xs text-text-dark hover:bg-white rounded-l-lg disabled:opacity-30"
            >
              -
            </button>
            <span className="px-2 text-xs font-bold text-text-dark">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="px-2.5 py-1.5 text-xs text-text-dark hover:bg-white rounded-r-lg"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
              justAdded
                ? "bg-emerald-600 text-white"
                : "bg-brand-primary text-white hover:bg-brand-primary-hover shadow-xs"
            }`}
          >
            {justAdded ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                Added to Cart
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
