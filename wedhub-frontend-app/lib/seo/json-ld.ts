import { BRAND_NAME, SITE_URL, absoluteUrl } from "./site";

/**
 * schema.org JSON-LD generators — every function returns a plain object
 * (not a string) meant to be serialized once via <JsonLd> (see json-ld.tsx)
 * with JSON.stringify + the standard </script>-breakout escape. Kept as
 * pure data builders (no React) so they're trivially testable and reusable
 * from both Server Components and app/sitemap.ts-adjacent code.
 *
 * Hard rule enforced throughout this file: never fabricate ratings, review
 * counts, prices, or addresses. Every field here is either omitted or comes
 * from a real value already flowing through the page (vendor.averageRating,
 * vendor.profile.address, etc.) — see each function's params.
 */

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function breadcrumbListJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/icon.png"),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?keyword={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ItemList for a category/city listing page — references vendor profile
// URLs only (no vendor detail duplicated here), matching Google's guidance
// for a "list of things" page. Real vendors only, in the same order shown.
export function vendorItemListJsonLd(vendors: Array<{ slug: string; businessName: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: vendors.map((vendor, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/vendors/${vendor.slug}`),
      name: vendor.businessName,
    })),
  };
}

export interface VendorLocalBusinessInput {
  businessName: string;
  slug: string;
  description?: string | null;
  categoryName?: string | null;
  address?: string | null;
  cityName?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  phone?: string | null;
  website?: string | null;
  imageUrl?: string | null;
  priceRangeMin?: string | null;
  priceRangeMax?: string | null;
  currency?: string | null;
  averageRating?: string | number | null;
  reviewCount?: number | null;
}

// LocalBusiness (falls back to the more generic base type when nothing
// about the vendor maps to a more specific @type) for a single vendor
// profile page. aggregateRating is only emitted when reviewCount > 0 —
// per schema.org/Google's own rules, an AggregateRating requires at least
// one real rating behind it; a vendor with zero reviews gets no rating
// block at all rather than a fabricated 0/5.
export function vendorLocalBusinessJsonLd(vendor: VendorLocalBusinessInput) {
  const rating = Number(vendor.averageRating ?? 0);
  const reviewCount = vendor.reviewCount ?? 0;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: vendor.businessName,
    url: absoluteUrl(`/vendors/${vendor.slug}`),
    description: vendor.description ?? undefined,
    image: vendor.imageUrl ?? undefined,
    telephone: vendor.phone ?? undefined,
    sameAs: vendor.website ?? undefined,
    address: vendor.address
      ? {
          "@type": "PostalAddress",
          streetAddress: vendor.address,
          addressLocality: vendor.cityName ?? undefined,
          addressCountry: "IN",
        }
      : vendor.cityName
        ? { "@type": "PostalAddress", addressLocality: vendor.cityName, addressCountry: "IN" }
        : undefined,
    geo:
      vendor.latitude && vendor.longitude
        ? { "@type": "GeoCoordinates", latitude: vendor.latitude, longitude: vendor.longitude }
        : undefined,
    priceRange:
      vendor.priceRangeMin && vendor.priceRangeMax
        ? `${vendor.currency === "INR" ? "₹" : (vendor.currency ?? "")}${vendor.priceRangeMin}-${vendor.priceRangeMax}`
        : undefined,
    ...(rating > 0 && reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount,
          },
        }
      : {}),
  };
}

export interface BlogPostingInput {
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string | null;
}

export function blogPostingJsonLd(post: BlogPostingInput) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: post.coverImageUrl ?? undefined,
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    publisher: {
      "@type": "Organization",
      name: BRAND_NAME,
      logo: { "@type": "ImageObject", url: absoluteUrl("/icon.png") },
    },
  };
}
