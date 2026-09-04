import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVendorAlbums, getVendorBySlug, getVendorReviews } from "@/lib/api/catalog";
import { ApiRequestError } from "@/lib/api/types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { VendorPortfolioView } from "@/components/portfolio/VendorPortfolioView";

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

    return {
      title: {
        absolute: vendor.profile?.seoTitle || `${vendor.businessName} — Portfolio & Pricing`,
      },
      description:
        vendor.profile?.seoDescription ||
        vendor.profile?.shortDescription ||
        `Explore the official wedding portfolio, photography, packages, and direct contact details for ${vendor.businessName}.`,
      openGraph: {
        title: `${vendor.businessName} — Official Portfolio`,
        description:
          vendor.profile?.shortDescription ||
          `Official wedding portfolio and service offerings for ${vendor.businessName}.`,
        images: ogImage ? [{ url: ogImage }] : undefined,
      },
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

  return (
    <VendorPortfolioView
      vendor={vendor}
      albums={albums || []}
      reviews={reviewsResult.data || []}
    />
  );
}
