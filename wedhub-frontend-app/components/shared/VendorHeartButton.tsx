"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { addFavorite, removeFavorite } from "@/lib/api/shortlists-client";

/**
 * Shortlist heart-toggle — POST/DELETE /shortlists/favorites/items/:vendorId
 * (see frontenddocs/04-stage-couple-experience.md Frontend Arch Phase 3).
 * Not idempotent server-side (409 on duplicate add), so we track "favorited"
 * state client-side from whatever the caller knows (initialFavorited) and
 * only flip it after a successful response.
 */
export function VendorHeartButton({
  vendorId,
  initialFavorited = false,
  isAuthenticated,
  className,
}: {
  vendorId: string;
  initialFavorited?: boolean;
  isAuthenticated: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);

  async function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (pending) return;
    setPending(true);
    const next = !favorited;
    setFavorited(next);

    try {
      const result = next ? await addFavorite(vendorId) : await removeFavorite(vendorId);
      if (!result.success) {
        setFavorited(!next);
      }
    } catch {
      setFavorited(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from shortlist" : "Save to shortlist"}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brand-primary shadow-sm transition-transform active:scale-90 disabled:opacity-60",
        className,
      )}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.6 4.2 5a5 5 0 017.8 1.3A5 5 0 0119.8 5c2.8 1.6 3.4 5.1 1.5 7.9C18.7 16.65 12 21 12 21z" />
      </svg>
    </button>
  );
}
