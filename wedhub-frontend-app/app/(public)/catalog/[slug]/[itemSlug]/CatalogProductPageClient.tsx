"use client";

import Link from "next/link";
import type { VendorDetail } from "@/lib/api/vendors.types";
import type { CatalogItem } from "@/lib/api/vendor-catalog.types";
import type { StoreTheme } from "../catalog-theme-tokens";
import { getPublicMediaUrl } from "@/lib/media/url";
import { useCatalogCart } from "../useCatalogCart";
import { CatalogProductDetail } from "../CatalogProductDetail";

function BagIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25c-.669 0-1.189-.578-1.119-1.243l1.263-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

/**
 * Client-side shell for the standalone product page — owns the cart hook
 * (sessionStorage-backed, shared with ShopifyCatalogView, see
 * useCatalogCart's header comment) since a Server Component page can't hold
 * that state itself. The Add to Cart button here opens the storefront's own
 * cart drawer by linking back to /catalog/{slug} with the drawer already
 * populated — there's no separate cart drawer on this page, keeping it a
 * focused single-product view rather than duplicating the full storefront
 * chrome (search, wishlist, collection nav) here too.
 */
export function CatalogProductPageClient({
  vendor,
  item,
  theme,
  primaryCategory,
}: {
  vendor: VendorDetail;
  item: CatalogItem;
  theme: StoreTheme;
  primaryCategory: string;
}) {
  const { addToCart, cartItemCount } = useCatalogCart(vendor.id);

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-[#1E1E1E] font-sans antialiased">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EDE8E0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-6">
          <Link href={`/catalog/${vendor.slug}`} className="flex items-center gap-3.5 group">
            {vendor.profile?.logoMedia ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getPublicMediaUrl(vendor.profile.logoMedia.optimizedObjectKey ?? vendor.profile.logoMedia.originalObjectKey)}
                alt={vendor.businessName}
                className="h-11 w-11 rounded-full object-cover border border-[#E5DECF]"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#181818] text-[#D8B478] flex items-center justify-center font-serif text-base font-bold border border-[#D8B478]/30">
                {vendor.businessName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="font-serif tracking-widest text-base sm:text-lg font-bold uppercase text-[#1C1C1C]">
              {vendor.businessName}
            </div>
          </Link>

          <Link
            href={`/catalog/${vendor.slug}`}
            className="relative p-2 hover:opacity-75 transition"
            title="View cart in storefront"
          >
            <BagIcon className="w-5 h-5 text-[#2E2A25]" />
            {cartItemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#8F6B38] text-white text-[10px] font-bold flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <CatalogProductDetail
        vendor={vendor}
        item={item}
        theme={theme}
        primaryCategory={primaryCategory}
        onAddToCart={(product, variant, duration) => addToCart(product, variant, duration)}
      />
    </div>
  );
}
