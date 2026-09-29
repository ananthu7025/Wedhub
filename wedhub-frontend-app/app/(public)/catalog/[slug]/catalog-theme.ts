import type { StoreAccentColor } from "@/lib/api/vendor-catalog.types";
import { STORE_THEMES, type StoreTheme } from "./catalog-theme-tokens";

export function themeForCatalog(accentColor: StoreAccentColor): StoreTheme {
  return STORE_THEMES[accentColor] ?? STORE_THEMES.CRIMSON;
}

export { STORE_ACCENT_COLOR_LABELS as CATALOG_ACCENT_COLOR_LABELS } from "./catalog-theme-tokens";
