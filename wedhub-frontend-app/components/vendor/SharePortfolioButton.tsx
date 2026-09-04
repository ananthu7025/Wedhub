"use client";

import { useState, useEffect } from "react";

interface SharePortfolioButtonProps {
  slug: string;
  businessName?: string;
  variant?: "header" | "card" | "full";
}

export function SharePortfolioButton({
  slug,
  businessName = "Our Wedding Business",
  variant = "header",
}: SharePortfolioButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const portfolioUrl = origin ? `${origin}/portfolio/${slug}` : `/portfolio/${slug}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(portfolioUrl)}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(portfolioUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = portfolioUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const shareText = `Hi! Explore our official wedding portfolio, recent work, and packages here: ${portfolioUrl}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <>
      {variant === "header" && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-800 shadow-2xs transition-all hover:border-neutral-400 hover:bg-neutral-50 active:scale-95"
          title="Share your digital portfolio link"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-neutral-600"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>Share Portfolio</span>
        </button>
      )}

      {variant === "card" && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:bg-neutral-800 active:scale-95"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>Get Shareable Portfolio Link</span>
        </button>
      )}

      {variant === "full" && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white shadow-xs transition-all hover:bg-neutral-800 active:scale-95"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>Share Your Portfolio</span>
        </button>
      )}

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
              aria-label="Close modal"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Modal Header */}
            <div className="mb-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60 mb-2.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Dedicated Vendor Link
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Your Digital Wedding Portfolio</h2>
              <p className="mt-1 text-xs sm:text-sm text-neutral-500 leading-relaxed">
                Share this clean, vendor-branded portfolio with prospective couples. It features your work, packages, and lets couples contact your WhatsApp in 1 click.
              </p>
            </div>

            {/* Link Copy Box */}
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                Portfolio URL
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-1.5 focus-within:border-neutral-400 focus-within:bg-white transition-all">
                <input
                  type="text"
                  readOnly
                  value={portfolioUrl}
                  className="w-full bg-transparent px-2.5 text-xs sm:text-sm font-mono text-neutral-800 outline-none select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white transition-all ${
                    copied
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-neutral-900 hover:bg-neutral-800"
                  }`}
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#20ba5a] transition-all"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                </svg>
                Share on WhatsApp
              </a>

              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Preview Live Portfolio
              </a>
            </div>

            {/* QR Code Section */}
            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt="Portfolio QR Code"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-neutral-900">QR Code for Consultations</h4>
                  <p className="mt-0.5 text-[11px] text-neutral-500 leading-relaxed">
                    Print on wedding brochures, business cards, or display at your studio counter.
                  </p>
                  <a
                    href={qrCodeUrl}
                    download={`${slug}-portfolio-qr.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 hover:text-neutral-900 underline"
                  >
                    Download QR Code
                  </a>
                </div>
              </div>
            </div>

            {/* Pro Tip */}
            <div className="mt-4 flex items-start gap-2 text-[11px] text-neutral-500">
              <span className="font-bold text-neutral-700">Tip:</span>
              <span>
                Put this link in your Instagram bio or send it as your digital brochure when new couples DM you.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
