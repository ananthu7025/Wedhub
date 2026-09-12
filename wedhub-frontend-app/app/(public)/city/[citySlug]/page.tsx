import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SeoLandingPage } from "@/components/shared/SeoLandingPage";
import { getSeoPage, listLocations } from "@/lib/api/catalog";
import { ApiRequestError } from "@/lib/api/types";
import { resolveCitySlugAlias } from "@/lib/seo/location-aliases";

interface CityPageProps {
  params: Promise<{ citySlug: string }>;
}

async function loadSeoPage(citySlug: string) {
  const { data: cities } = await listLocations("CITY");
  const city = cities.find((c) => c.slug === citySlug);
  if (!city) {
    // Colloquial name (e.g. "trivandrum") — redirect to the canonical
    // /city/thiruvananthapuram URL rather than serving a second indexable
    // URL for the same real page (duplicate-content risk).
    const canonicalSlug = resolveCitySlugAlias(citySlug);
    if (canonicalSlug !== citySlug && cities.some((c) => c.slug === canonicalSlug)) {
      redirect(`/city/${canonicalSlug}`);
    }
    notFound();
  }
  try {
    const { data } = await getSeoPage(undefined, city.id);
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const seo = await loadSeoPage(citySlug);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonicalPath },
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      url: seo.canonicalPath,
      images: seo.ogImageUrl ? [{ url: seo.ogImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: seo.ogImageUrl ? [seo.ogImageUrl] : undefined,
    },
    robots: seo.indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { citySlug } = await params;
  const seo = await loadSeoPage(citySlug);
  return <SeoLandingPage seo={seo} />;
}
