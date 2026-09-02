import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { VendorHeartButton } from "./VendorHeartButton";

export function VendorCard({
  vendorId,
  slug,
  businessName,
  logoUrl,
  shortDescription,
  startingPrice,
  currency,
  featured = false,
  isAuthenticated = false,
}: {
  vendorId?: string;
  slug: string;
  businessName: string;
  logoUrl: string | null;
  shortDescription: string | null;
  startingPrice: string | null;
  currency: string | null;
  featured?: boolean;
  isAuthenticated?: boolean;
}) {
  return (
    <Link
      href={`/vendors/${slug}`}
      className="block overflow-hidden rounded-xl border border-border bg-white no-underline text-inherit"
    >
      <div className="relative aspect-4/3 bg-surface-input">
        {logoUrl ? (
          <Image src={logoUrl} alt={businessName} fill className="object-cover" sizes="(max-width: 900px) 50vw, 25vw" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-text-grey">No photo yet</div>
        )}
        {featured && (
          <span className="absolute top-2.5 left-2.5">
            <Badge variant="crimson">Featured</Badge>
          </span>
        )}
        {vendorId && (
          <VendorHeartButton vendorId={vendorId} isAuthenticated={isAuthenticated} className="absolute top-2.5 right-2.5" />
        )}
      </div>
      <div className="p-3.5">
        <div className="mb-0.5 truncate text-sm font-bold">{businessName}</div>
        {shortDescription && <p className="mb-2 line-clamp-2 text-xs text-text-grey">{shortDescription}</p>}
        {startingPrice && (
          <div className="text-[13px] font-bold">
            {currency === "INR" ? "₹" : (currency ?? "")}
            {Number(startingPrice).toLocaleString("en-IN")} <span className="font-medium text-text-grey">onwards</span>
          </div>
        )}
      </div>
    </Link>
  );
}
