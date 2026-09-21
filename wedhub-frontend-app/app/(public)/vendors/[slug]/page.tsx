import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { VendorAttributes } from "@/components/shared/VendorAttributes";
import { VendorHeartButton } from "@/components/shared/VendorHeartButton";
import { EnquiryCta } from "@/components/shared/EnquiryCta";
import { JsonLd } from "@/components/shared/JsonLd";
import { MessageVendorButton } from "@/components/shared/MessageVendorButton";
import { VendorContactLinks } from "@/components/shared/VendorContactLinks";
import { VendorPortfolioTabs } from "@/components/portfolio/VendorPortfolioTabs";
import { VendorRatingDistribution } from "@/components/portfolio/VendorRatingDistribution";
import { CuratedVendorShelf } from "../CuratedVendorShelf";
import { getVendorAlbums, getVendorBySlug, getVendorReviews, searchVendors } from "@/lib/api/catalog";
import { getPublicMediaUrl, isPreOptimizedMediaUrl } from "@/lib/media/url";
import { formatResponseTimeBucket } from "@/lib/utils/response-time";
import { ApiRequestError } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { getOptionalSession } from "@/lib/auth/dal";
import { listMyShortlistedVendorIds } from "@/lib/api/shortlists";
import { breadcrumbListJsonLd, vendorLocalBusinessJsonLd } from "@/lib/seo/json-ld";
import { resolveCategorySeoSlug } from "@/lib/seo/category-slug-map";

