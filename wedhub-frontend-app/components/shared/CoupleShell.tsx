import Link from "next/link";
import { getMyUnreadNotificationCount } from "@/lib/api/account";
import { BrandLogo } from "./BrandLogo";

/**
 * Shared shell for all (couple) routes — desktop topbar + mobile bottom nav,
 * matching wedhub-frontend/couple/*.html's .topbar/.bottom-nav-bar pattern.
 * Built once as a layout per frontenddocs/04-stage-couple-experience.md
 * Frontend Arch Phase 4's note, introduced early since Phase 3 already needs
 * a couple-scoped shell for /shortlist and /compare.
 *
 * Async Server Component (added 2026-09-03) — fetches its own unread count
 * for the bell badge rather than threading it through every one of the 6
 * pages that render this shell.
 */

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Find Vendors" },
  { href: "/shortlist", label: "Shortlist" },
  { href: "/enquiries", label: "My Enquiries" },
  { href: "/wedding-website", label: "Wedding Website" },
];

const bottomNavLinks = [
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

export async function CoupleShell({ children, activeHref }: { children: React.ReactNode; activeHref: string }) {
  const unreadCount = await getMyUnreadNotificationCount()
    .then((r) => r.data.count)
    .catch(() => 0);

  return (
    <>
      <header className="sticky top-0 z-100 flex h-[70px] items-center justify-between border-b border-border bg-white px-10 max-[900px]:px-4">
        <BrandLogo variant="dark" />
        <nav className="flex gap-1 max-[900px]:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3.5 py-2 text-sm font-semibold no-underline ${
                activeHref === link.href
                  ? "bg-brand-primary-soft text-brand-primary"
                  : "text-text-grey hover:bg-surface-input hover:text-text-dark"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 max-[900px]:hidden">
          <Link
            href="/notifications"
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
            className={`relative flex h-10 w-10 items-center justify-center rounded-full ${
              activeHref === "/notifications" ? "bg-brand-primary-soft text-brand-primary" : "text-text-grey hover:bg-surface-input"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red ring-2 ring-white" />
            )}
          </Link>
          <Link
            href="/account"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-ink-soft text-sm font-bold text-white no-underline"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-1a8 8 0 0116 0v1" />
            </svg>
          </Link>
        </div>
      </header>

      {children}

      <nav className="fixed inset-x-0 bottom-0 z-100 hidden border-t border-border bg-white max-[900px]:block">
        <div className="flex items-center justify-around py-2">
          {bottomNavLinks.map((link) => (
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
      <div className="h-16 hidden max-[900px]:block" />
    </>
  );
}
