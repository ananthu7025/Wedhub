"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteMyOffer, updateMyOffer } from "@/lib/api/vendor-offers-client";
import type { Offer } from "@/lib/api/vendor-offers.types";

function formatPrice(amount: number, currency: string): string {
  const symbol = currency === "INR" ? "₹" : currency;
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

function isExpired(offer: Offer): boolean {
  return Boolean(offer.endDate && new Date(offer.endDate) < new Date());
}

export function OffersManager({ initialOffers }: { initialOffers: Offer[] }) {
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this offer? It will disappear from the public Offer Wall immediately.")) return;

    setDeletingId(id);
    const res = await deleteMyOffer(id);
    setDeletingId(null);

    if (res.success) {
      setOffers((prev) => prev.filter((offer) => offer.id !== id));
    } else {
      alert(typeof res.error === "string" ? res.error : res.error?.message || "Failed to delete offer");
    }
  }

  async function handleToggleActive(offer: Offer) {
    setTogglingId(offer.id);
    const res = await updateMyOffer(offer.id, { isActive: !offer.isActive });
    setTogglingId(null);

    if (res.success) {
      setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, isActive: res.data.isActive } : o)));
    } else {
      alert(typeof res.error === "string" ? res.error : res.error?.message || "Failed to update offer");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/vendor/offers/new"
          className="rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover transition-colors flex items-center justify-center gap-1.5 no-underline"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Offer
        </Link>
      </div>

      <div className="rounded-lg border border-neutral-grey-40 bg-white overflow-hidden">
        {offers.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-sm font-bold text-text-dark">No offers yet</h3>
            <p className="mt-1 text-xs text-text-grey max-w-sm mx-auto">
              Create a discounted offer to appear on the public Offer Wall and attract more enquiries.
            </p>
            <Link
              href="/vendor/offers/new"
              className="mt-4 inline-block rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover no-underline"
            >
              + Create Your First Offer
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-grey-40 bg-surface-input/60 text-text-grey font-semibold">
                <tr>
                  <th className="px-4 py-3">Offer</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Badge</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-grey-40">
                {offers.map((offer) => {
                  const cover = offer.media[0];
                  const imgUrl = cover?.url ?? cover?.thumbnailUrl;
                  const expired = isExpired(offer);

                  return (
                    <tr key={offer.id} className="hover:bg-surface-input/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 flex-shrink-0 rounded-lg border border-neutral-grey-40 overflow-hidden bg-surface-input">
                            {imgUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={imgUrl} alt={offer.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-neutral-400 text-[10px]">
                                No photo
                              </div>
                            )}
                          </div>
                          <div className="font-bold text-text-dark line-clamp-1">{offer.title}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-dark">{offer.category.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-text-dark">{formatPrice(offer.offerPrice, offer.currency)}</span>{" "}
                        <span className="text-text-grey line-through">{formatPrice(offer.originalPrice, offer.currency)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-text-dark">{offer.badgeType.replaceAll("_", " ")}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {expired ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                            Expired
                          </span>
                        ) : offer.isActive ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-surface-input px-2 py-0.5 text-[11px] font-semibold text-text-grey border border-neutral-grey-40">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={togglingId === offer.id}
                            onClick={() => handleToggleActive(offer)}
                            className="rounded border border-neutral-grey-40 bg-white px-2.5 py-1 text-xs font-bold text-text-dark hover:bg-surface-input transition-colors disabled:opacity-50"
                          >
                            {offer.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <Link
                            href={`/vendor/offers/${offer.id}/edit`}
                            className="rounded border border-neutral-grey-40 bg-white px-2.5 py-1 text-xs font-bold text-text-dark hover:bg-surface-input transition-colors no-underline"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            disabled={deletingId === offer.id}
                            onClick={() => handleDelete(offer.id)}
                            className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {deletingId === offer.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
