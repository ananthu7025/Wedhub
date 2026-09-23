"use client";

import { useState } from "react";
import {
  createAdminCatalogVariantField,
  deleteAdminCatalogVariantField,
  reorderAdminCatalogVariantFields,
  updateAdminCatalogVariantField,
} from "@/lib/api/admin-client";
import type { AttributeDataType, CatalogVariantField } from "@/lib/api/vendor-catalog.types";
import { formatApiError } from "@/lib/utils/error";

// Same 13-type list CategoryAttributesPanel uses — vendor catalog variants
// reuse AttributeDataType rather than a second type system. Options-required
// types match that panel's OPTIONS_REQUIRED constant.
const DATA_TYPES: AttributeDataType[] = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "NUMBER_RANGE",
  "BOOLEAN",
  "SELECT",
  "MULTI_SELECT",
  "PHONE",
  "URL",
  "TIME",
  "TIME_RANGE",
];
const OPTIONS_REQUIRED: AttributeDataType[] = ["SELECT", "MULTI_SELECT"];

/**
 * Admin configuration for a category's vendor-catalog variant shape (items
 * 1/2/3/5/10/12) — e.g. Wedding Cars gets withDriver (BOOLEAN), kmIncluded
 * (NUMBER); Bridal Wear gets size (SELECT), color (TEXT). This defines the
 * keys a vendor's CatalogItemVariant.attributes Json bag may contain for
 * catalog-enabled categories, mirroring CategoryAttributesPanel's own
 * key/label/dataType/options/reorder pattern exactly, but scoped to variant
 * shape rather than the vendor's profile-level Category Details fields.
 * IMAGE/EMAIL are intentionally excluded from DATA_TYPES here — a variant
 * is a row of a catalog item that already has its own media gallery and no
 * separate contact-email concept, unlike a full Category Details field.
 */
