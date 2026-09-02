import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { VendorAttributes } from "@/components/shared/VendorAttributes";
import { getVendorAlbums, getVendorBySlug, getVendorReviews } from "@/lib/api/catalog";
import { getPublicMediaUrl } from "@/lib/media/url";
import { ApiRequestError } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";

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
  try {
    const vendor = await loadVendor(slug);
    return {
      title: vendor.profile?.seoTitle ?? vendor.businessName,
      description: vendor.profile?.seoDescription ?? vendor.profile?.shortDescription ?? undefined,
    };
  } catch {
    return { title: "Vendor" };
  }
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

  const [{ data: albums }, reviewsResult] = await Promise.all([
    getVendorAlbums(slug),
    getVendorReviews(vendor.id, 1, 10).catch(() => ({ data: [], meta: undefined })),
  ]);
  const reviews = reviewsResult.data;

  // profile.logoMediaId/coverMediaId cannot be resolved to a URL (no public
  // media-by-id endpoint, no relation joined into the vendor-detail query —
  // see frontenddocs/10-risks-and-open-questions.md Open Question 7).
  // Fall back to the vendor's first public album's cover photo.
  const heroMedia = albums[0]?.media[0];
  const heroImageKey = heroMedia?.optimizedObjectKey ?? heroMedia?.originalObjectKey;
  const heroImageUrl = heroImageKey ? getPublicMediaUrl(heroImageKey) : null;

  const verificationLabel = VERIFICATION_LABEL[vendor.verificationLevel];
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category ?? vendor.categories[0]?.category;

  return (
    <>
      <PublicTopbar />

      <div className="relative h-80 bg-surface-input max-[900px]:h-52">
        {heroImageUrl && <Image src={heroImageUrl} alt={vendor.businessName} fill className="object-cover" priority />}
      </div>

      <div className="mx-auto max-w-[1200px] px-10 max-[900px]:px-4">
        <div className="-mt-16 flex items-end gap-5 max-[900px]:flex-wrap">
          <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-surface-input text-3xl font-bold text-text-grey shadow-[var(--shadow-card)]">
            {vendor.businessName.charAt(0)}
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
        </div>

        <div className="mt-8 grid grid-cols-[1fr_340px] gap-7 max-[900px]:grid-cols-1">
          <main>
            {vendor.profile?.description && (
              <section className="mb-9">
                <h2 className="mb-4 text-lg font-bold">About</h2>
                <p className="text-sm leading-relaxed text-text-body">{vendor.profile.description}</p>
                {vendor.attributeValues.length > 0 && (
                  <div className="mt-5">
                    <VendorAttributes attributeValues={vendor.attributeValues} />
                  </div>
                )}
              </section>
            )}

            {albums.length > 0 && (
              <section className="mb-9">
                <h2 className="mb-4 text-lg font-bold">Portfolio</h2>
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
              </section>
            )}

            {vendor.packages.length > 0 && (
              <section className="mb-9">
                <h2 className="mb-4 text-lg font-bold">Packages &amp; Pricing</h2>
                {vendor.packages
                  .filter((pkg) => pkg.isActive)
                  .map((pkg) => (
                    <div key={pkg.id} className="mb-3.5 rounded-xl border border-border p-5">
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
                  ))}
                {vendor.profile?.customQuoteAvailable && (
                  <p className="text-[13px] text-text-grey">Custom quotations available on request.</p>
                )}
              </section>
            )}

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

          <aside>
            <div className="sticky top-[90px] rounded-xl border border-border bg-white p-6 shadow-[var(--shadow-card)]">
              {vendor.profile?.startingPrice && (
                <p className="mb-1 text-xl font-bold">
                  {vendor.profile.currency === "INR" ? "₹" : vendor.profile.currency}
                  {Number(vendor.profile.startingPrice).toLocaleString("en-IN")}{" "}
                  <span className="text-xs font-medium text-text-grey">starting price</span>
                </p>
              )}

              {/* Enquiry submission is Frontend Arch Phase 3 scope (see
                  frontenddocs/04-stage-couple-experience.md) — the CTA
                  exists now so the page structure matches the mockup, but
                  it links to login rather than opening a working modal,
                  since there is nowhere yet for an unauthenticated visitor's
                  enquiry intent to go. */}
              <a
                href={`/login?next=/vendors/${vendor.slug}`}
                className="mt-3 block w-full rounded-md bg-brand-primary py-3 text-center text-sm font-bold text-white no-underline shadow-[0_4px_12px_rgba(224,11,65,0.18)] hover:bg-brand-primary-hover"
              >
                Send Enquiry
              </a>

              <div className="mt-5 border-t border-border pt-4">
                {vendor.profile?.phone && (
                  <div className="flex items-center gap-2.5 py-1.5 text-[13px]">📞 {vendor.profile.phone}</div>
                )}
                {vendor.profile?.email && (
                  <div className="flex items-center gap-2.5 py-1.5 text-[13px]">✉️ {vendor.profile.email}</div>
                )}
                {vendor.profile?.website && (
                  <div className="flex items-center gap-2.5 py-1.5 text-[13px]">🌐 {vendor.profile.website}</div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
      <div className="h-16" />
    </>
  );
}
