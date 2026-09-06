"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { createAdminCategory, updateAdminCategory } from "@/lib/api/admin-client";
import type { Category, Location } from "@/lib/api/vendors.types";
import { formatApiError } from "@/lib/utils/error";
import { LocationTree } from "./LocationTree";
import { CategoryImagePicker } from "./CategoryImagePicker";
import { CategoryAttributesPanel } from "./CategoryAttributesPanel";
import { CategoryServicesPanel } from "./CategoryServicesPanel";

/**
 * Categories & Locations admin page (Frontend Arch Phase 9, extended
 * 2026-09-03), matching wedhub-frontend/admin/categories-locations.html's
 * two-tab layout. Real gaps vs. the mockup, confirmed via backend
 * research: no reorder-specific endpoint (dragging isn't wired —
 * sortOrder edits would need a dedicated numeric input, not built this
 * pass since the mockup's drag handle has no real backend to persist
 * ordering changes beyond one-PATCH-per-row), no inline attribute/filter
 * config UI on this page (attribute CRUD lives on a per-category basis
 * and wasn't in the mockup's own inline view either — category
 * creation/renaming/enable-disable is this page's real scope).
 *
 * Both GET /categories and GET /locations are the exact same public
 * endpoints Phase 2 built against — includeInactive=true is only honored
 * for an authenticated ADMIN (a new, small backend addition this phase),
 * which is what makes toggling a category/location back on possible at
 * all after disabling it (previously a one-way trap — see
 * frontenddocs/10-risks-and-open-questions.md).
 *
 * 2026-09-03 addition: real homepage-curation fields
 * (isFeaturedOnHomepage/imageUrl/startingPriceLabel/homepageSortOrder,
 * backing the public homepage's category carousel/bento grid — see Open
 * Question 21). Image upload goes through a real R2 presigned flow
 * (CategoryImagePicker.tsx, admin-only media-uploads endpoints), not a
 * pasted URL. "Feature on homepage" is a prominent labeled button + a
 * dedicated summary section at the top of this tab (not a small,
 * easy-to-miss per-row checkbox), per explicit user feedback that the
 * first version of this screen buried both behind an unlabeled toggle and
 * a raw text field.
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
  const featured = categories
    .filter((c) => c.isFeaturedOnHomepage)
    .sort((a, b) => a.homepageSortOrder - b.homepageSortOrder);

  async function handleCreateCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!newCategoryName.trim()) return;
    setCreating(true);
    setError(null);
    const result = await createAdminCategory({ name: newCategoryName.trim() });
    setCreating(false);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setCategories((prev) => [...prev, { ...result.data, attributes: [], services: [] }]);
    setNewCategoryName("");
  }

  async function handleToggleCategory(category: Category) {
    setPendingId(category.id);
    setError(null);
    const result = await updateAdminCategory(category.id, { isActive: !category.isActive });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, isActive: result.data.isActive } : c)));
  }

  async function handleToggleFeatured(category: Category) {
    setPendingId(category.id);
    setError(null);
    const result = await updateAdminCategory(category.id, { isFeaturedOnHomepage: !category.isFeaturedOnHomepage });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, isFeaturedOnHomepage: result.data.isFeaturedOnHomepage } : c)));
  }

  async function handleToggleStore(category: Category) {
    setPendingId(category.id);
    setError(null);
    const result = await updateAdminCategory(category.id, { hasStoreEnabled: !category.hasStoreEnabled });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, hasStoreEnabled: result.data.hasStoreEnabled } : c)));
  }

  async function handleSaveHomepageFields(category: Category, imageUrl: string | null, startingPriceLabel: string) {
    setPendingId(category.id);
    setError(null);
    const result = await updateAdminCategory(category.id, {
      imageUrl,
      startingPriceLabel: startingPriceLabel.trim() || null,
    });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, imageUrl: result.data.imageUrl, startingPriceLabel: result.data.startingPriceLabel } : c)),
    );
  }

  function handleAttributesChange(categoryId: string, attributes: Category["attributes"]) {
    setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, attributes } : c)));
  }

  function handleServicesChange(categoryId: string, services: Category["services"]) {
    setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, services } : c)));
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
          <div className="mb-5 rounded-xl border border-border bg-white p-5">
            <h2 className="text-sm font-bold">Homepage-featured categories ({featured.length})</h2>
            <p className="mt-0.5 text-xs text-text-grey">
              These categories appear on the public homepage&apos;s category carousel and bento grid, in this order.
            </p>
            {featured.length === 0 ? (
              <p className="mt-3 text-xs text-text-grey">
                No categories are featured yet. Use &quot;Feature on homepage&quot; below on any category to add it here.
              </p>
            ) : (
              <ol className="mt-3 flex flex-wrap gap-2">
                {featured.map((c, i) => (
                  <li key={c.id}>
                    <Badge variant="green">
                      {i + 1}. {c.name}
                    </Badge>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <form onSubmit={handleCreateCategory} className="mb-4 flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name…"
              maxLength={150}
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
                  <CategoryRow
                    category={parent}
                    pending={pendingId === parent.id}
                    onToggle={() => handleToggleCategory(parent)}
                    onToggleFeatured={() => handleToggleFeatured(parent)}
                    onToggleStore={() => handleToggleStore(parent)}
                    onSaveHomepageFields={(imageUrl, priceLabel) => handleSaveHomepageFields(parent, imageUrl, priceLabel)}
                    onAttributesChange={(attributes) => handleAttributesChange(parent.id, attributes)}
                    onServicesChange={(services) => handleServicesChange(parent.id, services)}
                  />
                  {parent.children.map((child) => (
                    <CategoryRow
                      key={child.id}
                      category={child}
                      indented
                      pending={pendingId === child.id}
                      onToggle={() => handleToggleCategory(child)}
                      onToggleFeatured={() => handleToggleFeatured(child)}
                      onToggleStore={() => handleToggleStore(child)}
                      onSaveHomepageFields={(imageUrl, priceLabel) => handleSaveHomepageFields(child, imageUrl, priceLabel)}
                      onAttributesChange={(attributes) => handleAttributesChange(child.id, attributes)}
                      onServicesChange={(services) => handleServicesChange(child.id, services)}
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
  onToggleFeatured,
  onToggleStore,
  onSaveHomepageFields,
  onAttributesChange,
  onServicesChange,
}: {
  category: Category;
  indented?: boolean;
  pending: boolean;
  onToggle: () => void;
  onToggleFeatured: () => void;
  onToggleStore: () => void;
  onSaveHomepageFields: (imageUrl: string | null, startingPriceLabel: string) => void;
  onAttributesChange: (attributes: Category["attributes"]) => void;
  onServicesChange: (services: Category["services"]) => void;
}) {
  const [editingHomepage, setEditingHomepage] = useState(false);
  const [editingAttributes, setEditingAttributes] = useState(false);
  const [editingServices, setEditingServices] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState<string | null>(category.imageUrl);
  const [priceDraft, setPriceDraft] = useState(category.startingPriceLabel ?? "");

  return (
    <div
      data-testid={`category-row-${category.id}`}
      className={`border-b border-neutral-grey-20 last:border-b-0 ${indented ? "pl-12" : ""} ${!category.isActive ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold">
            {category.name}
            {category.isFeaturedOnHomepage && <Badge variant="green">Featured on homepage</Badge>}
            {category.hasStoreEnabled && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                Store Enabled
              </span>
            )}
          </div>
          <div className="text-xs text-text-grey">
            {category.attributes.length} attribute{category.attributes.length === 1 ? "" : "s"}
            {" · "}
            {category.services.length} service{category.services.length === 1 ? "" : "s"}
            {!category.isActive && " · disabled"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditingAttributes((v) => !v)}
            className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-bold text-text-dark hover:bg-surface-input"
          >
            {editingAttributes ? "Close attributes" : `Attributes (${category.attributes.length})`}
          </button>
          <button
            type="button"
            onClick={() => setEditingServices((v) => !v)}
            className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-bold text-text-dark hover:bg-surface-input"
          >
            {editingServices ? "Close services" : `Services (${category.services.length})`}
          </button>
          <button
            type="button"
            onClick={() => setEditingHomepage((v) => !v)}
            className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-bold text-text-dark hover:bg-surface-input"
          >
            {editingHomepage ? "Close homepage settings" : "Homepage image & price"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onToggleFeatured}
            className={`rounded-md px-3 py-1.5 text-xs font-bold disabled:opacity-60 ${
              category.isFeaturedOnHomepage
                ? "border border-border bg-white text-text-dark hover:bg-surface-input"
                : "bg-brand-primary text-white hover:bg-brand-primary-hover"
            }`}
          >
            {category.isFeaturedOnHomepage ? "Remove from homepage" : "Feature on homepage"}
          </button>
          <label className="flex items-center gap-1.5 text-xs text-text-grey cursor-pointer" title="Enable/Disable Vendor Store feature for vendors in this category">
            Store
            <span className="relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={Boolean(category.hasStoreEnabled)}
                disabled={pending}
                onChange={onToggleStore}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-emerald-600" />
              <span className="absolute left-[3px] h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-[18px]" />
            </span>
          </label>
          <label className="flex items-center gap-2 text-xs text-text-grey">
            Active
            <span className="relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer items-center">
              <input type="checkbox" checked={category.isActive} disabled={pending} onChange={onToggle} className="peer sr-only" />
              <span className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-brand-primary" />
              <span className="absolute left-[3px] h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-[18px]" />
            </span>
          </label>
        </div>
      </div>

      {editingHomepage && (
        <div className="flex flex-wrap items-end gap-4 border-t border-dashed border-neutral-grey-20 bg-surface-input px-5 py-3.5">
          <div>
            <span className="mb-1 block text-xs font-semibold text-text-grey">Homepage image</span>
            <CategoryImagePicker currentImageUrl={category.imageUrl} onUploaded={(url) => setImageUrlDraft(url)} />
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-text-grey">Starting price label</span>
            <input
              value={priceDraft}
              onChange={(e) => setPriceDraft(e.target.value)}
              placeholder="₹ 50,000"
              maxLength={60}
              className="w-40 rounded-md border border-border px-3 py-1.5 text-xs"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => onSaveHomepageFields(imageUrlDraft, priceDraft)}
            className="rounded-md bg-brand-primary px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {editingAttributes && (
        <CategoryAttributesPanel
          categoryId={category.id}
          attributes={category.attributes}
          onAttributesChange={onAttributesChange}
        />
      )}

      {editingServices && (
        <CategoryServicesPanel
          categoryId={category.id}
          services={category.services}
          onServicesChange={onServicesChange}
        />
      )}
    </div>
  );
}
