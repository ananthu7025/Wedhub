import { apiFetch } from "./client";
import type {
  CategorySelf,
  LocationSelf,
  MediaItem,
  RuleBookSelf,
  VendorAlbumSelf,
  VendorAnalytics,
  VendorSelf,
  WeddingStorySelf,
} from "./vendor-self.types";
import type { EffectivePlan } from "./subscriptions.types";

/**
 * Server-only, authenticated reads for the vendor self-service surface
 * (Frontend Arch Phase 5). See lib/api/vendor-self.types.ts's header comment.
 */

export function getMyVendor() {
  return apiFetch<VendorSelf>("/vendors/me/detail");
}

export function getMyAnalytics() {
  return apiFetch<VendorAnalytics>("/vendors/me/analytics");
}

// Backs page-level upgrade prompts (e.g. /vendor/store, /vendor/invoices) —
// server-merged against the plan's real defaults, so this never needs the
// client-side "?? fallback" duplication GET /plans data requires.
export function getMyEffectivePlan() {
  return apiFetch<EffectivePlan>("/vendors/me/effective-plan");
}

export function listMyMedia() {
  return apiFetch<MediaItem[]>("/media/me");
}

// Item 6 — never exposed on the public profile; only reachable by the
// vendor themselves.
export function getMyRuleBook() {
  return apiFetch<RuleBookSelf | null>("/vendors/me/rule-book", { cache: "no-store" });
}

// Items 10/11
export function listMyAlbums() {
  return apiFetch<VendorAlbumSelf[]>("/vendors/me/albums");
}

export function listMySubmittedStories() {
  return apiFetch<WeddingStorySelf[]>("/vendors/me/wedding-stories");
}

export function listStoriesAwaitingMyConfirmation() {
  return apiFetch<WeddingStorySelf[]>("/vendors/me/wedding-stories/awaiting-my-confirmation");
}

export function listCategoriesSelf() {
  return apiFetch<CategorySelf[]>("/categories", { skipAuth: true, public: true, next: { revalidate: 3600 } });
}

export function getCategoryBySlugSelf(slug: string) {
  return apiFetch<CategorySelf>(`/categories/${slug}`, { skipAuth: true, public: true, next: { revalidate: 3600 } });
}

export function listLocationsSelf(type?: "COUNTRY" | "STATE" | "CITY" | "AREA", parentId?: string) {
  return apiFetch<LocationSelf[]>("/locations", {
    query: { type, parentId },
    skipAuth: true,
    public: true,
    next: { revalidate: 3600 },
  });
}
