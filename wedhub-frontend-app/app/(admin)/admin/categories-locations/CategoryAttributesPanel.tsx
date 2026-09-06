"use client";

import { useState } from "react";
import { createAdminAttribute, deleteAdminAttribute, updateAdminAttribute } from "@/lib/api/admin-client";
import type { AttributeDataType, CategoryAttribute } from "@/lib/api/vendors.types";
import { formatApiError } from "@/lib/utils/error";

const DATA_TYPES: AttributeDataType[] = ["BOOLEAN", "NUMBER", "TEXT", "SELECT", "MULTI_SELECT"];
const OPTIONS_REQUIRED: AttributeDataType[] = ["SELECT", "MULTI_SELECT"];

/**
 * Category attribute management (added 2026-09-03) — the vendor-facing
 * fields a category's vendors fill in on their profile, and couples can
 * filter/compare by on search (e.g. Photography's "Photography Style",
 * "Drone Coverage"). The backend CRUD (POST/PATCH/DELETE
 * /categories/:id/attributes(/:attributeId)) already existed and was
 * already wired into admin-client.ts, but had no UI — this screen
 * previously only showed an attribute *count*, with nothing to click.
 * `key` is immutable after creation (confirmed via createAttributeSchema
 * vs. updateAttributeSchema — the latter has no `key` field at all) and
 * must be lowercase snake_case (backend regex `^[a-z][a-z0-9_]*$`).
 * `options` is required for SELECT/MULTI_SELECT and forbidden for every
 * other type (backend superRefine) — enforced client-side too so the
 * error surfaces before a round trip, not just after.
 */
