"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { loginWithGoogle } from "@/lib/api/auth-client";
import type { AuthenticatedUser, UserRole } from "@/lib/auth/types";
import { formatApiError } from "@/lib/utils/error";

/**
 * "Sign in with Google" via Google Identity Services (GIS) — renders
 * Google's own button into a div and receives an ID token client-side
 * (no server-side redirect/callback route). The token is posted straight
 * to our own /api/auth/google Route Handler (see lib/api/auth-client.ts's
 * loginWithGoogle), which mirrors /api/auth/login's cookie handling exactly.
 *
 * `role` is which entry point rendered this button:
 *  - /signup passes "END_USER" or "VENDOR" (per its own ?type= context) —
 *    a brand-new Google identity there is registered with that role.
 *  - /login omits it entirely — that page has no signup-intent context, so
 *    a brand-new Google identity there is NOT registered; the backend
 *    returns NOT_FOUND and this component redirects to /signup instead.
 * A RETURNING user's Google identity always resolves to their real existing
 * role regardless of which of these rendered the button.
 *
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID is expected to be unset until the project
 * owner creates a real Google Cloud OAuth Client ID — mirrors
 * CheckoutButton.tsx's "not configured" fallback for Razorpay rather than
 * silently rendering nothing.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleSignInButton({
  role,
  onSuccess,
}: {
  role?: Extract<UserRole, "END_USER" | "VENDOR">;
  onSuccess: (user: AuthenticatedUser) => void;
}) {
  const router = useRouter();
  const containerId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!scriptReady || !GOOGLE_CLIENT_ID || !window.google || !containerRef.current) return;

    async function handleCredential(response: { credential: string }) {
      setError(null);
      setPending(true);
      const result = await loginWithGoogle(response.credential, role);
      setPending(false);

      if (!result.success) {
        if (!role && result.error?.code === "NOT_FOUND") {
          router.push("/signup");
          return;
        }
        setError(formatApiError(result.error));
        return;
      }

      onSuccess(result.data.user);
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        void handleCredential(response);
      },
    });
    // GIS's renderButton wants a fixed pixel width, not a percentage — it
    // can't fluidly track its container the way the rest of this form does,
    // so measure the real available width instead of guessing a constant
    // (a hardcoded 360 overflowed the login form's actual ~344px content
    // width and spilled past the email/password inputs and submit button).
    const width = Math.min(containerRef.current.offsetWidth, 400);
    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      width,
      text: "continue_with",
    });
    // role is read fresh by the callback closure on every render, so it's
    // intentionally excluded here — re-initializing on every keystroke
    // elsewhere on the page would just re-render the same button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="rounded-md bg-amber-10 p-3 text-[13px] text-amber-70">
        Google sign-in is not configured in this environment (NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset).
      </div>
    );
  }

  return (
    <div className="w-full">
      <Script src="https://accounts.google.com/gsi/client" onReady={() => setScriptReady(true)} />
      {error && (
        <div className="mb-3 rounded-md bg-red-10 px-4 py-3 text-[13px] font-semibold text-red-70">{error}</div>
      )}
      <div id={containerId} ref={containerRef} className="flex justify-center overflow-hidden" />
      {pending && <p className="mt-2 text-center text-[13px] text-text-grey">Signing in…</p>}
    </div>
  );
}
