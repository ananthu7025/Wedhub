"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { isPreOptimizedMediaUrl } from "@/lib/media/url";
import { trackEvent } from "@/lib/analytics/track";
import { VendorHeartButton } from "./VendorHeartButton";
import { CrownRibbonBadge, VerifiedBadge } from "./PremiumBadge";
import { StarIcon } from "@/components/portfolio/icons";
import { startConversation } from "@/lib/api/messaging-client";
import { revealVendorContactClient } from "@/lib/api/catalog-client";
import { formatApiError } from "@/lib/utils/error";
import { useToast } from "@/components/ui/Toast";
import { SignInModal } from "./SignInModal";

export interface VendorCardProps {
  vendorId?: string;
  slug: string;
  businessName: string;
  logoUrl: string | null;
  logoBlurDataUrl?: string | null;
  shortDescription?: string | null;
  startingPrice: string | null;
  currency: string | null;
  featured?: boolean;
  isPremiumEligible?: boolean;
  isAuthenticated?: boolean;
  listContext?: string;
  onFavoriteToggle?: (favorited: boolean) => void;
  verificationLevel?: string;
  status?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  cityName?: string | null;
  avgRating?: number | null;
  reviewCount?: number;
}

export function VendorCard({
  vendorId,
  slug,
  businessName,
  logoUrl,
  logoBlurDataUrl,
  shortDescription,
  startingPrice,
  currency,
  featured = false,
  isPremiumEligible = false,
  isAuthenticated = false,
  listContext,
  onFavoriteToggle,
  verificationLevel = "UNVERIFIED",
  status = "APPROVED",
  categoryId,
  categoryName,
  cityName,
  avgRating,
  reviewCount,
}: VendorCardProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const impressionFired = useRef(false);

  const [signInAction, setSignInAction] = useState<"message" | "call" | null>(null);
  const [messagePending, setMessagePending] = useState(false);
  const [callPending, setCallPending] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);

  useEffect(() => {
    if (impressionFired.current || !vendorId) return;
    impressionFired.current = true;
    trackEvent({ eventType: "vendor_impression", vendorId, metadata: { listContext: listContext ?? "unknown" } });
  }, [vendorId, listContext]);

  function handleClick() {
    if (!vendorId) return;
    trackEvent({ eventType: "vendor_click", vendorId, metadata: { listContext: listContext ?? "unknown" } });
  }

  async function handleMessage(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!vendorId) {
      router.push(`/vendors/${slug}`);
      return;
    }
    if (!isAuthenticated) {
      setSignInAction("message");
      return;
    }
    setMessagePending(true);
    const result = await startConversation({ vendorId });
    setMessagePending(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    router.push(`/inbox?conversation=${result.data.id}`);
  }

  async function handleCall(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (revealedPhone) {
      trackEvent({ eventType: "portfolio_call_click", vendorId, metadata: { source: "vendor_card", businessName } });
      window.location.href = `tel:${revealedPhone}`;
      return;
    }
    if (!isAuthenticated) {
      setSignInAction("call");
      return;
    }
    setCallPending(true);
    const result = await revealVendorContactClient(slug);
    setCallPending(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    trackEvent({ eventType: "contact_details_revealed", vendorId, metadata: { source: "vendor_card", businessName } });
    if (result.data.phone) {
      setRevealedPhone(result.data.phone);
      trackEvent({ eventType: "portfolio_call_click", vendorId, metadata: { source: "vendor_card", businessName } });
      window.location.href = `tel:${result.data.phone}`;
    } else if (result.data.email) {
      showToast(`Phone not available. Vendor email: ${result.data.email}`, "info");
    } else {
      showToast("No phone number available for this vendor.", "info");
    }
  }

  const heartSummary = {
    id: vendorId ?? "",
    businessName,
    slug,
    status,
    verificationLevel,
    categoryId,
    profile: {
      shortDescription: shortDescription ?? null,
      startingPrice,
      currency,
      logoUrl,
      logoBlurDataUrl: logoBlurDataUrl ?? null,
    },
  };

  return (
    <>
      {/* Desktop view (unchanged original layout for screens > 900px) */}
      <Link
        href={`/vendors/${slug}`}
        onClick={handleClick}
        className="hidden min-[901px]:block overflow-hidden rounded-xl border border-border bg-white no-underline text-inherit hover:shadow-sm transition-shadow"
      >
        <div className="relative aspect-4/3 bg-surface-input">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={businessName}
              fill
              className="object-cover"
              sizes="25vw"
              unoptimized={isPreOptimizedMediaUrl(logoUrl)}
              {...(logoBlurDataUrl ? { placeholder: "blur" as const, blurDataURL: logoBlurDataUrl } : {})}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-text-grey">No photo yet</div>
          )}
          {(isPremiumEligible || featured) && <CrownRibbonBadge />}
          {vendorId && (
            <VendorHeartButton
              vendorId={vendorId}
              vendorSummary={heartSummary}
              isAuthenticated={isAuthenticated}
              initialFavorited={onFavoriteToggle ? true : undefined}
              onToggle={onFavoriteToggle}
              className="absolute top-2.5 right-2.5"
            />
          )}
        </div>
        <div className="p-3.5">
          <div className="mb-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="truncate text-sm font-bold text-gray-900">{businessName}</span>
            {verificationLevel && verificationLevel !== "UNVERIFIED" && <VerifiedBadge />}
          </div>
          {shortDescription && <p className="mb-2 line-clamp-2 text-xs text-text-grey">{shortDescription}</p>}
          {startingPrice && (
            <div className="text-[13px] font-bold">
              {currency === "INR" ? "₹" : (currency ?? "")}
              {Number(startingPrice).toLocaleString("en-IN")} <span className="font-medium text-text-grey">onwards</span>
            </div>
          )}
        </div>
      </Link>

      {/* Mobile view (single-column card matching reference UX for screens <= 900px) */}
      <div className="min-[901px]:hidden overflow-hidden rounded-2xl border border-border bg-white shadow-xs flex flex-col">
        {/* Photo Container */}
        <div className="relative aspect-[16/10] w-full bg-surface-input overflow-hidden">
          <Link href={`/vendors/${slug}`} onClick={handleClick} className="block h-full w-full">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={businessName}
                fill
                className="object-cover"
                sizes="100vw"
                unoptimized={isPreOptimizedMediaUrl(logoUrl)}
                {...(logoBlurDataUrl ? { placeholder: "blur" as const, blurDataURL: logoBlurDataUrl } : {})}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-text-grey">No photo yet</div>
            )}
          </Link>

          {(isPremiumEligible || featured) && <CrownRibbonBadge />}

          {vendorId && (
            <VendorHeartButton
              vendorId={vendorId}
              vendorSummary={heartSummary}
              isAuthenticated={isAuthenticated}
              initialFavorited={onFavoriteToggle ? true : undefined}
              onToggle={onFavoriteToggle}
              className="absolute top-3 right-3 z-10"
            />
          )}
        </div>

        {/* Card Content */}
        <div className="p-4 flex flex-col flex-1 justify-between gap-3">
          <Link href={`/vendors/${slug}`} onClick={handleClick} className="no-underline text-inherit block space-y-1">
            {/* Row 1: City / Location (left) + Star Rating & Review Count (right) */}
            <div className="flex items-center justify-between text-xs text-text-grey font-medium">
              <span>{cityName ?? "Kerala"}</span>
              {avgRating && Number(avgRating) > 0 ? (
                <span className="flex items-center gap-1 font-bold text-text-dark">
                  <StarIcon filled className="inline h-3.5 w-3.5 text-emerald-600" />
                  <span>{Number(avgRating).toFixed(1)}</span>
                  {reviewCount !== undefined && reviewCount > 0 && (
                    <span className="font-normal text-text-grey">({reviewCount})</span>
                  )}
                </span>
              ) : (
                <span className="text-[11px] text-text-grey font-normal">New on WedHub</span>
              )}
            </div>

            {/* Row 2: Business Name (bold) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-lg font-bold text-text-dark leading-tight line-clamp-1">
                {businessName}
              </h3>
              {verificationLevel && verificationLevel !== "UNVERIFIED" && <VerifiedBadge />}
            </div>

            {/* Row 3: Category name or tagline */}
            {(categoryName || shortDescription) && (
              <p className="text-xs text-text-grey font-medium line-clamp-1">
                {categoryName ?? shortDescription}
              </p>
            )}

            {/* Row 4: Price & Info */}
            <div className="flex items-baseline justify-between pt-1">
              {startingPrice ? (
                <div className="text-[15px] font-bold text-text-dark">
                  {currency === "INR" ? "₹" : (currency ?? "")} {Number(startingPrice).toLocaleString("en-IN")}{" "}
                  <span className="text-xs font-normal text-text-grey">per day</span>
                </div>
              ) : (
                <div className="text-xs text-text-grey font-medium">Price on request</div>
              )}
              <span className="text-[11px] font-medium text-text-grey flex items-center gap-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Info
              </span>
            </div>
          </Link>

          {/* Row 5: Action buttons (Message + Call) */}
          <div className="pt-2 border-t border-neutral-grey-20 flex items-center gap-2.5">
            <button
              type="button"
              disabled={messagePending}
              onClick={handleMessage}
              className="flex-1 h-10 rounded-full border border-brand-primary bg-white text-brand-primary hover:bg-brand-primary/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-semibold text-xs cursor-pointer disabled:opacity-60"
            >
              {messagePending ? (
                <span className="text-xs font-medium">Connecting…</span>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.84 7.04-.15.82-.62 2.22-1.8 3.32-.22.2-.14.56.14.65.61.19 1.95.42 3.66-.46 1.3.47 2.7.75 4.16.75 5.52 0 10-4.03 10-9s-4.48-9-10-9zm-4 10a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm4 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm4 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
                  </svg>
                  <span>Message</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={callPending}
              onClick={handleCall}
              aria-label={`Call ${businessName}`}
              className="h-10 w-10 flex-shrink-0 rounded-full border border-[#00a66c] bg-white text-[#00a66c] hover:bg-[#00a66c]/10 active:scale-[0.95] transition-all flex items-center justify-center cursor-pointer disabled:opacity-60 shadow-xs"
            >
              {callPending ? (
                <svg className="h-4 w-4 animate-spin text-[#00a66c]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1v3.5a1 1 0 01-1 1C10.61 21.01 2.99 13.39 2.99 3.99a1 1 0 011-1H7.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.21z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {signInAction && (
        <SignInModal
          vendorName={businessName}
          onClose={() => setSignInAction(null)}
          onSuccess={() => {
            const action = signInAction;
            setSignInAction(null);
            router.refresh();
            if (action === "message" && vendorId) {
              void startConversation({ vendorId }).then((res) => {
                if (res.success) router.push(`/inbox?conversation=${res.data.id}`);
              });
            } else if (action === "call") {
              void revealVendorContactClient(slug).then((res) => {
                if (res.success && res.data.phone) {
                  window.location.href = `tel:${res.data.phone}`;
                }
              });
            }
          }}
        />
      )}
    </>
  );
}
