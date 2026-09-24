"use client";

import { useState } from "react";
import { createMyCatalogItem, updateMyCatalogItem } from "@/lib/api/vendor-catalog-client";
import { createMediaUploadRequest, confirmMediaUpload } from "@/lib/api/vendor-self-client";
import { compressImageIfPossible } from "@/lib/media/compress-image";
import { UPLOAD_CACHE_CONTROL } from "@/lib/media/upload";
import type {
  CatalogCollection,
  CatalogItem,
  CatalogItemComponentInput,
  CatalogItemVariantInput,
  CatalogVariantField,
} from "@/lib/api/vendor-catalog.types";

export function CatalogItemModal({
  item,
  variantFields,
  collections,
  onClose,
  onSaved,
}: {
  item?: CatalogItem | null;
  variantFields: CatalogVariantField[];
  collections: CatalogCollection[];
  onClose: () => void;
  onSaved: (item: CatalogItem) => void;
}) {
  const isEditing = Boolean(item);

  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [basePrice, setBasePrice] = useState<number | string>(item?.basePrice ?? "");
  const [isCustomizable, setIsCustomizable] = useState(item?.isCustomizable ?? false);
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(item?.collectionIds ?? []);

  function toggleCollection(id: string) {
    setSelectedCollectionIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  const [mediaList, setMediaList] = useState<Array<{ id: string; url?: string | null }>>(
    item?.media?.map((m) => ({ id: m.mediaId, url: m.url ?? m.thumbnailUrl })) ?? [],
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  const [variants, setVariants] = useState<VariantDraft[]>(
    item?.variants.length
      ? item.variants.map((v) => ({
          attributes: { ...v.attributes },
          price: String(v.price),
          sku: v.sku ?? "",
          stockQuantity: v.stockQuantity != null ? String(v.stockQuantity) : "",
          isAvailable: v.isAvailable,
        }))
      : [],
  );

  const [components, setComponents] = useState<ComponentDraft[]>(
    item?.components.map((c) => ({
      name: c.name,
      defaultQty: String(c.defaultQty),
      minQty: String(c.minQty),
      maxQty: c.maxQty != null ? String(c.maxQty) : "",
      unitPrice: c.unitPrice != null ? String(c.unitPrice) : "",
      isRequired: c.isRequired,
    })) ?? [],
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setErrorMsg(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const originalFile = files[i];
        const file = await compressImageIfPossible(originalFile);
        const reqRes = await createMediaUploadRequest({
          mediaType: "CATALOG_ITEM_PHOTO",
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

  function addVariant() {
    const attributes: Record<string, unknown> = {};
    for (const field of variantFields) {
      attributes[field.key] = field.dataType === "BOOLEAN" ? false : "";
    }
    setVariants((prev) => [...prev, { attributes, price: "", sku: "", stockQuantity: "", isAvailable: true }]);
  }

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function updateVariantAttribute(index: number, key: string, value: unknown) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, attributes: { ...v.attributes, [key]: value } } : v)));
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function addComponent() {
    setComponents((prev) => [...prev, { name: "", defaultQty: "1", minQty: "0", maxQty: "", unitPrice: "", isRequired: false }]);
  }

  function updateComponent(index: number, patch: Partial<ComponentDraft>) {
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeComponent(index: number) {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Please enter a title");
      return;
    }

    for (const variant of variants) {
      if (variant.price === "" || isNaN(Number(variant.price)) || Number(variant.price) < 0) {
        setErrorMsg("Please enter a valid price for every variant");
        return;
      }
    }

    setSaving(true);
    setErrorMsg(null);

    const variantInputs: CatalogItemVariantInput[] = variants.map((v) => ({
      attributes: v.attributes,
      price: Number(v.price),
      sku: v.sku.trim() || null,
      stockQuantity: v.stockQuantity === "" ? null : Number(v.stockQuantity),
      isAvailable: v.isAvailable,
    }));

    const componentInputs: CatalogItemComponentInput[] = components
      .filter((c) => c.name.trim())
      .map((c) => ({
        name: c.name.trim(),
        defaultQty: Number(c.defaultQty) || 1,
        minQty: Number(c.minQty) || 0,
        maxQty: c.maxQty === "" ? null : Number(c.maxQty),
        unitPrice: c.unitPrice === "" ? null : Number(c.unitPrice),
        isRequired: c.isRequired,
      }));

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      basePrice: basePrice === "" ? null : Number(basePrice),
      isCustomizable,
      isActive,
      mediaIds: mediaList.map((m) => m.id),
      variants: variantInputs,
      components: componentInputs,
      collectionIds: selectedCollectionIds,
    };

    const res = isEditing && item ? await updateMyCatalogItem(item.id, payload) : await createMyCatalogItem(payload);

    setSaving(false);

    if (!res.success) {
      setErrorMsg(typeof res.error === "string" ? res.error : res.error?.message || "Failed to save catalog item");
      return;
    }

    onSaved(res.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
          <h2 className="text-lg font-bold text-text-dark">{isEditing ? "Edit Catalog Item" : "Add Catalog Item"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-text-grey hover:bg-surface-input hover:text-text-dark">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {errorMsg && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-grey mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Red Mercedes S-Class"
              maxLength={200}
              className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-grey mb-1">Base price (₹, optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="Leave blank if only variants have a price"
                className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-text-dark">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-brand-primary" />
                Active
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-text-dark">
                <input
                  type="checkbox"
                  checked={isCustomizable}
                  onChange={(e) => setIsCustomizable(e.target.checked)}
                  className="accent-brand-primary"
                />
                Customizable package
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-grey mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              className="w-full rounded-lg border border-border px-3.5 py-2 text-sm focus:border-brand-primary focus:outline-none"
            />
          </div>

          {collections.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-text-grey mb-2">
                Collections <span className="font-normal text-text-grey/70">(shown on your public catalog page)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {collections.map((collection) => (
                  <label
                    key={collection.id}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition ${
                      selectedCollectionIds.includes(collection.id)
                        ? "border-brand-primary bg-brand-primary-soft text-brand-primary"
                        : "border-border text-text-dark hover:bg-surface-input"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCollectionIds.includes(collection.id)}
                      onChange={() => toggleCollection(collection.id)}
                      className="sr-only"
                    />
                    {collection.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Photos */}
          <div>
            <label className="block text-xs font-semibold text-text-grey mb-2">Photos</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {mediaList.map((m) => (
                <div key={m.id} className="relative h-20 w-20 rounded-lg border border-border overflow-hidden group">
                  {m.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt="Catalog item preview" className="h-full w-full object-cover" />
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
              <label
                className={`h-20 w-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-xs text-text-grey cursor-pointer hover:border-brand-primary hover:text-brand-primary transition-colors ${uploadingImage ? "opacity-50 cursor-not-allowed" : ""}`}
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
            </div>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-text-grey">Variants</label>
              <button type="button" onClick={addVariant} className="text-xs font-bold text-brand-primary hover:underline">
                + Add variant
              </button>
            </div>
            {variantFields.length === 0 && (
              <p className="text-[11px] text-text-grey mb-2">
                No variant fields configured for your category yet. You can still save item-level pricing above.
              </p>
            )}
            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div key={index} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {variantFields.map((field) => (
                      <VariantFieldInput
                        key={field.id}
                        field={field}
                        value={variant.attributes[field.key]}
                        onChange={(value) => updateVariantAttribute(index, field.key, value)}
                      />
                    ))}
                    <label className="block">
                      <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Price (₹)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, { price: e.target.value })}
                        className="w-28 rounded-md border border-border px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">SKU (optional)</span>
                      <input
                        type="text"
                        value={variant.sku}
                        onChange={(e) => updateVariant(index, { sku: e.target.value })}
                        className="w-28 rounded-md border border-border px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Stock (blank = unlimited)</span>
                      <input
                        type="number"
                        min="0"
                        value={variant.stockQuantity}
                        onChange={(e) => updateVariant(index, { stockQuantity: e.target.value })}
                        className="w-32 rounded-md border border-border px-2 py-1 text-xs"
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-text-grey">
                      <input
                        type="checkbox"
                        checked={variant.isAvailable}
                        onChange={(e) => updateVariant(index, { isAvailable: e.target.checked })}
                        className="accent-brand-primary"
                      />
                      Available
                    </label>
                    <button type="button" onClick={() => removeVariant(index)} className="text-[11px] font-bold text-red-600 hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customizable package components (decorators) */}
          {isCustomizable && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-text-grey">Package components</label>
                <button type="button" onClick={addComponent} className="text-xs font-bold text-brand-primary hover:underline">
                  + Add component
                </button>
              </div>
              <div className="space-y-2">
                {components.map((component, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-2.5">
                    <label className="block flex-1 min-w-[140px]">
                      <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Name</span>
                      <input
                        value={component.name}
                        onChange={(e) => updateComponent(index, { name: e.target.value })}
                        placeholder="Party poppers with rose petals"
                        className="w-full rounded-md border border-border px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Default qty</span>
                      <input
                        type="number"
                        min="0"
                        value={component.defaultQty}
                        onChange={(e) => updateComponent(index, { defaultQty: e.target.value })}
                        className="w-20 rounded-md border border-border px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Min qty</span>
                      <input
                        type="number"
                        min="0"
                        value={component.minQty}
                        onChange={(e) => updateComponent(index, { minQty: e.target.value })}
                        className="w-20 rounded-md border border-border px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Max qty</span>
                      <input
                        type="number"
                        min="0"
                        value={component.maxQty}
                        onChange={(e) => updateComponent(index, { maxQty: e.target.value })}
                        placeholder="Uncapped"
                        className="w-20 rounded-md border border-border px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Unit price (₹)</span>
                      <input
                        type="number"
                        min="0"
                        value={component.unitPrice}
                        onChange={(e) => updateComponent(index, { unitPrice: e.target.value })}
                        placeholder="Included"
                        className="w-24 rounded-md border border-border px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-text-grey pb-1.5">
                      <input
                        type="checkbox"
                        checked={component.isRequired}
                        onChange={(e) => updateComponent(index, { isRequired: e.target.checked })}
                        className="accent-brand-primary"
                      />
                      Required
                    </label>
                    <button type="button" onClick={() => removeComponent(index)} className="text-[11px] font-bold text-red-600 hover:underline pb-1.5">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-5">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-text-dark hover:bg-surface-input">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="rounded-lg bg-brand-primary px-5 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover disabled:opacity-60"
            >
              {saving ? "Saving…" : isEditing ? "Save Changes" : "Create Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface VariantDraft {
  attributes: Record<string, unknown>;
  price: string;
  sku: string;
  stockQuantity: string;
  isAvailable: boolean;
}

interface ComponentDraft {
  name: string;
  defaultQty: string;
  minQty: string;
  maxQty: string;
  unitPrice: string;
  isRequired: boolean;
}

function VariantFieldInput({
  field,
  value,
  onChange,
}: {
  field: CatalogVariantField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const options = Array.isArray(field.options) ? (field.options as string[]) : [];

  if (field.dataType === "BOOLEAN") {
    return (
      <label className="flex items-center gap-1.5 self-end pb-1.5 text-[11px] font-semibold text-text-grey">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="accent-brand-primary" />
        {field.label}
      </label>
    );
  }

  if (field.dataType === "SELECT" || field.dataType === "MULTI_SELECT") {
    return (
      <label className="block">
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">{field.label}</span>
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 rounded-md border border-border px-2 py-1 text-xs bg-white"
        >
          <option value="">—</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.dataType === "NUMBER") {
    return (
      <label className="block">
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">{field.label}</span>
        <input
          type="number"
          value={typeof value === "number" || typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-24 rounded-md border border-border px-2 py-1 text-xs"
        />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">{field.label}</span>
      <input
        type="text"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 rounded-md border border-border px-2 py-1 text-xs"
      />
    </label>
  );
}
