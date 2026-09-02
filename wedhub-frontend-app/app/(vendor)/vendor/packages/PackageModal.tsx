"use client";

import { useState } from "react";
import type { PackageSelf } from "@/lib/api/vendor-self.types";

export function PackageModal({
  initialPackage,
  onClose,
  onSave,
}: {
  initialPackage: PackageSelf | null;
  onClose: () => void;
  onSave: (input: { name: string; description: string; price: number; inclusions: string[] }) => Promise<boolean>;
}) {
  const [name, setName] = useState(initialPackage?.name ?? "");
  const [price, setPrice] = useState(initialPackage?.price ?? "");
  const [description, setDescription] = useState(initialPackage?.description ?? "");
  const [inclusions, setInclusions] = useState<string[]>(initialPackage?.inclusions ?? []);
  const [newInclusion, setNewInclusion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addInclusion() {
    if (!newInclusion.trim()) return;
    setInclusions((prev) => [...prev, newInclusion.trim()]);
    setNewInclusion("");
  }

  function removeInclusion(index: number) {
    setInclusions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !price) {
      setError("Package name and price are required");
      return;
    }
    setSaving(true);
    setError("");
    const success = await onSave({ name: name.trim(), description: description.trim(), price: Number(price), inclusions });
    if (success) {
      onClose();
    } else {
      setSaving(false);
      setError("Could not save this package. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-2xl bg-white p-7" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Close" className="float-right border-none bg-transparent text-lg text-text-grey">
          ✕
        </button>
        <h2 className="mb-1.5 text-lg font-bold">{initialPackage ? "Edit package" : "Add package"}</h2>
        <p className="mb-5.5 text-[13px] text-text-grey">This package will be shown to couples on your public profile.</p>

        <form onSubmit={handleSubmit}>
          <label className="mb-3.5 block text-sm">
            <span className="mb-1.5 block font-bold text-[13px]">Package name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Signature"
              required
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
            />
          </label>

          <label className="mb-3.5 block text-sm">
            <span className="mb-1.5 block font-bold text-[13px]">Price (₹)</span>
            <input
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 75000"
              required
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
            />
          </label>

          <label className="mb-3.5 block text-sm">
            <span className="mb-1.5 block font-bold text-[13px]">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 2 day coverage · 2 photographers + drone"
              className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
            />
          </label>

          <div className="mb-4.5">
            <span className="mb-1.5 block text-[13px] font-bold">Inclusions</span>
            {inclusions.map((item, index) => (
              <div key={`${item}-${index}`} className="mb-2.5 flex items-center gap-2">
                <span className="flex-1 rounded-md border border-border px-3 py-2 text-[13px]">{item}</span>
                <button
                  type="button"
                  onClick={() => removeInclusion(index)}
                  aria-label={`Remove ${item}`}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border bg-white text-text-grey hover:bg-red-10 hover:text-red-70"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newInclusion}
                onChange={(e) => setNewInclusion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addInclusion();
                  }
                }}
                placeholder="e.g. Drone coverage"
                className="flex-1 rounded-md border border-border px-3 py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={addInclusion}
                className="rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-bold hover:bg-surface-input"
              >
                + Add item
              </button>
            </div>
          </div>

          {error && <p className="mb-3.5 text-[13px] text-red">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-brand-primary py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save package"}
          </button>
        </form>
      </div>
    </div>
  );
}
