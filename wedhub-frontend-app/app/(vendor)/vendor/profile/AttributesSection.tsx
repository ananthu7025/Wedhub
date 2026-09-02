import type { CategoryAttributeSelf } from "@/lib/api/vendor-self.types";

type AttributeValueMap = Record<string, string | number | boolean | string[]>;

/**
 * Generic, editable category-attribute form — switches on dataType, never
 * hardcoded to a single category's field set (same principle as the
 * couple-facing read-only VendorAttributes.tsx from Frontend Arch Phase 2).
 */
export function AttributesSection({
  attributes,
  values,
  onChange,
}: {
  attributes: CategoryAttributeSelf[];
  values: AttributeValueMap;
  onChange: (next: AttributeValueMap) => void;
}) {
  function setValue(attributeId: string, value: string | number | boolean | string[]) {
    onChange({ ...values, [attributeId]: value });
  }

  return (
    <div className="grid grid-cols-2 gap-3.5 max-[700px]:grid-cols-1">
      {attributes.map((attribute) => {
        const value = values[attribute.id];

        if (attribute.dataType === "TEXT") {
          return (
            <label key={attribute.id} className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">{attribute.label}</span>
              <input
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setValue(attribute.id, e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
            </label>
          );
        }

        if (attribute.dataType === "NUMBER") {
          return (
            <label key={attribute.id} className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">{attribute.label}</span>
              <input
                type="number"
                value={typeof value === "number" ? value : ""}
                onChange={(e) => setValue(attribute.id, e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-md border border-border px-3 py-2.5 text-sm"
              />
            </label>
          );
        }

        if (attribute.dataType === "BOOLEAN") {
          return (
            <label key={attribute.id} className="flex items-center justify-between gap-4 py-2 text-sm">
              <span className="text-[13px] font-bold">{attribute.label}</span>
              <input
                type="checkbox"
                checked={value === true}
                onChange={(e) => setValue(attribute.id, e.target.checked)}
                className="h-5 w-5 accent-brand-primary"
              />
            </label>
          );
        }

        if (attribute.dataType === "SELECT") {
          return (
            <label key={attribute.id} className="block text-sm">
              <span className="mb-1.5 block font-bold text-[13px]">{attribute.label}</span>
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
            </label>
          );
        }

        // MULTI_SELECT
        const selectedOptions = Array.isArray(value) ? value : [];
        return (
          <div key={attribute.id} className="text-sm">
            <span className="mb-1.5 block font-bold text-[13px]">{attribute.label}</span>
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
          </div>
        );
      })}
    </div>
  );
}
