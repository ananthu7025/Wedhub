import Link from "next/link";
import { getOptionalSession } from "@/lib/auth/dal";
import { listCategories } from "@/lib/api/catalog";
import { BrandLogo } from "@/components/shared/BrandLogo";

interface PublicTopbarProps {
  variant?: "brand" | "white";
}

export async function PublicTopbar({ variant = "brand" }: PublicTopbarProps) {
  const [session, { data: categories }] = await Promise.all([getOptionalSession(), listCategories()]);

  const isBrand = variant === "brand";
  // "Venues" nav link needs a real Category.id, not a hardcoded string —
  // /search's ?categoryId= param is matched against real UUIDs. Falls back
  // to an unfiltered /search if the "venues" category isn't seeded.
  const venuesCategoryId = categories.find((c) => c.slug === "venues")?.id;
  const venuesLink = venuesCategoryId ? `/search?categoryId=${venuesCategoryId}` : "/search?keyword=venue";

  return (
    <div className="sticky top-0 z-50 w-full shadow-md">
      {/* Top Utility Strip */}
      <div className="hidden border-b border-white/10 bg-[#b70835] px-6 py-1 text-xs text-white/90 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>India&apos;s Favourite Wedding Planning Platform</span>
          </div>
          <div className="flex items-center gap-5 font-medium">
            <Link href="/reviews/write" className="flex items-center gap-1 text-white/90 transition-colors hover:text-white hover:underline">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Write A Review
            </Link>
            <span className="text-white/40">|</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header
        className={`flex h-[66px] items-center justify-between px-4 sm:px-6 lg:px-10 transition-colors ${isBrand
          ? "bg-gradient-to-r from-[#d81b60] via-[#e00b41] to-[#c2185b] text-white"
          : "border-b border-border bg-white text-text-dark"
          }`}
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <BrandLogo variant={isBrand ? "white" : "dark"} />

          {/* Desktop Nav Links */}
          <nav className="hidden items-center gap-1 lg:flex">
            <Link
              href={venuesLink}
              className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-white/90 transition-all hover:bg-white/15 hover:text-white"
            >
              Venues
            </Link>
            <Link
              href="/vendors"
              className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-white/90 transition-all hover:bg-white/15 hover:text-white"
            >
              Vendors
            </Link>
            <a
              href="#gallery-inspiration"
              className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-white/90 transition-all hover:bg-white/15 hover:text-white"
            >
              Photos
            </a>
            <a
              href="#wedding-stories"
              className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-white/90 transition-all hover:bg-white/15 hover:text-white"
            >
              Real Weddings
            </a>
            <a
              href="#wedding-blogs"
              className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-white/90 transition-all hover:bg-white/15 hover:text-white"
            >
              Blog
            </a>
            <Link
              href="/search"
              className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-white/90 transition-all hover:bg-white/15 hover:text-white"
            >
              E-Invites
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Search trigger */}
          <Link
            href="/search"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 sm:hidden"
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </Link>

          {/* Write a review (tablet / desktop) */}
          <Link
            href="/reviews/write"
            className="hidden items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-white hover:text-[#e00b41] sm:inline-flex"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Review a Vendor
          </Link>

          {session ? (
            <div className="flex items-center gap-2">
              <Link
                href="/shortlist"
                className="hidden rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/25 sm:inline-block"
              >
                Shortlist
              </Link>
              <Link
                href="/account"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white font-bold text-[#e00b41] shadow-sm ring-2 ring-white/40 transition-transform hover:scale-105"
                title="My Account"
              >
                {session.userId.slice(0, 2).toUpperCase()}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-[#e00b41] shadow-sm transition-all hover:bg-white/90 hover:shadow"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Category Quick Scroll */}
      <div className="flex overflow-x-auto border-t border-white/15 bg-[#c2185b] px-3 py-1.5 text-xs font-medium text-white/90 whitespace-nowrap lg:hidden">
        <Link href={venuesLink} className="px-2.5 py-1 hover:text-white">Venues</Link>
        <span className="opacity-30">•</span>
        <Link href="/vendors" className="px-2.5 py-1 hover:text-white">Vendors</Link>
        <span className="opacity-30">•</span>
        <a href="#gallery-inspiration" className="px-2.5 py-1 hover:text-white">Photos</a>
        <span className="opacity-30">•</span>
        <a href="#wedding-stories" className="px-2.5 py-1 hover:text-white">Real Weddings</a>
        <span className="opacity-30">•</span>
        <a href="#wedding-blogs" className="px-2.5 py-1 hover:text-white">Blog</a>
        <span className="opacity-30">•</span>
        <Link href="/reviews/write" className="px-2.5 py-1 hover:text-white">Write Review</Link>
      </div>
    </div>
  );
}
