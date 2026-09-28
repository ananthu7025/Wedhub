"use client";

import { useState } from "react";
import Link from "next/link";
import type { VendorDetail } from "@/lib/api/vendors.types";
import type { CatalogItem, CatalogItemVariant } from "@/lib/api/vendor-catalog.types";
import type { StoreTheme } from "@/components/vendor-store/store-theme";
import { formatCatalogPrice, getCatalogCalculatedPrice, getCatalogItemBasePrice, type RentalDuration } from "./catalog-pricing";

function SparklesIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function CheckIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function BagIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25c-.669 0-1.189-.578-1.119-1.243l1.263-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function ChevronLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

const RENTAL_DURATIONS: { value: RentalDuration; label: string; helper: string }[] = [
  { value: "1-day", label: "1 Day", helper: "Trial / Shoot" },
  { value: "3-days", label: "3 Days", helper: "Wedding Standard" },
  { value: "5-days", label: "5 Days", helper: "Extended Events" },
];

/**
 * Full product-detail content — the standalone page's own body, and also
 * what the storefront's earlier "Quick View" modal rendered inline before
 * every product got a real, linkable /catalog/{vendor}/{item} URL of its
 * own. Kept as a single component so both contexts render identically;
 * the caller decides the surrounding chrome (a page vs. a modal wrapper).
 */
export function CatalogProductDetail({
  vendor,
  item,
  theme,
  primaryCategory,
  onAddToCart,
}: {
  vendor: VendorDetail;
  item: CatalogItem;
  theme: StoreTheme;
  primaryCategory: string;
  onAddToCart: (item: CatalogItem, variant: CatalogItemVariant | undefined, duration: RentalDuration) => void;
}) {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<CatalogItemVariant | null>(item.variants[0] ?? null);
  const [selectedDuration, setSelectedDuration] = useState<RentalDuration>("3-days");

  const activeMedia = item.media[activePhotoIdx];
  const basePrice = getCatalogItemBasePrice(item, selectedVariant ?? undefined);
  const calculatedPrice = getCatalogCalculatedPrice(basePrice, selectedDuration);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href={`/catalog/${vendor.slug}`}
        className={`group inline-flex items-center gap-1.5 text-xs font-bold ${theme.accentTextClass} hover:underline no-underline mb-6 transition-all`}
      >
        <ChevronLeftIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
        <span>Back to storefront</span>
      </Link>

      <div className="bg-white rounded-3xl border border-[#EDE8E0] shadow-xs overflow-hidden flex flex-col md:flex-row">
        {/* Photo gallery */}
        <div className="md:w-1/2 bg-[#F8F6F2] flex flex-col justify-between p-4 sm:p-6">
          <div className="group relative aspect-square rounded-2xl overflow-hidden bg-white shadow-xs">
            {activeMedia ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeMedia.url ?? activeMedia.thumbnailUrl ?? ""}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#B0A798]">
                <SparklesIcon className="w-12 h-12" />
              </div>
            )}
          </div>

          {item.media.length > 1 && (
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              {item.media.map((m, idx) => (
                <button
                  key={m.id || idx}
                  type="button"
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`h-14 w-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all duration-200 active:scale-90 ${
                    activePhotoIdx === idx
                      ? "border-[#1F1C18] scale-105 shadow-sm ring-2 ring-black/10"
                      : "border-[#E5DEC7] opacity-60 hover:opacity-100 hover:scale-105"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url ?? m.thumbnailUrl ?? ""} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#8F6B38] uppercase tracking-widest">{primaryCategory}</span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1F1C18] mt-1">{item.title}</h1>
            {item.description && <p className="mt-2 text-sm text-[#524B43] leading-relaxed">{item.description}</p>}

            <div className="mt-4 p-3.5 bg-[#FAF8F5] rounded-xl border border-[#EDE8E0]">
              <div className="text-[10px] uppercase font-bold text-[#8A8175] tracking-wider">Rental Rate:</div>
              <div className="text-2xl font-bold text-[#1F1C18] font-mono mt-0.5">
                {formatCatalogPrice(calculatedPrice)}
                <span className="text-xs text-[#7A7165] font-sans font-normal ml-1">
                  ({selectedDuration.replace("-", " ")})
                </span>
              </div>
            </div>

            {item.variants.length > 1 && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-[#2A2621] mb-1.5">Options:</label>
                <div className="flex flex-wrap gap-2">
                  {item.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 ${
                        selectedVariant?.id === variant.id
                          ? "bg-[#1C1A17] text-white border-[#1C1A17] shadow-xs"
                          : "bg-white text-[#2A2621] border-[#E0D7C8] hover:bg-[#FAF8F5]"
                      }`}
                    >
                      {Object.values(variant.attributes || {}).join(" / ") || "Option"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-bold text-[#2A2621] mb-1.5">Rental Duration:</label>
              <div className="grid grid-cols-3 gap-2">
                {RENTAL_DURATIONS.map((duration) => (
                  <button
                    key={duration.value}
                    type="button"
                    onClick={() => setSelectedDuration(duration.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 text-center ${
                      selectedDuration === duration.value
                        ? "bg-[#1C1A17] text-white border-[#1C1A17] shadow-xs"
                        : "bg-white text-[#2A2621] border-[#E0D7C8] hover:bg-[#FAF8F5]"
                    }`}
                  >
                    <div>{duration.label}</div>
                    <div className="text-[10px] opacity-75 font-normal">{duration.helper}</div>
                  </button>
                ))}
              </div>
            </div>

            {item.components.length > 0 && (
              <div className="mt-4 bg-[#FAF8F5] rounded-xl p-4 border border-[#EDE8E0]">
                <h2 className="text-xs font-bold text-[#1F1C18] mb-2">
                  Included in Suite ({item.components.length}):
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#524B43]">
                  {item.components.map((comp) => (
                    <li key={comp.id} className="flex items-center gap-1.5">
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {comp.name} {comp.defaultQty > 1 ? `(${comp.defaultQty})` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#EDE8E0]">
            <button
              type="button"
              onClick={() => onAddToCart(item, selectedVariant ?? undefined, selectedDuration)}
              className="group relative overflow-hidden w-full py-3.5 px-4 rounded-xl bg-[#1C1A17] text-white text-xs font-bold hover:bg-black active:scale-[0.98] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
              <BagIcon className="w-4 h-4 transition-transform duration-200 group-hover:scale-115" />
              <span>Add to Rental Bag</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
