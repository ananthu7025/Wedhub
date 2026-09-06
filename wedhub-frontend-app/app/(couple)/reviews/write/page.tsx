import Link from "next/link";
import type { Metadata } from "next";
import { PublicTopbar, CoupleBottomNav } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { getVendorBySlug } from "@/lib/api/catalog";
import { ApiRequestError } from "@/lib/api/types";
import { ReviewForm } from "./ReviewForm";

export const metadata: Metadata = {
  title: "Write a Review",
};

interface WriteReviewPageProps {
  searchParams: Promise<{ vendor?: string }>;
}

export default async function WriteReviewPage({ searchParams }: WriteReviewPageProps) {
  const { vendor: vendorSlug } = await searchParams;

  if (!vendorSlug) {
    return (
      <>
        <PublicTopbar activeHref="/enquiries" />
        <div className="mx-auto max-w-[560px] px-6 py-14 text-center">
          <h1 className="mb-2 text-xl font-bold">No vendor selected</h1>
          <p className="mb-5 text-sm text-text-grey">Write a review from your enquiries list or a vendor&apos;s profile.</p>
          <Link href="/enquiries" className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white no-underline">
            Go to my enquiries
          </Link>
        </div>
        <PublicFooter />
        <CoupleBottomNav activeHref="/enquiries" />
      </>
    );
  }

  let vendor;
  try {
    const { data } = await getVendorBySlug(vendorSlug);
    vendor = data;
  } catch (error) {
    const message = error instanceof ApiRequestError ? error.message : "Vendor not found";
    return (
      <>
        <PublicTopbar activeHref="/enquiries" />
        <div className="mx-auto max-w-[560px] px-6 py-14 text-center">
          <h1 className="mb-2 text-xl font-bold">Couldn&apos;t load this vendor</h1>
          <p className="text-sm text-text-grey">{message}</p>
        </div>
        <PublicFooter />
        <CoupleBottomNav activeHref="/enquiries" />
      </>
    );
  }

  return (
    <>
      <PublicTopbar activeHref="/enquiries" />
      <div className="mx-auto max-w-[560px] px-6 py-8">
        <Link href="/enquiries" className="mb-3 inline-block text-[13px] font-semibold text-text-grey no-underline">
          ← Back to enquiries
        </Link>
        <h1 className="mb-1 text-2xl font-bold">Write a review</h1>
        <p className="mb-6 text-sm text-text-grey">Share your experience to help other couples</p>

        <div className="rounded-xl border border-border bg-white p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-surface-input text-lg font-bold text-text-grey">
              {vendor.businessName.charAt(0)}
            </div>
            <div>
              <strong className="block text-sm">{vendor.businessName}</strong>
              <div className="text-xs text-text-grey">Reviewing on itsmyKalyanam</div>
            </div>
          </div>

          <ReviewForm vendorId={vendor.id} services={vendor.services.map((s) => ({ id: s.serviceId, name: s.service.name }))} />
        </div>
      </div>
      <PublicFooter />
      <CoupleBottomNav activeHref="/enquiries" />
    </>
  );
}
