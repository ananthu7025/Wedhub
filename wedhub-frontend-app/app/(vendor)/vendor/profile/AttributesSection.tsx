import type { CategoryAttributeSelf, MediaItem } from "@/lib/api/vendor-self.types";
import { LogoCoverPicker } from "./LogoCoverPicker";

type NumberRangeValue = { min: number; max: number };
type TimeValue = { time: string };
type TimeRangeValue = { start: string; end: string };
export type AttributeValue = string | number | boolean | string[] | NumberRangeValue | TimeValue | TimeRangeValue;
export type AttributeValueMap = Record<string, AttributeValue>;

const WIDE_ASPECT_RATIOS = new Set(["16:9", "3:2"]);

/**
 * Generic, editable category-attribute form — switches on dataType, never
 * hardcoded to a single category's field set (same principle as the
 * couple-facing read-only VendorAttributes.tsx from Frontend Arch Phase 2).
 *
 * Extended 2026-09-11 for the Category Details form builder: TEXTAREA,
 * NUMBER_RANGE, IMAGE, PHONE, URL, EMAIL, TIME, TIME_RANGE, plus
 * placeholder/helpText passthrough and a RADIO uiVariant on SELECT.
 * DROPDOWN_RANGE/CHECKBOX from the original spec aren't separate cases here
 * — they're SELECT (range-labeled options) and BOOLEAN respectively.
 */
