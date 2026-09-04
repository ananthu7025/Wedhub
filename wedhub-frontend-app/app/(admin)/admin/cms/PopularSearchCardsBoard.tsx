"use client";

import { useState } from "react";
import Image from "next/image";
import {
  createAdminPopularSearchCard,
  deleteAdminPopularSearchCard,
  updateAdminPopularSearchCard,
} from "@/lib/api/admin-client";
import type { AdminPopularSearchCard } from "@/lib/api/admin.types";
import { formatApiError } from "@/lib/utils/error";
import { PopularSearchImagePicker } from "./PopularSearchImagePicker";

interface FormValues {
  title: string;
  locationBlurb: string;
  priceLabel: string;
  imageUrl: string | null;
  searchQuery: string;
  isFeatured: boolean;
}

/**
 * Admin board for PopularSearchCard (Arch Phase 17, added 2026-09-04) —
 * same state-management/edit/delete/create shape as WeddingStoriesBoard.tsx,
 * simplified since this model has no real Album/Media entity to
 * cross-reference: it's fully standalone (title/location/price/image/
 * search link), so there's no "usable albums" gating or cold-start
 * album-creation flow here, just a form.
 */
export function PopularSearchCardsBoard({ initialCards }: { initialCards: AdminPopularSearchCard[] }) {
  const [cards, setCards] = useState(initialCards);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(values: FormValues) {
    setPendingId("new");
    setError(null);
    const result = await createAdminPopularSearchCard(values);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setCards((prev) => [...prev, result.data]);
    setAdding(false);
  }

  async function handleUpdate(card: AdminPopularSearchCard, values: FormValues) {
    setPendingId(card.id);
    setError(null);
    const result = await updateAdminPopularSearchCard(card.id, values);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setCards((prev) => prev.map((c) => (c.id === card.id ? result.data : c)));
    setEditingId(null);
  }

  async function handleToggleFeatured(card: AdminPopularSearchCard) {
    setPendingId(card.id);
    setError(null);
    const result = await updateAdminPopularSearchCard(card.id, { isFeatured: !card.isFeatured });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setCards((prev) => prev.map((c) => (c.id === card.id ? result.data : c)));
  }

  async function handleDelete(card: AdminPopularSearchCard) {
    setPendingId(card.id);
    setError(null);
    const result = await deleteAdminPopularSearchCard(card.id);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setCards((prev) => prev.filter((c) => c.id !== card.id));
  }

  return (
    <div>
      {error && <div className="mb-3 rounded-md bg-red-10 p-2.5 text-[13px] text-red-70">{error}</div>}

      {cards.length === 0 && !adding && <p className="mb-3 text-sm text-text-grey">No popular search cards yet.</p>}

      <div className="mb-3 flex flex-col gap-3">
        {cards.map((card) =>
          editingId === card.id ? (
            <CardForm
              key={card.id}
              initial={card}
              saving={pendingId === card.id}
              onCancel={() => setEditingId(null)}
              onSubmit={(values) => handleUpdate(card, values)}
            />
          ) : (
            <div key={card.id} className="flex items-center gap-3 rounded-md border border-border p-3">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-surface-input">
                {card.imageUrl && (
                  <Image src={card.imageUrl} alt={card.title} fill className="object-cover" sizes="56px" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-bold">
                  {card.title}
                  {card.isFeatured && (
                    <span className="rounded-full bg-emerald-10 px-2 py-0.5 text-[10px] font-bold text-emerald-70">
                      Featured on homepage
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-text-grey">
                  {card.locationBlurb} · {card.priceLabel} · /search?keyword={card.searchQuery}
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  type="button"
                  disabled={pendingId === card.id}
                  onClick={() => handleToggleFeatured(card)}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-60 ${
                    card.isFeatured
                      ? "border border-border bg-white text-text-dark hover:bg-surface-input"
                      : "bg-brand-primary text-white hover:bg-brand-primary-hover"
                  }`}
                >
                  {card.isFeatured ? "Unfeature" : "Feature"}
                </button>
                <button
                  type="button"
                  disabled={pendingId === card.id}
                  onClick={() => setEditingId(card.id)}
                  className="text-[11px] font-bold text-brand-primary hover:underline disabled:opacity-60"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={pendingId === card.id}
                  onClick={() => handleDelete(card)}
                  className="text-[11px] font-bold text-red hover:underline disabled:opacity-60"
                >
                  {pendingId === card.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      {adding ? (
        <CardForm saving={pendingId === "new"} onCancel={() => setAdding(false)} onSubmit={handleCreate} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs font-bold text-brand-primary hover:underline"
        >
          + Add popular search card
        </button>
      )}
    </div>
  );
}

function CardForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial?: AdminPopularSearchCard;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: FormValues) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [locationBlurb, setLocationBlurb] = useState(initial?.locationBlurb ?? "");
  const [priceLabel, setPriceLabel] = useState(initial?.priceLabel ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [searchQuery, setSearchQuery] = useState(initial?.searchQuery ?? "");
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    if (!title.trim() || !locationBlurb.trim() || !priceLabel.trim() || !searchQuery.trim()) {
      setValidationError("Title, location, price, and search query are required");
      return;
    }

    onSubmit({
      title: title.trim(),
      locationBlurb: locationBlurb.trim(),
      priceLabel: priceLabel.trim(),
      imageUrl,
      searchQuery: searchQuery.trim(),
      isFeatured,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-md border border-brand-primary bg-white p-3">
      {validationError && <p className="text-[11px] text-red-70">{validationError}</p>}

      <label className="block">
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Image</span>
        <PopularSearchImagePicker currentImageUrl={imageUrl} onUploaded={setImageUrl} />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="4 Star & Above Wedding Hotels"
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Location blurb</span>
          <input
            value={locationBlurb}
            onChange={(e) => setLocationBlurb(e.target.value)}
            maxLength={200}
            placeholder="Bengaluru, Delhi, Mumbai"
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Price label</span>
          <input
            value={priceLabel}
            onChange={(e) => setPriceLabel(e.target.value)}
            maxLength={100}
            placeholder="₹1,800 per plate onwards"
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Search query</span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            maxLength={200}
            placeholder="Hotel"
            className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
          />
          <span className="mt-0.5 block text-[10px] text-text-grey">Links to /search?keyword=&lt;this&gt;</span>
        </label>
      </div>

      <label className="flex items-center gap-1.5 text-[11px] text-text-grey">
        <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
        Featured on homepage
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : initial ? "Save" : "Add card"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-bold text-text-dark"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
