"use client";

import { useState } from "react";
import Script from "next/script";

/**
 * Loads Razorpay's Checkout.js and invokes it against a real order from
 * POST /wedding-websites/me/:id/publish-order. Activation is 100%
 * webhook-driven (Business Rule 9) — onSuccess only triggers a poll of
 * the draft's real status, it never assumes the checkout callback itself
 * means the website is published. Same shape as
 * app/(vendor)/vendor/subscription/CheckoutButton.tsx.
 */

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

export function PublishCheckoutButton({
  orderId,
  amount,
  currency,
  coupleNames,
  onSuccess,
}: {
  orderId: string;
  amount: number;
  currency: string;
  coupleNames: string;
  onSuccess: () => void;
}) {
  const [scriptReady, setScriptReady] = useState(false);
  const [opening, setOpening] = useState(false);

  function openCheckout() {
    if (!window.Razorpay) return;
    setOpening(true);
    const razorpay = new window.Razorpay({
      key: RAZORPAY_KEY_ID,
      order_id: orderId,
      amount: Math.round(amount * 100),
      currency,
      name: "WedHub",
      description: `Publish ${coupleNames}'s Wedding Website`,
      handler: () => {
        setOpening(false);
        onSuccess();
      },
      modal: {
        ondismiss: () => setOpening(false),
      },
    });
    razorpay.open();
  }

  if (!RAZORPAY_KEY_ID) {
    return (
      <div className="rounded-md bg-amber-10 p-3 text-[13px] text-amber-70">
        Payments are not configured in this environment (NEXT_PUBLIC_RAZORPAY_KEY_ID is unset). The checkout order was
        created successfully on the backend, but there is no way to complete a real payment here.
      </div>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setScriptReady(true)} />
      <button
        onClick={openCheckout}
        disabled={!scriptReady || opening}
        className="w-full rounded-md bg-brand-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {opening ? "Processing…" : `Publish My Website – ₹${amount}`}
      </button>
    </>
  );
}
