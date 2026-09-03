"use client";

import { useState } from "react";
import Script from "next/script";

/**
 * Loads Razorpay's Checkout.js and invokes it against a real order created
 * by POST /subscriptions/me/upgrade. Per backend research (see
 * lib/api/subscriptions.types.ts's header comment), activation is 100%
 * webhook-driven — this component's onSuccess callback only triggers a
 * poll of GET /subscriptions/me, it never assumes the checkout callback
 * itself means the subscription is active.
 *
 * NEXT_PUBLIC_RAZORPAY_KEY_ID is unset in this dev environment (no real
 * Razorpay test-mode account was available — see
 * frontenddocs/10-risks-and-open-questions.md) — the button renders a
 * clear "not configured" state instead of silently failing when clicked.
 */

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

export function CheckoutButton({
  orderId,
  amount,
  currency,
  planName,
  onSuccess,
}: {
  orderId: string;
  amount: string;
  currency: string;
  planName: string;
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
      amount: Math.round(Number(amount) * 100),
      currency,
      name: "itsmyKalyanam",
      description: `Upgrade to ${planName}`,
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
        className="rounded-md bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {opening ? "Processing…" : "Pay with Razorpay"}
      </button>
    </>
  );
}
