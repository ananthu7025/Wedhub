import Link from "next/link";
import type { Metadata } from "next";
import { CoupleShell } from "@/components/shared/CoupleShell";
import { compareVendors } from "@/lib/api/shortlists";
import { ApiRequestError } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Compare Vendors",
};

interface ComparePageProps {
  searchParams: Promise<{ vendorIds?: string }>;
}

function formatAttributeValue(value: string | number | boolean | string[] | null): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  return String(value);
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { vendorIds: vendorIdsParam } = await searchParams;
  const vendorIds = vendorIdsParam ? vendorIdsParam.split(",").filter(Boolean) : [];

  let errorMessage: string | null = null;
  let result: Awaited<ReturnType<typeof compareVendors>>["data"] | null = null;

  if (vendorIds.length < 2) {
    errorMessage = "Select at least 2 vendors from your shortlist to compare.";
  } else {
    try {
      const response = await compareVendors(vendorIds);
      result = response.data;
    } catch (error) {
      errorMessage = error instanceof ApiRequestError ? error.message : "Could not load comparison.";
    }
  }

  return (
    <CoupleShell activeHref="/shortlist">
      <div className="mx-auto max-w-[1200px] px-10 py-7 max-[900px]:px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Compare vendors</h1>
            {result && (
              <p className="text-sm text-text-grey">
                Comparing {result.vendors.length} {result.category?.name.toLowerCase() ?? "vendors"}
              </p>
            )}
          </div>
          <Link href="/shortlist" className="rounded-md border border-border bg-white px-4 py-2.5 text-sm font-bold no-underline">
            ← Back to shortlist
          </Link>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-border bg-white px-6 py-12 text-center">
            <p className="text-sm text-text-grey">{errorMessage}</p>
          </div>
        )}

        {result && (
          <div className="overflow-x-auto rounded-xl border border-border bg-white">
            <table className="w-full min-w-[720px] border-collapse">
              <tbody>
                <tr>
                  <td className="w-40 border-b border-border bg-surface-input p-4" />
                  {result.vendors.map((vendor) => (
                    <td key={vendor.id} className="w-60 border-b border-border p-4 align-top">
                      <div className="mb-1 text-[15px] font-bold">{vendor.businessName}</div>
                      {vendor.verificationLevel !== "UNVERIFIED" && <Badge variant="green">✓ Verified</Badge>}
                      <div className="mt-2">
                        <Link href={`/vendors/${vendor.slug}`} className="text-[13px] font-bold text-brand-primary no-underline">
                          View profile →
                        </Link>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border-b border-border bg-surface-input p-4 text-xs font-bold tracking-wide text-text-grey uppercase">
                    Starting price
                  </td>
                  {result.vendors.map((vendor) => (
                    <td key={vendor.id} className="border-b border-border p-4 text-sm">
                      {vendor.startingPrice !== null ? (
                        <strong>
                          {vendor.currency === "INR" ? "₹" : (vendor.currency ?? "")}
                          {Number(vendor.startingPrice).toLocaleString("en-IN")}
                        </strong>
                      ) : (
                        "—"
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border-b border-border bg-surface-input p-4 text-xs font-bold tracking-wide text-text-grey uppercase">
                    Location
                  </td>
                  {result.vendors.map((vendor) => (
                    <td key={vendor.id} className="border-b border-border p-4 text-sm">
                      {vendor.city ?? "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border-b border-border bg-surface-input p-4 text-xs font-bold tracking-wide text-text-grey uppercase">
                    Experience
                  </td>
                  {result.vendors.map((vendor) => (
                    <td key={vendor.id} className="border-b border-border p-4 text-sm">
                      {vendor.yearsExperience !== null ? `${vendor.yearsExperience} years` : "—"}
                    </td>
                  ))}
                </tr>
                {result.attributes.map((attribute) => (
                  <tr key={attribute.id}>
                    <td className="border-b border-border bg-surface-input p-4 text-xs font-bold tracking-wide text-text-grey uppercase">
                      {attribute.label}
                    </td>
                    {result.vendors.map((vendor) => (
                      <td key={vendor.id} className="border-b border-border p-4 text-sm">
                        {formatAttributeValue(vendor.attributeValues[attribute.key] ?? null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CoupleShell>
  );
}
