import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVendorBySlug } from "@/lib/api/catalog";
import { fetchPublicCatalogItems, fetchPublicCatalogStoreSettings } from "@/lib/api/vendor-catalog";
import { ApiRequestError } from "@/lib/api/types";
import { getCatalogItemBasePrice } from "../catalog-pricing";
import { themeForCatalog } from "../catalog-theme";
import { JsonLd } from "@/components/shared/JsonLd";
import { CatalogProductPageClient } from "./CatalogProductPageClient";

interface CatalogProductPageProps {
  params: Promise<{ slug: string; itemSlug: string }>;
}

export const dynamic = "force-dynamic";

async function loadProduct(slug: string, itemSlug: string) {
  const [vendorRes, itemsRes] = await Promise.all([
    getVendorBySlug(slug),
    fetchPublicCatalogItems(slug).catch(() => ({ data: [] })),
  ]);
  const vendor = vendorRes.data;
  const item = (itemsRes.data ?? []).find((i) => i.slug === itemSlug && i.isActive);
  return { vendor, item };
}

export async function generateMetadata({ params }: CatalogProductPageProps): Promise<Metadata> {
  const { slug, itemSlug } = await params;
  try {
    const { vendor, item } = await loadProduct(slug, itemSlug);
    if (!item) {
      return { title: "Product not found | WedHub" };
    }

    const title = `${item.title} | ${vendor.businessName}`;
    const description = item.description || `${item.title}, available from ${vendor.businessName} on WedHub.`;
    const primaryMedia = item.media[0];
    const ogImage = primaryMedia?.url ?? undefined;
    const canonicalPath = `/catalog/${vendor.slug}/${item.slug}`;

    return {
      title,
      description,
      alternates: { canonical: canonicalPath },
      openGraph: {
        title,
        description,
        url: canonicalPath,
        images: ogImage ? [{ url: ogImage }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [ogImage] : undefined,
      },
    };
  } catch {
    return { title: "Bridal Catalog Storefront | WedHub" };
  }
}

export default async function CatalogProductPage({ params }: CatalogProductPageProps) {
  const { slug, itemSlug } = await params;

  let vendor;
  let item;
  let storeSettings = null;

  try {
    const loaded = await loadProduct(slug, itemSlug);
    vendor = loaded.vendor;
    item = loaded.item;
    const settingsRes = await fetchPublicCatalogStoreSettings(slug).catch(() => ({ data: undefined }));
    storeSettings = settingsRes.data ?? null;
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      notFound();
    }
    notFound();
  }

  if (!vendor || !item) {
    notFound();
  }

  const theme = themeForCatalog(storeSettings?.accentColor ?? "CRIMSON");
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category?.name || "Bridal Rentals";
  const price = getCatalogItemBasePrice(item);
  const productImages = item.media
    .map((m) => m.url)
    .filter((url): url is string => url !== null);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.title,
    description: item.description ?? undefined,
    image: productImages.length > 0 ? productImages : undefined,
    brand: { "@type": "Brand", name: vendor.businessName },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price,
      availability: item.variants.some((v) => v.isAvailable) || item.variants.length === 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/catalog/${vendor.slug}/${item.slug}`,
    },
  };

  return (
    <>
      <JsonLd data={productJsonLd} />
      <CatalogProductPageClient
        vendor={vendor}
        item={item}
        theme={theme}
        primaryCategory={primaryCategory}
      />
    </>
  );
}
