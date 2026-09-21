"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startConversation } from "@/lib/api/messaging-client";
import { formatApiError } from "@/lib/utils/error";
import { useToast } from "@/components/ui/Toast";
import { SignInModal } from "./SignInModal";

// Matches VendorContactLinks.tsx's inline-SVG-per-file icon convention for
// this directory.
function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

/**
 * Client wrapper so the (Server Component) vendor profile page can render an
 * interactive "Message vendor" button without itself becoming a Client
 * Component — same reasoning as EnquiryCta.tsx, whose gating pattern this
 * mirrors exactly (SignInModal for unauthenticated visitors, continue the
 * original action via onSuccess + router.refresh() so isAuthenticated flips
 * before the next render).
 *
 * Starting a conversation is idempotent server-side: messaging.service.ts's
 * startConversation -> messaging.repository.ts's upsertConversation keys on
 * the (coupleUserId, vendorId) unique constraint, so clicking this more than
 * once (even concurrently, before the first request resolves) can never
 * create a second thread — it just returns the same conversation. The
 * `pending` guard below only prevents redundant requests/double-navigation,
 * it is not load-bearing for correctness.
 *
 * POST /messaging/conversations is gated by requireVerifiedMiddleware
 * (messaging.routes.ts) — an authenticated-but-unverified couple gets a 403
 * whose message ("Please verify your email address before continuing") is
 * surfaced via formatApiError + toast, same convention as
 * VendorContactLinks.tsx's reveal() error handling, instead of failing
 * silently.
 */
export function MessageVendorButton({
  vendorId,
  vendorName,
  isAuthenticated,
}: {
  vendorId: string;
  vendorName: string;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [showSignIn, setShowSignIn] = useState(false);
  const [pending, setPending] = useState(false);

  async function messageVendor() {
    if (pending) return;
    setPending(true);
    const result = await startConversation({ vendorId });
    setPending(false);
    if (!result.success) {
      showToast(formatApiError(result.error), "error");
      return;
    }
    router.push(`/inbox?conversation=${result.data.id}`);
  }

  if (!isAuthenticated) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowSignIn(true)}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-white py-3 text-center text-sm font-bold text-text-dark hover:bg-surface-input"
        >
          <ChatIcon /> Message vendor
        </button>
        {showSignIn && (
          <SignInModal
            vendorName={vendorName}
            onClose={() => setShowSignIn(false)}
            onSuccess={() => {
              setShowSignIn(false);
              void messageVendor();
            }}
          />
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={messageVendor}
      className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-white py-3 text-center text-sm font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
    >
      {pending ? "Starting…" : (
        <>
          <ChatIcon /> Message vendor
        </>
      )}
    </button>
  );
}
