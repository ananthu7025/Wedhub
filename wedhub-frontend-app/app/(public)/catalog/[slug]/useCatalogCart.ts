"use client";

import { useCallback, useEffect, useState } from "react";
import type { CatalogItem, CatalogItemVariant } from "@/lib/api/vendor-catalog.types";
import { getCatalogCalculatedPrice, getCatalogItemBasePrice, type RentalDuration } from "./catalog-pricing";

export interface CatalogCartEntry {
  item: CatalogItem;
  variant?: CatalogItemVariant;
  rentalDuration: RentalDuration;
  quantity: number;
}

// sessionStorage (not localStorage) — a cart is a single-visit shopping
// session's worth of state, not something that should resurface on this
// vendor's storefront weeks later. Keyed per-vendor so browsing multiple
// vendor storefronts in the same tab (unlikely but possible via back/forward)
// never mixes carts. Wrapped in try/catch per this codebase's browser-storage
// convention (see useGuestShortlist.ts) — storage can throw in a private
// window or be unavailable; the cart still works in-memory for the session.
function storageKey(vendorId: string): string {
  return `wedhub_catalog_cart_${vendorId}`;
}

function readCart(vendorId: string): CatalogCartEntry[] {
  try {
    const raw = window.sessionStorage.getItem(storageKey(vendorId));
    return raw ? (JSON.parse(raw) as CatalogCartEntry[]) : [];
  } catch {
    return [];
  }
}

function writeCart(vendorId: string, cart: CatalogCartEntry[]) {
  try {
    window.sessionStorage.setItem(storageKey(vendorId), JSON.stringify(cart));
  } catch {
    // Storage unavailable — cart still works in-memory for this page's
    // lifetime, it just won't survive navigating to another catalog route.
  }
}

/**
 * Cart state shared between the storefront grid (ShopifyCatalogView) and the
 * standalone product page (CatalogProductDetail) — sessionStorage is what
 * lets "add to cart on the product page, go back to the grid" keep the item,
 * without needing a React context spanning two separate page components.
 */
export function useCatalogCart(vendorId: string) {
  const [cart, setCart] = useState<CatalogCartEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCart(readCart(vendorId));
    setLoaded(true);
    // Only re-read if the caller genuinely switches vendors.
  }, [vendorId]);

  const addToCart = useCallback(
    (item: CatalogItem, variant?: CatalogItemVariant, duration: RentalDuration = "3-days") => {
      setCart((prev) => {
        const idx = prev.findIndex(
          (c) => c.item.id === item.id && c.variant?.id === variant?.id && c.rentalDuration === duration,
        );
        const next =
          idx >= 0
            ? prev.map((entry, i) => (i === idx ? { ...entry, quantity: entry.quantity + 1 } : entry))
            : [...prev, { item, variant, rentalDuration: duration, quantity: 1 }];
        writeCart(vendorId, next);
        return next;
      });
    },
    [vendorId],
  );

  const updateQuantity = useCallback(
    (itemId: string, variantId: string | undefined, duration: string, delta: number) => {
      setCart((prev) => {
        const next = prev
          .map((entry) => {
            if (entry.item.id === itemId && entry.variant?.id === variantId && entry.rentalDuration === duration) {
              const nextQty = entry.quantity + delta;
              return nextQty > 0 ? { ...entry, quantity: nextQty } : null;
            }
            return entry;
          })
          .filter((entry): entry is CatalogCartEntry => entry !== null);
        writeCart(vendorId, next);
        return next;
      });
    },
    [vendorId],
  );

  const clearCart = useCallback(() => {
    writeCart(vendorId, []);
    setCart([]);
  }, [vendorId]);

  const cartItemCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const cartSubtotal = cart.reduce((acc, curr) => {
    const base = getCatalogItemBasePrice(curr.item, curr.variant);
    const price = getCatalogCalculatedPrice(base, curr.rentalDuration);
    return acc + price * curr.quantity;
  }, 0);

  return { cart, loaded, addToCart, updateQuantity, clearCart, cartItemCount, cartSubtotal };
}
