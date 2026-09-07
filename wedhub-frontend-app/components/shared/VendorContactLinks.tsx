"use client";

import { trackEvent } from "@/lib/analytics/track";

/**
 * Clickable tel:/mailto:/website links for a vendor's contact block on
 * /vendors/[slug] — previously plain, unclickable text (SEO audit finding;
 * also blocks the required phone_click/email_click GA4 events from ever
 * having a real click to fire from). A small Client Component since the
 * page itself is a Server Component and onClick needs an event handler.
 */
export function VendorContactLinks({
  vendorId,
  businessName,
  phone,
  email,
  website,
}: {
  vendorId: string;
  businessName: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}) {
  return (
    <>
      {phone && (
        <a
          href={`tel:${phone}`}
          onClick={() => trackEvent({ eventType: "portfolio_call_click", vendorId, metadata: { source: "profile_sidebar", businessName } })}
          className="flex items-center gap-2.5 py-1.5 text-[13px] text-inherit no-underline hover:underline"
        >
          📞 {phone}
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          onClick={() => trackEvent({ eventType: "email_click", vendorId, metadata: { source: "profile_sidebar", businessName } })}
          className="flex items-center gap-2.5 py-1.5 text-[13px] text-inherit no-underline hover:underline"
        >
          ✉️ {email}
        </a>
      )}
      {website && (
        <a
          href={website.startsWith("http") ? website : `https://${website}`}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex items-center gap-2.5 py-1.5 text-[13px] text-inherit no-underline hover:underline"
        >
          🌐 {website}
        </a>
      )}
    </>
  );
}
