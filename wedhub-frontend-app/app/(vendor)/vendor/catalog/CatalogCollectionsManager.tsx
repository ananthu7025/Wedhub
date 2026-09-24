"use client";

import { useState } from "react";
import {
  createMyCatalogCollection,
  deleteMyCatalogCollection,
  updateMyCatalogCollection,
} from "@/lib/api/vendor-catalog-client";
import type { CatalogCollection } from "@/lib/api/vendor-catalog.types";

export function CatalogCollectionsManager({
  collections,
  onChange,
}: {
  collections: CatalogCollection[];
  onChange: (collections: CatalogCollection[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);

    const res = await createMyCatalogCollection({ name: newName.trim() });
    setCreating(false);

    if (!res.success) {
      setError(typeof res.error === "string" ? res.error : res.error?.message || "Failed to create collection");
      return;
    }

    onChange([...collections, res.data]);
    setNewName("");
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    const res = await updateMyCatalogCollection(id, { name: editingName.trim() });
    if (!res.success) {
      setError(typeof res.error === "string" ? res.error : res.error?.message || "Failed to rename collection");
      return;
    }
    onChange(collections.map((c) => (c.id === id ? res.data : c)));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this collection? Items in it will stay in your catalog, just no longer grouped here.")) return;
    setDeletingId(id);
    const res = await deleteMyCatalogCollection(id);
    setDeletingId(null);
    if (!res.success) {
      setError(typeof res.error === "string" ? res.error : res.error?.message || "Failed to delete collection");
      return;
    }
    onChange(collections.filter((c) => c.id !== id));
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-bold text-text-dark">Collections</p>
          <p className="text-xs text-text-grey">
            Group items into named collections (e.g. Best Sellers, Festive Edit) to control what shows in your
            storefront&apos;s category grid and tab filters.
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-text-grey transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-800">{error}</div>}

          {collections.length === 0 ? (
            <p className="text-xs text-text-grey">No collections yet. Create one below.</p>
          ) : (
            <ul className="space-y-2">
              {collections.map((collection) => (
                <li
                  key={collection.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  {editingId === collection.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(collection.id)}
                      autoFocus
                      className="flex-1 rounded-lg border border-border px-2 py-1 text-xs focus:border-brand-primary focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-text-dark">{collection.name}</span>
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {editingId === collection.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRename(collection.id)}
                          className="rounded px-2 py-1 text-[11px] font-bold text-brand-primary hover:bg-brand-primary-soft"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded px-2 py-1 text-[11px] font-bold text-text-grey hover:bg-surface-input"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(collection.id);
                            setEditingName(collection.name);
                          }}
                          className="rounded px-2 py-1 text-[11px] font-bold text-text-dark hover:bg-surface-input"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === collection.id}
                          onClick={() => handleDelete(collection.id)}
                          className="rounded px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === collection.id ? "…" : "Remove"}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="New collection name, e.g. Best Sellers"
              className="flex-1 rounded-lg border border-border px-3 py-2 text-xs focus:border-brand-primary focus:outline-none"
            />
            <button
              type="button"
              disabled={creating || !newName.trim()}
              onClick={handleCreate}
              className="rounded-lg bg-brand-primary px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-primary-hover disabled:opacity-60"
            >
              {creating ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
