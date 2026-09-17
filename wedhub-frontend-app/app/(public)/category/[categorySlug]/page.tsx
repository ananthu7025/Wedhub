import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SeoLandingPage } from "@/components/shared/SeoLandingPage";
import { getSeoPage, listCategories } from "@/lib/api/catalog";
import { ApiRequestError } from "@/lib/api/types";
import { resolveCategoryDbSlug, resolveCategorySeoSlug } from "@/lib/seo/category-slug-map";

interface CategoryPageProps {
  params: Promise<{ categorySlug: string }>;
}

async function loadSeoPage(categorySlug: string) {
  const { data: categories } = await listCategories();
  // categorySlug here is the marketing SEO slug (e.g. "wedding-photographers")
  // — resolve it to the real Category.slug before matching against the
  // catalog. resolveCategoryDbSlug() returns the input unchanged if it's
  // not a known marketing alias, so a raw DB slug (old link) still matches
  // directly on the line below.
  const realSlug = resolveCategoryDbSlug(categorySlug);
  const category = categories.find((c) => c.slug === realSlug);
  if (!category) {
    notFound();
  }
  // Hit with the raw DB slug (e.g. /category/photography-videography) while
  // a marketing slug exists for it — redirect to the canonical marketing
  // URL rather than serving a second indexable URL for the same real page
  // (same duplicate-content-avoidance pattern as resolveCitySlugAlias's
  // redirect in city/[citySlug]/page.tsx).
  const canonicalCategorySlug = resolveCategorySeoSlug(category.slug);
  if (canonicalCategorySlug !== categorySlug) {
    redirect(`/category/${canonicalCategorySlug}`);
  }
  try {
    const { data } = await getSeoPage(category.id, undefined);
    return data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const seo = await loadSeoPage(categorySlug);
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

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categorySlug } = await params;
  const seo = await loadSeoPage(categorySlug);
  return <SeoLandingPage seo={seo} />;
}
