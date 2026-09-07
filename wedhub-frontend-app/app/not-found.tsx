import Link from "next/link";
import { PublicTopbar } from "@/components/shared/PublicTopbar";

// Root-level 404 — Next.js renders this for any route with no more specific
// not-found.tsx (e.g. /vendors/[slug]/not-found.tsx overrides it for vendor
// profiles). Without this, every other route (home, search, category/city
// landing pages, blog, dashboards) fell through to Next's generic unbranded
// default (SEO audit finding, matches archive's own still-open Frontend
// Arch Phase 11c checklist item). Next automatically serves this with a
// real HTTP 404 status.
export default function NotFound() {
  return (
    <>
      <PublicTopbar />
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <h1 className="mb-2 text-2xl font-bold">Page not found</h1>
        <p className="mb-6 text-sm text-text-grey">
          The page you&apos;re looking for doesn&apos;t exist, or may have moved.
        </p>
        <Link href="/" className="rounded-md bg-brand-primary px-5 py-3 text-sm font-bold text-white no-underline">
          Back to home
        </Link>
      </div>
    </>
  );
}
