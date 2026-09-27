"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startConversation } from "@/lib/api/messaging-client";
import { revealVendorContactClient } from "@/lib/api/catalog-client";
import { trackEvent } from "@/lib/analytics/track";
import { formatApiError } from "@/lib/utils/error";
import { useToast } from "@/components/ui/Toast";
import { SignInModal } from "./SignInModal";

interface VendorMobileStickyBarProps {
  vendorId: string;
  vendorSlug: string;
  businessName: string;
  isAuthenticated: boolean;
}

export function VendorMobileStickyBar({
  vendorId,
  vendorSlug,
  businessName,
  isAuthenticated,
}: VendorMobileStickyBarProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [messagePending, setMessagePending] = useState(false);
  const [callPending, setCallPending] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [signInAction, setSignInAction] = useState<"message" | "call" | null>(null);
  const [signedInLocally, setSignedInLocally] = useState(false);

  const isAuthed = isAuthenticated || signedInLocally;

  async function executeMessage() {
    if (messagePending) return;
    setMessagePending(true);
    const result = await startConversation({ vendorId });
    setMessagePending(false);

    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }

    router.push(`/inbox?conversation=${result.data.id}`);
  }

  async function executeCall() {
    if (callPending) return;

    if (revealedPhone) {
      trackEvent({
        eventType: "portfolio_call_click",
        vendorId,
        metadata: { source: "profile_mobile_sticky", businessName },
      });
      window.location.href = `tel:${revealedPhone}`;
      return;
    }

    setCallPending(true);
    const result = await revealVendorContactClient(vendorSlug);
    setCallPending(false);

    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }

    trackEvent({
      eventType: "contact_details_revealed",
      vendorId,
      metadata: { source: "profile_mobile_sticky", businessName },
    });

    if (result.data.phone) {
      setRevealedPhone(result.data.phone);
      trackEvent({
        eventType: "portfolio_call_click",
        vendorId,
        metadata: { source: "profile_mobile_sticky", businessName },
      });
      window.location.href = `tel:${result.data.phone}`;
    } else if (result.data.email) {
      showToast(`Phone not available. Vendor email: ${result.data.email}`, "info");
    } else {
      showToast("No phone number available for this vendor.", "info");
    }
  }

  function handleMessageClick() {
    if (!isAuthed) {
      setSignInAction("message");
      return;
    }
    void executeMessage();
  }

  function handleCallClick() {
    if (!isAuthed) {
      setSignInAction("call");
      return;
    }
    void executeCall();
  }

  return (
    <>
      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-border px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] min-[901px]:hidden pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
        aria-label="Vendor quick actions"
      >
        <div className="flex items-center gap-3 w-full max-w-lg mx-auto">
          {/* Pink pill "Message" button */}
          <button
            type="button"
            disabled={messagePending}
            onClick={handleMessageClick}
            className="flex-1 h-12 rounded-full bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-white font-bold text-[15px] shadow-[0_2px_8px_rgba(224,11,65,0.25)] disabled:opacity-70 cursor-pointer"
          >
            {messagePending ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Connecting…
              </span>
            ) : (
              <>
                {/* Speech bubble with 3 dots icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="flex-shrink-0">
                  <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.84 7.04-.15.82-.62 2.22-1.8 3.32-.22.2-.14.56.14.65.61.19 1.95.42 3.66-.46 1.3.47 2.7.75 4.16.75 5.52 0 10-4.03 10-9s-4.48-9-10-9zm-4 10a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm4 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm4 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
                </svg>
                <span>Message</span>
              </>
            )}
          </button>

          {/* Green circular "Call" button */}
          <button
            type="button"
            disabled={callPending}
            onClick={handleCallClick}
            aria-label={`Call ${businessName}`}
            className="h-12 w-12 flex-shrink-0 rounded-full border-2 border-[#00a66c] bg-white flex items-center justify-center text-[#00a66c] hover:bg-[#00a66c]/10 active:scale-[0.95] transition-all shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {callPending ? (
              <svg className="h-5 w-5 animate-spin text-[#00a66c]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : (
              /* Slanted telephone handset icon */
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1v3.5a1 1 0 01-1 1C10.61 21.01 2.99 13.39 2.99 3.99a1 1 0 011-1H7.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.21z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {signInAction && (
        <SignInModal
          vendorName={businessName}
          onClose={() => setSignInAction(null)}
          onSuccess={() => {
            const action = signInAction;
            setSignedInLocally(true);
            setSignInAction(null);
            router.refresh();
            if (action === "message") {
              void executeMessage();
            } else if (action === "call") {
              void executeCall();
            }
          }}
        />
      )}
    </>
  );
}
