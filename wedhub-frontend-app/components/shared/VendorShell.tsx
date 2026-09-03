import Link from "next/link";
import { getMyUnreadNotificationCount } from "@/lib/api/account";
import { BrandLogo } from "./BrandLogo";
import { VendorLogoutButton } from "./VendorLogoutButton";

/**
 * Sidebar shell for all (vendor) routes, matching
 * wedhub-frontend/vendor/*.html's .app-shell/.sidebar pattern. All nine
 * mockup nav items now link to real routes as of Frontend Arch Phase 7
 * (Dashboard/Profile/Portfolio/Packages from Phase 5, Leads/Reviews from
 * Phase 6, Subscription/Analytics/Settings from Phase 7) — Stage 3 is
 * fully built out, no more "coming soon" placeholders.
 *
 * Header notification bell added 2026-09-03 — previously this shell had no
 * notification entry point at all, despite NEW_LEAD being a real
 * notification event every vendor receives. Async Server Component now,
 * fetching its own unread count for the same reason as CoupleShell.
 */

const navLinks = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" /> },
  {
    href: "/vendor/profile",
    label: "My Profile",
    icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0116 0v1" /></>,
  },
  {
    href: "/vendor/portfolio",
    label: "Portfolio",
    icon: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></>,
  },
  {
    href: "/vendor/packages",
    label: "Packages & Pricing",
    icon: <><path d="M20.59 13.41L11 3.83V3H3v8h.83l9.58 9.59a2 2 0 002.83 0l4.35-4.35a2 2 0 000-2.83z" /><circle cx="6.5" cy="6.5" r="1.5" /></>,
  },
  {
    href: "/vendor/leads",
    label: "Leads",
    icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  },
  {
    href: "/vendor/reviews",
    label: "Reviews",
    icon: <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />,
  },
  {
    href: "/vendor/subscription",
    label: "Subscription",
    icon: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  },
  {
    href: "/vendor/analytics",
    label: "Analytics",
    icon: <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />,
  },
  {
    href: "/vendor/settings",
    label: "Settings",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </>
    ),
  },
];

export async function VendorShell({
  children,
  activeHref,
  vendorName,
}: {
  children: React.ReactNode;
  activeHref: string;
  vendorName: string;
}) {
  const initials = vendorName.slice(0, 2).toUpperCase();
  const unreadCount = await getMyUnreadNotificationCount()
    .then((r) => r.data.count)
    .catch(() => 0);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-[220px] flex-shrink-0 flex-col gap-1 border-r border-border bg-white p-4">
        <BrandLogo variant="dark" href="/vendor/dashboard" className="mb-5 px-2" />

        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-semibold no-underline ${
              activeHref === link.href ? "bg-brand-primary-soft text-brand-primary" : "text-text-grey hover:bg-surface-input hover:text-text-dark"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              {link.icon}
            </svg>
            {link.label}
          </Link>
        ))}

        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          <VendorLogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-end gap-3 border-b border-border bg-white px-6">
          <Link
            href="/vendor/notifications"
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
            className={`relative flex h-9 w-9 items-center justify-center rounded-full ${
              activeHref === "/vendor/notifications" ? "bg-brand-primary-soft text-brand-primary" : "text-text-grey hover:bg-surface-input"
            }`}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red ring-2 ring-white" />
            )}
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-ink-soft text-xs font-bold text-white">
            {initials}
          </div>
        </header>
        <main className="flex-1 bg-surface-page p-6">{children}</main>
      </div>
    </div>
  );
}
