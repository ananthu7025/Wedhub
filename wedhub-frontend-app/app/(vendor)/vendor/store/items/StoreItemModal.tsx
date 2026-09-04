"use client";

import { useState } from "react";
import {
  createMyStoreItem,
  updateMyStoreItem,
} from "@/lib/api/vendor-store-client";
import {
  createMediaUploadRequest,
  confirmMediaUpload,
} from "@/lib/api/vendor-self-client";
import type {
  StoreItemType,
  VendorStoreItem,
} from "@/lib/api/vendor-store.types";

export function StoreItemModal({
  item,
  onClose,
  onSaved,
}: {
  item?: VendorStoreItem | null;
  onClose: () => void;
  onSaved: (item: VendorStoreItem) => void;
}) {
  const isEditing = Boolean(item);

  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [itemType, setItemType] = useState<StoreItemType>(
    item?.itemType ?? "PHYSICAL_PRODUCT",
  );
  const [price, setPrice] = useState<number | string>(item?.price ?? "");
  const [compareAtPrice, setCompareAtPrice] = useState<number | string>(
    item?.compareAtPrice ?? "",
  );
  const [gstRate, setGstRate] = useState<number>(item?.gstRate ?? 18);
  const [minOrderQuantity, setMinOrderQuantity] = useState<number>(
    item?.minOrderQuantity ?? 1,
  );
  const [stockQuantity, setStockQuantity] = useState<number | string>(
    item?.stockQuantity ?? "",
  );
  const [isAvailable, setIsAvailable] = useState<boolean>(
    item?.isAvailable ?? true,
  );
  const [tagsString, setTagsString] = useState<string>(
    item?.tags?.join(", ") ?? "",
  );

  // Existing and newly uploaded media IDs
  const [mediaList, setMediaList] = useState<
    Array<{ id: string; url?: string | null }>
  >(
    item?.media?.map((m) => ({
      id: m.mediaId,
      url: m.url ?? m.thumbnailUrl,
    })) ?? [],
  );

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setErrorMsg(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // 1. Request presigned upload URL
        const reqRes = await createMediaUploadRequest({
          mediaType: "STORE_ITEM_PHOTO",
          filename: file.name,
          mimeType: file.type || "image/jpeg",
          fileSize: file.size,
        });

        if (!reqRes.success) {
          throw new Error(
            typeof reqRes.error === "string"
              ? reqRes.error
              : reqRes.error?.message || "Failed to initialize image upload",
          );
        }

        const { mediaId, uploadUrl } = reqRes.data;

        // 2. Direct PUT to R2 signed URL
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "image/jpeg",
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload image to storage");
        }

        // 3. Confirm upload
        await confirmMediaUpload(mediaId);

        // 4. Track mediaId with local preview
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
    if (!title.trim()) {
      setErrorMsg("Please enter a product title");
      return;
    }
    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setErrorMsg("Please enter a valid price");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const tags = tagsString
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      itemType,
      price: numericPrice,
      compareAtPrice: compareAtPrice === "" ? null : Number(compareAtPrice),
      gstRate,
      minOrderQuantity: Number(minOrderQuantity) || 1,
      stockQuantity: stockQuantity === "" ? null : Number(stockQuantity),
      isAvailable,
      tags,
      mediaIds: mediaList.map((m) => m.id),
    };

    const res = isEditing && item
      ? await updateMyStoreItem(item.id, payload)
      : await createMyStoreItem(payload);

    setSaving(false);

    if (!res.success) {
      setErrorMsg(
        typeof res.error === "string"
          ? res.error
          : res.error?.message || "Failed to save product",
      );
      return;
    }

    onSaved(res.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
          <h2 className="text-lg font-bold text-text-dark">
            {isEditing ? "Edit Product / Offering" : "Add Product to Store"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-grey hover:bg-surface-input hover:text-text-dark"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-grey mb-1">
              Product Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Traditional Fresh Jasmine Bridal Garland (Pair)"
              maxLength={200}
              className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">
                Item Offering Type
              </label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as StoreItemType)}
                className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none bg-white"
              >
                <option value="PHYSICAL_PRODUCT">Physical Product (Crafts, Garlands, Favors)</option>
                <option value="RENTAL_ITEM">Rental Item (Decor, Outfits, Props)</option>
                <option value="SERVICE_TOKEN">Service Token / Add-on</option>
                <option value="DIGITAL_DOWNLOAD">Digital Asset / Wedding E-Invite</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">
                GST Tax Rate (%)
              </label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none bg-white"
              >
                <option value={0}>0% GST (Exempt items)</option>
                <option value={5}>5% GST (Standard fresh florals / simple handicrafts)</option>
                <option value={12}>12% GST (Apparel / printing items)</option>
                <option value={18}>18% GST (Standard goods & event services)</option>
                <option value={28}>28% GST (Luxury items)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">
                Selling Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="2500"
                className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">
                Original / Compare-at Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                placeholder="3000 (shows strikethrough discount)"
                className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">
                Minimum Order Quantity
              </label>
              <input
                type="number"
                min="1"
                value={minOrderQuantity}
                onChange={(e) => setMinOrderQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">
                Stock / Capacity Quantity
              </label>
              <input
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Leave blank for unlimited"
                className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-grey mb-1">
              Description & Specifications
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Material details, size, freshness guarantee, delivery timeframe, etc."
              maxLength={5000}
              className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-grey mb-1">
              Search Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsString}
              onChange={(e) => setTagsString(e.target.value)}
              placeholder="e.g. jasmine, rose, bridal garland, traditional"
              className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </div>

          {/* Product Photos Upload */}
          <div>
            <label className="block text-xs font-semibold text-text-grey mb-2">
              Product Images
            </label>

            <div className="flex flex-wrap gap-3 mb-3">
              {mediaList.map((m) => (
                <div key={m.id} className="relative h-20 w-20 rounded-lg border border-border overflow-hidden group">
                  {m.url ? (
                    <img src={m.url} alt="Product preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-surface-input text-xs text-text-grey">
                      Image
                    </div>
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

              <label className={`h-20 w-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-xs text-text-grey cursor-pointer hover:border-brand-primary hover:text-brand-primary transition-colors ${uploadingImage ? "opacity-50 cursor-not-allowed" : ""}`}>
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
            </div>
            <p className="text-[11px] text-text-grey">Upload high-res JPG, PNG, or WebP images (max 10MB each).</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-emerald-600" />
              <span className="absolute left-[2px] h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-[16px]" />
            </label>
            <span className="text-xs font-semibold text-text-dark">
              Available for immediate order on storefront
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-text-dark hover:bg-surface-input"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="rounded-lg bg-brand-primary px-5 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover disabled:opacity-60"
            >
              {saving ? "Saving…" : isEditing ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
