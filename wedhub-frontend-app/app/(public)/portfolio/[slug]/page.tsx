import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVendorAlbums, getVendorBySlug, getVendorReviews } from "@/lib/api/catalog";
import { ApiRequestError } from "@/lib/api/types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { VendorPortfolioView } from "@/components/portfolio/VendorPortfolioView";
import { JsonLd } from "@/components/shared/JsonLd";
import { vendorLocalBusinessJsonLd } from "@/lib/seo/json-ld";

interface PortfolioPageProps {
  params: Promise<{ slug: string }>;
}

async function loadVendor(slug: string) {
  try {
    const { data } = await getVendorBySlug(slug);
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: PortfolioPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
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
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: "Vendor Portfolio" };
  }
}

export default async function VendorPortfolioPage({ params }: PortfolioPageProps) {
  const { slug } = await params;
  const vendor = await loadVendor(slug);

  const [{ data: albums }, reviewsResult] = await Promise.all([
    getVendorAlbums(slug).catch(() => ({ data: [] })),
    getVendorReviews(vendor.id, 1, 30).catch(() => ({ data: [] })),
  ]);

  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category ?? vendor.categories[0]?.category;
  const coverMedia = vendor.profile?.coverMedia;
  const coverImageUrl = coverMedia
    ? getPublicMediaUrl(coverMedia.optimizedObjectKey ?? coverMedia.originalObjectKey)
    : undefined;

  return (
    <>
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
      <VendorPortfolioView vendor={vendor} albums={albums || []} reviews={reviewsResult.data || []} />
    </>
  );
}
