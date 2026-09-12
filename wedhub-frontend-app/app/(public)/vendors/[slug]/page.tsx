import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { VendorAttributes } from "@/components/shared/VendorAttributes";
import { VendorHeartButton } from "@/components/shared/VendorHeartButton";
import { EnquiryCta } from "@/components/shared/EnquiryCta";
import { JsonLd } from "@/components/shared/JsonLd";
import { VendorContactLinks } from "@/components/shared/VendorContactLinks";
import { getVendorAlbums, getVendorBySlug, getVendorReviews } from "@/lib/api/catalog";
import { getPublicMediaUrl } from "@/lib/media/url";
import { ApiRequestError } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { getOptionalSession } from "@/lib/auth/dal";
import { listMyShortlistedVendorIds } from "@/lib/api/shortlists";
import { breadcrumbListJsonLd, vendorLocalBusinessJsonLd } from "@/lib/seo/json-ld";

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

  const [{ data: albums }, reviewsResult, session] = await Promise.all([
    getVendorAlbums(slug),
    getVendorReviews(vendor.id, 1, 10).catch(() => ({ data: [], meta: undefined })),
    getOptionalSession(),
  ]);
  const reviews = reviewsResult.data;

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
  const heroMedia = albums[0]?.media[0];
  const heroImageKey =
    coverMedia?.optimizedObjectKey ??
    coverMedia?.originalObjectKey ??
    heroMedia?.optimizedObjectKey ??
    heroMedia?.originalObjectKey;
  const heroImageUrl = heroImageKey ? getPublicMediaUrl(heroImageKey) : null;

  const logoMedia = vendor.profile?.logoMedia;
  const logoImageKey = logoMedia?.optimizedObjectKey ?? logoMedia?.originalObjectKey;
  const logoImageUrl = logoImageKey ? getPublicMediaUrl(logoImageKey) : null;

  const verificationLabel = VERIFICATION_LABEL[vendor.verificationLevel];
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category ?? vendor.categories[0]?.category;

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    ...(primaryCategory ? [{ name: primaryCategory.name, path: `/category/${primaryCategory.slug}` }] : []),
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
          phone: vendor.profile?.phone,
          website: vendor.profile?.website,
          imageUrl: heroImageUrl,
          priceRangeMin: vendor.profile?.priceRangeMin,
          priceRangeMax: vendor.profile?.priceRangeMax,
          currency: vendor.profile?.currency,
          averageRating: vendor.averageRating,
          reviewCount: vendor.reviewCount,
        })}
      />
      <PublicTopbar />

      <div className="relative h-80 bg-surface-input max-[900px]:h-52">
        {heroImageUrl && <Image src={heroImageUrl} alt={vendor.businessName} fill className="object-cover" priority />}
      </div>

      <div className="mx-auto max-w-[1200px] px-10 max-[900px]:px-4">
        <nav className="mb-4 pt-5 text-xs text-text-grey" aria-label="Breadcrumb">
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

        <div className="-mt-4 flex items-end gap-5 max-[900px]:flex-wrap">
          <div className="relative flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-surface-input text-3xl font-bold text-text-grey shadow-[var(--shadow-card)]">
            {logoImageUrl ? (
              <Image src={logoImageUrl} alt={vendor.businessName} fill className="object-cover" />
            ) : (
              vendor.businessName.charAt(0)
            )}
          </div>
          <div className="flex-1 pb-2">
            <div className="mb-1 inline-flex flex-wrap items-center gap-2.5 bg-white">
              <h1 className="text-[26px] font-bold">{vendor.businessName}</h1>
              {verificationLabel && <Badge variant="green">{verificationLabel}</Badge>}
            </div>
            <p className="text-[13px] text-text-grey">
              {Number(vendor.averageRating) > 0 && <>★ {Number(vendor.averageRating).toFixed(1)} ({vendor.reviewCount} reviews) · </>}
              {primaryCategory?.name}
              {vendor.city && <> · {vendor.city.name}</>}
              {vendor.profile?.yearsExperience !== null && vendor.profile?.yearsExperience !== undefined && (
                <> · {vendor.profile.yearsExperience} yrs experience</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2.5 pb-2">
            <VendorHeartButton
              vendorId={vendor.id}
              isAuthenticated={session !== null}
              initialFavorited={isFavorited}
              className="static h-10 w-10 border border-border bg-white shadow-none"
            />
            <Link
              href={`/shortlist?compareVendorId=${vendor.id}`}
              className="rounded-md border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-dark no-underline hover:bg-surface-input"
            >
              Add to compare
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-[1fr_340px] gap-7 max-[900px]:grid-cols-1">
          <main className="max-[900px]:order-2">
            {(vendor.profile?.description || vendor.attributeValues.length > 0) && (
              <section className="mb-9">
                <h2 className="mb-4 text-lg font-bold">About</h2>
                {vendor.profile?.description && (
                  <p className="text-sm leading-relaxed text-text-body">{vendor.profile.description}</p>
                )}
                {vendor.attributeValues.length > 0 && (
                  <div className="mt-5">
                    <VendorAttributes attributeValues={vendor.attributeValues} />
                  </div>
                )}
              </section>
            )}

            <section className="mb-9">
              <h2 className="mb-4 text-lg font-bold">Portfolio</h2>
              {albums.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5 max-[900px]:grid-cols-2">
                  {albums
                    .flatMap((album) => album.media)
                    .slice(0, 9)
                    .map((media) => {
                      const key = media.thumbnailObjectKey ?? media.optimizedObjectKey ?? media.originalObjectKey;
                      return (
                        <div key={media.id} className="relative aspect-square overflow-hidden rounded-md bg-surface-input">
                          <Image src={getPublicMediaUrl(key)} alt={media.altText ?? vendor.businessName} fill className="object-cover" />
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-text-grey">Portfolio photos are being prepared. Check back soon.</p>
              )}
            </section>

            <section className="mb-9">
              <h2 className="mb-4 text-lg font-bold">Packages &amp; Pricing</h2>
              {vendor.packages.length > 0 ? (
                <>
                  {vendor.packages
                    .filter((pkg) => pkg.isActive)
                    .map((pkg) => {
                      const imageKey =
                        pkg.image?.thumbnailObjectKey ?? pkg.image?.optimizedObjectKey ?? pkg.image?.originalObjectKey;
                      return (
                      <div key={pkg.id} className="mb-3.5 flex gap-4 rounded-xl border border-border p-5">
                        {imageKey && (
                          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-surface-input">
                            <Image src={getPublicMediaUrl(imageKey)} alt={pkg.name} fill className="object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-baseline justify-between">
                            <span className="text-[15px] font-bold">{pkg.name}</span>
                            <span className="text-base font-bold text-brand-primary">
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
                </>
              ) : (
                <p className="text-sm text-text-grey">No packages listed yet. Contact the vendor for pricing.</p>
              )}
            </section>

            <section>
              <h2 className="mb-4 text-lg font-bold">Reviews</h2>
              {Number(vendor.averageRating) > 0 && (
                <div className="mb-6 flex items-center gap-5">
                  <div className="text-[44px] font-bold">{Number(vendor.averageRating).toFixed(1)}</div>
                  <div className="text-sm text-text-grey">{vendor.reviewCount} review{vendor.reviewCount === 1 ? "" : "s"}</div>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-sm text-text-grey">No reviews yet.</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border-b border-neutral-grey-20 py-4.5 last:border-b-0">
                    <div className="mb-1 text-[#f0a202]">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
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
                ))
              )}
            </section>
          </main>

          <aside className="max-[900px]:order-1">
            <div className="sticky top-[90px] max-[900px]:static rounded-xl border border-border bg-white p-6 shadow-[var(--shadow-card)]">
              {vendor.profile?.startingPrice && (
                <p className="mb-1 text-xl font-bold">
                  {vendor.profile.currency === "INR" ? "₹" : vendor.profile.currency}
                  {Number(vendor.profile.startingPrice).toLocaleString("en-IN")}{" "}
                  <span className="text-xs font-medium text-text-grey">starting price</span>
                </p>
              )}

              <EnquiryCta
                vendorId={vendor.id}
                vendorSlug={vendor.slug}
                vendorName={vendor.businessName}
                isAuthenticated={session !== null}
              />

              <div className="mt-5 border-t border-border pt-4">
                <VendorContactLinks
                  vendorId={vendor.id}
                  businessName={vendor.businessName}
                  phone={vendor.profile?.phone}
                  email={vendor.profile?.email}
                  website={vendor.profile?.website}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
      <div className="h-16" />
    </>
  );
}
