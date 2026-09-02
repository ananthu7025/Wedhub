"use client";

import { useState } from "react";
import { EnquiryModal } from "./EnquiryModal";

/**
 * Client wrapper so the (Server Component) vendor profile page can render an
 * interactive "Send Enquiry" button without itself becoming a Client
 * Component. Unauthenticated visitors are sent to /login first — see
 * frontenddocs/04-stage-couple-experience.md Frontend Arch Phase 3 and
 * EnquiryModal.tsx's header comment for why we gate here instead of allowing
 * the backend's anonymous-submission path.
 */
export function EnquiryCta({
  vendorId,
  vendorSlug,
  vendorName,
  isAuthenticated,
}: {
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  isAuthenticated: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <a
        href={`/login?next=/vendors/${vendorSlug}`}
        className="mt-3 block w-full rounded-md bg-brand-primary py-3 text-center text-sm font-bold text-white no-underline shadow-[0_4px_12px_rgba(224,11,65,0.18)] hover:bg-brand-primary-hover"
      >
        Send Enquiry
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 block w-full rounded-md bg-brand-primary py-3 text-center text-sm font-bold text-white shadow-[0_4px_12px_rgba(224,11,65,0.18)] hover:bg-brand-primary-hover"
      >
        Send Enquiry
      </button>
      <EnquiryModal vendorId={vendorId} vendorName={vendorName} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
