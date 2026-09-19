"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics/track";
import { revealVendorContactClient } from "@/lib/api/catalog-client";
import { formatApiError } from "@/lib/utils/error";
import { SignInModal } from "./SignInModal";

// Custom padlock icon for "Reveal contact details" — matches the app's
// inline-SVG icon convention (see VendorHeartButton.tsx) instead of the 🔒
// system emoji, which renders inconsistently across platforms/fonts.
function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="11" width="15" height="10" rx="2" />
      <path d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" />
    </svg>
  );
}

/**
 * Clickable tel:/mailto:/website links for a vendor's contact block on
 * /vendors/[slug] — previously plain, unclickable text (SEO audit finding;
 * also blocks the required phone_click/email_click GA4 events from ever
 * having a real click to fire from). A small Client Component since the
 * page itself is a Server Component and onClick needs an event handler.
 *
 * Contact details are never sent in the page's initial payload — GET
 * /vendors/:slug redacts phone/email/website server-side (see
 * vendor.controller.ts's redactContactFields), so there's nothing to hide
 * client-side and nothing exposed via view-source before a reveal. Real
 * values are fetched only after the couple explicitly clicks "Reveal
 * contact details", via POST /vendors/:slug/reveal-contact, which requires
 * a logged-in session and logs contact_details_revealed server-side — a
 * stronger-intent signal the vendor sees distinctly on their Leads page
 * (see lead.repository.ts::listProfileViewers and LeadsBoard.tsx).
 * Unauthenticated visitors get an in-page SignInModal instead of a redirect
 * to /login, mirroring EnquiryCta.tsx's exact same gate — on successful
 * sign-in the reveal call fires immediately (no second click needed) and
 * router.refresh() (inside SignInModal) re-reads the server-rendered
 * isAuthenticated flag so a future render of this component already knows
 * the visitor is signed in.
 */
export function VendorContactLinks({
  vendorId,
  vendorSlug,
  businessName,
  isAuthenticated,
  hasAnyContactInfo,
}: {
  vendorId: string;
  vendorSlug: string;
  businessName: string;
  isAuthenticated: boolean;
  hasAnyContactInfo: boolean;
}) {
  const [revealed, setRevealed] = useState<{ phone: string | null; email: string | null; website: string | null } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);

  if (!hasAnyContactInfo) return null;

  async function reveal() {
    setLoading(true);
    setError(null);
    const result = await revealVendorContactClient(vendorSlug);
    setLoading(false);
    if (!result.success) {
      // Surface the backend's actual message (e.g. requireVerifiedMiddleware's
      // "Please verify your email address before continuing") instead of a
      // generic string that would hide a 403 EMAIL_NOT_VERIFIED behind the
      // same text as a network blip.
      setError(formatApiError(result.error));
      return;
    }
    trackEvent({ eventType: "contact_details_revealed", vendorId, metadata: { source: "profile_sidebar", businessName } });
    setRevealed(result.data);
  }

  if (!isAuthenticated) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowSignIn(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-input px-4 py-2.5 text-[13px] font-semibold text-text-dark hover:bg-neutral-grey-20"
        >
          <LockIcon /> Reveal contact details
        </button>
        {showSignIn && (
          <SignInModal
            vendorName={businessName}
            onClose={() => setShowSignIn(false)}
            onSuccess={() => {
              setShowSignIn(false);
              void reveal();
            }}
          />
        )}
      </>
    );
  }

  if (!revealed) {
    return (
      <div>
        <button
          type="button"
          disabled={loading}
          onClick={reveal}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-input px-4 py-2.5 text-[13px] font-semibold text-text-dark hover:bg-neutral-grey-20 disabled:opacity-60"
        >
          <LockIcon /> {loading ? "Loading…" : "Reveal contact details"}
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <>
      {revealed.phone && (
        <a
          href={`tel:${revealed.phone}`}
          onClick={() => trackEvent({ eventType: "portfolio_call_click", vendorId, metadata: { source: "profile_sidebar", businessName } })}
          className="flex items-center gap-2.5 py-1.5 text-[13px] text-inherit no-underline hover:underline"
        >
          📞 {revealed.phone}
        </a>
      )}
      {revealed.email && (
        <a
          href={`mailto:${revealed.email}`}
          onClick={() => trackEvent({ eventType: "email_click", vendorId, metadata: { source: "profile_sidebar", businessName } })}
          className="flex items-center gap-2.5 py-1.5 text-[13px] text-inherit no-underline hover:underline"
        >
          ✉️ {revealed.email}
        </a>
      )}
      {revealed.website && (
        <a
          href={revealed.website.startsWith("http") ? revealed.website : `https://${revealed.website}`}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex items-center gap-2.5 py-1.5 text-[13px] text-inherit no-underline hover:underline"
        >
          🌐 {revealed.website}
        </a>
      )}
    </>
  );
}
