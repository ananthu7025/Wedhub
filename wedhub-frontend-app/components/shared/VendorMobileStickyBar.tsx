"use client";

import { EnquiryCta } from "./EnquiryCta";
import { MessageVendorButton } from "./MessageVendorButton";

interface VendorMobileStickyBarProps {
  vendorId: string;
  businessName: string;
  isAuthenticated: boolean;
}

export function VendorMobileStickyBar({
  vendorId,
  businessName,
  isAuthenticated,
}: VendorMobileStickyBarProps) {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-border px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] min-[901px]:hidden pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
      aria-label="Vendor quick actions"
    >
      <div className="flex items-center gap-3 w-full max-w-lg mx-auto">
        {/* Primary "Send Enquiry" pill button */}
        <div className="flex-1 min-w-0">
          <EnquiryCta
            vendorId={vendorId}
            vendorName={businessName}
            isAuthenticated={isAuthenticated}
            className="h-12 w-full rounded-full bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-white font-bold text-[15px] shadow-[0_2px_8px_rgba(224,11,65,0.25)] cursor-pointer"
          />
        </div>

        {/* "Message vendor" circular icon button */}
        <MessageVendorButton
          vendorId={vendorId}
          vendorName={businessName}
          isAuthenticated={isAuthenticated}
          ariaLabel={`Message ${businessName}`}
          className="h-12 w-12 flex-shrink-0 rounded-full border-2 border-brand-primary bg-white flex items-center justify-center text-brand-primary hover:bg-brand-primary-soft/30 active:scale-[0.95] transition-all shadow-sm cursor-pointer disabled:opacity-60"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </MessageVendorButton>
      </div>
    </div>
  );
}
