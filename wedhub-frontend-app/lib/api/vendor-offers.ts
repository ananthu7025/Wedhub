import "server-only";
import { apiFetch } from "./client";
import type { Offer } from "./vendor-offers.types";

export function fetchVendorOffers() {
  return apiFetch<Offer[]>("/offers/me", { cache: "no-store" });
}

export function fetchVendorOffer(offerId: string) {
  return apiFetch<Offer>(`/offers/me/${offerId}`, { cache: "no-store" });
}
