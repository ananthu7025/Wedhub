import type { OfferBadgeType } from "@/lib/api/vendor-offers.types";

/**
 * Offer Wall corner badge — one fixed label/color per OfferBadgeType, picked
 * manually by the vendor at offer-creation time (no auto-computation). Same
 * absolute-positioned corner-ribbon slot PremiumBadge.tsx's CrownRibbonBadge
 * uses on vendor search cards, but offer cards render exactly one of these
 * instead, keyed off the offer's own badgeType rather than vendor premium
 * status.
 */
const BADGE_STYLES: Record<OfferBadgeType, { label: (discountPercent: number) => string; className: string }> = {
  SAVE_PERCENT: {
    label: (pct) => `Save ${pct}%`,
    className: "bg-[#e00b41] text-white",
  },
  FLAT_PERCENT_OFF: {
    label: (pct) => `Flat ${pct}% OFF`,
    className: "bg-[#e00b41] text-white",
  },
  NEW: {
    label: () => "NEW",
    className: "bg-emerald-600 text-white",
  },
  LIMITED_TIME_DEAL: {
    label: () => "Limited Time Deal",
    className: "bg-[#FF7A00] text-white",
  },
  FREE_ADD_ON: {
    label: () => "Free Add-on",
    className: "bg-sky-600 text-white",
  },
  TOP_RATED: {
    label: () => "Top Rated",
    className: "bg-amber-500 text-white",
  },
  CATALOG_OFFER: {
    label: () => "Catalog Offer",
    className: "bg-gray-800 text-white",
  },
};

export function OfferBadge({
  badgeType,
  discountPercent,
  className = "absolute top-3 left-3 z-10",
}: {
  badgeType: OfferBadgeType;
  discountPercent: number;
  className?: string;
}) {
  const style = BADGE_STYLES[badgeType];
  return (
    <span
      className={`${className} inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold shadow-sm ${style.className}`}
    >
      {style.label(discountPercent)}
    </span>
  );
}
