"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export function ShareButtons({ url, coupleNames }: { url: string; coupleNames: string }) {
  const [copied, setCopied] = useState(false);
  // navigator.share isn't available during SSR — reading it directly in
  // render (even via a lazy useState initializer) would still mismatch
  // between the server-rendered HTML and the client's first render, since
  // Next.js runs a Client Component's initial render server-side too.
  // Detecting it in an effect (client-only, post-mount) is the correct,
  // standard fix for a browser-only capability check — not a case the
  // "avoid setState in effect" lint rule is meant to catch, since there's
  // no external state to synchronize from and no cascading-render loop
  // risk (this runs once, deps never change).
  const [canNativeShare, setCanNativeShare] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setCanNativeShare(typeof navigator !== "undefined" && "share" in navigator), []);
  const whatsappText = encodeURIComponent(`💍 You're invited!\n\nJoin us as we celebrate our wedding ❤️\n\nView our wedding website:\n${url}`);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — the URL is still visible/selectable on the page
    }
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: coupleNames, url });
      } catch {
        // user cancelled the native share sheet — no error state needed
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      <a
        href={`https://wa.me/?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md bg-emerald-70 px-4 py-2.5 text-xs font-bold text-white hover:opacity-90"
      >
        Share on WhatsApp
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md bg-byzantine-blue-70 px-4 py-2.5 text-xs font-bold text-white hover:opacity-90"
      >
        Share on Facebook
      </a>
      <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy Link"}
      </Button>
      {canNativeShare && (
        <Button type="button" variant="ghost" size="sm" onClick={handleNativeShare}>
          More options
        </Button>
      )}
    </div>
  );
}
