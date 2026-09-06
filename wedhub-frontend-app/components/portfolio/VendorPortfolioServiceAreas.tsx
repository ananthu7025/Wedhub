"use client";

import type { VendorDetail } from "@/lib/api/vendors.types";
import { MapPinIcon } from "./icons";

interface VendorPortfolioServiceAreasProps {
  serviceAreas: VendorDetail["serviceAreas"];
  baseCityName?: string | null;
  onCheckAvailability: () => void;
}

export function VendorPortfolioServiceAreas({
  serviceAreas,
  baseCityName,
  onCheckAvailability,
}: VendorPortfolioServiceAreasProps) {
  const areaNames = (serviceAreas ?? []).map((sa) => sa.location?.name).filter(Boolean) as string[];

  if (areaNames.length === 0 && !baseCityName) return null;

  return (
    <section className="pt-14">
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Service Areas</h2>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-white p-6">
        <div className="flex items-start gap-3">
          <MapPinIcon className="flex-shrink-0 h-5 w-5 text-brand-primary mt-0.5" />
          <div>
            {baseCityName && (
              <p className="text-xs text-neutral-500 mb-1">Based in {baseCityName}</p>
            )}
            {areaNames.length > 0 ? (
              <p className="text-sm sm:text-base font-semibold text-neutral-800">
                {areaNames.join(", ")}
              </p>
            ) : (
              <p className="text-sm text-neutral-500">Service area details available on request</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onCheckAvailability}
          className="flex-shrink-0 rounded-xl border border-brand-primary/30 bg-brand-primary/5 px-5 py-2.5 text-xs sm:text-sm font-bold text-brand-primary hover:bg-brand-primary/10 transition-colors"
        >
          Check Availability
        </button>
      </div>
    </section>
  );
}
