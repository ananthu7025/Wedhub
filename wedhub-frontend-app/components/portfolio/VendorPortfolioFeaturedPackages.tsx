"use client";

import Image from "next/image";
import type { VendorPackage } from "@/lib/api/vendors.types";
import { getPublicMediaUrl } from "@/lib/media/url";
import { ArrowRightIcon } from "./icons";

const FEATURED_COUNT = 2;

interface VendorPortfolioFeaturedPackagesProps {
  packages: VendorPackage[];
  onScrollToPackages: () => void;
}

export function VendorPortfolioFeaturedPackages({ packages, onScrollToPackages }: VendorPortfolioFeaturedPackagesProps) {
  const activePackages = packages.filter((p) => p.isActive);
  if (activePackages.length === 0) return null;

  const featured = activePackages.slice(0, FEATURED_COUNT);
  const hasMore = activePackages.length > FEATURED_COUNT;

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-neutral-900">Featured Packages</h3>
        {hasMore && (
          <button
            type="button"
            onClick={onScrollToPackages}
            className="flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-primary-hover whitespace-nowrap"
          >
            View All Packages
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-col divide-y divide-neutral-100">
        {featured.map((pkg) => {
          const imageKey =
            pkg.image?.thumbnailObjectKey ?? pkg.image?.optimizedObjectKey ?? pkg.image?.originalObjectKey ?? null;

          return (
            <div key={pkg.id} className="flex items-center gap-3.5 py-4 first:pt-0 last:pb-0">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                {imageKey ? (
                  <Image src={getPublicMediaUrl(imageKey)} alt={pkg.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-neutral-400">
                    No photo
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-neutral-900">{pkg.name}</p>
                {pkg.description && (
                  <p className="truncate text-xs text-neutral-500">{pkg.description}</p>
                )}
                <p className="mt-0.5 text-xs text-neutral-600">
                  <span className="font-bold text-neutral-900">
                    ₹{Number(pkg.price).toLocaleString("en-IN")}
                  </span>{" "}
                  onwards
                </p>
              </div>

              <button
                type="button"
                onClick={onScrollToPackages}
                className="flex-shrink-0 rounded-lg bg-brand-primary-soft/60 px-3.5 py-2 text-xs font-bold text-brand-primary hover:bg-brand-primary-soft transition-colors"
              >
                View Details
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
