"use client";

import Image from "next/image";
import { formatWhatsAppUrl, formatTelUrl } from "@/lib/utils/whatsapp";

interface VendorPortfolioHeaderProps {
  businessName: string;
  logoUrl?: string | null;
  phone?: string | null;
  categoryName?: string;
  cityName?: string;
  onEnquireClick?: () => void;
}

export function VendorPortfolioHeader({
  businessName,
  logoUrl,
  phone,
  categoryName,
  cityName,
  onEnquireClick,
}: VendorPortfolioHeaderProps) {
  const whatsappUrl = formatWhatsAppUrl(phone, businessName);
  const telUrl = formatTelUrl(phone);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-white/95 backdrop-blur-md shadow-xs transition-all">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-8">
        {/* Brand identity on the left */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-gradient-to-br from-neutral-50 to-neutral-100 shadow-xs">
            {logoUrl ? (
              <Image src={logoUrl} alt={businessName} fill className="object-cover" />
            ) : (
              <span className="text-lg font-extrabold tracking-tight text-neutral-800">
                {businessName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base sm:text-lg font-bold tracking-tight text-neutral-900 leading-tight">
              {businessName}
            </h1>
            <p className="truncate text-xs font-medium text-neutral-500">
              {categoryName ? `${categoryName}` : "Wedding Professional"}
              {cityName ? ` · ${cityName}` : ""}
            </p>
          </div>
        </div>

        {/* Action buttons on the right */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all duration-200 hover:bg-[#20ba5a] hover:scale-[1.02] active:scale-[0.98]"
              aria-label="Chat on WhatsApp"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.95.814 3.027.815h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.519-4.481 10-10 10-1.748 0-3.387-.45-4.821-1.239l-5.179 1.359 1.385-5.059c-.86-1.488-1.385-3.228-1.385-5.061 0-5.519 4.481-10 10-10s10 4.481 10 10z" />
              </svg>
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          )}

          {telUrl && (
            <a
              href={telUrl}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-neutral-800 shadow-xs transition-all duration-200 hover:bg-neutral-50 hover:scale-[1.02] active:scale-[0.98]"
              aria-label="Call vendor"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>Call</span>
            </a>
          )}

          {onEnquireClick && (
            <button
              onClick={onEnquireClick}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all duration-200 hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Book / Enquire</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
