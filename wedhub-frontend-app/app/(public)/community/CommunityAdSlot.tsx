import { VendorCard } from "@/components/shared/VendorCard";
import type { FeaturedListing } from "@/lib/api/vendors.types";

/**
 * Sidebar ad slot for the community feed — reuses the platform's real
 * paid-placement mechanism (FeaturedListing, placementType COMMUNITY)
 * rather than a static placeholder box, and VendorCard's exact visual
 * style (the same "Featured" card used on the homepage/search results) so
 * it reads as a real platform ad, not a foreign element bolted on.
 * Renders nothing when there are no active COMMUNITY listings — same
 * "real data only, no fabricated placeholder" posture as the homepage's
 * FeaturedVendorsSection.
 */
export function CommunityAdSlot({ listings }: { listings: FeaturedListing[] }) {
  if (listings.length === 0) return null;

  return (
    <div className="sticky top-[90px] flex flex-col gap-4">
      <span className="text-[10px] font-bold uppercase tracking-wide text-text-grey">Sponsored</span>
      {listings.map((listing) => (
        <VendorCard
          key={listing.id}
          vendorId={listing.vendor.id}
          slug={listing.vendor.slug}
          businessName={listing.vendor.businessName}
          logoUrl={listing.vendor.logoUrl}
          logoBlurDataUrl={listing.vendor.logoBlurDataUrl}
          shortDescription={listing.vendor.shortDescription}
          startingPrice={listing.vendor.startingPrice}
          currency={listing.vendor.currency}
          featured
          listContext="community_feed_ad"
        />
      ))}
    </div>
  );
}
