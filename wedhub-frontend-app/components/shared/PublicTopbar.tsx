import Link from "next/link";
import { getOptionalSession } from "@/lib/auth/dal";
import { listCategories } from "@/lib/api/catalog";
import { getMe, getMyUnreadNotificationCount } from "@/lib/api/account";
import { BrandLogo } from "@/components/shared/BrandLogo";

interface PublicTopbarProps {
  variant?: "brand" | "white";
  /**
   * Marks the active item among coupleNavLinks — the marketing nav
   * (Venues/Vendors/Photos/...) is swapped out entirely for those once a
   * session exists, so a couple's journey stays on the brand header
   * without browsing links irrelevant to their task. Pass "/notifications"
   * too so the bell can highlight itself.
   */
  activeHref?: string;
}

const coupleNavLinks = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Find Vendors" },
  { href: "/shortlist", label: "Shortlist" },
  { href: "/enquiries", label: "My Enquiries" },
  { href: "/wedding-website", label: "Wedding Website" },
];

/** "AB" from "Ananthu G" / falls back to the email's first two letters when no name is set yet. */
function initialsFrom(firstName: string | null, lastName: string | null, email: string): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (name) return name.slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

const coupleBottomNavLinks = [
  { href: "/", label: "Home", icon: <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" /> },
  { href: "/search", label: "Search", icon: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></> },
  {
    href: "/shortlist",
    label: "Saved",
    icon: <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.6 4.2 5a5 5 0 017.8 1.3A5 5 0 0119.8 5c2.8 1.6 3.4 5.1 1.5 7.9C18.7 16.65 12 21 12 21z" />,
  },
  {
    href: "/enquiries",
    label: "Enquiries",
    icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  },
  {
    href: "/account",
    label: "Profile",
    icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0116 0v1" /></>,
  },
];

export async function PublicTopbar({ variant = "brand", activeHref }: PublicTopbarProps) {
  // listCategories() is revalidated hourly (see catalog.ts), so fetching it
  // unconditionally here costs logged-in couples nothing extra in practice
  // — simpler than threading a conditional through Promise.all's tuple type.
  const [session, { data: categories }] = await Promise.all([getOptionalSession(), listCategories()]);
  const [unreadCount, me] = session
    ? await Promise.all([
        getMyUnreadNotificationCount()
          .then((r) => r.data.count)
          .catch(() => 0),
        getMe()
          .then((r) => r.data)
          .catch(() => null),
      ])
    : [0, null];
  const initials = me ? initialsFrom(me.profile?.firstName ?? null, me.profile?.lastName ?? null, me.email) : "";

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
          {!session && (
            <div className="flex items-center gap-5 font-medium">
              <Link href="/reviews/write" className="flex items-center gap-1 text-white/90 transition-colors hover:text-white hover:underline">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Write A Review
              </Link>
              <span className="text-white/40">|</span>
            </div>
          )}
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
            {session ? (
              coupleNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all ${
                    activeHref === link.href ? "bg-white/25 text-white" : "text-white/90 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))
            ) : (
              <>
                <Link
                  href="/vendors"
                  className="rounded-full px-3.5 py-1.5 text-sm font-semibold text-white/90 transition-all hover:bg-white/15 hover:text-white"
                >
                  Vendors
                </Link>
              </>
            )}
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

          {/* Write a review (tablet / desktop) — logged-out visitors only; couples get it from their enquiries list instead */}
          {!session && (
            <Link
              href="/reviews/write"
              className="hidden items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-white hover:text-[#e00b41] sm:inline-flex"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Review a Vendor
            </Link>
          )}

          {session ? (
            <div className="flex items-center gap-2">
              <Link
                href="/notifications"
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {unreadCount > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#e00b41]" />}
              </Link>
              <Link
                href="/account"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white font-bold text-[#e00b41] shadow-sm ring-2 ring-white/40 transition-transform hover:scale-105"
                title="My Account"
              >
                {initials}
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

      {/* Mobile Category Quick Scroll — replaced by the couple's own links when logged in, since the primary mobile nav for them is CoupleBottomNav below anyway */}
      <div className="flex overflow-x-auto border-t border-white/15 bg-[#c2185b] px-3 py-1.5 text-xs font-medium text-white/90 whitespace-nowrap lg:hidden">
        {session ? (
          <>
            <Link href="/enquiries" className="px-2.5 py-1 hover:text-white">My Enquiries</Link>
            <span className="opacity-30">•</span>
            <Link href="/wedding-website" className="px-2.5 py-1 hover:text-white">Wedding Website</Link>
          </>
        ) : (
          <>
            <Link href={venuesLink} className="px-2.5 py-1 hover:text-white">Venues</Link>
            <span className="opacity-30">•</span>
            <Link href="/vendors" className="px-2.5 py-1 hover:text-white">Vendors</Link>
            <span className="opacity-30">•</span>
            <a href="#gallery-inspiration" className="px-2.5 py-1 hover:text-white">Photos</a>
            <span className="opacity-30">•</span>
            <Link href="/real-weddings" className="px-2.5 py-1 hover:text-white">Real Weddings</Link>
            <span className="opacity-30">•</span>
            <a href="#wedding-blogs" className="px-2.5 py-1 hover:text-white">Blog</a>
            <span className="opacity-30">•</span>
            <Link href="/reviews/write" className="px-2.5 py-1 hover:text-white">Write Review</Link>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Fixed mobile tab bar for signed-in couples — rendered as a sibling of
 * PublicTopbar (not inside it) since it's viewport-fixed to the bottom,
 * not the header. Kept in this file so the couple's mobile primary nav
 * lives next to the desktop nav links it mirrors (coupleNavLinks/session
 * logic above). Pages that need it render `{session && <CoupleBottomNav />}`
 * — see PublicShell below for the composed version most pages should use.
 */
export function CoupleBottomNav({ activeHref }: { activeHref?: string }) {
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-100 hidden border-t border-border bg-white lg:hidden">
        <div className="flex items-center justify-around py-2">
          {coupleBottomNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 text-[11px] font-semibold no-underline ${
                activeHref === link.href ? "text-brand-primary" : "text-text-grey"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {link.icon}
              </svg>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="h-16 block lg:hidden" />
    </>
  );
}
