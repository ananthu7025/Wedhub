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
  onSave: (input: { name: string; description: string; price: number; inclusions: string[] }) => Promise<{ success: boolean; error?: string }>;
}) {
  const [name, setName] = useState(initialPackage?.name ?? "");
  const [price, setPrice] = useState(initialPackage?.price ?? "");
  const [description, setDescription] = useState(initialPackage?.description ?? "");
  const [inclusions, setInclusions] = useState<string[]>(initialPackage?.inclusions ?? []);
  const [newInclusion, setNewInclusion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Backend caps inclusions at max(50) items, max(200) chars each
  // (package.schema.ts) — enforced here, one item at a time, rather than
  // letting the list grow past what a save will actually accept.
  function addInclusion() {
    const trimmed = newInclusion.trim();
    if (!trimmed || trimmed.length > 200 || inclusions.length >= 50) return;
    setInclusions((prev) => [...prev, trimmed]);
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
    const saveResult = await onSave({ name: name.trim(), description: description.trim(), price: Number(price), inclusions });
    if (saveResult.success) {
      onClose();
    } else {
      setSaving(false);
      setError(saveResult.error || "Could not save this package. Please try again.");
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
              maxLength={200}
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
              maxLength={2000}
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
                maxLength={200}
                disabled={inclusions.length >= 50}
                className="flex-1 rounded-md border border-border px-3 py-2.5 text-sm disabled:bg-surface-input"
              />
              <button
                type="button"
                onClick={addInclusion}
                disabled={inclusions.length >= 50}
                className="rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-bold hover:bg-surface-input disabled:opacity-60"
              >
                + Add item
              </button>
            </div>
            {inclusions.length >= 50 && <p className="mt-1.5 text-[11px] text-text-grey">Maximum of 50 inclusions.</p>}
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
