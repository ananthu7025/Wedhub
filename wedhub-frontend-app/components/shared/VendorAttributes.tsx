import type { ReactNode } from "react";
import type { AttributeDataType, VendorAttributeValue } from "@/lib/api/vendors.types";

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

// One icon per field *type*, not per specific label — attribute labels are
// arbitrary admin-configured text ("Services Offered", "Team Size", ...)
// with no reliable way to derive a semantically precise icon per label
// without hardcoding this component to one category's field set, which its
// own original comment explicitly rules out. Typed this way, the icon is
// always an honest reflection of what kind of value the row holds.
function AttributeTypeIcon({ dataType, className }: { dataType: AttributeDataType; className?: string }) {
  switch (dataType) {
    case "BOOLEAN":
      return (
        <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10.5l4 4 8-9" />
        </svg>
      );
    case "NUMBER":
    case "NUMBER_RANGE":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 9h14M5 15h14M9 4l-2 16M17 4l-2 16" />
        </svg>
      );
    case "MULTI_SELECT":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    case "TIME":
    case "TIME_RANGE":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );
    case "SELECT":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.5 12.5v6a1 1 0 01-1 1h-6l-9-9 7-7 9 9z" />
          <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3.5h9l4.5 4.5v12.5a1 1 0 01-1 1H6a1 1 0 01-1-1V4.5a1 1 0 011-1z" />
          <path d="M9 12h7M9 16h7" />
        </svg>
      );
  }
}

/**
 * Renders category-specific attributes generically — never hardcoded to a
 * single category's field set. `leadingRow` is an optional extra row
 * rendered first (this page uses it for the vendor's tagline), styled
 * identically to a real attribute row so the section reads as one
 * consistent list rather than two different visual patterns stitched
 * together.
 */
export function VendorAttributes({
  attributeValues,
  leadingRow,
}: {
  attributeValues: VendorAttributeValue[];
  leadingRow?: { label: string; value: ReactNode };
}) {
  const rows = attributeValues
    .map((value) => ({
      label: value.attribute.label,
      display: formatAttributeValue(value),
      dataType: value.attribute.dataType,
    }))
    .filter((row): row is { label: string; display: string; dataType: AttributeDataType } => row.display !== null);

  if (rows.length === 0 && !leadingRow) return null;

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 max-[900px]:grid-cols-1">
      {leadingRow && (
        <div className="flex items-start gap-3 text-[13px]">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-crimson-10 text-crimson-70">
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10.5l4 4 8-9" />
            </svg>
          </span>
          <div className="min-w-0">
            <span className="mb-0.5 block text-text-grey">{leadingRow.label}</span>
            <span className="font-semibold">{leadingRow.value}</span>
          </div>
        </div>
      )}
      {rows.map((row) => (
        <div key={row.label} className="flex items-start gap-3 text-[13px]">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-crimson-10 text-crimson-70">
            <AttributeTypeIcon dataType={row.dataType} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <span className="mb-0.5 block text-text-grey">{row.label}</span>
            <span className="font-semibold">{row.display}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
