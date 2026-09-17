import { apiFetch } from "./client";
import type {
  CategorySelf,
  LocationSelf,
  MediaItem,
  VendorAlbumSelf,
  VendorAnalytics,
  VendorSelf,
  WeddingStorySelf,
} from "./vendor-self.types";

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

export function listMyMedia() {
  return apiFetch<MediaItem[]>("/media/me");
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
