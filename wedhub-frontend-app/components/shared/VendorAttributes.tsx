import type { VendorAttributeValue } from "@/lib/api/vendors.types";

function formatAttributeValue(value: VendorAttributeValue): string | null {
  switch (value.attribute.dataType) {
    case "TEXT":
    case "SELECT":
      return value.valueText;
    case "NUMBER":
      return value.valueNumber !== null ? Number(value.valueNumber).toLocaleString("en-IN") : null;
    case "BOOLEAN":
      return value.valueBoolean === null ? null : value.valueBoolean ? "Yes" : "No";
    case "MULTI_SELECT":
      return value.valueOptions.length > 0 ? value.valueOptions.join(", ") : null;
    default:
      return null;
  }
}

/** Renders category-specific attributes generically — never hardcoded to a single category's field set. */
export function VendorAttributes({ attributeValues }: { attributeValues: VendorAttributeValue[] }) {
  const rows = attributeValues
    .map((value) => ({ label: value.attribute.label, display: formatAttributeValue(value) }))
    .filter((row): row is { label: string; display: string } => row.display !== null);

  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3.5 max-[900px]:grid-cols-1">
      {rows.map((row) => (
        <div key={row.label} className="text-[13px]">
          <span className="mb-0.5 block text-text-grey">{row.label}</span>
          <span className="font-semibold">{row.display}</span>
        </div>
      ))}
    </div>
  );
}
