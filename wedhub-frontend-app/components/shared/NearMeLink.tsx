"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { findNearestKeralaDistrict } from "@/lib/seo/kerala-districts-geo";

type NearMeStatus = "idle" | "locating" | "denied" | "unsupported" | "error";

/**
 * "Near Me" control — matches "best photographers near me"-style search
 * intent to a real Kerala district via the browser's own geolocation (with
 * explicit user consent, never fetched automatically on page load) instead
 * of a fabricated location. Redirects to the same real SEO landing page a
 * manual district pick would reach:
 *   - categorySeoSlug given -> /category/<categorySeoSlug>/<nearest-district>
 *   - no categorySeoSlug -> /city/<nearest-district>
 *
 * Fails open: geolocation denied, unsupported, or the resolved point is too
 * far from every known Kerala district (see MAX_REASONABLE_DISTANCE_KM in
 * kerala-districts-geo.ts) all just show a short inline message — the
 * existing manual category/city picker (SearchFilterBar) remains the
 * fallback, never a dead end.
 */
export function NearMeLink({ categorySeoSlug, className }: { categorySeoSlug?: string; className?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<NearMeStatus>("idle");

  function handleClick() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = findNearestKeralaDistrict(position.coords.latitude, position.coords.longitude);
        if (!nearest) {
          setStatus("error");
          return;
        }
        const path = categorySeoSlug ? `/category/${categorySeoSlug}/${nearest.slug}` : `/city/${nearest.slug}`;
        router.push(path);
      },
      (geoError) => {
        setStatus(geoError.code === geoError.PERMISSION_DENIED ? "denied" : "error");
      },
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  if (status === "locating") {
    return (
      <span className={className ?? "text-xs text-text-grey"}>
        Finding your nearest district…
      </span>
    );
  }

  if (status === "denied") {
    return (
      <span className={className ?? "text-xs text-text-grey"}>
        Location access denied — pick your district using the filters above instead.
      </span>
    );
  }

  if (status === "unsupported" || status === "error") {
    return (
      <span className={className ?? "text-xs text-text-grey"}>
        Couldn&apos;t detect your location — pick your district using the filters above instead.
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
      }
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 22s8-8.5 8-13a8 8 0 1 0-16 0c0 4.5 8 13 8 13z" />
        <circle cx="12" cy="9" r="3" />
      </svg>
      <span>Near Me</span>
    </button>
  );
}