interface VendorPageProps {
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

export async function generateMetadata({ params }: VendorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await loadVendor(slug);
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category ?? vendor.categories[0]?.category;
  const title =
    vendor.profile?.seoTitle ??
    (primaryCategory && vendor.city
      ? `${vendor.businessName} | ${primaryCategory.name} in ${vendor.city.name}`
      : vendor.businessName);
  const description = vendor.profile?.seoDescription ?? vendor.profile?.shortDescription ?? undefined;
  const canonicalPath = `/vendors/${vendor.slug}`;
  // A vendor-supplied canonicalUrl (VendorProfile.canonicalUrl) is an
  // escape hatch for a vendor pointing Google at their own external site
  // instead — honored only when set; the marketplace's own /vendors/:slug
  // URL is canonical by default.
  const canonical = vendor.profile?.canonicalUrl || canonicalPath;
  const coverMedia = vendor.profile?.coverMedia;
  const ogImage = coverMedia
    ? getPublicMediaUrl(coverMedia.optimizedObjectKey ?? coverMedia.originalObjectKey)
    : undefined;

  return {
    title,
    description,
    alternates: { canonical },
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
    robots: { index: true, follow: true },
  };
}

const VERIFICATION_LABEL: Record<string, string> = {
  UNVERIFIED: "",
  IDENTITY_VERIFIED: "✓ Identity Verified",
  BUSINESS_VERIFIED: "✓ Business Verified",
  PLATFORM_VERIFIED: "✓ Platform Verified",
};

export default async function VendorProfilePage({ params }: VendorPageProps) {
  const { slug } = await params;
  const vendor = await loadVendor(slug);

  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category ?? vendor.categories[0]?.category;

  const [{ data: albums }, reviewsResult, session, similarResult] = await Promise.all([
    getVendorAlbums(slug),
    // limit=50: high enough that the fetched page equals the vendor's real
    // total for the overwhelming majority of vendors on this marketplace
    // today (rating distribution below only renders when it genuinely
    // does — see VendorRatingDistribution's own doc comment for why a
    // partial sample is never shown as if it were complete).
    getVendorReviews(vendor.id, 1, 50).catch(() => ({ data: [], meta: undefined })),
    getOptionalSession(),
    primaryCategory
      ? searchVendors({ categoryId: primaryCategory.id, limit: 12 }).catch(() => ({ data: [], meta: undefined }))
      : Promise.resolve({ data: [], meta: undefined }),
  ]);
  const reviews = reviewsResult.data;
  const similarVendors = similarResult.data.filter((v) => v.id !== vendor.id).slice(0, 10);

  // Seeds the heart button with real shortlist membership instead of always
  // starting "unfavorited" (which made un-hearting an already-shortlisted
  // vendor from this page impossible — see VendorHeartButton's doc comment).
  const isFavorited = session !== null && (await listMyShortlistedVendorIds()).has(vendor.id);

  // GET /vendors/:slug now joins profile.logoMedia/coverMedia directly
  // (vendor.repository.ts's include) — the earlier "no way to resolve
  // logoMediaId/coverMediaId to a URL" limitation (frontenddocs/
  // 10-risks-and-open-questions.md Open Question 7) no longer applies, but
  // this page was never updated to use it, so a vendor's logo/cover never
  // rendered even when uploaded. Cover falls back to the vendor's first
  // public album photo if no cover image is set; logo falls back to the
  // first-letter badge.
  const coverMedia = vendor.profile?.coverMedia;
  // "IMAGE" is not a real MediaType value (see AlbumMedia's own type
  // comment in vendors.types.ts) — a photo in an album is "PORTFOLIO".
  // Excluding "VIDEO" rather than positively matching "PORTFOLIO" also
  // means this correctly keeps working if a third non-video media type
  // ever appears in an album's media list.
  const heroMedia = albums[0]?.media.find((m) => m.mediaType !== "VIDEO");
  const heroImageKey =
    coverMedia?.optimizedObjectKey ??
    coverMedia?.originalObjectKey ??
    heroMedia?.optimizedObjectKey ??
    heroMedia?.originalObjectKey;
  const heroImageUrl = heroImageKey ? getPublicMediaUrl(heroImageKey) : null;

  const logoMedia = vendor.profile?.logoMedia;
  // Rendered into a compact circular badge — the 300px thumbnail variant is
  // already more than enough resolution, no need to request the 800px
  // "medium" variant for this.
  const logoImageKey = logoMedia?.thumbnailObjectKey ?? logoMedia?.optimizedObjectKey ?? logoMedia?.originalObjectKey;
  const logoImageUrl = logoImageKey ? getPublicMediaUrl(logoImageKey) : null;

  const verificationLabel = VERIFICATION_LABEL[vendor.verificationLevel];
  const responseTimeLabel = formatResponseTimeBucket(vendor.avgResponseTimeMs);
  const hasRating = Number(vendor.averageRating) > 0;

  // Real, additional service-area cities beyond the vendor's home city — a
  // genuine "+N more city" line only when there's real data behind it, not
  // a decorative count.
  const extraServiceAreaCities = vendor.serviceAreas
    .map((sa) => sa.location.name)
    .filter((name) => name !== vendor.city?.name);

  const galleryMedia = albums.flatMap((a) => a.media);
  const hasAbout = Boolean(vendor.profile?.description) || vendor.attributeValues.length > 0;
  const hasPackages = vendor.packages.some((pkg) => pkg.isActive);
  const hasReviews = reviews.length > 0;
  // The fetched review page equals the vendor's real total only when the
  // count matches — see VendorRatingDistribution's own comment on why a
  // partial sample must never be shown as if it were a complete breakdown.
  const reviewsAreComplete = reviews.length === vendor.reviewCount;

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    ...(primaryCategory
      ? [{ name: primaryCategory.name, path: `/category/${resolveCategorySeoSlug(primaryCategory.slug)}` }]
      : []),
    ...(vendor.city ? [{ name: vendor.city.name, path: `/city/${vendor.city.slug}` }] : []),
    { name: vendor.businessName, path: `/vendors/${vendor.slug}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbListJsonLd(breadcrumbItems)} />
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
          imageUrl: heroImageUrl,
          priceRangeMin: vendor.profile?.priceRangeMin,
          priceRangeMax: vendor.profile?.priceRangeMax,
          currency: vendor.profile?.currency,
          averageRating: vendor.averageRating,
          reviewCount: vendor.reviewCount,
        })}
      />
      <PublicTopbar />

      <div className="bg-surface-page">
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6">
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

          {/* Two-column hero: gallery preview on the left, identity +
              contact card on the right — sticky on desktop so the
              enquiry/contact actions stay reachable while scrolling. */}
          <div className="grid grid-cols-[1fr_360px] gap-6 max-[900px]:grid-cols-1">
            <div>
              {heroImageUrl && (
                <div className="relative aspect-16/9 w-full overflow-hidden rounded-xl bg-surface-input sm:aspect-21/9">
                  <Image
                    src={heroImageUrl}
                    alt={vendor.businessName}
                    fill
                    sizes="(max-width: 900px) 100vw, 800px"
                    className="object-cover"
                    priority
                    unoptimized={isPreOptimizedMediaUrl(heroImageUrl)}
                    {...(coverMedia?.blurDataUrl ?? heroMedia?.blurDataUrl
                      ? { placeholder: "blur" as const, blurDataURL: coverMedia?.blurDataUrl ?? heroMedia?.blurDataUrl ?? undefined }
                      : {})}
                  />
                </div>
              )}

              <div className="mt-4 flex items-start gap-4">
                {logoImageUrl && (
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-white shadow-[var(--shadow-card)]">
                    <Image
                      src={logoImageUrl}
                      alt={vendor.businessName}
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized={isPreOptimizedMediaUrl(logoImageUrl)}
                      {...(logoMedia?.blurDataUrl ? { placeholder: "blur" as const, blurDataURL: logoMedia.blurDataUrl } : {})}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-bold">{vendor.businessName}</h1>
                    {verificationLabel && <Badge variant="green">{verificationLabel}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-text-grey">
                    {hasRating && (
                      <>
                        <span className="font-bold text-text-dark">★ {Number(vendor.averageRating).toFixed(1)}</span>{" "}
                        ({vendor.reviewCount} review{vendor.reviewCount === 1 ? "" : "s"}){" · "}
                      </>
                    )}
                    {vendor.city && vendor.city.name}
                    {extraServiceAreaCities.length > 0 && ` +${extraServiceAreaCities.length} more city`}
                  </p>
                  {vendor.profile?.address && <p className="mt-0.5 text-xs text-text-grey">{vendor.profile.address}</p>}
                  {responseTimeLabel && <p className="mt-1.5 text-xs font-medium text-emerald-700">{responseTimeLabel}</p>}
                </div>
                <VendorHeartButton
                  vendorId={vendor.id}
                  isAuthenticated={session !== null}
                  initialFavorited={isFavorited}
                  className="static h-10 w-10 flex-shrink-0 border border-border bg-white shadow-none"
                />
              </div>
            </div>

            <aside>
              <div className="sticky top-[90px] rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-card)]">
                {vendor.profile?.startingPrice && (
                  <div className="mb-4 border-b border-border pb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-text-grey">Starting Price</p>
                    <p className="text-xl font-bold">
                      {vendor.profile.currency === "INR" ? "₹" : vendor.profile.currency}
                      {Number(vendor.profile.startingPrice).toLocaleString("en-IN")}
                    </p>
                  </div>
                )}

                <EnquiryCta vendorId={vendor.id} vendorName={vendor.businessName} isAuthenticated={session !== null} />

                <MessageVendorButton vendorId={vendor.id} vendorName={vendor.businessName} isAuthenticated={session !== null} />

                <div className="mt-4 border-t border-border pt-4">
                  <VendorContactLinks
                    vendorId={vendor.id}
                    vendorSlug={vendor.slug}
                    businessName={vendor.businessName}
                    isAuthenticated={session !== null}
                    hasAnyContactInfo={Boolean(vendor.profile?.hasContactInfo)}
                  />
                </div>

                <Link
                  href={`/shortlist?compareVendorId=${vendor.id}`}
                  className="mt-3 block w-full rounded-md border border-border bg-white py-2.5 text-center text-xs font-bold text-text-dark no-underline hover:bg-surface-input"
                >
                  Add to compare
                </Link>
              </div>
            </aside>
          </div>

          {/* Portfolio */}
          {galleryMedia.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-lg font-bold">Portfolio</h2>
              <VendorPortfolioTabs albums={albums} businessName={vendor.businessName} />
            </section>
          )}

          <div className="mt-10 grid grid-cols-[1fr_360px] gap-10 max-[900px]:grid-cols-1">
            <main className="min-w-0">
              {hasAbout && (
                <section className="mb-10">
                  <h2 className="mb-4 text-lg font-bold">
                    About {vendor.businessName}
                    {vendor.city ? ` - ${primaryCategory?.name ?? ""}, ${vendor.city.name}` : ""}
                  </h2>
                  {vendor.profile?.description && (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-text-body">{vendor.profile.description}</p>
                  )}
                  {vendor.attributeValues.length > 0 && (
                    <div className="mt-5">
                      <VendorAttributes attributeValues={vendor.attributeValues} />
                    </div>
                  )}
                </section>
              )}

              {hasPackages && (
                <section className="mb-10">
                  <h2 className="mb-4 text-lg font-bold">Packages &amp; Pricing</h2>
                  {vendor.packages
                    .filter((pkg) => pkg.isActive)
                    .map((pkg) => {
                      const imageKey = pkg.image?.thumbnailObjectKey ?? pkg.image?.optimizedObjectKey ?? pkg.image?.originalObjectKey;
                      return (
                        <div key={pkg.id} className="mb-3.5 flex gap-4 rounded-xl border border-border p-5">
                          {imageKey && (
                            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-surface-input">
                              <Image src={getPublicMediaUrl(imageKey)} alt={pkg.name} fill sizes="64px" className="object-cover" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-baseline justify-between gap-2">
                              <span className="text-[15px] font-bold">{pkg.name}</span>
                              <span className="whitespace-nowrap text-base font-bold text-brand-primary">
                                {pkg.currency === "INR" ? "₹" : pkg.currency} {Number(pkg.price).toLocaleString("en-IN")}
                              </span>
                            </div>
                            {pkg.description && <p className="mb-2 text-[13px] text-text-grey">{pkg.description}</p>}
                            {pkg.inclusions.length > 0 && (
                              <ul className="mt-2.5 list-disc pl-4.5 text-[13px] leading-loose text-text-body">
                                {pkg.inclusions.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {vendor.profile?.customQuoteAvailable && (
                    <p className="text-[13px] text-text-grey">Custom quotations available on request.</p>
                  )}
                </section>
              )}

              {hasReviews && (
                <section>
                  <h2 className="mb-4 text-lg font-bold">
                    Reviews for {vendor.businessName} ({vendor.reviewCount})
                  </h2>

                  <div className="mb-6 grid grid-cols-[auto_1fr] gap-8 rounded-xl border border-border p-5 max-[600px]:grid-cols-1">
                    <div className="text-center">
                      <div className="text-[44px] font-bold leading-none">{Number(vendor.averageRating).toFixed(1)}</div>
                      <div className="mt-1 text-xs text-text-grey">
                        {vendor.reviewCount} review{vendor.reviewCount === 1 ? "" : "s"}
                      </div>
                    </div>
                    {reviewsAreComplete && (
                      <div className="flex flex-col justify-center">
                        <VendorRatingDistribution reviews={reviews} />
                      </div>
                    )}
                  </div>

                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-neutral-grey-20 py-4.5 last:border-b-0">
                      <div className="mb-1 text-[#f0a202]">
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </div>
                      {review.title && <div className="mb-1 text-sm font-bold">{review.title}</div>}
                      {review.content && <p className="mb-2 text-[13px] leading-relaxed">{review.content}</p>}
                      {review.verifiedInteraction && <Badge variant="green">✓ Verified booking</Badge>}
                      {review.photos.length > 0 && (
                        <div className="mt-2.5 flex gap-2">
                          {review.photos.map((photo) => {
                            const key = photo.thumbnailObjectKey ?? photo.optimizedObjectKey ?? photo.originalObjectKey;
                            return (
                              <div key={photo.id} className="relative h-16 w-16 overflow-hidden rounded-md bg-surface-input">
                                <Image
                                  src={getPublicMediaUrl(key)}
                                  alt={`Review photo for ${vendor.businessName}`}
                                  fill
                                  sizes="64px"
                                  className="object-cover"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {review.vendorResponse && (
                        <div className="mt-2.5 rounded-md bg-surface-input p-3.5 text-[13px]">
                          <strong className="mb-1 block text-xs">Response from {vendor.businessName}</strong>
                          {review.vendorResponse}
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              )}
            </main>

            {/* Right rail intentionally left as spacing on desktop — the
                sticky contact card above already occupies this column; this
                grid keeps the main content width consistent with the hero
                above it without a second sticky element competing for
                attention. */}
            <div aria-hidden className="max-[900px]:hidden" />
          </div>

          {similarVendors.length > 0 && primaryCategory && (
            <CuratedVendorShelf
              title={`Browse Similar ${primaryCategory.name}`}
              categoryId={primaryCategory.id}
              vendors={similarVendors}
            />
          )}
        </div>
      </div>
      <div className="h-16" />
    </>
  );
}
