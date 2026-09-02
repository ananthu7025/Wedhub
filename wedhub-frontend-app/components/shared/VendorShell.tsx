import Link from "next/link";
import { VendorLogoutButton } from "./VendorLogoutButton";

/**
 * Sidebar shell for all (vendor) routes, matching
 * wedhub-frontend/vendor/*.html's .app-shell/.sidebar pattern. Only the
 * Frontend Arch Phase 5 pages (Dashboard/Profile/Portfolio/Packages) link
 * to real routes; Leads/Reviews/Subscription/Analytics/Settings are Phase
 * 6/7 scope — shown in the nav (matching the mockup) but not yet built, so
 * they're rendered as disabled/greyed rather than linking to a 404.
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
];

const comingSoonLinks = [
  { label: "Leads", icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /> },
  { label: "Reviews", icon: <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /> },
  { label: "Subscription", icon: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></> },
  { label: "Analytics", icon: <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" /> },
];

export function VendorShell({
  children,
  activeHref,
  vendorName,
}: {
  children: React.ReactNode;
  activeHref: string;
  vendorName: string;
}) {
  const initials = vendorName.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-[220px] flex-shrink-0 flex-col gap-1 border-r border-border bg-white p-4">
        <Link href="/vendor/dashboard" className="mb-5 flex items-center px-2 text-[20px] font-semibold text-brand-ink-soft no-underline">
          Wed<span className="font-bold text-brand-primary">Hub</span>
        </Link>

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

        {comingSoonLinks.map((link) => (
          <span
            key={link.label}
            title="Coming soon"
            className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-semibold text-paynes-grey-30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              {link.icon}
            </svg>
            {link.label}
          </span>
        ))}

        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          <VendorLogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-end gap-4 border-b border-border bg-white px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-ink-soft text-xs font-bold text-white">
            {initials}
          </div>
        </header>
        <main className="flex-1 bg-surface-page p-6">{children}</main>
      </div>
    </div>
  );
}
