import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVendorBySlug } from "@/lib/api/catalog";
import {
  fetchPublicCatalogCollections,
  fetchPublicCatalogItems,
  fetchPublicCatalogStoreSettings,
} from "@/lib/api/vendor-catalog";
import { ApiRequestError } from "@/lib/api/types";
import { getPublicMediaUrl } from "@/lib/media/url";
import type { CatalogCollectionWithItems, CatalogStoreSettings } from "@/lib/api/vendor-catalog.types";
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
  let storeSettings: CatalogStoreSettings | null = null;
  let collections: CatalogCollectionWithItems[] = [];

  try {
    const [vendorRes, itemsRes, settingsRes, collectionsRes] = await Promise.all([
      getVendorBySlug(slug),
      fetchPublicCatalogItems(slug).catch(() => ({ data: [] })),
      fetchPublicCatalogStoreSettings(slug).catch(() => ({ data: undefined })),
      fetchPublicCatalogCollections(slug).catch(() => ({ data: [] })),
    ]);
    vendor = vendorRes.data;
    items = itemsRes.data || [];
    storeSettings = settingsRes.data ?? null;
    collections = collectionsRes.data ?? [];
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      notFound();
    }
    notFound();
  }

  if (!vendor) {
    notFound();
  }

  return <ShopifyCatalogView vendor={vendor} initialItems={items} storeSettings={storeSettings} collections={collections} />;
}
