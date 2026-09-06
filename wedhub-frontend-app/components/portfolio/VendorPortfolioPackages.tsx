"use client";

import Image from "next/image";
import type { VendorPackage } from "@/lib/api/vendors.types";
import { formatWhatsAppUrl } from "@/lib/utils/whatsapp";
import { trackEvent } from "@/lib/analytics/track";
import { getPublicMediaUrl } from "@/lib/media/url";
import { CheckIcon, SparkleIcon, WhatsAppIcon } from "./icons";

interface VendorPortfolioPackagesProps {
  vendorId?: string;
  packages: VendorPackage[];
  customQuoteAvailable?: boolean;
  phone?: string | null;
  businessName: string;
  onEnquireClick?: () => void;
}

export function VendorPortfolioPackages({
  vendorId,
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

          const handlePackageWhatsAppClick = () => {
            if (vendorId) {
              trackEvent({
                eventType: "portfolio_whatsapp_click",
                vendorId,
                metadata: {
                  source: "package",
                  packageId: pkg.id,
                  packageName: pkg.name,
                  price: pkg.price,
                  businessName,
                },
              });
            }
          };

          const imageKey =
            pkg.image?.optimizedObjectKey ?? pkg.image?.thumbnailObjectKey ?? pkg.image?.originalObjectKey ?? null;

          return (
            <div
              key={pkg.id}
              className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs transition-all duration-200 hover:shadow-md hover:border-neutral-300"
            >
              <div>
                {imageKey && (
                  <div className="relative -mx-6 -mt-6 mb-5 h-40 overflow-hidden rounded-t-2xl bg-neutral-100">
                    <Image
                      src={getPublicMediaUrl(imageKey)}
                      alt={pkg.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                )}
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
                          <CheckIcon className="flex-shrink-0 h-4 w-4 mt-0.5 text-emerald-600" />
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
                    onClick={handlePackageWhatsAppClick}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-xs sm:text-sm font-bold text-white transition-all hover:bg-[#20ba5a]"
                  >
                    <WhatsAppIcon className="h-[15px] w-[15px]" />
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
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-4 text-center text-xs sm:text-sm text-neutral-600">
          <SparkleIcon className="hidden sm:inline h-4 w-4 flex-shrink-0 text-brand-primary" />
          <span>
            Custom bespoke packages available upon request. Have unique wedding requirements?{" "}
            <button
              onClick={onEnquireClick}
              className="font-bold text-neutral-900 underline hover:text-neutral-700"
            >
              Request a personalized quotation
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
