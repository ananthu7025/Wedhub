"use client";

import { useState } from "react";
import { createAdminSeoOverride, deleteAdminSeoOverride, updateAdminSeoOverride } from "@/lib/api/admin-client";
import type { AdminSeoOverride, SeoOverridePageType } from "@/lib/api/admin.types";
import type { Category, Location } from "@/lib/api/vendors.types";

interface FormValues {
  pageType: SeoOverridePageType;
  categoryId: string;
  cityId: string;
  title: string;
  description: string;
  ogImageUrl: string;
  noIndex: boolean;
}

function overrideLabel(override: AdminSeoOverride): string {
  if (override.category && override.location) return `${override.category.name} + ${override.location.name}`;
  if (override.category) return override.category.name;
  return override.location?.name ?? "";
}

export function SeoOverridesBoard({
  initialOverrides,
  categories,
  cities,
}: {
  initialOverrides: AdminSeoOverride[];
  categories: Category[];
  cities: Location[];
}) {
  const [overrides, setOverrides] = useState(initialOverrides);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(values: FormValues) {
    setPendingId("new");
    setError(null);
    const result = await createAdminSeoOverride({
      pageType: values.pageType,
      categoryId: values.pageType !== "CITY" ? values.categoryId : undefined,
      cityId: values.pageType !== "CATEGORY" ? values.cityId : undefined,
      title: values.title.trim() || undefined,
      description: values.description.trim() || undefined,
      ogImageUrl: values.ogImageUrl.trim() || undefined,
      noIndex: values.noIndex,
    });
    setPendingId(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setOverrides((prev) => [result.data, ...prev]);
    setAdding(false);
  }

  async function handleUpdate(override: AdminSeoOverride, values: FormValues) {
    setPendingId(override.id);
    setError(null);
    const result = await updateAdminSeoOverride(override.id, {
      title: values.title.trim() || null,
      description: values.description.trim() || null,
      ogImageUrl: values.ogImageUrl.trim() || null,
      noIndex: values.noIndex,
    });
    setPendingId(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setOverrides((prev) => prev.map((o) => (o.id === override.id ? result.data : o)));
    setEditingId(null);
  }

  async function handleDelete(override: AdminSeoOverride) {
    setPendingId(override.id);
    setError(null);
    const result = await deleteAdminSeoOverride(override.id);
    setPendingId(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setOverrides((prev) => prev.filter((o) => o.id !== override.id));
  }

  return (
    <div>
      {error && <div className="mb-3 rounded-md bg-red-10 p-2.5 text-[13px] text-red-70">{error}</div>}

      {overrides.length === 0 && !adding && (
        <p className="mb-3 text-sm text-text-grey">
          No overrides yet — every page currently uses its auto-generated title and description.
        </p>
      )}

      <div className="mb-3 flex flex-col gap-3">
        {overrides.map((override) =>
          editingId === override.id ? (
            <OverrideForm
              key={override.id}
              initial={override}
              saving={pendingId === override.id}
              onCancel={() => setEditingId(null)}
              onSubmit={(values) => handleUpdate(override, values)}
            />
          ) : (
            <div key={override.id} className="flex items-center gap-3 rounded-md border border-border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-bold">
                  {overrideLabel(override)}
                  {override.noIndex && (
                    <span className="rounded-full bg-red-10 px-2 py-0.5 text-[10px] font-bold text-red-70">noindex</span>
                  )}
                </div>
                <div className="truncate text-xs text-text-grey">{override.title ?? "(using auto-generated title)"}</div>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  type="button"
                  disabled={pendingId === override.id}
                  onClick={() => setEditingId(override.id)}
                  className="text-[11px] font-bold text-brand-primary hover:underline disabled:opacity-60"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={pendingId === override.id}
                  onClick={() => handleDelete(override)}
                  className="text-[11px] font-bold text-red hover:underline disabled:opacity-60"
                >
                  {pendingId === override.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      {adding ? (
        <OverrideForm
          categories={categories}
          cities={cities}
          saving={pendingId === "new"}
          onCancel={() => setAdding(false)}
          onSubmit={handleCreate}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs font-bold text-brand-primary hover:underline"
        >
          + Add override
        </button>
      )}
    </div>
  );
}

function OverrideForm({
  initial,
  categories,
  cities,
  saving,
  onCancel,
  onSubmit,
}: {
  initial?: AdminSeoOverride;
  categories?: Category[];
  cities?: Location[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: FormValues) => void;
}) {
  const [pageType, setPageType] = useState<SeoOverridePageType>(initial?.pageType ?? "CATEGORY");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories?.[0]?.id ?? "");
  const [cityId, setCityId] = useState(initial?.locationId ?? cities?.[0]?.id ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [ogImageUrl, setOgImageUrl] = useState(initial?.ogImageUrl ?? "");
  const [noIndex, setNoIndex] = useState(initial?.noIndex ?? false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    if (!initial) {
      if (pageType !== "CITY" && !categoryId) {
        setValidationError("Select a category");
        return;
      }
      if (pageType !== "CATEGORY" && !cityId) {
        setValidationError("Select a city");
        return;
      }
    }
    if (!title.trim() && !description.trim() && !noIndex) {
      setValidationError("Set at least a title, description, or noindex — otherwise there's nothing to override");
      return;
    }

    onSubmit({ pageType, categoryId, cityId, title, description, ogImageUrl, noIndex });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-md border border-brand-primary bg-white p-3">
      {validationError && <p className="text-[11px] text-red-70">{validationError}</p>}

      {!initial && categories && cities && (
        <>
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Page type</span>
            <select
              value={pageType}
              onChange={(e) => setPageType(e.target.value as SeoOverridePageType)}
              className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
            >
              <option value="CATEGORY">Category page</option>
              <option value="CITY">City page</option>
              <option value="CATEGORY_CITY">Category + city page</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            {pageType !== "CITY" && (
              <label className="block">
                <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Category</span>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {pageType !== "CATEGORY" && (
              <label className="block">
                <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">City</span>
                <select
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </>
      )}

      <label className="block">
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Title override (blank = auto-generated)</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Best Wedding Photographers in Bengaluru"
          className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
        />
      </label>

      <label className="block">
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Description override (blank = auto-generated)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
          className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
        />
      </label>

      <label className="block">
        <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">OG image URL (optional)</span>
        <input
          value={ogImageUrl}
          onChange={(e) => setOgImageUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
        />
      </label>

      <label className="flex items-center gap-1.5 text-[11px] text-text-grey">
        <input type="checkbox" checked={noIndex} onChange={(e) => setNoIndex(e.target.checked)} />
        Force this page non-indexable, regardless of vendor count
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : initial ? "Save" : "Add override"}
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
