"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMyOffer, updateMyOffer } from "@/lib/api/vendor-offers-client";
import { createMediaUploadRequest, confirmMediaUpload } from "@/lib/api/vendor-self-client";
import { compressImageIfPossible } from "@/lib/media/compress-image";
import { UPLOAD_CACHE_CONTROL } from "@/lib/media/upload";
import type { Offer, OfferBadgeType } from "@/lib/api/vendor-offers.types";
import type { Category } from "@/lib/api/vendors.types";

const BADGE_OPTIONS: { value: OfferBadgeType; label: string }[] = [
  { value: "SAVE_PERCENT", label: "Save X% (e.g. \"Save 20%\")" },
  { value: "FLAT_PERCENT_OFF", label: "Flat X% OFF" },
  { value: "NEW", label: "NEW" },
  { value: "LIMITED_TIME_DEAL", label: "Limited Time Deal" },
  { value: "FREE_ADD_ON", label: "Free Add-on" },
  { value: "TOP_RATED", label: "Top Rated" },
  { value: "CATALOG_OFFER", label: "Catalog Offer" },
];

function FormCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-grey-40 bg-white">
      <div className="border-b border-neutral-grey-40 px-5 py-4">
        <h2 className="text-sm font-bold text-text-dark">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-text-grey">{description}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function OfferForm({ offer, categories }: { offer?: Offer | null; categories: Category[] }) {
  const router = useRouter();
  const isEditing = Boolean(offer);

  const [categoryId, setCategoryId] = useState(offer?.category.id ?? "");
  const [title, setTitle] = useState(offer?.title ?? "");
  const [description, setDescription] = useState(offer?.description ?? "");
  const [originalPrice, setOriginalPrice] = useState<number | string>(offer?.originalPrice ?? "");
  const [offerPrice, setOfferPrice] = useState<number | string>(offer?.offerPrice ?? "");
  const [badgeType, setBadgeType] = useState<OfferBadgeType>(offer?.badgeType ?? "SAVE_PERCENT");
  const [startDate, setStartDate] = useState(toDateInputValue(offer?.startDate ?? null));
  const [endDate, setEndDate] = useState(toDateInputValue(offer?.endDate ?? null));
  const [isActive, setIsActive] = useState(offer?.isActive ?? true);

  const [mediaList, setMediaList] = useState<Array<{ id: string; url?: string | null }>>(
    offer?.media?.map((m) => ({ id: m.mediaId, url: m.url ?? m.thumbnailUrl })) ?? [],
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (mediaList.length + files.length > 6) {
      setErrorMsg("You can add up to 6 photos per offer");
      e.target.value = "";
      return;
    }

    setUploadingImage(true);
    setErrorMsg(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const originalFile = files[i];
        const file = await compressImageIfPossible(originalFile);
        const reqRes = await createMediaUploadRequest({
          mediaType: "OFFER_PHOTO",
          filename: file.name,
          mimeType: file.type || "image/jpeg",
          fileSize: file.size,
        });

        if (!reqRes.success) {
          throw new Error(
            typeof reqRes.error === "string" ? reqRes.error : reqRes.error?.message || "Failed to initialize image upload",
          );
        }

        const { mediaId, uploadUrl } = reqRes.data;

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg", "Cache-Control": UPLOAD_CACHE_CONTROL },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload image to storage");
        }

        await confirmMediaUpload(mediaId);

        const localPreviewUrl = URL.createObjectURL(file);
        setMediaList((prev) => [...prev, { id: mediaId, url: localPreviewUrl }]);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  function handleRemoveMedia(id: string) {
    setMediaList((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!categoryId) {
      setErrorMsg("Please choose a category");
      return;
    }
    if (!title.trim()) {
      setErrorMsg("Please enter a title");
      return;
    }
    if (originalPrice === "" || isNaN(Number(originalPrice)) || Number(originalPrice) < 0) {
      setErrorMsg("Please enter a valid original price");
      return;
    }
    if (offerPrice === "" || isNaN(Number(offerPrice)) || Number(offerPrice) < 0) {
      setErrorMsg("Please enter a valid offer price");
      return;
    }
    if (Number(offerPrice) > Number(originalPrice)) {
      setErrorMsg("Offer price can't be higher than the original price");
      return;
    }
    if (startDate && endDate && endDate <= startDate) {
      setErrorMsg("End date must be after the start date");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload = {
      categoryId,
      title: title.trim(),
      description: description.trim() || null,
      originalPrice: Number(originalPrice),
      offerPrice: Number(offerPrice),
      badgeType,
      startDate: startDate || null,
      endDate: endDate || null,
      isActive,
      mediaIds: mediaList.map((m) => m.id),
    };

    const res = isEditing && offer ? await updateMyOffer(offer.id, payload) : await createMyOffer(payload);

    setSaving(false);

    if (!res.success) {
      setErrorMsg(typeof res.error === "string" ? res.error : res.error?.message || "Failed to save offer");
      return;
    }

    router.push("/vendor/offers");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMsg && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{errorMsg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <FormCard title="Title & description">
            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bridal Makeup Package"
                maxLength={200}
                className="w-full rounded-lg border border-neutral-grey-40 px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                className="w-full rounded-lg border border-neutral-grey-40 px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-neutral-grey-40 px-3.5 py-2 text-sm bg-white focus:border-brand-primary focus:outline-none"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </FormCard>

          <FormCard title="Photos" description="Up to 6 photos shown on the Offer Wall card and offer detail.">
            <div className="flex flex-wrap gap-3">
              {mediaList.map((m) => (
                <div key={m.id} className="relative h-20 w-20 rounded-lg border border-neutral-grey-40 overflow-hidden group">
                  {m.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt="Offer preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-surface-input text-xs text-text-grey">Image</div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(m.id)}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {mediaList.length < 6 && (
                <label
                  className={`h-20 w-20 rounded-lg border-2 border-dashed border-neutral-grey-40 flex flex-col items-center justify-center text-xs text-text-grey cursor-pointer hover:border-brand-primary hover:text-brand-primary transition-colors ${uploadingImage ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={uploadingImage}
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                  <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  {uploadingImage ? "Uploading…" : "Add photo"}
                </label>
              )}
            </div>
          </FormCard>
        </div>

        <div className="space-y-5">
          <FormCard title="Status">
            <label className="flex items-center gap-2 text-xs font-semibold text-text-dark">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-brand-primary" />
              Active — visible on the public Offer Wall
            </label>
          </FormCard>

          <FormCard title="Pricing">
            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">
                Original price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="w-full rounded-lg border border-neutral-grey-40 px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">
                Offer price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                className="w-full rounded-lg border border-neutral-grey-40 px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
          </FormCard>

          <FormCard title="Badge" description="Shown on the corner of the offer card.">
            <select
              value={badgeType}
              onChange={(e) => setBadgeType(e.target.value as OfferBadgeType)}
              className="w-full rounded-lg border border-neutral-grey-40 px-3.5 py-2 text-sm bg-white focus:border-brand-primary focus:outline-none"
            >
              {BADGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormCard>

          <FormCard title="Validity" description="Optional. Leave blank for an offer with no end date.">
            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-grey-40 px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-neutral-grey-40 px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
          </FormCard>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-neutral-grey-40 pt-4">
        <button
          type="button"
          onClick={() => router.push("/vendor/offers")}
          className="rounded-lg border border-neutral-grey-40 px-4 py-2 text-xs font-bold text-text-dark hover:bg-surface-input"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || uploadingImage}
          className="rounded-lg bg-brand-primary px-5 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover disabled:opacity-60"
        >
          {saving ? "Saving…" : isEditing ? "Save changes" : "Create offer"}
        </button>
      </div>
    </form>
  );
}
