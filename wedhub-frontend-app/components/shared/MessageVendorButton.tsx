"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startConversation } from "@/lib/api/messaging-client";
import { formatApiError } from "@/lib/utils/error";
import { useToast } from "@/components/ui/Toast";
import { SignInModal } from "./SignInModal";

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
          className="mt-2.5 block w-full rounded-md border border-border bg-white py-3 text-center text-sm font-bold text-text-dark hover:bg-surface-input"
        >
          Message vendor
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
      className="mt-2.5 block w-full rounded-md border border-border bg-white py-3 text-center text-sm font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
    >
      {pending ? "Starting…" : "Message vendor"}
    </button>
  );
}
