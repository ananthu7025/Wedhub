"use client";

import { useState } from "react";
import { createAdminGalleryCategory, deleteAdminGalleryCategory, updateAdminGalleryCategory } from "@/lib/api/admin-client";
import type { GalleryCategory } from "@/lib/api/vendors.types";
import { formatApiError } from "@/lib/utils/error";
import { GalleryCategoryImagePicker } from "./GalleryCategoryImagePicker";

/**
 * Gallery Inspiration taxonomy management — the 8 "Photos" mega-menu-style
 * groupings (Outfit, Mehndi, Decor & Ideas, ...) a photo gets tagged with
 * when featured, and the pills the public /gallery page filters by.Rows
 * previously could only be created by editing the hardcoded
 * GALLERY_CATEGORIES array in prisma/seed.ts and re-running the seed
 * script — this panel adds real admin CRUD, mirroring
 * CategoryAttributesPanel.tsx. A new/edited category has no effect on
 * existing FeaturedMedia rows; it only becomes a new option in the
 * category picker below and a new pill on /gallery once a photo is
 * tagged with it.
 *
 * `coverImageUrl` (added 2026-09-11) is a separate, admin-pinned homepage
 * cover photo for this category's Gallery Inspiration tile — independent
 * of any FeaturedMedia photo tagged with the category. Read only by the
 * public homepage (GalleryInspiration.tsx); the /gallery browse page's
 * pills and grid are unaffected and keep showing real tagged photos.
 */
export function GalleryCategoriesPanel({
  categories,
  onCategoriesChange,
}: {
  categories: GalleryCategory[];
  onCategoriesChange: (categories: GalleryCategory[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleCreate(input: GalleryCategoryFormValues) {
    setPendingId("new");
    setError(null);
    const result = await createAdminGalleryCategory({ name: input.name });
    if (!result.success) {
      setPendingId(null);
      setError(formatApiError(result.error));
      return;
    }
    // Category must exist before its cover can be saved (PATCH, not part of
    // the create body) — same two-step pattern as Category.imageUrl.
    let created = result.data;
    if (input.coverImageUrl) {
      const coverResult = await updateAdminGalleryCategory(created.id, { coverImageUrl: input.coverImageUrl });
      if (coverResult.success) created = coverResult.data;
    }
    setPendingId(null);
    onCategoriesChange([...categories, created]);
    setAdding(false);
  }

  async function handleUpdate(category: GalleryCategory, input: GalleryCategoryFormValues) {
    setPendingId(category.id);
    setError(null);
    const result = await updateAdminGalleryCategory(category.id, { name: input.name, coverImageUrl: input.coverImageUrl ?? null });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onCategoriesChange(categories.map((c) => (c.id === category.id ? result.data : c)));
    setEditingId(null);
  }

  async function handleToggleActive(category: GalleryCategory) {
    setPendingId(category.id);
    setError(null);
    const result = await updateAdminGalleryCategory(category.id, { isActive: !category.isActive });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onCategoriesChange(categories.map((c) => (c.id === category.id ? result.data : c)));
  }

  async function handleDelete(category: GalleryCategory) {
    setPendingId(category.id);
    setError(null);
    const result = await deleteAdminGalleryCategory(category.id);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onCategoriesChange(categories.filter((c) => c.id !== category.id));
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-white p-6">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-base font-bold">Gallery categories</h3>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs font-bold text-brand-primary hover:underline"
          >
            + Add category
          </button>
        )}
      </div>
      <p className="mb-4 text-[13px] text-text-grey">
        The taxonomy featured photos are tagged with — shown as filter pills on the public /gallery page.
      </p>

      {error && <div className="mb-3 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      {categories.length === 0 && !adding && <p className="text-xs text-text-grey">No gallery categories yet.</p>}

      <div className="flex flex-col gap-2">
        {categories.map((category) =>
          editingId === category.id ? (
            <GalleryCategoryForm
              key={category.id}
              initial={category}
              saving={pendingId === category.id}
              onCancel={() => setEditingId(null)}
              onSubmit={(values) => handleUpdate(category, values)}
            />
          ) : (
            <div
              key={category.id}
              className={`flex items-center justify-between gap-3 rounded-md border border-border bg-white px-3 py-2 ${!category.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-12 flex-shrink-0 overflow-hidden rounded border border-border bg-surface-input">
                  {category.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={category.coverImageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="text-xs">
                  <span className="font-bold">{category.name}</span>{" "}
                  <code className="rounded bg-surface-input px-1 py-0.5 text-[10px] text-text-grey">{category.slug}</code>
                  {!category.isActive && <span className="text-text-grey"> · inactive</span>}
                </div>
              </div>
              <div className="flex flex-shrink-0 gap-3">
                <button
                  type="button"
                  disabled={pendingId === category.id}
                  onClick={() => setEditingId(category.id)}
                  className="text-[11px] font-bold text-brand-primary hover:underline disabled:opacity-60"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={pendingId === category.id}
                  onClick={() => handleToggleActive(category)}
                  className="text-[11px] font-bold text-text-dark hover:underline disabled:opacity-60"
                >
                  {category.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  disabled={pendingId === category.id}
                  onClick={() => handleDelete(category)}
                  className="text-[11px] font-bold text-red hover:underline disabled:opacity-60"
                >
                  {pendingId === category.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ),
        )}

        {adding && (
          <GalleryCategoryForm saving={pendingId === "new"} onCancel={() => setAdding(false)} onSubmit={handleCreate} />
        )}
      </div>
    </div>
  );
}

interface GalleryCategoryFormValues {
  name: string;
  coverImageUrl?: string | null;
}

function GalleryCategoryForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial?: GalleryCategory;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: GalleryCategoryFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(initial?.coverImageUrl ?? null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError("Name is required");
      return;
    }

    onSubmit({ name: name.trim(), coverImageUrl });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border border-brand-primary bg-white p-3">
      {validationError && <p className="text-[11px] text-red-70">{validationError}</p>}
      <label className="block">
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Destination Decor"
          maxLength={150}
          className="w-56 rounded-md border border-border px-2 py-1 text-xs"
        />
      </label>
      <div>
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Homepage cover photo (optional)</span>
        <GalleryCategoryImagePicker currentImageUrl={coverImageUrl} onUploaded={setCoverImageUrl} />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : initial ? "Save" : "Add category"}
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
