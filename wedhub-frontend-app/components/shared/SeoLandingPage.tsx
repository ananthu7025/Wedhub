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
import { NearMeLink } from "@/components/shared/NearMeLink";

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
  // combinations. Excludes the current page itself from both lists. Kept
  // small here (not all 14 districts) since a category+city page already
  // links out via the full district list below when seo.category is set.
  const relatedInOtherCities =
    seo.category && seo.city
      ? allCities.filter((c) => c.id !== seo.city!.id).slice(0, RELATED_LINKS_PER_GROUP)
      : [];
  const relatedOtherCategories =
    seo.category && seo.city
      ? allCategories.filter((c) => c.id !== seo.category!.id).slice(0, RELATED_LINKS_PER_GROUP)
      : [];
  const hasRelatedSearches = relatedInOtherCities.length > 0 || relatedOtherCategories.length > 0;

  // "Browse by Kerala district" (task: full district cross-linking) — every
  // real seeded district gets a crawlable link into this same category,
  // shown whenever the page has a category (category-only AND
  // category+city pages; the current city, if any, is excluded so the page
  // doesn't link to itself). This is the platform's actual full service
  // area (all 14 Kerala districts — prisma/seed.ts), not a partial sample,
  // so Google can reach every real category/district combination from a
  // single hub page rather than only via the smaller Related Searches list.
  const allDistrictLinks = seo.category && categorySeoSlug
    ? allCities
        .filter((c) => c.id !== seo.city?.id)
        .map((c) => ({ id: c.id, name: c.name, href: `/category/${categorySeoSlug}/${c.slug}` }))
    : [];

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
        <p className="mb-4 max-w-2xl text-sm text-text-grey">{seo.description}</p>

        {/* Only on the category-only page (no city yet) — matches "<category>
            near me" search intent by resolving the visitor's own nearest
            Kerala district. A category+city page already names a specific
            district, so this control would be redundant there. */}
        {seo.category && !seo.city && categorySeoSlug && (
          <div className="mb-4">
            <NearMeLink categorySeoSlug={categorySeoSlug} />
          </div>
        )}

        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm text-text-grey font-medium">
            <strong className="text-text-dark font-bold">{meta?.total ?? vendors.length}</strong> vendors found
          </span>
          <Link
            href={searchHref}
            className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3.5 py-1.5 text-xs font-semibold text-text-dark no-underline shadow-xs hover:bg-surface-input"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            Filter
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
          <div className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-1 max-[900px]:gap-4">
            {vendors.map((vendor) => {
              const category = allCategories.find((c) => c.id === vendor.categoryId) ?? seo.category;
              return (
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
                  isPremiumEligible={vendor.isPremiumEligible}
                  isAuthenticated={session !== null}
                  listContext="seo_landing_page"
                  categoryId={vendor.categoryId}
                  categoryName={category?.name}
                  cityName={seo.city?.name}
                  avgRating={vendor.avgRating}
                  reviewCount={vendor.reviewCount}
                />
              );
            })}
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

        {allDistrictLinks.length > 0 && (
          <div className="mt-10 border-t border-border pt-6">
            <h2 className="mb-3 text-base font-bold text-text-dark">
              {seo.category!.name} by Kerala District
            </h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {allDistrictLinks.map((district) => (
                <Link
                  key={district.id}
                  href={district.href}
                  className="text-brand-primary no-underline hover:underline"
                >
                  {district.name}
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
