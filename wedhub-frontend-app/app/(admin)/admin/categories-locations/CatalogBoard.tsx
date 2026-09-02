"use client";

import { useState } from "react";
import { createAdminCategory, updateAdminCategory } from "@/lib/api/admin-client";
import type { Category, Location } from "@/lib/api/vendors.types";
import { LocationTree } from "./LocationTree";

/**
 * Categories & Locations admin page (Frontend Arch Phase 9), matching
 * wedhub-frontend/admin/categories-locations.html's two-tab layout. Real
 * gaps vs. the mockup, confirmed via backend research: no reorder-specific
 * endpoint (dragging isn't wired — sortOrder edits would need a dedicated
 * numeric input, not built this pass since the mockup's drag handle has no
 * real backend to persist ordering changes beyond one-PATCH-per-row), no
 * inline attribute/filter config UI on this page (attribute CRUD lives on
 * a per-category basis and wasn't in the mockup's own inline view either —
 * category creation/renaming/enable-disable is this page's real scope).
 *
 * Both GET /categories and GET /locations are the exact same public
 * endpoints Phase 2 built against — includeInactive=true is only honored
 * for an authenticated ADMIN (a new, small backend addition this phase),
 * which is what makes toggling a category/location back on possible at
 * all after disabling it (previously a one-way trap — see
 * frontenddocs/10-risks-and-open-questions.md).
 */

type Tab = "categories" | "locations";

function buildCategoryTree(categories: Category[]): Array<Category & { children: Category[] }> {
  const byParent = new Map<string | null, Category[]>();
  for (const cat of categories) {
    const key = cat.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(cat);
  }
  const roots = byParent.get(null) ?? [];
  return roots.map((root) => ({ ...root, children: byParent.get(root.id) ?? [] }));
}

export function CatalogBoard({
  initialCategories,
  initialCountries,
}: {
  initialCategories: Category[];
  initialCountries: Location[];
}) {
  const [tab, setTab] = useState<Tab>("categories");
  const [categories, setCategories] = useState(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const tree = buildCategoryTree(categories);

  async function handleCreateCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!newCategoryName.trim()) return;
    setCreating(true);
    setError(null);
    const result = await createAdminCategory({ name: newCategoryName.trim() });
    setCreating(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setCategories((prev) => [...prev, { ...result.data, attributes: [] }]);
    setNewCategoryName("");
  }

  async function handleToggleCategory(category: Category) {
    setPendingId(category.id);
    setError(null);
    const result = await updateAdminCategory(category.id, { isActive: !category.isActive });
    setPendingId(null);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, isActive: result.data.isActive } : c)));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Categories & locations</h1>
        <p className="text-sm text-text-grey">Manage the taxonomy vendors are categorized under and the geography they serve.</p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-10 p-3 text-[13px] text-red-70">{error}</div>}

      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setTab("categories")}
          className={`rounded-full px-4 py-2 text-[13px] font-bold ${
            tab === "categories" ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setTab("locations")}
          className={`rounded-full px-4 py-2 text-[13px] font-bold ${
            tab === "locations" ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
          }`}
        >
          Locations
        </button>
      </div>

      {tab === "categories" && (
        <>
          <form onSubmit={handleCreateCategory} className="mb-4 flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name…"
              className="w-full max-w-[320px] rounded-md border border-border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={creating || !newCategoryName.trim()}
              className="rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {creating ? "Adding…" : "+ Add category"}
            </button>
          </form>

          <div className="rounded-xl border border-border bg-white">
            {tree.length === 0 ? (
              <p className="p-6 text-sm text-text-grey">No categories yet.</p>
            ) : (
              tree.map((parent) => (
                <div key={parent.id}>
                  <CategoryRow category={parent} pending={pendingId === parent.id} onToggle={() => handleToggleCategory(parent)} />
                  {parent.children.map((child) => (
                    <CategoryRow
                      key={child.id}
                      category={child}
                      indented
                      pending={pendingId === child.id}
                      onToggle={() => handleToggleCategory(child)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === "locations" && <LocationTree initialCountries={initialCountries} />}
    </div>
  );
}

function CategoryRow({
  category,
  indented,
  pending,
  onToggle,
}: {
  category: Category;
  indented?: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-neutral-grey-20 px-5 py-3.5 last:border-b-0 ${
        indented ? "pl-12" : ""
      } ${!category.isActive ? "opacity-60" : ""}`}
    >
      <div>
        <div className="text-sm font-bold">{category.name}</div>
        <div className="text-xs text-text-grey">
          {category.attributes.length} attribute{category.attributes.length === 1 ? "" : "s"}
          {!category.isActive && " · disabled"}
        </div>
      </div>
      <label className="relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer items-center">
        <input type="checkbox" checked={category.isActive} disabled={pending} onChange={onToggle} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-brand-primary" />
        <span className="absolute left-[3px] h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-[18px]" />
      </label>
    </div>
  );
}
