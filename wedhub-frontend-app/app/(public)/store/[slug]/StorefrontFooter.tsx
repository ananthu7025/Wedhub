import type { PublicStoreData } from "@/lib/api/vendor-store.types";
import type { StoreTheme } from "@/components/vendor-store/store-theme";
import { GlobeIcon, InstagramIcon, FacebookIcon, MapPinIcon } from "@/components/portfolio/icons";

/**
 * A persistent storefront footer — contact info, social links, and policies
 * for the vendor's own store, using data already returned by the public
 * store API (address/phone/email) plus website/socialLinks now surfaced
 * from VendorProfile for the first time (see vendor-store.service.ts's
 * getPublicStoreBySlug). Instagram/Facebook URL normalization mirrors
 * components/portfolio/VendorPortfolioAbout.tsx's existing logic rather
 * than reimplementing it.
 */
export function StorefrontFooter({
  store,
  theme,
}: {
  store: PublicStoreData;
  theme: StoreTheme;
}) {
  const { vendor } = store;
  const hasContactInfo = Boolean(
    vendor.address || vendor.phone || vendor.email || vendor.website || vendor.socialLinks?.instagram || vendor.socialLinks?.facebook,
  );
  const hasPolicies = Boolean(store.shippingPolicy || store.returnPolicy);

  if (!hasContactInfo && !hasPolicies) return null;

  return (
    <footer className="mt-12 border-t border-border bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className={`text-sm font-bold mb-3 ${theme.accentTextClass}`}>{store.storeName}</h3>
          {store.tagline && <p className="text-xs text-text-grey mb-4 max-w-sm">{store.tagline}</p>}

          <div className="space-y-2.5 text-xs text-text-grey">
            {vendor.address && (
              <div className="flex items-start gap-2">
                <MapPinIcon className="flex-shrink-0 h-4 w-4 mt-0.5 text-text-grey" />
                <span>{vendor.address}</span>
              </div>
            )}
            {vendor.phone && (
              <div className="flex items-center gap-2">
                <svg className="flex-shrink-0 h-4 w-4 text-text-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>{vendor.phone}</span>
              </div>
            )}
            {vendor.email && (
              <div className="flex items-center gap-2">
                <svg className="flex-shrink-0 h-4 w-4 text-text-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href={`mailto:${vendor.email}`} className="hover:underline">
                  {vendor.email}
                </a>
              </div>
            )}
            {vendor.website && (
              <div className="flex items-center gap-2">
                <GlobeIcon className="flex-shrink-0 h-4 w-4 text-text-grey" />
                <a
                  href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {vendor.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            {vendor.socialLinks?.instagram && (
              <div className="flex items-center gap-2">
                <InstagramIcon className="flex-shrink-0 h-4 w-4 text-text-grey" />
                <a
                  href={`https://instagram.com/${vendor.socialLinks.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Instagram
                </a>
              </div>
            )}
            {vendor.socialLinks?.facebook && (
              <div className="flex items-center gap-2">
                <FacebookIcon className="flex-shrink-0 h-4 w-4 text-text-grey" />
                <a
                  href={vendor.socialLinks.facebook.startsWith("http") ? vendor.socialLinks.facebook : `https://${vendor.socialLinks.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Facebook
                </a>
              </div>
            )}
          </div>
        </div>

        {hasPolicies && (
          <div className="space-y-4 text-xs text-text-grey">
            {store.shippingPolicy && (
              <div>
                <h4 className="font-bold text-text-dark mb-1">Shipping &amp; Delivery</h4>
                <p className="leading-relaxed">{store.shippingPolicy}</p>
              </div>
            )}
            {store.returnPolicy && (
              <div>
                <h4 className="font-bold text-text-dark mb-1">Returns &amp; Cancellations</h4>
                <p className="leading-relaxed">{store.returnPolicy}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