export function AttributesSection({
  attributes,
  values,
  onChange,
  mediaByAttributeId,
}: {
  attributes: CategoryAttributeSelf[];
  values: AttributeValueMap;
  onChange: (next: AttributeValueMap) => void;
  mediaByAttributeId: Record<string, MediaItem>;
}) {
  function setValue(attributeId: string, value: AttributeValue) {
    onChange({ ...values, [attributeId]: value });
  }

  function labelWithMarker(attribute: CategoryAttributeSelf) {
    return (
      <>
        {attribute.label}
        {attribute.isRequired && <span className="text-red"> *</span>}
      </>
    );
  }

  function helpText(attribute: CategoryAttributeSelf) {
    if (!attribute.helpText) return null;
    return <p className="mt-1 text-xs text-text-grey">{attribute.helpText}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3.5 max-[700px]:grid-cols-1">
      {attributes.map((attribute) => {
        const value = values[attribute.id];

        if (attribute.dataType === "TEXT") {
          return (
            <label key={attribute.id} className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">{labelWithMarker(attribute)}</span>
              <input
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setValue(attribute.id, e.target.value)}
                placeholder={attribute.placeholder ?? undefined}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              {helpText(attribute)}
            </label>
          );
        }

        if (attribute.dataType === "TEXTAREA") {
          return (
            <label key={attribute.id} className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">{labelWithMarker(attribute)}</span>
              <textarea
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setValue(attribute.id, e.target.value)}
                placeholder={attribute.placeholder ?? undefined}
                className="min-h-[80px] w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              {helpText(attribute)}
            </label>
          );
        }

        if (attribute.dataType === "PHONE") {
          return (
            <label key={attribute.id} className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">{labelWithMarker(attribute)}</span>
              <input
                type="tel"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setValue(attribute.id, e.target.value)}
                placeholder={attribute.placeholder ?? undefined}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              {helpText(attribute)}
            </label>
          );
        }

        if (attribute.dataType === "EMAIL") {
          return (
            <label key={attribute.id} className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">{labelWithMarker(attribute)}</span>
              <input
                type="email"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setValue(attribute.id, e.target.value)}
                placeholder={attribute.placeholder ?? undefined}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              {helpText(attribute)}
            </label>
          );
        }

        if (attribute.dataType === "URL") {
          return (
            <label key={attribute.id} className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">{labelWithMarker(attribute)}</span>
              <input
                type="url"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setValue(attribute.id, e.target.value)}
                placeholder={attribute.placeholder ?? undefined}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              {helpText(attribute)}
            </label>
          );
        }

        if (attribute.dataType === "NUMBER") {
          return (
            <label key={attribute.id} className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">{labelWithMarker(attribute)}</span>
              <input
                type="number"
                value={typeof value === "number" ? value : ""}
                onChange={(e) => setValue(attribute.id, e.target.value === "" ? "" : Number(e.target.value))}
                placeholder={attribute.placeholder ?? undefined}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              {helpText(attribute)}
            </label>
          );
        }

        if (attribute.dataType === "NUMBER_RANGE") {
          const range = value && typeof value === "object" && "min" in value ? (value as NumberRangeValue) : undefined;
          return (
            <div key={attribute.id} className="text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">{labelWithMarker(attribute)}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  aria-label={`${attribute.label} minimum`}
                  value={range?.min ?? ""}
                  onChange={(e) =>
                    setValue(attribute.id, { min: e.target.value === "" ? NaN : Number(e.target.value), max: range?.max ?? NaN })
                  }
                  placeholder="Min"
                  className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
                />
                <span className="text-text-grey">–</span>
                <input
                  type="number"
                  aria-label={`${attribute.label} maximum`}
                  value={range?.max ?? ""}
                  onChange={(e) =>
                    setValue(attribute.id, { min: range?.min ?? NaN, max: e.target.value === "" ? NaN : Number(e.target.value) })
                  }
                  placeholder="Max"
                  className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
                />
              </div>
              {helpText(attribute)}
            </div>
          );
        }

        if (attribute.dataType === "TIME") {
          const time = value && typeof value === "object" && "time" in value ? (value as TimeValue).time : "";
          return (
            <label key={attribute.id} className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">{labelWithMarker(attribute)}</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setValue(attribute.id, { time: e.target.value })}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
              {helpText(attribute)}
            </label>
          );
        }

        if (attribute.dataType === "TIME_RANGE") {
          const range = value && typeof value === "object" && "start" in value ? (value as TimeRangeValue) : undefined;
          return (
            <div key={attribute.id} className="text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">{labelWithMarker(attribute)}</span>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  aria-label={`${attribute.label} start`}
                  value={range?.start ?? ""}
                  onChange={(e) => setValue(attribute.id, { start: e.target.value, end: range?.end ?? "" })}
                  className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
                />
                <span className="text-text-grey">–</span>
                <input
                  type="time"
                  aria-label={`${attribute.label} end`}
                  value={range?.end ?? ""}
                  onChange={(e) => setValue(attribute.id, { start: range?.start ?? "", end: e.target.value })}
                  className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
                />
              </div>
              {helpText(attribute)}
            </div>
          );
        }

        if (attribute.dataType === "BOOLEAN") {
          return (
            <label key={attribute.id} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span className="text-[13px] font-bold">{labelWithMarker(attribute)}</span>
              <input
                type="checkbox"
                checked={value === true}
                onChange={(e) => setValue(attribute.id, e.target.checked)}
                className="h-5 w-5 accent-brand-primary"
              />
            </label>
          );
        }

        if (attribute.dataType === "IMAGE") {
          const mediaId = typeof value === "string" ? value : null;
          const media = mediaByAttributeId[attribute.id];
          const shape = attribute.aspectRatio && WIDE_ASPECT_RATIOS.has(attribute.aspectRatio) ? "wide" : "square";
          return (
            <div key={attribute.id}>
              <LogoCoverPicker
                label={attribute.label}
                mediaId={mediaId}
                initialObjectKey={media?.optimizedObjectKey ?? media?.originalObjectKey ?? null}
                onChange={(next) => setValue(attribute.id, next ?? "")}
                mediaType="CATEGORY_ATTRIBUTE_PHOTO"
                shape={shape}
              />
              {attribute.aspectRatio && (
                <p className="mt-1 text-xs text-text-grey">Recommended aspect ratio: {attribute.aspectRatio}</p>
              )}
              {helpText(attribute)}
            </div>
          );
        }

        if (attribute.dataType === "SELECT") {
          if (attribute.uiVariant === "RADIO") {
            return (
              <fieldset key={attribute.id} className="text-sm">
                <legend className="mb-1.5 font-bold text-[13px]">{labelWithMarker(attribute)}</legend>
                <div className="flex flex-col gap-1.5">
                  {(attribute.options ?? []).map((option) => (
                    <label key={option} className="flex items-center gap-2 text-[13px]">
                      <input
                        type="radio"
                        name={attribute.id}
                        checked={value === option}
                        onChange={() => setValue(attribute.id, option)}
                        className="accent-brand-primary"
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {helpText(attribute)}
              </fieldset>
            );
          }
          return (
            <label key={attribute.id} className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">{labelWithMarker(attribute)}</span>
              <select
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setValue(attribute.id, e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              >
                <option value="">Select…</option>
                {(attribute.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {helpText(attribute)}
            </label>
          );
        }

        // MULTI_SELECT
        const selectedOptions = Array.isArray(value) ? value : [];
        return (
          <div key={attribute.id} className="text-sm">
            <span className="mb-1.5 block font-bold text-[13px]">{labelWithMarker(attribute)}</span>
            <div className="flex flex-col gap-1.5">
              {(attribute.options ?? []).map((option) => (
                <label key={option} className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selectedOptions, option]
                        : selectedOptions.filter((o) => o !== option);
                      setValue(attribute.id, next);
                    }}
                    className="accent-brand-primary"
                  />
                  {option}
                </label>
              ))}
            </div>
            {helpText(attribute)}
          </div>
        );
      })}
    </div>
  );
}

