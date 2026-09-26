import Link from "next/link";
import type { Metadata } from "next";
import { PublicTopbar, CoupleBottomNav } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { compareVendors } from "@/lib/api/shortlists";
import { ApiRequestError } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";

// Item: /compare moved out of app/(couple) so a signed-out visitor can
// select and view a comparison without being redirected to login (the
// backend's GET /comparison/vendors this reads from already skips auth —
// see lib/api/shortlists.ts's compareVendors, skipAuth: true). It lost the
// (couple) layout's blanket `robots: {index:false}` metadata by moving, so
// it's set explicitly here instead — this is a utility/session-driven page
// (its content is just whatever vendorIds happen to be in the URL), not an
// evergreen landing page worth indexing. app/robots.ts's crawl-directive
// disallow for "/compare" still applies too (defense in depth).
export const metadata: Metadata = {
  title: "Compare Vendors",
  robots: { index: false, follow: false },
};

interface ComparePageProps {
  // Item 16: comparison is no longer shortlist-only — `from` tells the page
  // which back-link/nav context to show (shortlist vs. search results),
  // defaulting to shortlist for any old/bookmarked link with no `from`.
  searchParams: Promise<{ vendorIds?: string; from?: string }>;
}

function formatAttributeValue(value: string | number | boolean | string[] | null): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  return String(value);
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { vendorIds: vendorIdsParam, from } = await searchParams;
  const vendorIds = vendorIdsParam ? vendorIdsParam.split(",").filter(Boolean) : [];
  const backHref = from === "search" ? "/search" : "/shortlist";
  const backLabel = from === "search" ? "← Back to search" : "← Back to shortlist";

  let errorMessage: string | null = null;
  let result: Awaited<ReturnType<typeof compareVendors>>["data"] | null = null;

  if (vendorIds.length < 2) {
    errorMessage = "Select at least 2 vendors to compare.";
  } else if (vendorIds.length > 5) {
    errorMessage = "You can compare up to 5 vendors at a time.";
  } else {
    try {
      const response = await compareVendors(vendorIds);
      result = response.data;
    } catch (error) {
      // Item 16: this is where the backend's "must share the same primary
      // category" rejection (comparison.service.ts) actually surfaces —
      // vendors picked from anywhere (search results, not just the
      // shortlist) can now span categories, so this is a real, reachable
      // error state rather than a defensive fallback.
      errorMessage = error instanceof ApiRequestError ? error.message : "Could not load comparison.";
    }
  }

  return (
    <>
      <PublicTopbar activeHref={backHref} />
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
          <Link href={backHref} className="rounded-md border border-border bg-white px-4 py-2.5 text-sm font-bold no-underline">
            {backLabel}
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
      <PublicFooter />
      <CoupleBottomNav activeHref={backHref} />
    </>
  );
}
