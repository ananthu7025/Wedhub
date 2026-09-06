import Link from "next/link";
import { getMyUnreadNotificationCount } from "@/lib/api/account";
import { getMyVendor } from "@/lib/api/vendor-self";
import { BrandLogo } from "./BrandLogo";
import { VendorLogoutButton } from "./VendorLogoutButton";
import { SharePortfolioButton } from "@/components/vendor/SharePortfolioButton";
import { VendorMobileNav } from "./VendorMobileNav";

/**
 * Sidebar shell for all (vendor) routes, matching
 * wedhub-frontend/vendor/*.html's .app-shell/.sidebar pattern.
 *
 * Mobile layout overhaul:
 * - On desktop (>=1024px): 240px static sidebar + topbar.
 * - On mobile/tablet (<1024px): Clean sticky mobile header + native-app-style
 *   bottom navigation bar + slide-over drawer for all subpages and settings.
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
    href: "/vendor/store",
    label: "Store",
    icon: (
      <>
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </>
    ),
  },
  {
    href: "/vendor/invoices",
    label: "Invoices",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ),
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
  vendorSlug,
}: {
  children: React.ReactNode;
  activeHref: string;
  vendorName: string;
  vendorSlug?: string;
}) {
  const initials = vendorName.slice(0, 2).toUpperCase();
  const [unreadCount, resolvedSlug] = await Promise.all([
    getMyUnreadNotificationCount()
      .then((r) => r.data.count)
      .catch(() => 0),
    vendorSlug
      ? Promise.resolve(vendorSlug)
      : getMyVendor()
          .then((r) => r.data.slug)
          .catch(() => undefined),
  ]);

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
      {/* Desktop Sidebar (hidden on screens < 1024px) */}
      <aside className="hidden lg:flex w-[240px] flex-shrink-0 flex-col gap-1 border-r border-border bg-white p-4">
        <BrandLogo variant="dark" href="/vendor/dashboard" className="mb-5 px-1" />

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

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Desktop Header (hidden on screens < 1024px) */}
        <header className="hidden lg:flex h-16 items-center justify-end gap-3 border-b border-border bg-white px-6">
          {resolvedSlug && (
            <SharePortfolioButton slug={resolvedSlug} businessName={vendorName} variant="header" />
          )}

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

        {/* Mobile Sticky Top Header (visible only on < 1024px) */}
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-border bg-white/95 backdrop-blur-md px-3 sm:px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <BrandLogo variant="dark" href="/vendor/dashboard" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {resolvedSlug && (
              <SharePortfolioButton slug={resolvedSlug} businessName={vendorName} variant="header" />
            )}
            <Link
              href="/vendor/notifications"
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
              className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full ${
                activeHref === "/vendor/notifications" ? "bg-brand-primary-soft text-brand-primary" : "text-text-grey hover:bg-surface-input"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red ring-2 ring-white" />
              )}
            </Link>
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-brand-ink-soft text-xs font-bold text-white shadow-xs">
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content with safe-area bottom padding for the mobile bottom nav */}
        <main className="flex-1 min-w-0 bg-surface-page p-3 sm:p-5 lg:p-6 pb-24 lg:pb-6">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar & Slide-Over Drawer */}
      <VendorMobileNav
        vendorName={vendorName}
        vendorSlug={resolvedSlug}
        unreadCount={unreadCount}
      />
    </div>
  );
}