export function CategoryCatalogVariantFieldsPanel({
  categoryId,
  fields,
  onFieldsChange,
}: {
  categoryId: string;
  fields: CatalogVariantField[];
  onFieldsChange: (fields: CatalogVariantField[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleCreate(input: FieldFormValues) {
    setPendingId("new");
    setError(null);
    const result = await createAdminCatalogVariantField(categoryId, {
      key: input.key,
      label: input.label,
      dataType: input.dataType,
      options: OPTIONS_REQUIRED.includes(input.dataType) ? input.options : undefined,
      isRequired: input.isRequired,
    });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onFieldsChange([...fields, result.data]);
    setAdding(false);
  }

  async function handleUpdate(field: CatalogVariantField, input: FieldFormValues) {
    setPendingId(field.id);
    setError(null);
    const result = await updateAdminCatalogVariantField(categoryId, field.id, {
      label: input.label,
      options: OPTIONS_REQUIRED.includes(input.dataType) ? input.options : undefined,
      isRequired: input.isRequired,
    });
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onFieldsChange(fields.map((f) => (f.id === field.id ? result.data : f)));
    setEditingId(null);
  }

  async function handleDelete(field: CatalogVariantField) {
    setPendingId(field.id);
    setError(null);
    const result = await deleteAdminCatalogVariantField(categoryId, field.id);
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onFieldsChange(fields.filter((f) => f.id !== field.id));
  }

  async function handleMove(field: CatalogVariantField, direction: "up" | "down") {
    const index = fields.findIndex((f) => f.id === field.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= fields.length) {
      return;
    }

    const reordered = [...fields];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setPendingId(field.id);
    setError(null);
    const result = await reorderAdminCatalogVariantFields(categoryId, reordered.map((f) => f.id));
    setPendingId(null);
    if (!result.success) {
      setError(formatApiError(result.error));
      return;
    }
    onFieldsChange(result.data);
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">Catalog variant fields ({fields.length})</h3>
          <p className="mt-0.5 text-xs text-text-grey">
            Attributes a vendor's catalog item variants can carry (e.g. size, color, with-driver)
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-bold text-brand-primary hover:bg-surface-input"
          >
            + Add field
          </button>
        )}
      </div>

      {error && <div className="mb-3 rounded-md bg-red-10 p-2.5 text-[11px] text-red-70">{error}</div>}

      {adding && (
        <div className="mb-3">
          <FieldForm saving={pendingId === "new"} onCancel={() => setAdding(false)} onSubmit={handleCreate} />
        </div>
      )}

      {fields.length === 0 && !adding ? (
        <p className="text-xs text-text-grey">No variant fields yet — vendors in this category can't add item variants until at least one is configured.</p>
      ) : (
        fields.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-input text-xs text-text-grey">
                  <th className="px-3 py-2 font-semibold">Order</th>
                  <th className="px-3 py-2 font-semibold">Key</th>
                  <th className="px-3 py-2 font-semibold">Label</th>
                  <th className="px-3 py-2 font-semibold">Type</th>
                  <th className="px-3 py-2 text-center font-semibold">Required</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) =>
                  editingId === field.id ? (
                    <tr key={field.id} className="border-b border-neutral-grey-20 last:border-b-0">
                      <td colSpan={6} className="p-3">
                        <FieldForm
                          initial={field}
                          lockDataType
                          lockKey
                          saving={pendingId === field.id}
                          onCancel={() => setEditingId(null)}
                          onSubmit={(values) => handleUpdate(field, values)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={field.id} className="border-b border-neutral-grey-20 last:border-b-0">
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col leading-none">
                          <button
                            type="button"
                            disabled={pendingId !== null || index === 0}
                            onClick={() => handleMove(field, "up")}
                            aria-label={`Move ${field.label} up`}
                            className="px-1 py-0.5 text-text-grey hover:text-brand-primary disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={pendingId !== null || index === fields.length - 1}
                            onClick={() => handleMove(field, "down")}
                            aria-label={`Move ${field.label} down`}
                            className="px-1 py-0.5 text-text-grey hover:text-brand-primary disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <code className="rounded bg-surface-input px-1 py-0.5 text-[11px] text-text-grey">{field.key}</code>
                      </td>
                      <td className="px-3 py-2.5 font-bold">
                        {field.label}
                        {Array.isArray(field.options) && field.options.length > 0 && (
                          <div className="mt-0.5 text-[11px] font-normal text-text-grey">
                            {(field.options as string[]).join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-text-grey">{field.dataType}</td>
                      <td className="px-3 py-2.5 text-center">{field.isRequired ? "✓" : "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            disabled={pendingId === field.id}
                            onClick={() => setEditingId(field.id)}
                            className="text-[12px] font-bold text-brand-primary hover:underline disabled:opacity-60"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={pendingId === field.id}
                            onClick={() => handleDelete(field)}
                            className="text-[12px] font-bold text-red hover:underline disabled:opacity-60"
                          >
                            {pendingId === field.id ? "…" : "Delete"}
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

interface FieldFormValues {
  key: string;
  label: string;
  dataType: AttributeDataType;
  options?: string[];
  isRequired: boolean;
}

function FieldForm({
  initial,
  lockDataType,
  lockKey,
  saving,
  onCancel,
  onSubmit,
}: {
  initial?: CatalogVariantField;
  lockDataType?: boolean;
  lockKey?: boolean;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: FieldFormValues) => void;
}) {
  const [key, setKey] = useState(initial?.key ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [dataType, setDataType] = useState<AttributeDataType>(initial?.dataType ?? "TEXT");
  const [optionsText, setOptionsText] = useState(
    Array.isArray(initial?.options) ? (initial.options as string[]).join(", ") : "",
  );
  const [isRequired, setIsRequired] = useState(initial?.isRequired ?? false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const needsOptions = OPTIONS_REQUIRED.includes(dataType);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setValidationError(null);

    if (!lockKey && !/^[a-zA-Z][a-zA-Z0-9]*$/.test(key)) {
      setValidationError("Key must be a single camelCase identifier (e.g. withDriver)");
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

    onSubmit({ key, label: label.trim(), dataType, options, isRequired });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border border-brand-primary bg-white p-3">
      {validationError && <p className="text-[11px] text-red-70">{validationError}</p>}
      <div className="flex flex-wrap items-end gap-2">
        {!lockKey && (
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Key (camelCase, permanent)</span>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="withDriver"
              maxLength={50}
              className="w-40 rounded-md border border-border px-2 py-1 text-xs"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-0.5 block text-[10px] font-semibold text-text-grey">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="With Driver"
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
              placeholder="S, M, L, XL"
              className="w-full min-w-[200px] rounded-md border border-border px-2 py-1 text-xs"
            />
          </label>
        )}
        <label className="flex items-center gap-1.5 pb-1 text-[11px] font-semibold text-text-grey">
          <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="accent-brand-primary" />
          Required
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving} className="rounded-md bg-brand-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-md border border-border px-3 py-1.5 text-xs font-bold text-text-grey hover:bg-surface-input">
          Cancel
        </button>
      </div>
    </form>
  );
}
