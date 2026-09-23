import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVendorBySlug } from "@/lib/api/catalog";
import { fetchPublicCatalogItems } from "@/lib/api/vendor-catalog";
import { ApiRequestError } from "@/lib/api/types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { ShopifyCatalogView } from "./ShopifyCatalogView";

interface CatalogPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CatalogPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data: vendor } = await getVendorBySlug(slug);
    const title = `${vendor.businessName} | Bridal & Rental Catalog`;
    const description =
      vendor.profile?.shortDescription ||
      `Explore luxury bridal jewellery, couture, and rental collections by ${vendor.businessName} on WedHub.`;
    const coverMedia = vendor.profile?.coverMedia;
    const ogImage = coverMedia
      ? getPublicMediaUrl(coverMedia.optimizedObjectKey ?? coverMedia.originalObjectKey)
      : undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: ogImage ? [{ url: ogImage }] : undefined,
      },
    };
  } catch {
    return {
      title: "Bridal Catalog Storefront | WedHub",
    };
  }
}

export default async function PublicCatalogStorePage({ params }: CatalogPageProps) {
  const { slug } = await params;

  let vendor;
  let items = [];

  try {
    const [vendorRes, itemsRes] = await Promise.all([
      getVendorBySlug(slug),
      fetchPublicCatalogItems(slug).catch(() => ({ data: [] })),
    ]);
    vendor = vendorRes.data;
    items = itemsRes.data || [];
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      notFound();
    }
    notFound();
  }

  if (!vendor) {
    notFound();
  }

  return <ShopifyCatalogView vendor={vendor} initialItems={items} />;
}
