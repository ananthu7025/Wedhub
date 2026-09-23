import type { StoreAccentColor } from "@/lib/api/vendor-catalog.types";
import { STORE_THEMES, type StoreTheme } from "@/components/vendor-store/store-theme";

/**
 * Catalog reuses VendorStore's StoreAccentColor enum and precomputed
 * Tailwind class map (store-theme.ts) rather than defining a parallel
 * palette — same closed preset set, same picker UX, for both public
 * storefront types.
 */
export function themeForCatalog(accentColor: StoreAccentColor): StoreTheme {
  return STORE_THEMES[accentColor] ?? STORE_THEMES.CRIMSON;
}

export { STORE_ACCENT_COLOR_LABELS as CATALOG_ACCENT_COLOR_LABELS } from "@/components/vendor-store/store-theme";
