import { NotFoundError } from "../../common/errors";
import * as popularSearchCardsRepository from "./popular-search-cards.repository";
import type { CreatePopularSearchCardBody, UpdatePopularSearchCardBody } from "./popular-search-cards.schema";

// Backs the public homepage's "Popular Searches" section — real,
// admin-curated cards instead of the hardcoded POPULAR_SEARCH_CARDS array.
// Deliberately editorial (isFeatured is hand-set by an admin), not
// analytics-driven — Arch Phase 18 (Analytics & Marketplace Metrics)
// doesn't exist yet, so there is no real search-volume signal to derive
// "popular" from.
export function listFeatured() {
  return popularSearchCardsRepository.findFeatured();
}

export function listAllForAdmin() {
  return popularSearchCardsRepository.findAllForAdmin();
}

export function createCard(input: CreatePopularSearchCardBody) {
  return popularSearchCardsRepository.createCard({
    title: input.title,
    locationBlurb: input.locationBlurb,
    priceLabel: input.priceLabel,
    imageUrl: input.imageUrl,
    searchQuery: input.searchQuery,
    isFeatured: input.isFeatured,
    sortOrder: input.sortOrder,
  });
}

export async function updateCard(id: string, input: UpdatePopularSearchCardBody) {
  const existing = await popularSearchCardsRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Popular search card not found");
  }

  return popularSearchCardsRepository.updateCard(id, {
    title: input.title,
    locationBlurb: input.locationBlurb,
    priceLabel: input.priceLabel,
    imageUrl: input.imageUrl,
    searchQuery: input.searchQuery,
    isFeatured: input.isFeatured,
    sortOrder: input.sortOrder,
  });
}

export async function deleteCard(id: string): Promise<void> {
  const existing = await popularSearchCardsRepository.findById(id);
  if (!existing) {
    throw new NotFoundError("Popular search card not found");
  }
  await popularSearchCardsRepository.deleteCard(id);
}
