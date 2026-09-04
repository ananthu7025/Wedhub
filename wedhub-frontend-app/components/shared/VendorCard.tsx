"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { trackEvent } from "@/lib/analytics/track";
import { VendorHeartButton } from "./VendorHeartButton";

/**
 * Shared vendor card — reused across search results, homepage featured
 * listings, and carousels (see this component's callers). Arch Phase 18
 * Stage A instruments it once here for two distinct events (product.md
 * §46):
 *
 * - "Vendor impression": fires once per card per mount, i.e. once per page
 *   load a card appears on. A real IntersectionObserver (fire-once-when-
 *   actually-scrolled-into-view) was deliberately skipped — this card
 *   already only ever renders a handful of vendors per page (homepage
 *   featured section: 8; search results: a 20-per-page grid), never an
 *   infinite/virtualized list, so "visible in the results a visitor is
 *   looking at" and "rendered on the page" are close enough in practice not
 *   to justify the extra observer plumbing. Revisit if a genuinely long
 *   infinite-scroll list adopts this card.
 * - "Vendor click": fires from the Link's onClick, BEFORE navigation away —
 *   distinct from the already-existing server-side vendor_profile_viewed
 *   (vendor.controller.ts), which fires on every GET /vendors/:slug
 *   regardless of referrer. This event specifically captures click-through
 *   intent from a listing context; trackEvent uses sendBeacon internally
 *   specifically so this fires reliably even though the click immediately
 *   unloads the page.
 */
export function VendorCard({
  vendorId,
  slug,
  businessName,
  logoUrl,
  shortDescription,
  startingPrice,
  currency,
  featured = false,
  isAuthenticated = false,
  listContext,
}: {
  vendorId?: string;
  slug: string;
  businessName: string;
  logoUrl: string | null;
  shortDescription: string | null;
  startingPrice: string | null;
  currency: string | null;
  featured?: boolean;
  isAuthenticated?: boolean;
  /** Where this card is being rendered — carried as event metadata so impressions/clicks from search results, featured listings, and carousels can be told apart later. */
  listContext?: string;
}) {
  const impressionFired = useRef(false);

  useEffect(() => {
    if (impressionFired.current || !vendorId) return;
    impressionFired.current = true;
    trackEvent({ eventType: "vendor_impression", vendorId, metadata: { listContext: listContext ?? "unknown" } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  function handleClick() {
    if (!vendorId) return;
    trackEvent({ eventType: "vendor_click", vendorId, metadata: { listContext: listContext ?? "unknown" } });
  }

  return (
    <Link
      href={`/vendors/${slug}`}
      onClick={handleClick}
      className="block overflow-hidden rounded-xl border border-border bg-white no-underline text-inherit"
    >
      <div className="relative aspect-4/3 bg-surface-input">
        {logoUrl ? (
          <Image src={logoUrl} alt={businessName} fill className="object-cover" sizes="(max-width: 900px) 50vw, 25vw" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-text-grey">No photo yet</div>
        )}
        {featured && (
          <span className="absolute top-2.5 left-2.5">
            <Badge variant="crimson">Featured</Badge>
          </span>
        )}
        {vendorId && (
          <VendorHeartButton vendorId={vendorId} isAuthenticated={isAuthenticated} className="absolute top-2.5 right-2.5" />
        )}
      </div>
      <div className="p-3.5">
        <div className="mb-0.5 truncate text-sm font-bold">{businessName}</div>
        {shortDescription && <p className="mb-2 line-clamp-2 text-xs text-text-grey">{shortDescription}</p>}
        {startingPrice && (
          <div className="text-[13px] font-bold">
            {currency === "INR" ? "₹" : (currency ?? "")}
            {Number(startingPrice).toLocaleString("en-IN")} <span className="font-medium text-text-grey">onwards</span>
          </div>
        )}
      </div>
    </Link>
  );
}
