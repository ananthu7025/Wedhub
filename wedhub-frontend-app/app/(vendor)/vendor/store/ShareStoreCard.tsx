"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function ShareStoreCard({
  storeSlug,
  storeName,
  isEnabled,
}: {
  storeSlug: string;
  storeName: string;
  isEnabled: boolean;
}) {
  const [storeUrl, setStoreUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/store/${storeSlug}`;
      setStoreUrl(url);

      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: "#1A1A1A",
          light: "#FFFFFF",
        },
      })
        .then((data) => setQrDataUrl(data))
        .catch(() => {});
    }
  }, [storeSlug]);

  function handleCopy() {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${storeSlug}-store-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const shareText = encodeURIComponent(
    `Check out our wedding store & catalog on WedHub: ${storeUrl}`,
  );
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${shareText}`;

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text-dark">Branded Storefront Link</h2>
            {isEnabled ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                Live
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-text-grey">
            Share this link or QR code with couples on WhatsApp, Instagram, or wedding invitations to accept direct orders.
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <code className="rounded bg-surface-input px-3 py-1.5 text-xs font-mono text-text-dark border border-border max-w-full overflow-x-auto">
              {storeUrl || `/store/${storeSlug}`}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-primary-hover transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>
            <a
              href={`/store/${storeSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-bold text-text-dark hover:bg-surface-input transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-text-grey" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Preview Store
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.476-.15-.676.15-.2.3-.777.978-.952 1.179-.176.2-.351.226-.652.075-.301-.15-1.27-.468-2.42-1.494-.894-.798-1.498-1.783-1.673-2.084-.176-.3-.019-.463.132-.613.136-.134.301-.351.451-.527.151-.176.201-.301.301-.502.1-.2.05-.376-.025-.526-.075-.15-.677-1.633-.927-2.235-.244-.585-.492-.506-.677-.515-.175-.009-.376-.01-.577-.01-.2 0-.526.075-.802.376-.276.3-1.053 1.029-1.053 2.508 0 1.48 1.078 2.909 1.229 3.11.15.2 2.122 3.24 5.141 4.544.718.31 1.278.496 1.716.634.721.229 1.378.196 1.898.119.58-.087 1.78-.727 2.03-1.429.251-.702.251-1.303.176-1.429-.076-.125-.276-.2-.577-.35z" />
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.176L2 22l4.982-1.396C8.423 21.49 10.155 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.67 0-3.23-.52-4.52-1.41l-.32-.22-2.96.83.83-2.89-.23-.33C3.84 14.88 3.3 13.48 3.3 12c0-4.8 3.9-8.7 8.7-8.7s8.7 3.9 8.7 8.7-3.9 8.7-8.7 8.7z" />
            </svg>
            Share on WhatsApp
          </a>

          {qrDataUrl && (
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="rounded-lg border border-border bg-white p-2 text-text-dark hover:bg-surface-input transition-colors flex items-center justify-center"
              title="Show Store QR Code"
            >
              <svg className="w-5 h-5 text-text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
                <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
                <rect x="3" y="14" width="7" height="7" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 14h2v2h-2zm3 0h3v3h-3zm-3 3h3v3h-3zm3 3h3v-2h-2v2z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {showQrModal && qrDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <h3 className="text-lg font-bold text-text-dark">{storeName}</h3>
            <p className="mt-1 text-xs text-text-grey">Scan to browse catalog and place orders directly</p>
            <div className="mt-4 flex justify-center">
              <img src={qrDataUrl} alt={`${storeName} QR Code`} className="h-64 w-64 rounded-lg border border-border p-2" />
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex-1 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover"
              >
                Download QR Code
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="rounded-lg border border-border bg-white px-4 py-2 text-xs font-bold text-text-dark hover:bg-surface-input"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
