import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPortfolioAccess,
  getPortfolioAccessAsOwner,
  getVendorAlbums,
  getVendorAlbumsAsOwner,
  getVendorBySlug,
  getVendorBySlugAsOwner,
  getVendorReviews,
} from "@/lib/api/catalog";
import { fetchPublicCatalogItems } from "@/lib/api/vendor-catalog";
import { ApiRequestError } from "@/lib/api/types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { getSession } from "@/lib/auth/session";
import { VendorPortfolioView } from "@/components/portfolio/VendorPortfolioView";
import { JsonLd } from "@/components/shared/JsonLd";
import { vendorLocalBusinessJsonLd } from "@/lib/seo/json-ld";

interface PortfolioPageProps {
  params: Promise<{ slug: string }>;
}

// The cached, unauthenticated getVendorBySlug() 404s for any non-APPROVED
// vendor. Before treating that as a real not-found, retry with the
// uncached, session-carrying variant so a logged-in vendor can preview
// their OWN not-yet-approved page — but only bother making that second,
// slower request when someone is actually logged in (an anonymous visitor
// hitting a genuinely nonexistent/unapproved slug still 404s on the first
// try, no wasted round trip).
async function loadVendor(slug: string) {
  try {
    const { data } = await getVendorBySlug(slug);
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      const session = await getSession();
      if (session) {
        try {
          const { data } = await getVendorBySlugAsOwner(slug);
          return data;
        } catch (ownerError) {
          if (!(ownerError instanceof ApiRequestError && ownerError.status === 404)) {
            throw ownerError;
          }
        }
      }
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: PortfolioPageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await loadVendor(slug);
  const coverMedia = vendor.profile?.coverMedia;
  const ogImage = coverMedia
    ? getPublicMediaUrl(coverMedia.optimizedObjectKey ?? coverMedia.originalObjectKey)
    : undefined;

  const title = vendor.profile?.seoTitle || `${vendor.businessName} — Portfolio & Pricing`;
  const description =
    vendor.profile?.seoDescription ||
    vendor.profile?.shortDescription ||
    `Explore the official wedding portfolio, photography, packages, and direct contact details for ${vendor.businessName}.`;
  const canonicalPath = `/portfolio/${vendor.slug}`;

  return {
    title: { absolute: title },
    description,
    // Self-canonical: this is a distinct, vendor-branded shareable page
    // (QR codes, WhatsApp/Instagram links) — a genuinely different
    // real-world destination from the marketplace's own /vendors/:slug
    // discovery page, not a throwaway duplicate, so it keeps its own
    // canonical rather than pointing at /vendors/:slug.
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${vendor.businessName} — Official Portfolio`,
      description:
        vendor.profile?.shortDescription ||
        `Official wedding portfolio and service offerings for ${vendor.businessName}.`,
      url: canonicalPath,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${vendor.businessName} — Official Portfolio`,
      description:
        vendor.profile?.shortDescription || `Official wedding portfolio for ${vendor.businessName}.`,
      images: ogImage ? [ogImage] : undefined,
    },
    // A preview response only ever reaches the owner's own logged-in
    // request (see loadVendor's owner fallback) — never indexable, since
    // the page isn't really live yet.
    robots: vendor.isOwnerPreview ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function VendorPortfolioPage({ params }: PortfolioPageProps) {
  const { slug } = await params;
  const vendor = await loadVendor(slug);

  // Frontend-only gate — GET /vendors/:slug (loadVendor above) stays fully
  // ungated since it's shared with the discovery page. See
  // PLAN-2026-09-22-premium-feature-buildout.md §2c. When loadVendor served
  // the owner-preview fallback (vendor not yet APPROVED), the cached public
  // access check would incorrectly 404 too — use the same authenticated,
  // uncached variant instead.
  const { data: access } = await (vendor.isOwnerPreview ? getPortfolioAccessAsOwner(slug) : getPortfolioAccess(slug)).catch(
    () => ({ data: { available: false } }),
  );
  if (!access.available) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="mb-2 text-xl font-bold text-text-dark">This page isn&apos;t available</h1>
        <p className="text-sm text-text-grey">
          {vendor.businessName} doesn&apos;t have a shareable portfolio page active right now.
        </p>
      </div>
    );
  }

  const hasCatalogEligibleCategory = vendor.categories.some((vc) => vc.category.hasCatalogEnabled);

  const [{ data: albums }, reviewsResult, catalogItemsResult] = await Promise.all([
    (vendor.isOwnerPreview ? getVendorAlbumsAsOwner(slug) : getVendorAlbums(slug)).catch(() => ({ data: [] })),
    getVendorReviews(vendor.id, 1, 30).catch(() => ({ data: [] })),
    hasCatalogEligibleCategory ? fetchPublicCatalogItems(slug).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
  ]);

  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category ?? vendor.categories[0]?.category;
  const coverMedia = vendor.profile?.coverMedia;
  const coverImageUrl = coverMedia
    ? getPublicMediaUrl(coverMedia.optimizedObjectKey ?? coverMedia.originalObjectKey)
    : undefined;

  return (
    <>
      {/* Never emit structured data for a not-yet-live page an owner is
          previewing — this page isn't real search-result content yet. */}
      {!vendor.isOwnerPreview && (
        <JsonLd
          data={vendorLocalBusinessJsonLd({
            businessName: vendor.businessName,
            slug: vendor.slug,
            description: vendor.profile?.description ?? vendor.profile?.shortDescription,
            categoryName: primaryCategory?.name,
            address: vendor.profile?.address,
            cityName: vendor.city?.name,
            latitude: vendor.profile?.latitude,
            longitude: vendor.profile?.longitude,
            phone: vendor.profile?.phone,
            website: vendor.profile?.website,
            imageUrl: coverImageUrl,
            priceRangeMin: vendor.profile?.priceRangeMin,
            priceRangeMax: vendor.profile?.priceRangeMax,
            currency: vendor.profile?.currency,
            averageRating: vendor.averageRating,
            reviewCount: vendor.reviewCount,
          })}
        />
      )}
      {vendor.isOwnerPreview && (
        <div className="sticky top-0 z-50 bg-amber px-4 py-2.5 text-center text-sm font-bold text-jet-black shadow-sm">
          Preview mode — this page isn&apos;t live yet. Only you can see it this way.
        </div>
      )}
      <VendorPortfolioView
        vendor={vendor}
        albums={albums || []}
        reviews={reviewsResult.data || []}
        catalogItems={catalogItemsResult.data || []}
      />
    </>
  );
}