export function CategoryAttributesPanel({
  categoryId,
  attributes,
  onAttributesChange,
}: {
  categoryId: string;
  attributes: CategoryAttribute[];
  onAttributesChange: (attributes: CategoryAttribute[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleCreate(input: AttributeFormValues) {
    setPendingId("new");
    setError(null);
    const result = await createAdminAttribute(categoryId, {
      key: input.key,
      label: input.label,
      dataType: input.dataType,
      options: OPTIONS_REQUIRED.includes(input.dataType) ? input.options : undefined,
      isFilterable: input.isFilterable,
      isComparable: input.isComparable,
    });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onAttributesChange([...attributes, result.data]);
    setAdding(false);
  }

  async function handleUpdate(attribute: CategoryAttribute, input: AttributeFormValues) {
    setPendingId(attribute.id);
    setError(null);
    const result = await updateAdminAttribute(categoryId, attribute.id, {
      label: input.label,
      options: OPTIONS_REQUIRED.includes(input.dataType) ? input.options : undefined,
      isFilterable: input.isFilterable,
      isComparable: input.isComparable,
    });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onAttributesChange(attributes.map((a) => (a.id === attribute.id ? result.data : a)));
    setEditingId(null);
  }

  async function handleDelete(attribute: CategoryAttribute) {
    setPendingId(attribute.id);
    setError(null);
    const result = await deleteAdminAttribute(categoryId, attribute.id);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onAttributesChange(attributes.filter((a) => a.id !== attribute.id));
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">Attributes ({attributes.length})</h3>
          <p className="mt-0.5 text-xs text-text-grey">Vendor profile fields &amp; search filters for this category</p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-bold text-brand-primary hover:bg-surface-input"
          >
            + Add attribute
          </button>
        )}
      </div>

      {error && <div className="mb-3 rounded-md bg-red-10 p-2.5 text-[11px] text-red-70">{error}</div>}

      {adding && (
        <div className="mb-3">
          <AttributeForm saving={pendingId === "new"} onCancel={() => setAdding(false)} onSubmit={handleCreate} />
        </div>
      )}

      {attributes.length === 0 && !adding ? (
        <p className="text-xs text-text-grey">No attributes yet.</p>
      ) : (
        attributes.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-input text-xs text-text-grey">
                  <th className="px-3 py-2 font-semibold">Key</th>
                  <th className="px-3 py-2 font-semibold">Label</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 text-center font-semibold">Searchable</th>
                  <th className="px-3 py-2 text-center font-semibold">Comparison</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map((attribute) =>
                  editingId === attribute.id ? (
                    <tr key={attribute.id} className="border-b border-neutral-grey-20 last:border-b-0">
                      <td colSpan={6} className="p-3">
                        <AttributeForm
                          initial={attribute}
                          lockDataType
                          lockKey
                          saving={pendingId === attribute.id}
                          onCancel={() => setEditingId(null)}
                          onSubmit={(values) => handleUpdate(attribute, values)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={attribute.id} className="border-b border-neutral-grey-20 last:border-b-0">
                      <td className="px-3 py-2.5">
                        <code className="rounded bg-surface-input px-1 py-0.5 text-[11px] text-text-grey">{attribute.key}</code>
                      </td>
                      <td className="px-3 py-2.5 font-bold">
                        {attribute.label}
                        {attribute.options && attribute.options.length > 0 && (
                          <div className="mt-0.5 text-[11px] font-normal text-text-grey">{attribute.options.join(", ")}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-text-grey">{attribute.dataType}</td>
                      <td className="px-3 py-2.5 text-center">{attribute.isFilterable ? "✓" : "—"}</td>
                      <td className="px-3 py-2.5 text-center">{attribute.isComparable ? "✓" : "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            disabled={pendingId === attribute.id}
                            onClick={() => setEditingId(attribute.id)}
                            className="text-[12px] font-bold text-brand-primary hover:underline disabled:opacity-60"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={pendingId === attribute.id}
                            onClick={() => handleDelete(attribute)}
                            className="text-[12px] font-bold text-red hover:underline disabled:opacity-60"
                          >
                            {pendingId === attribute.id ? "…" : "Delete"}
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

interface AttributeFormValues {
  key: string;
  label: string;
  dataType: AttributeDataType;
  options?: string[];
  isFilterable: boolean;
  isComparable: boolean;
}

function AttributeForm({
  initial,
  lockDataType,
  lockKey,
  saving,
  onCancel,
  onSubmit,
}: {
  initial?: CategoryAttribute;
  lockDataType?: boolean;
  lockKey?: boolean;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: AttributeFormValues) => void;
}) {
  const [key, setKey] = useState(initial?.key ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [dataType, setDataType] = useState<AttributeDataType>(initial?.dataType ?? "TEXT");
  const [optionsText, setOptionsText] = useState((initial?.options ?? []).join(", "));
  const [isFilterable, setIsFilterable] = useState(initial?.isFilterable ?? false);
  const [isComparable, setIsComparable] = useState(initial?.isComparable ?? false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const needsOptions = OPTIONS_REQUIRED.includes(dataType);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    if (!lockKey && !/^[a-z][a-z0-9_]*$/.test(key)) {
      setValidationError("Key must be lowercase snake_case, starting with a letter (e.g. drone_coverage)");
      return;
    }
    if (!label.trim()) {
      setValidationError("Label is required");
      return;
    }
    const options = needsOptions
      ? optionsText
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined;
    if (needsOptions && (!options || options.length === 0)) {
      setValidationError(`At least one option is required for ${dataType}`);
      return;
    }

    onSubmit({ key, label: label.trim(), dataType, options, isFilterable, isComparable });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border border-brand-primary bg-white p-3">
      {validationError && <p className="text-[11px] text-red-70">{validationError}</p>}
      <div className="flex flex-wrap gap-2">
        {!lockKey && (
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Key (snake_case, permanent)</span>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="drone_coverage"
              maxLength={100}
              className="w-40 rounded-md border border-border px-2 py-1 text-xs"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Drone Coverage"
            maxLength={150}
            className="w-44 rounded-md border border-border px-2 py-1 text-xs"
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Type</span>
          <select
            value={dataType}
            disabled={lockDataType}
            onChange={(e) => setDataType(e.target.value as AttributeDataType)}
            className="w-32 rounded-md border border-border px-2 py-1 text-xs disabled:bg-surface-input"
          >
            {DATA_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {needsOptions && (
          <label className="block flex-1">
            <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Options (comma-separated)</span>
            <input
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder="Traditional, Candid, Documentary"
              className="w-full min-w-[200px] rounded-md border border-border px-2 py-1 text-xs"
            />
          </label>
        )}
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-[11px] text-text-grey">
          <input type="checkbox" checked={isFilterable} onChange={(e) => setIsFilterable(e.target.checked)} />
          Filterable on search
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-text-grey">
          <input type="checkbox" checked={isComparable} onChange={(e) => setIsComparable(e.target.checked)} />
          Shown in comparison
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : initial ? "Save" : "Add attribute"}
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
