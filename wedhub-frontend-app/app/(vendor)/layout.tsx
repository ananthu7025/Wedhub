import { requireVendorOwnership } from "@/lib/auth/require-vendor";

/**
 * Every (vendor) route requires an authenticated VENDOR who owns a vendor
 * row — see lib/auth/require-vendor.ts's header comment for why role alone
 * isn't sufficient.
 */
export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  await requireVendorOwnership();
  return <>{children}</>;
}
