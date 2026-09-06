"use client";

import { useState } from "react";
import { createMyPackage, deleteMyPackage, updateMyPackage } from "@/lib/api/vendor-self-client";
import type { PackageSelf } from "@/lib/api/vendor-self.types";
import { formatApiError } from "@/lib/utils/error";
import { PackageModal } from "./PackageModal";

export function PackagesManager({
  initialPackages,
  currency,
}: {
  initialPackages: PackageSelf[];
  currency: string;
}) {
  const [packages, setPackages] = useState(initialPackages);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageSelf | null>(null);

  function openAddModal() {
    setEditingPackage(null);
    setModalOpen(true);
  }

  function openEditModal(pkg: PackageSelf) {
    setEditingPackage(pkg);
    setModalOpen(true);
  }

  async function handleDelete(pkg: PackageSelf) {
    if (!window.confirm(`Delete "${pkg.name}"?`)) return;
    setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
    await deleteMyPackage(pkg.id);
  }

  async function handleSave(input: { name: string; description: string; price: number; inclusions: string[] }): Promise<{ success: boolean; error?: string }> {
    if (editingPackage) {
      const result = await updateMyPackage(editingPackage.id, input);
      if (result.success) {
        setPackages((prev) => prev.map((p) => (p.id === editingPackage.id ? result.data : p)));
        return { success: true };
      }
      return { success: false, error: formatApiError(result.error) };
    }

    const result = await createMyPackage({ ...input, currency });
    if (result.success) {
      setPackages((prev) => [...prev, result.data]);
      return { success: true };
    }
    return { success: false, error: formatApiError(result.error) };
  }

  return (
    <div>
      <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Packages &amp; Pricing</h1>
          <p className="text-xs sm:text-sm text-text-grey">Create and manage the packages couples see when they view your profile.</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="w-full sm:w-auto inline-flex justify-center items-center rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white shadow-xs"
        >
          + Add package
        </button>
      </div>

      {packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-5 py-14 sm:py-18 text-center">
          <h3 className="mb-1.5 text-[15px] font-bold">No packages yet</h3>
          <p className="mb-4 max-w-[320px] text-xs sm:text-[13px] text-text-grey">
            Add a package so couples know what you offer and what it costs.
          </p>
          <button type="button" onClick={openAddModal} className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white shadow-xs">
            + Add package
          </button>
        </div>
      ) : (
        packages.map((pkg) => (
          <div key={pkg.id} className="mb-4 rounded-xl border border-border bg-white p-4 sm:p-6 shadow-xs">
            <div className="mb-1.5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[17px] font-bold">{pkg.name}</p>
                <p className="text-xl font-bold text-brand-primary">
                  {pkg.currency === "INR" ? "₹" : pkg.currency}
                  {Number(pkg.price).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(pkg)}
                  className="rounded-md border border-border bg-white px-3.5 py-2 text-[13px] font-bold hover:bg-surface-input"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(pkg)}
                  className="rounded-md border border-red-10 bg-white px-3.5 py-2 text-[13px] font-bold text-red hover:bg-red-10"
                >
                  Delete
                </button>
              </div>
            </div>
            {pkg.description && <p className="mb-3.5 text-[13px] text-text-grey">{pkg.description}</p>}
            {pkg.inclusions.length > 0 && (
              <ul className="list-disc pl-4.5 text-[13px] leading-relaxed text-text-body">
                {pkg.inclusions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}

      {modalOpen && (
        <PackageModal
          initialPackage={editingPackage}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
