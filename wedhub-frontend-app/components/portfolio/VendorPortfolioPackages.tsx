"use client";

import type { VendorPackage } from "@/lib/api/vendors.types";
import { formatWhatsAppUrl } from "@/lib/utils/whatsapp";

interface VendorPortfolioPackagesProps {
  packages: VendorPackage[];
  customQuoteAvailable?: boolean;
  phone?: string | null;
  businessName: string;
  onEnquireClick?: () => void;
}

export function VendorPortfolioPackages({
  packages,
  customQuoteAvailable,
  phone,
  businessName,
  onEnquireClick,
}: VendorPortfolioPackagesProps) {
  const activePackages = packages.filter((p) => p.isActive);

  if (activePackages.length === 0 && !customQuoteAvailable) {
    return null;
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {activePackages.map((pkg) => {
          const packageWhatsAppUrl = phone
            ? `https://wa.me/${phone.replace(/\D/g, "").length === 10 ? `91${phone.replace(/\D/g, "")}` : phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                `Hi ${businessName}, I am interested in your "${pkg.name}" package (₹${Number(pkg.price).toLocaleString("en-IN")}) for my wedding. Is this available on my date?`
              )}`
            : null;

          return (
            <div
              key={pkg.id}
              className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs transition-all duration-200 hover:shadow-md hover:border-neutral-300"
            >
              <div>
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900">{pkg.name}</h3>
                  <span className="text-lg font-extrabold text-neutral-900 whitespace-nowrap">
                    ₹{Number(pkg.price).toLocaleString("en-IN")}
                  </span>
                </div>

                {pkg.description && (
                  <p className="mb-5 text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    {pkg.description}
                  </p>
                )}

                {pkg.inclusions.length > 0 && (
                  <div className="mb-6 border-t border-neutral-100 pt-4">
                    <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      What&apos;s Included
                    </span>
                    <ul className="flex flex-col gap-2 text-xs sm:text-sm text-neutral-700">
                      {pkg.inclusions.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="flex-shrink-0 text-emerald-600 font-bold">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-col gap-2">
                {packageWhatsAppUrl ? (
                  <a
                    href={packageWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-xs sm:text-sm font-bold text-white transition-all hover:bg-[#20ba5a]"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.95.814 3.027.815h.005c3.18 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm9.969 5.766c0 5.519-4.481 10-10 10-1.748 0-3.387-.45-4.821-1.239l-5.179 1.359 1.385-5.059c-.86-1.488-1.385-3.228-1.385-5.061 0-5.519 4.481-10 10-10s10 4.481 10 10z" />
                    </svg>
                    <span>Inquire on WhatsApp</span>
                  </a>
                ) : (
                  <button
                    onClick={onEnquireClick}
                    className="w-full rounded-xl bg-neutral-900 py-2.5 text-xs sm:text-sm font-bold text-white transition-all hover:bg-neutral-800"
                  >
                    Inquire About Package
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {customQuoteAvailable && (
        <div className="mt-6 rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-4 text-center text-xs sm:text-sm text-neutral-600">
          ✨ Custom bespoke packages available upon request. Have unique wedding requirements?{" "}
          <button
            onClick={onEnquireClick}
            className="font-bold text-neutral-900 underline hover:text-neutral-700"
          >
            Request a personalized quotation
          </button>
        </div>
      )}
    </div>
  );
}
