import type { WeddingWebsiteTemplate } from "@/lib/api/wedding-website.types";

/**
 * Per-template visual theme — the ONLY thing that differs between the 3
 * templates (Royal Wedding, Minimal Elegant, Traditional Indian Wedding).
 * WeddingWebsiteRenderer.tsx is the single layout; this file supplies the
 * varying colors/fonts/decorative touches, keyed off the same data-driven
 * template enum the backend stores — per the feature spec's explicit
 * "template renderer, not three independent applications" requirement.
 * Colors stay within the existing design-token palette (app/globals.css)
 * rather than introducing new ad-hoc hex values.
 */
export interface WeddingWebsiteTheme {
  heroOverlay: string;
  heroEyebrowClass: string;
  headingFontClass: string;
  accentTextClass: string;
  accentBgClass: string;
  sectionBgClass: string;
  divider: string;
  cardBorderClass: string;
  ctaVariant: "primary" | "dark";
}

const THEMES: Record<WeddingWebsiteTemplate, WeddingWebsiteTheme> = {
  ROYAL_WEDDING: {
    heroOverlay: "bg-gradient-to-t from-jet-black-90/90 via-jet-black-90/40 to-transparent",
    heroEyebrowClass: "text-amber-10",
    headingFontClass: "font-serif tracking-wide",
    accentTextClass: "text-amber-70",
    accentBgClass: "bg-amber-10",
    sectionBgClass: "bg-anti-flash-white",
    divider: "◆",
    cardBorderClass: "border-amber",
    ctaVariant: "dark",
  },
  MINIMAL_ELEGANT: {
    heroOverlay: "bg-gradient-to-t from-white/95 via-white/60 to-transparent",
    heroEyebrowClass: "text-text-grey",
    headingFontClass: "font-sans tracking-tight",
    accentTextClass: "text-brand-primary",
    accentBgClass: "bg-brand-primary-soft",
    sectionBgClass: "bg-white",
    divider: "—",
    cardBorderClass: "border-border",
    ctaVariant: "primary",
  },
  TRADITIONAL_INDIAN: {
    heroOverlay: "bg-gradient-to-t from-crimson-90/90 via-crimson-70/30 to-transparent",
    heroEyebrowClass: "text-amber-10",
    headingFontClass: "font-serif tracking-wide",
    accentTextClass: "text-crimson-70",
    accentBgClass: "bg-crimson-10",
    sectionBgClass: "bg-reseda-green-10",
    divider: "❋",
    cardBorderClass: "border-crimson-20",
    ctaVariant: "primary",
  },
};

export function themeFor(template: WeddingWebsiteTemplate): WeddingWebsiteTheme {
  return THEMES[template];
}
