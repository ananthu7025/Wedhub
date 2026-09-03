import Link from "next/link";
import { PublicTopbar } from "@/components/shared/PublicTopbar";

export default function VendorNotFound() {
  return (
    <>
      <PublicTopbar />
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <h1 className="mb-2 text-2xl font-bold">Vendor not found</h1>
        <p className="mb-6 text-sm text-text-grey">
          This vendor profile doesn&apos;t exist, or is no longer active on itsmyKalyanam.
        </p>
        <Link href="/search" className="rounded-md bg-brand-primary px-5 py-3 text-sm font-bold text-white no-underline">
          Browse vendors
        </Link>
      </div>
    </>
  );
}
