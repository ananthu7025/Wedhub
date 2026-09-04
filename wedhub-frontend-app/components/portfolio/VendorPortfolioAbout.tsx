"use client";

import type { VendorAttributeValue } from "@/lib/api/vendors.types";

interface VendorPortfolioAboutProps {
  description?: string | null;
  yearsExperience?: number | null;
  teamSize?: number | null;
  travelPolicy?: string | null;
  languages?: string[];
  businessHours?: Record<string, string> | null;
  address?: string | null;
  cityName?: string | null;
  website?: string | null;
  socialLinks?: Record<string, string> | null;
  attributeValues: VendorAttributeValue[];
}

export function VendorPortfolioAbout({
  description,
  yearsExperience,
  teamSize,
  travelPolicy,
  languages = [],
  businessHours,
  address,
  cityName,
  website,
  socialLinks,
  attributeValues,
}: VendorPortfolioAboutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left 2 cols: Story & Specifications */}
      <div className="lg:col-span-2 flex flex-col gap-8">
        {description && (
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <h3 className="mb-4 text-lg font-bold text-neutral-900">About Us</h3>
            <p className="whitespace-pre-line text-sm sm:text-base leading-relaxed text-neutral-700">
              {description}
            </p>
          </div>
        )}

        {/* Dynamic Category Highlights / Specifications */}
        {attributeValues.length > 0 && (
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <h3 className="mb-4 text-lg font-bold text-neutral-900">Services &amp; Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {attributeValues.map((attr) => {
                const label = attr.attribute?.label ?? "Feature";
                let valueDisplay: React.ReactNode = "—";

                if (attr.valueBoolean !== null) {
                  valueDisplay = attr.valueBoolean ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                      ✓ Available
                    </span>
                  ) : (
                    <span className="text-neutral-400">Not Available</span>
                  );
                } else if (attr.valueNumber !== null) {
                  valueDisplay = <span className="font-bold text-neutral-800">{attr.valueNumber}</span>;
                } else if (attr.valueText !== null) {
                  valueDisplay = <span className="font-semibold text-neutral-800">{attr.valueText}</span>;
                } else if (attr.valueOptions && attr.valueOptions.length > 0) {
                  valueDisplay = (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {attr.valueOptions.map((opt: string) => (
                        <span
                          key={opt}
                          className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  );
                }

                return (
                  <div key={attr.attributeId} className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3.5">
                    <span className="block text-xs font-medium text-neutral-500">{label}</span>
                    <div className="mt-0.5 text-sm">{valueDisplay}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right col: Quick facts & Social */}
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
          <h3 className="mb-4 text-base font-bold text-neutral-900">Quick Facts</h3>
          <dl className="flex flex-col divide-y divide-neutral-100 text-xs sm:text-sm">
            {yearsExperience !== null && yearsExperience !== undefined && (
              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Experience</dt>
                <dd className="font-semibold text-neutral-800">{yearsExperience} Years</dd>
              </div>
            )}
            {teamSize !== null && teamSize !== undefined && (
              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Team Size</dt>
                <dd className="font-semibold text-neutral-800">{teamSize} Professionals</dd>
              </div>
            )}
            {cityName && (
              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Base City</dt>
                <dd className="font-semibold text-neutral-800">{cityName}</dd>
              </div>
            )}
            {languages.length > 0 && (
              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Languages</dt>
                <dd className="font-semibold text-neutral-800 text-right">{languages.join(", ")}</dd>
              </div>
            )}
            {travelPolicy && (
              <div className="py-2.5">
                <dt className="mb-1 text-neutral-500">Travel Policy</dt>
                <dd className="text-neutral-700 leading-relaxed">{travelPolicy}</dd>
              </div>
            )}
            {businessHours?.general && (
              <div className="flex justify-between py-2.5">
                <dt className="text-neutral-500">Hours</dt>
                <dd className="font-semibold text-neutral-800">{businessHours.general}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Location & Contact Details */}
        {(address || website || socialLinks?.instagram || socialLinks?.facebook) && (
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
            <h3 className="mb-3 text-base font-bold text-neutral-900">Studio &amp; Online</h3>
            {address && (
              <div className="mb-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-neutral-600">
                <span className="flex-shrink-0 text-base">📍</span>
                <p>{address}</p>
              </div>
            )}
            {website && (
              <div className="mb-3 flex items-center gap-2.5 text-xs sm:text-sm">
                <span className="flex-shrink-0 text-base">🌐</span>
                <a
                  href={website.startsWith("http") ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-semibold text-neutral-800 hover:underline"
                >
                  {website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            {socialLinks?.instagram && (
              <div className="mb-3 flex items-center gap-2.5 text-xs sm:text-sm">
                <span className="flex-shrink-0 text-base">📷</span>
                <a
                  href={`https://instagram.com/${socialLinks.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-neutral-800 hover:underline"
                >
                  Instagram
                </a>
              </div>
            )}
            {socialLinks?.facebook && (
              <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                <span className="flex-shrink-0 text-base">👥</span>
                <a
                  href={socialLinks.facebook.startsWith("http") ? socialLinks.facebook : `https://${socialLinks.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-neutral-800 hover:underline"
                >
                  Facebook
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
