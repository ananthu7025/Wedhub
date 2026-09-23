"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CatalogAvailabilityEntry, CatalogItem } from "@/lib/api/vendor-catalog.types";
import { fetchPublicCatalogItemAvailability } from "@/lib/api/vendor-catalog";
import { isPreOptimizedMediaUrl } from "@/lib/media/url";
import { trackEvent } from "@/lib/analytics/track";

interface VendorPortfolioCatalogProps {
  vendorId?: string;
  items: CatalogItem[];
  onEnquireClick?: () => void;
}

function priceLabel(item: CatalogItem): string {
  if (item.variants.length > 0) {
    const prices = item.variants.map((v) => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₹${min.toLocaleString("en-IN")}` : `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString("en-IN")}`;
  }
  if (item.basePrice != null) return `₹${item.basePrice.toLocaleString("en-IN")}`;
  return "Price on request";
}

function summarizeAvailability(entries: CatalogAvailabilityEntry[]): string {
  const todayStr = new Date().toISOString().slice(0, 10);
  const unavailableToday = entries.some((e) => e.date.slice(0, 10) === todayStr);
  if (!unavailableToday) return "Available now";

  const bookedDates = new Set(entries.map((e) => e.date.slice(0, 10)));
  let cursorMs = new Date(todayStr).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  while (bookedDates.has(new Date(cursorMs).toISOString().slice(0, 10))) {
    cursorMs += dayMs;
  }
  const nextAvailable = new Date(cursorMs).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `Available from ${nextAvailable}`;
}

// Read-only "next available" summary, not a full grid — keeps the public
// page light (item 4's full click-to-toggle calendar is vendor-only).
function AvailabilityBadge({ itemId }: { itemId: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 30);
    fetchPublicCatalogItemAvailability(itemId, today, horizon.toISOString().slice(0, 10))
      .then(({ data }) => {
        if (cancelled) return;
        setLabel(summarizeAvailability(data));
      })
      .catch(() => {
        if (!cancelled) setLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  if (!label) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        label === "Available now" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {label}
    </span>
  );
}

export function VendorPortfolioCatalog({ vendorId, items, onEnquireClick }: VendorPortfolioCatalogProps) {
  const activeItems = items.filter((i) => i.isActive);
  const impressionsFired = useRef(false);

  useEffect(() => {
    if (impressionsFired.current || !vendorId || activeItems.length === 0) return;
    impressionsFired.current = true;
    for (const item of activeItems) {
      trackEvent({ eventType: "view_catalog_item", vendorId, metadata: { catalog_item_id: item.id, itemName: item.title } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, activeItems.length]);

  if (activeItems.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {activeItems.map((item) => {
        // catalog.service.ts's formatItem already resolves media to full
        // URLs (getPublicUrl), unlike Package.image which is a raw object
        // key VendorPortfolioPackages.tsx resolves itself — no
        // getPublicMediaUrl() call needed here.
        const primaryMedia = item.media[0];
        const imageUrl = primaryMedia?.url ?? primaryMedia?.thumbnailUrl ?? null;

        return (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs transition-all duration-200 hover:shadow-md hover:border-neutral-300"
          >
            <div>
              {imageUrl && (
                <div className="relative -mx-6 -mt-6 mb-5 h-40 overflow-hidden rounded-t-2xl bg-neutral-100">
                  <Image
                    src={imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized={isPreOptimizedMediaUrl(imageUrl)}
                  />
                </div>
              )}
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900">{item.title}</h3>
                <span className="text-lg font-extrabold text-neutral-900 whitespace-nowrap">{priceLabel(item)}</span>
              </div>

              <div className="mb-3">
                <AvailabilityBadge itemId={item.id} />
              </div>

              {item.description && <p className="mb-5 text-xs sm:text-sm text-neutral-600 leading-relaxed">{item.description}</p>}

              {item.variants.length > 0 && (
                <div className="mb-2 border-t border-neutral-100 pt-4">
                  <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    {item.variants.length} option{item.variants.length === 1 ? "" : "s"} available
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-100">
              <button
                onClick={onEnquireClick}
                className="w-full rounded-xl bg-neutral-900 py-2.5 text-xs sm:text-sm font-bold text-white transition-all hover:bg-neutral-800"
              >
                Enquire About This Item
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
