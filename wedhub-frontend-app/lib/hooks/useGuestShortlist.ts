"use client";

import { useCallback, useEffect, useState } from "react";
import type { ShortlistVendorSummary } from "@/lib/api/shortlists.types";

/**
 * localStorage-only shortlist for signed-out visitors (High-priority fix:
 * "Save to shortlist" previously hard-redirected a guest to /login before
 * they could save anything). Mirrors useWizardDraft's browser-storage
 * convention: every localStorage call wrapped in try/catch (private window,
 * cleared/blocked site data, quota — the heart button must still work
 * in-memory for the session even if nothing persists), and the lazy
 * useState initializer never reads `window` during SSR/initial render.
 *
 * Stores a full ShortlistVendorSummary snapshot per vendor (not just the id)
 * captured at save-time, so the guest's own /shortlist view can render
 * VendorCards with zero extra fetches — there's no bulk get-vendors-by-ids
 * endpoint in this codebase (only /comparison/vendors takes a vendorIds
 * list, and that returns comparison-shaped data, not card-renderable
 * summaries). Trade-off: a saved card's price/photo can go stale until the
 * visitor re-saves or logs in and the real backend shortlist takes over —
 * acceptable for a pre-account convenience feature.
 */
const STORAGE_KEY = "wedhub_guest_shortlist_v1";

export interface GuestShortlistItem {
  vendorId: string;
  vendor: ShortlistVendorSummary;
  savedAt: string;
}

function readStorage(): GuestShortlistItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GuestShortlistItem[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(items: GuestShortlistItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable — the save simply won't persist across a reload,
    // same tradeoff useWizardDraft accepts. Not surfaced as a user error.
  }
}

export function useGuestShortlist() {
  const [items, setItems] = useState<GuestShortlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(readStorage());
    setLoaded(true);
  }, []);

  const isSaved = useCallback((vendorId: string) => items.some((item) => item.vendorId === vendorId), [items]);

  const save = useCallback((vendorId: string, vendor: ShortlistVendorSummary) => {
    setItems((prev) => {
      if (prev.some((item) => item.vendorId === vendorId)) return prev;
      const next = [...prev, { vendorId, vendor, savedAt: new Date().toISOString() }];
      writeStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((vendorId: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.vendorId !== vendorId);
      writeStorage(next);
      return next;
    });
  }, []);

  // Called after a successful merge into the real account on login/signup —
  // the guest-side copy is now redundant (the account's real /shortlist has
  // it) and stale local data must not resurface for this browser later.
  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // See writeStorage's comment.
    }
    setItems([]);
  }, []);

  return { items, loaded, isSaved, save, remove, clear };
}

/** Non-hook read for one-off contexts (the login/signup merge step) that need the current guest shortlist without subscribing to it via a hook. */
export function readGuestShortlist(): GuestShortlistItem[] {
  return readStorage();
}

/** Non-hook clear, paired with readGuestShortlist for the same one-off merge context. */
export function clearGuestShortlist() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See writeStorage's comment.
  }
}
