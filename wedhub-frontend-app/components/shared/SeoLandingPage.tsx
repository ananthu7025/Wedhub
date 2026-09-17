import Link from "next/link";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { VendorCard } from "@/components/shared/VendorCard";
import { JsonLd } from "@/components/shared/JsonLd";
import { ViewCategoryTracker } from "@/components/shared/ViewCategoryTracker";
import { listCategories, listLocations, searchVendors } from "@/lib/api/catalog";
import type { SeoPageData } from "@/lib/api/vendors.types";
import { getOptionalSession } from "@/lib/auth/dal";
import { breadcrumbListJsonLd, vendorItemListJsonLd, type BreadcrumbItem } from "@/lib/seo/json-ld";
import { resolveCategorySeoSlug } from "@/lib/seo/category-slug-map";

// How many "Related Searches" links to show per group (task item #10/#17) —
// kept small and genuinely useful rather than an exhaustive cross-product
// of every category/city combination.
const RELATED_LINKS_PER_GROUP = 4;

// Shared render for all three SEO landing page types (Arch Phase 17):
// /category/[categorySlug], /category/[categorySlug]/[citySlug],
// /city/[citySlug]. The page data (title/H1/description/indexable) comes
// from the backend's templated seo/page endpoint; the vendor listings
// reuse the exact same /search/vendors query the main search page uses,
// so results are always the same real inventory a visitor would get by
// filtering search manually.
export async function SeoLandingPage({ seo }: { seo: SeoPageData }) {
  const [{ data: vendors, meta }, session, { data: allCategories }, { data: allCities }] = await Promise.all([
    searchVendors({
      categoryId: seo.category?.id,
      cityId: seo.city?.id,
      sort: "recommended",
      page: 1,
      limit: 24,
    }),
    getOptionalSession(),
    listCategories(),
    listLocations("CITY"),
  ]);

  const searchHref = `/search?${new URLSearchParams({
    ...(seo.category ? { categoryId: seo.category.id } : {}),
    ...(seo.city ? { cityId: seo.city.id } : {}),
  }).toString()}`;

  const categorySeoSlug = seo.category ? resolveCategorySeoSlug(seo.category.slug) : null;

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: "Home", path: "/" },
    ...(seo.category && categorySeoSlug ? [{ name: seo.category.name, path: `/category/${categorySeoSlug}` }] : []),
    ...(seo.city ? [{ name: seo.city.name, path: `/city/${seo.city.slug}` }] : []),
  ];

  // Related Searches (task item #10/#17): crawlable internal links to
  // (a) this same category in a few other real cities, and (b) a few other
  // real categories in this same city — real catalog data, not invented
  // combinations. Excludes the current page itself from both lists.
  const relatedInOtherCities =
    seo.category && seo.city
      ? allCities.filter((c) => c.id !== seo.city!.id).slice(0, RELATED_LINKS_PER_GROUP)
      : [];
  const relatedOtherCategories =
    seo.category && seo.city
      ? allCategories.filter((c) => c.id !== seo.category!.id).slice(0, RELATED_LINKS_PER_GROUP)
      : [];
  const hasRelatedSearches = relatedInOtherCities.length > 0 || relatedOtherCategories.length > 0;

  return (
    <>
      <JsonLd data={breadcrumbListJsonLd(breadcrumbItems)} />
      {vendors.length > 0 && <JsonLd data={vendorItemListJsonLd(vendors)} />}
      <ViewCategoryTracker
        categoryId={seo.category?.id}
        categoryName={seo.category?.name}
        locationName={seo.city?.name}
        vendorCount={meta?.total ?? vendors.length}
      />
      <PublicTopbar />

      <div className="px-10 py-8 max-[900px]:px-4">
        <nav className="mb-4 text-xs text-text-grey" aria-label="Breadcrumb">
          {breadcrumbItems.map((item, index) => (
            <span key={item.path}>
              {index > 0 && " / "}
              {index === breadcrumbItems.length - 1 ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link href={item.path} className="no-underline hover:underline">
                  {item.name}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <h1 className="mb-2 text-2xl font-bold text-text-dark">{seo.h1}</h1>
        <p className="mb-6 max-w-2xl text-sm text-text-grey">{seo.description}</p>

        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm text-text-grey">
            <strong className="text-text-dark">{meta?.total ?? vendors.length}</strong> vendors found
          </span>
          <Link href={searchHref} className="text-[13px] font-bold text-brand-primary no-underline hover:underline">
            Refine with filters →
          </Link>
        </div>

        {vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-18 text-center">
            <h3 className="mb-1.5 text-[15px] font-bold">No vendors found yet</h3>
            <p className="max-w-[320px] text-[13px] text-text-grey">
              Check back soon, or <Link href="/search">browse all vendors</Link>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-2">
            {vendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendorId={vendor.id}
                slug={vendor.slug}
                businessName={vendor.businessName}
                logoUrl={vendor.logoUrl}
                logoBlurDataUrl={vendor.logoBlurDataUrl}
                shortDescription={vendor.shortDescription}
                startingPrice={vendor.startingPrice}
                currency={vendor.currency}
                isAuthenticated={session !== null}
                listContext="seo_landing_page"
              />
            ))}
          </div>
        )}

        {hasRelatedSearches && (
          <div className="mt-10 border-t border-border pt-6">
            <h2 className="mb-3 text-base font-bold text-text-dark">Related Searches</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {relatedInOtherCities.map((city) => (
                <Link
                  key={`city-${city.id}`}
                  href={`/category/${categorySeoSlug}/${city.slug}`}
                  className="text-brand-primary no-underline hover:underline"
                >
                  {seo.category!.name} in {city.name}
                </Link>
              ))}
              {relatedOtherCategories.map((category) => (
                <Link
                  key={`category-${category.id}`}
                  href={`/category/${resolveCategorySeoSlug(category.slug)}/${seo.city!.slug}`}
                  className="text-brand-primary no-underline hover:underline"
                >
                  {category.name} in {seo.city!.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <PublicFooter />
    </>
  );
}
