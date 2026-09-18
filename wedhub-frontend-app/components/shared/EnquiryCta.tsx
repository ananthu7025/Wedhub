"use client";

import { useState } from "react";
import { EnquiryModal } from "./EnquiryModal";
import { SignInModal } from "./SignInModal";

/**
 * Client wrapper so the (Server Component) vendor profile page can render an
 * interactive "Send Enquiry" button without itself becoming a Client
 * Component. Unauthenticated visitors get an in-page SignInModal instead of
 * being sent to /login — see frontenddocs/04-stage-couple-experience.md
 * Frontend Arch Phase 3 and EnquiryModal.tsx's header comment for why we
 * gate here instead of allowing the backend's anonymous-submission path.
 * On successful sign-in the enquiry form opens immediately, same page, no
 * second click required — mirrors VendorContactLinks.tsx's identical gate.
 */
export function EnquiryCta({
  vendorId,
  vendorName,
  isAuthenticated,
}: {
  vendorId: string;
  vendorName: string;
  isAuthenticated: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  if (!isAuthenticated) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowSignIn(true)}
          className="mt-3 block w-full rounded-md bg-brand-primary py-3 text-center text-sm font-bold text-white shadow-[0_4px_12px_rgba(224,11,65,0.18)] hover:bg-brand-primary-hover"
        >
          Send Enquiry
        </button>
        {showSignIn && (
          <SignInModal
            vendorName={vendorName}
            onClose={() => setShowSignIn(false)}
            onSuccess={() => {
              setShowSignIn(false);
              setOpen(true);
            }}
          />
        )}
        <EnquiryModal vendorId={vendorId} vendorName={vendorName} open={open} onClose={() => setOpen(false)} />
      </>
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
