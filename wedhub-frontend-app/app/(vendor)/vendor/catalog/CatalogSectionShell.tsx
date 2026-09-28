"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Nested sidebar for the Catalog section — a Shopify-admin-style "Products
 * / Collections" sub-nav inside the Catalog area, distinct from the app-wide
 * VendorShell sidebar it renders inside of. Scoped to catalog pages only
 * (per the user's own scoping decision) — VendorShell itself is untouched.
 */
const SECTION_LINKS = [
  {
    href: "/vendor/catalog",
    label: "Products",
    icon: (
      <>
        <path d="M20.59 13.41L11 3.83V3H3v8h.83l9.58 9.59a2 2 0 002.83 0l4.35-4.35a2 2 0 000-2.83z" />
        <circle cx="6.5" cy="6.5" r="1.5" />
      </>
    ),
  },
  {
    href: "/vendor/catalog/collections",
    label: "Collections",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
  },
  {
    href: "/vendor/catalog/storefront",
    label: "Storefront",
    icon: (
      <>
        <path d="M4 4h16v4H4z" />
        <path d="M6 8v12h12V8" />
        <path d="M10 20v-6h4v6" />
      </>
    ),
  },
] as const;

export function CatalogSectionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Section sub-sidebar — neutral, flat, single accent (active state
          only), matching the Shopify-admin palette this section asked for. */}
      <nav className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar lg:w-52 lg:flex-shrink-0 lg:border-r lg:border-neutral-grey-40 lg:pr-4">
        {SECTION_LINKS.map((link) => {
          const isActive = link.href === "/vendor/catalog" ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold no-underline transition-colors ${
                isActive
                  ? "bg-neutral-grey-20 text-text-dark"
                  : "text-text-grey hover:bg-neutral-grey-20/60 hover:text-text-dark"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="flex-shrink-0">
                {link.icon}
              </svg>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
