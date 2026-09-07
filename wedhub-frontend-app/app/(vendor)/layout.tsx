import type { Metadata } from "next";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";

/**
 * Every (vendor) route requires an authenticated VENDOR who owns a vendor
 * row — see lib/auth/require-vendor.ts's header comment for why role alone
 * isn't sufficient.
 *
 * robots: noindex is page-level defense in depth alongside app/robots.ts's
 * "/vendor" crawl-directive disallow (a crawler that ignores robots.txt
 * would otherwise still see an indexable dashboard page).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  await requireVendorOwnership();
  return <>{children}</>;
}
