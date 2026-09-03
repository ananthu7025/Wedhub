import { apiFetch } from "./client";
import type {
  WeddingWebsiteDraft,
  WeddingWebsitePublicView,
  WeddingWebsitePublishedSlug,
  WeddingWebsiteTemplateOption,
} from "./wedding-website.types";

/**
 * Server-only reads for the ₹49 Instant Wedding Website surface
 * (backend Arch Phase 26). Public routes (templates, preview, published,
 * sitemap slugs) use skipAuth: true; owner reads need the session.
 */

export function listWeddingWebsiteTemplates() {
  return apiFetch<WeddingWebsiteTemplateOption[]>("/wedding-websites/templates", { skipAuth: true });
}

export function getWeddingWebsitePreview(token: string) {
  return apiFetch<WeddingWebsitePublicView>(`/wedding-websites/preview/${token}`, { skipAuth: true });
}

export function getPublishedWeddingWebsite(slug: string) {
  return apiFetch<WeddingWebsitePublicView>(`/wedding-websites/published/${slug}`, { skipAuth: true });
}

export function listPublishedWeddingWebsiteSlugs() {
  return apiFetch<WeddingWebsitePublishedSlug[]>("/wedding-websites/published", { skipAuth: true });
}

export function listMyWeddingWebsites() {
  return apiFetch<WeddingWebsiteDraft[]>("/wedding-websites/me");
}

export function getMyWeddingWebsite(id: string) {
  return apiFetch<WeddingWebsiteDraft>(`/wedding-websites/me/${id}`);
}
