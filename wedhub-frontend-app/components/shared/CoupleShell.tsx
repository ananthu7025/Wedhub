import Link from "next/link";

/**
 * Shared shell for all (couple) routes — desktop topbar + mobile bottom nav,
 * matching wedhub-frontend/couple/*.html's .topbar/.bottom-nav-bar pattern.
 * Built once as a layout per frontenddocs/04-stage-couple-experience.md
 * Frontend Arch Phase 4's note, introduced early since Phase 3 already needs
 * a couple-scoped shell for /shortlist and /compare.
 */

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Find Vendors" },
  { href: "/shortlist", label: "Shortlist" },
];

const bottomNavLinks = [
  { href: "/", label: "Home", icon: <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" /> },
  { href: "/search", label: "Search", icon: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></> },
  {
    href: "/shortlist",
    label: "Saved",
    icon: <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.6 4.2 5a5 5 0 017.8 1.3A5 5 0 0119.8 5c2.8 1.6 3.4 5.1 1.5 7.9C18.7 16.65 12 21 12 21z" />,
  },
];

export function CoupleShell({ children, activeHref }: { children: React.ReactNode; activeHref: string }) {
  return (
    <>
      <header className="sticky top-0 z-100 flex h-[70px] items-center justify-between border-b border-border bg-white px-10 max-[900px]:px-4">
        <Link href="/" className="flex items-center text-[22px] font-semibold text-brand-ink-soft no-underline">
          Wed<span className="font-bold text-brand-primary">Hub</span>
        </Link>
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
