import type { StoreAccentColor } from "@/lib/api/vendor-store.types";

/**
 * Vendor-selectable storefront accent color — a closed preset set backed by
 * this codebase's existing design tokens (app/globals.css) or Tailwind's
 * built-in palette (already used elsewhere for non-token colors, e.g.
 * PublicStorefrontView.tsx's purple/pink cover-fallback gradient), never a
 * new ad-hoc hex value. Mirrors components/wedding-website/theme.ts's
 * enum-plus-THEMES-map pattern: pick a preset, splice its precomputed
 * Tailwind class strings into JSX — no inline styles, no CSS custom
 * properties.
 */
export interface StoreTheme {
  accentTextClass: string;
  accentBgClass: string;
  accentBgHoverClass: string;
  accentRingClass: string;
  accentBorderClass: string;
  accentFocusBorderClass: string;
  /** A soft translucent tint of the accent, for selected-state backgrounds. */
  accentSoftBgClass: string;
  /** A softer hover-only border tint, for unselected-state hover affordance. */
  accentHoverBorderClass: string;
  /**
   * The one exception to "no raw hex": Razorpay Checkout's SDK config
   * (`theme.color`) requires an actual hex string, not a Tailwind class —
   * an external SDK requirement, not a WedHub design decision.
   */
  accentHex: string;
}

export const STORE_THEMES: Record<StoreAccentColor, StoreTheme> = {
  CRIMSON: {
    accentTextClass: "text-brand-primary",
    accentBgClass: "bg-brand-primary",
    accentBgHoverClass: "hover:bg-brand-primary-hover",
    accentRingClass: "ring-brand-primary",
    accentBorderClass: "border-brand-primary",
    accentFocusBorderClass: "focus:border-brand-primary",
    accentSoftBgClass: "bg-brand-primary-soft",
    accentHoverBorderClass: "hover:border-brand-primary-hover",
    accentHex: "#e00b41",
  },
  EMERALD: {
    accentTextClass: "text-emerald-70",
    accentBgClass: "bg-emerald",
    accentBgHoverClass: "hover:bg-emerald-70",
    accentRingClass: "ring-emerald",
    accentBorderClass: "border-emerald",
    accentFocusBorderClass: "focus:border-emerald",
    accentSoftBgClass: "bg-emerald-10",
    accentHoverBorderClass: "hover:border-emerald",
    accentHex: "#41b057",
  },
  NAVY: {
    accentTextClass: "text-byzantine-blue-70",
    accentBgClass: "bg-byzantine-blue",
    accentBgHoverClass: "hover:bg-byzantine-blue-70",
    accentRingClass: "ring-byzantine-blue",
    accentBorderClass: "border-byzantine-blue",
    accentFocusBorderClass: "focus:border-byzantine-blue",
    accentSoftBgClass: "bg-byzantine-blue-10",
    accentHoverBorderClass: "hover:border-byzantine-blue",
    accentHex: "#1e55e2",
  },
  AMBER: {
    accentTextClass: "text-amber-70",
    accentBgClass: "bg-amber",
    accentBgHoverClass: "hover:bg-amber-70",
    accentRingClass: "ring-amber",
    accentBorderClass: "border-amber",
    accentFocusBorderClass: "focus:border-amber",
    accentSoftBgClass: "bg-amber-10",
    accentHoverBorderClass: "hover:border-amber",
    accentHex: "#f0a202",
  },
  PLUM: {
    accentTextClass: "text-purple-700",
    accentBgClass: "bg-purple-600",
    accentBgHoverClass: "hover:bg-purple-700",
    accentRingClass: "ring-purple-600",
    accentBorderClass: "border-purple-600",
    accentFocusBorderClass: "focus:border-purple-600",
    accentSoftBgClass: "bg-purple-50",
    accentHoverBorderClass: "hover:border-purple-600",
    accentHex: "#9333ea",
  },
  SLATE: {
    accentTextClass: "text-jet-black-70",
    accentBgClass: "bg-jet-black",
    accentBgHoverClass: "hover:bg-jet-black-70",
    accentRingClass: "ring-jet-black",
    accentBorderClass: "border-jet-black",
    accentFocusBorderClass: "focus:border-jet-black",
    accentSoftBgClass: "bg-jet-black-10",
    accentHoverBorderClass: "hover:border-jet-black",
    accentHex: "#333333",
  },
};

export const STORE_ACCENT_COLOR_LABELS: Record<StoreAccentColor, string> = {
  CRIMSON: "Crimson",
  EMERALD: "Emerald",
  NAVY: "Navy",
  AMBER: "Amber",
  PLUM: "Plum",
  SLATE: "Slate",
};

export function themeForStore(accentColor: StoreAccentColor): StoreTheme {
  return STORE_THEMES[accentColor] ?? STORE_THEMES.CRIMSON;
}
