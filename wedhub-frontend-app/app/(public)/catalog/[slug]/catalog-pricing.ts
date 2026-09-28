import type { CatalogItem, CatalogItemVariant } from "@/lib/api/vendor-catalog.types";

export type RentalDuration = "1-day" | "3-days" | "5-days";

export function formatCatalogPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getCatalogItemBasePrice(item: CatalogItem, variant?: CatalogItemVariant): number {
  if (variant) return variant.price;
  if (item.variants.length > 0) {
    return Math.min(...item.variants.map((v) => v.price));
  }
  return item.basePrice || 0;
}

// Duration multiplier is a fixed, frontend-only pricing convention for this
// storefront's rental-goods framing (Wedding Cars/Bridal Wear categories) —
// there's no backend field for it, it's applied purely at display/cart time.
export function getCatalogCalculatedPrice(basePrice: number, duration: RentalDuration): number {
  if (duration === "1-day") return Math.round(basePrice * 0.75);
  if (duration === "5-days") return Math.round(basePrice * 1.35);
  return basePrice;
}
