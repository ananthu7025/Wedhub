"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { createAdminCategory, updateAdminCategory } from "@/lib/api/admin-client";
import type { Category, Location } from "@/lib/api/vendors.types";
import { formatApiError } from "@/lib/utils/error";
import { LocationTree } from "./LocationTree";
import { CategoryImagePicker } from "./CategoryImagePicker";
import { CategoryAttributesPanel } from "./CategoryAttributesPanel";

/**
 * Categories & Locations admin page (Frontend Arch Phase 9, extended
 * 2026-09-03, redesigned 2026-09-07 to a master-detail layout, redesigned
 * again 2026-09-11 to a stat-card + tabbed detail panel per a reference
 * screenshot's UX). Same underlying data/actions as before (create,
 * rename/describe, enable/disable, feature on homepage, store toggle,
 * homepage image & price, attributes) — nothing added or removed,
 * only rearranged. Real gaps vs. any mockup, confirmed via backend research:
 * no reorder-specific endpoint (dragging isn't wired — sortOrder edits would
 * need a dedicated numeric input); no per-category location assignment or
 * per-category SEO override exists, so this redesign deliberately does not
 * add "Locations"/"SEO" tabs inside a category's detail panel — Locations
 * stays its own separate top-level tab, same as before.
 *
 * Both GET /categories and GET /locations are the exact same public
 * endpoints Phase 2 built against — includeInactive=true is only honored
 * for an authenticated ADMIN, which is what makes toggling a
 * category/location back on possible at all after disabling it.
 *
 * Mobile (<1024px): list and detail panel stack — selecting a category
 * swaps the list out for the detail panel full-width with a back button,
 * rather than a cramped side-by-side split.
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Once a category is selected, the full list collapses to a slim rail so
  // the detail panel (whose Attributes table is wide — 8 columns) gets most
  // of the page width instead of being squeezed into `1fr` next to a
  // permanent 340px list. Expanding the rail temporarily brings the full
  // list back without losing the current selection.
  const [listExpanded, setListExpanded] = useState(false);

  const tree = buildCategoryTree(categories);
  const flatOrdered = tree.flatMap((parent) => [parent, ...parent.children]);
  const filtered = flatOrdered.filter((c) => {
    if (statusFilter === "ACTIVE" && !c.isActive) return false;
    if (statusFilter === "INACTIVE" && c.isActive) return false;
    if (search.trim() && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });
  const selected = categories.find((c) => c.id === selectedId) ?? null;

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
    setCategories((prev) => [...prev, { ...result.data, attributes: [] }]);
    setNewCategoryName("");
    setSelectedId(result.data.id);
  }

  async function handleSaveBasicInfo(category: Category, name: string, description: string) {
    setPendingId(category.id);
    setError(null);
    const result = await updateAdminCategory(category.id, { name: name.trim(), description: description.trim() });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, name: result.data.name, description: result.data.description } : c)));
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Categories & locations</h1>
          <p className="text-sm text-text-grey">Manage the taxonomy vendors are categorized under and the geography they serve.</p>
        </div>
        {tab === "categories" && (
          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name…"
              maxLength={150}
              className="w-full max-w-[200px] rounded-md border border-border px-3 py-2 text-sm sm:max-w-[240px]"
            />
            <button
              type="submit"
              disabled={creating || !newCategoryName.trim()}
              className="shrink-0 rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {creating ? "Adding…" : "+ Add category"}
            </button>
          </form>
        )}
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
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-xs font-semibold text-text-grey">Total categories</p>
              <p className="mt-1 text-2xl font-bold">{categories.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-xs font-semibold text-text-grey">Featured on homepage</p>
              <p className="mt-1 text-2xl font-bold">{featured.length}</p>
            </div>
            <button
              type="button"
              onClick={() => setTab("locations")}
              className="rounded-xl border border-border bg-white p-4 text-left hover:border-brand-primary hover:bg-surface-input"
            >
              <p className="text-xs font-semibold text-text-grey">Active locations</p>
              <p className="mt-1 text-2xl font-bold">{initialCountries.length}</p>
            </button>
          </div>

          <div className="mb-5 rounded-xl border border-border bg-brand-primary-soft/40 p-5">
            <h2 className="text-sm font-bold">Homepage-featured categories ({featured.length})</h2>
            <p className="mt-0.5 text-xs text-text-grey">
              These categories appear on the public homepage&apos;s category carousel and bento grid, in this order.
            </p>
            {featured.length === 0 ? (
              <p className="mt-3 text-xs text-text-grey">
                No categories are featured yet. Use &quot;Feature on homepage&quot; in a category&apos;s detail panel to add it here.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-3">
                {featured.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className="flex w-20 flex-col items-center gap-1.5 text-center"
                  >
                    <div className="h-14 w-20 overflow-hidden rounded-md border border-border bg-surface-input">
                      {c.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <span className="truncate text-[11px] font-semibold text-text-dark">
                      {i + 1}. {c.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`grid grid-cols-1 gap-5 ${selected && !listExpanded ? "lg:grid-cols-[72px_1fr]" : "lg:grid-cols-[340px_1fr]"}`}>
            {/* Category list — collapses to a slim rail once a category is
                selected (desktop only) so the detail panel's wide Attributes
                table isn't squeezed; hidden entirely on mobile in that state
                since the rail isn't useful at narrow widths. */}
            <div className={selected ? "hidden lg:block" : ""}>
              {selected && !listExpanded ? (
                <div className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto rounded-xl border border-border bg-white p-2">
                  <button
                    type="button"
                    onClick={() => setListExpanded(true)}
                    aria-label="Show category list"
                    className="mb-1 flex h-9 w-9 items-center justify-center self-center rounded-md text-text-grey hover:bg-surface-input"
                  >
                    ☰
                  </button>
                  {filtered.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedId(category.id)}
                      title={category.name}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full text-xs font-bold ${
                        selectedId === category.id ? "bg-brand-primary text-white" : "bg-surface-input text-text-grey hover:bg-neutral-grey-20"
                      } ${!category.isActive ? "opacity-60" : ""}`}
                    >
                      {category.name.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    {selected && (
                      <button
                        type="button"
                        onClick={() => setListExpanded(false)}
                        aria-label="Collapse category list"
                        className="hidden shrink-0 rounded-md border border-border bg-white px-2.5 py-2 text-text-grey hover:bg-surface-input lg:block"
                      >
                        ☰
                      </button>
                    )}
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search categories…"
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
                      className="shrink-0 rounded-md border border-border px-2 py-2 text-sm"
                    >
                      <option value="ALL">All status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Disabled</option>
                    </select>
                  </div>

                  <p className="mb-2 text-xs font-semibold text-text-grey">All categories ({filtered.length})</p>

                  <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-white">
                    {filtered.length === 0 ? (
                      <p className="p-6 text-sm text-text-grey">No categories match.</p>
                    ) : (
                      filtered.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(category.id);
                            setListExpanded(false);
                          }}
                          className={`flex w-full items-center justify-between gap-3 border-b border-neutral-grey-20 px-4 py-3 text-left last:border-b-0 ${
                            selectedId === category.id ? "bg-brand-primary-soft" : "hover:bg-surface-input"
                          } ${!category.isActive ? "opacity-60" : ""} ${category.parentId ? "pl-8" : ""}`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-text-dark">{category.name}</div>
                            <div className="text-xs text-text-grey">
                              {category.attributes.length} attribute{category.attributes.length === 1 ? "" : "s"}
                            </div>
                          </div>
                          <Badge variant={category.isActive ? "green" : "grey"}>{category.isActive ? "Active" : "Disabled"}</Badge>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Detail panel */}
            <div className={selected ? "" : "hidden lg:block"}>
              {selected ? (
                <CategoryDetailPanel
                  category={selected}
                  pending={pendingId === selected.id}
                  onBack={() => setSelectedId(null)}
                  onSaveBasicInfo={(name, description) => handleSaveBasicInfo(selected, name, description)}
                  onToggle={() => handleToggleCategory(selected)}
                  onToggleFeatured={() => handleToggleFeatured(selected)}
                  onToggleStore={() => handleToggleStore(selected)}
                  onSaveHomepageFields={(imageUrl, priceLabel) => handleSaveHomepageFields(selected, imageUrl, priceLabel)}
                  onAttributesChange={(attributes) => handleAttributesChange(selected.id, attributes)}
                />
              ) : (
                <div className="hidden h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white p-6 text-center lg:flex">
                  <p className="text-sm font-bold text-text-dark">Select a category</p>
                  <p className="mt-1 text-xs text-text-grey">Choose a category from the list to view and edit its details.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === "locations" && <LocationTree initialCountries={initialCountries} />}
    </div>
  );
}

type DetailTab = "overview" | "attributes" | "homepage" | "settings";

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  activeColorClassName = "peer-checked:bg-brand-primary",
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  activeColorClassName?: string;
}) {
  return (
    <span className="relative inline-flex h-[22px] w-10 flex-shrink-0 cursor-pointer items-center">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="peer sr-only" />
      <span className={`absolute inset-0 rounded-full bg-border transition-colors ${activeColorClassName}`} />
      <span className="absolute left-[3px] h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-[18px]" />
    </span>
  );
}

function CategoryDetailPanel({
  category,
  pending,
  onBack,
  onSaveBasicInfo,
  onToggle,
  onToggleFeatured,
  onToggleStore,
  onSaveHomepageFields,
  onAttributesChange,
}: {
  category: Category;
  pending: boolean;
  onBack: () => void;
  onSaveBasicInfo: (name: string, description: string) => void;
  onToggle: () => void;
  onToggleFeatured: () => void;
  onToggleStore: () => void;
  onSaveHomepageFields: (imageUrl: string | null, startingPriceLabel: string) => void;
  onAttributesChange: (attributes: Category["attributes"]) => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");
  const [imageUrlDraft, setImageUrlDraft] = useState<string | null>(category.imageUrl);
  const [priceDraft, setPriceDraft] = useState(category.startingPriceLabel ?? "");

  const TABS: Array<{ id: DetailTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "attributes", label: `Attributes (${category.attributes.length})` },
    { id: "homepage", label: "Homepage" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-border bg-white">
        <div
          className="flex h-32 items-end rounded-t-xl bg-surface-input bg-cover bg-center sm:h-40"
          style={category.imageUrl ? { backgroundImage: `url(${category.imageUrl})` } : undefined}
        >
          <div className="flex w-full items-center justify-between gap-3 p-4">
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-white text-text-grey hover:bg-surface-input lg:hidden"
              aria-label="Back to category list"
            >
              ←
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3 p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-bold">{category.name}</h2>
              <Badge variant={category.isActive ? "green" : "grey"}>{category.isActive ? "Active" : "Disabled"}</Badge>
            </div>
            <p className="text-xs text-text-grey">
              {category.attributes.length} attribute{category.attributes.length === 1 ? "" : "s"}
              {category.isFeaturedOnHomepage && " · Featured on homepage"}
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={onToggleFeatured}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold disabled:opacity-60 ${
              category.isFeaturedOnHomepage
                ? "border border-border bg-white text-text-dark hover:bg-surface-input"
                : "bg-brand-primary text-white hover:bg-brand-primary-hover"
            }`}
          >
            {category.isFeaturedOnHomepage ? "Remove from homepage" : "★ Feature on homepage"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold ${
              activeTab === t.id ? "bg-jet-black-90 text-white" : "border border-border bg-white text-text-body hover:bg-surface-input"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-border bg-white p-5">
            <h3 className="mb-3 text-sm font-bold">Category information</h3>
            <div className="flex flex-col gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-text-grey">Category name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={150}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-text-grey">Description (optional)</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  className="min-h-[70px] w-full rounded-md border border-border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-text-grey">Category image (optional)</span>
                <CategoryImagePicker currentImageUrl={category.imageUrl} onUploaded={(url) => setImageUrlDraft(url)} />
              </label>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => onSaveBasicInfo(name, description)}
                className="rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
              <label className="flex items-center gap-2 text-xs text-text-grey">
                Active
                <ToggleSwitch checked={category.isActive} disabled={pending} onChange={onToggle} />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-5">
            <h3 className="mb-3 text-sm font-bold">Quick actions</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setActiveTab("attributes")}
                className="rounded-xl border border-border bg-white p-4 text-left hover:border-brand-primary hover:bg-surface-input"
              >
                <p className="text-sm font-bold">Manage attributes</p>
                <p className="mt-0.5 text-xs text-text-grey">Add or edit vendor profile fields</p>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("homepage")}
                className="rounded-xl border border-border bg-white p-4 text-left hover:border-brand-primary hover:bg-surface-input"
              >
                <p className="text-sm font-bold">Homepage settings</p>
                <p className="mt-0.5 text-xs text-text-grey">Feature on the homepage carousel</p>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="rounded-xl border border-border bg-white p-4 text-left hover:border-brand-primary hover:bg-surface-input"
              >
                <p className="text-sm font-bold">Settings</p>
                <p className="mt-0.5 text-xs text-text-grey">Store and other category settings</p>
              </button>
            </div>
          </div>

          {category.isFeaturedOnHomepage && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-4">
              <p className="text-sm font-semibold text-emerald-800">This category is featured on the homepage.</p>
              <button
                type="button"
                disabled={pending}
                onClick={onToggleFeatured}
                className="shrink-0 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-bold text-text-dark hover:bg-surface-input disabled:opacity-60"
              >
                Remove from homepage
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "attributes" && (
        <CategoryAttributesPanel categoryId={category.id} attributes={category.attributes} onAttributesChange={onAttributesChange} />
      )}

      {activeTab === "homepage" && (
        <div className="rounded-xl border border-border bg-white p-5">
          <h3 className="text-sm font-bold">Homepage settings</h3>
          <p className="mt-0.5 text-xs text-text-grey">Feature this category on the homepage carousel/bento grid.</p>

          <div className="mt-4">
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
              {category.isFeaturedOnHomepage ? "Remove from homepage" : "★ Feature on homepage"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-4">
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
        </div>
      )}

      {activeTab === "settings" && (
        <div className="rounded-xl border border-border bg-white p-5">
          <h3 className="text-sm font-bold">Settings</h3>
          <p className="mt-0.5 text-xs text-text-grey">Store and other category settings</p>

          <label
            className="mt-4 flex items-center gap-2 text-xs text-text-grey cursor-pointer"
            title="Enable/Disable Vendor Store feature for vendors in this category"
          >
            Store enabled
            <ToggleSwitch
              checked={Boolean(category.hasStoreEnabled)}
              disabled={pending}
              onChange={onToggleStore}
              activeColorClassName="peer-checked:bg-emerald-600"
            />
          </label>
        </div>
      )}
    </div>
  );
}
