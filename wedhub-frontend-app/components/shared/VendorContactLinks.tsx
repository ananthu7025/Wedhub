"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics/track";
import { revealVendorContactClient } from "@/lib/api/catalog-client";

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
 * Unauthenticated visitors are sent to /login first, mirroring
 * EnquiryCta.tsx's exact same gate.
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

  if (!hasAnyContactInfo) return null;

  if (!isAuthenticated) {
    return (
      <a
        href={`/login?next=/vendors/${vendorSlug}`}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-input px-4 py-2.5 text-[13px] font-semibold text-text-dark no-underline hover:bg-neutral-grey-20"
      >
        🔒 Reveal contact details
      </a>
    );
  }

  if (!revealed) {
    return (
      <div>
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setError(null);
            const result = await revealVendorContactClient(vendorSlug);
            setLoading(false);
            if (!result.success) {
              setError("Couldn't load contact details. Please try again.");
              return;
            }
            trackEvent({ eventType: "contact_details_revealed", vendorId, metadata: { source: "profile_sidebar", businessName } });
            setRevealed(result.data);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface-input px-4 py-2.5 text-[13px] font-semibold text-text-dark hover:bg-neutral-grey-20 disabled:opacity-60"
        >
          🔒 {loading ? "Loading…" : "Reveal contact details"}
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
