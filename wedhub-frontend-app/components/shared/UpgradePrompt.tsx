import Link from "next/link";
import { VendorShell } from "./VendorShell";

/**
 * Shown in place of a gated page's real content when the vendor's current
 * plan doesn't include the feature — checked server-side via
 * GET /vendors/me/effective-plan before the page renders, so a FREE vendor
 * sees this instead of a form they'd only discover was blocked after
 * submitting (the backend's 403 from assertVendorFeatureAccess is still the
 * real enforcement; this is the "explain before they invest effort" layer
 * on top of it — see PLAN-2026-09-22-dynamic-plans-and-feature-registry.md
 * §7b/§10 for the original design of this pattern).
 *
 * Reuses VendorShell so the vendor isn't stranded outside their normal nav —
 * same shell as every other vendor page, just with an empty-state body.
 */
export function UpgradePrompt({
  feature,
  description,
  activeHref,
  vendorName,
  vendorSlug,
}: {
  feature: string;
  description: string;
  activeHref: string;
  vendorName: string;
  vendorSlug?: string;
}) {
  return (
    <VendorShell activeHref={activeHref} vendorName={vendorName} vendorSlug={vendorSlug}>
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-bold text-text-dark">{feature} is a plan upgrade away</h1>
        <p className="mb-6 max-w-md text-sm text-text-grey">{description}</p>
        <Link
          href="/vendor/subscription"
          className="rounded-md bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          View plans
        </Link>
      </div>
    </VendorShell>
  );
}
