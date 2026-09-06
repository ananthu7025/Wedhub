"use client";

import { useState } from "react";
import { createAdminService, deleteAdminService, updateAdminService } from "@/lib/api/admin-client";
import type { Service } from "@/lib/api/vendors.types";
import { formatApiError } from "@/lib/utils/error";

/**
 * Category service management — the fixed catalog of offerings
 * (e.g. Photography's "Drone Coverage", "Pre-Wedding Shoot") a vendor in
 * this category can attach to their profile via the "At least one
 * service" submission requirement (vendor.completeness.ts). Previously
 * these rows could only be created by editing the hardcoded
 * CATEGORY_SERVICES map in prisma/seed.ts and re-running the seed script —
 * this panel adds real admin CRUD, mirroring CategoryAttributesPanel.tsx.
 */
export function CategoryServicesPanel({
  categoryId,
  services,
  onServicesChange,
}: {
  categoryId: string;
  services: Service[];
  onServicesChange: (services: Service[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleCreate(input: ServiceFormValues) {
    setPendingId("new");
    setError(null);
    const result = await createAdminService(categoryId, {
      name: input.name,
      description: input.description || undefined,
    });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onServicesChange([...services, result.data]);
    setAdding(false);
  }

  async function handleUpdate(service: Service, input: ServiceFormValues) {
    setPendingId(service.id);
    setError(null);
    const result = await updateAdminService(categoryId, service.id, {
      name: input.name,
      description: input.description || null,
    });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onServicesChange(services.map((s) => (s.id === service.id ? result.data : s)));
    setEditingId(null);
  }

  async function handleToggleActive(service: Service) {
    setPendingId(service.id);
    setError(null);
    const result = await updateAdminService(categoryId, service.id, { isActive: !service.isActive });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onServicesChange(services.map((s) => (s.id === service.id ? result.data : s)));
  }

  async function handleDelete(service: Service) {
    setPendingId(service.id);
    setError(null);
    const result = await deleteAdminService(categoryId, service.id);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onServicesChange(services.filter((s) => s.id !== service.id));
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">Services ({services.length})</h3>
          <p className="mt-0.5 text-xs text-text-grey">Offerings vendors in this category can select on their profile</p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-bold text-brand-primary hover:bg-surface-input"
          >
            + Add service
          </button>
        )}
      </div>

      {error && <div className="mb-3 rounded-md bg-red-10 p-2.5 text-[11px] text-red-70">{error}</div>}

      {adding && (
        <div className="mb-3">
          <ServiceForm saving={pendingId === "new"} onCancel={() => setAdding(false)} onSubmit={handleCreate} />
        </div>
      )}

      {services.length === 0 && !adding ? (
        <p className="text-xs text-text-grey">No services yet.</p>
      ) : (
        services.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[480px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-input text-xs text-text-grey">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Description (optional)</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) =>
                  editingId === service.id ? (
                    <tr key={service.id} className="border-b border-neutral-grey-20 last:border-b-0">
                      <td colSpan={3} className="p-3">
                        <ServiceForm
                          initial={service}
                          saving={pendingId === service.id}
                          onCancel={() => setEditingId(null)}
                          onSubmit={(values) => handleUpdate(service, values)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={service.id} className={`border-b border-neutral-grey-20 last:border-b-0 ${!service.isActive ? "opacity-60" : ""}`}>
                      <td className="px-3 py-2.5 font-bold">
                        {service.name}
                        {!service.isActive && <span className="ml-1.5 font-normal text-text-grey">· inactive</span>}
                      </td>
                      <td className="px-3 py-2.5 text-text-grey">{service.description ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            disabled={pendingId === service.id}
                            onClick={() => setEditingId(service.id)}
                            className="text-[12px] font-bold text-brand-primary hover:underline disabled:opacity-60"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={pendingId === service.id}
                            onClick={() => handleToggleActive(service)}
                            className="text-[12px] font-bold text-text-dark hover:underline disabled:opacity-60"
                          >
                            {service.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            disabled={pendingId === service.id}
                            onClick={() => handleDelete(service)}
                            className="text-[12px] font-bold text-red hover:underline disabled:opacity-60"
                          >
                            {pendingId === service.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

interface ServiceFormValues {
  name: string;
  description: string;
}

function ServiceForm({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial?: Service;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: ServiceFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError("Name is required");
      return;
    }

    onSubmit({ name: name.trim(), description: description.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border border-brand-primary bg-white p-3">
      {validationError && <p className="text-[11px] text-red-70">{validationError}</p>}
      <div className="flex flex-wrap gap-2">
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bridal Mehndi"
            maxLength={150}
            className="w-44 rounded-md border border-border px-2 py-1 text-xs"
          />
        </label>
        <label className="block flex-1">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Description (optional)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            className="w-full min-w-[200px] rounded-md border border-border px-2 py-1 text-xs"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : initial ? "Save" : "Add service"}
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
