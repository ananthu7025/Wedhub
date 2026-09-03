import Link from "next/link";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { BrandLogo } from "./BrandLogo";

/**
 * Sidebar shell for all (admin) routes, matching wedhub-frontend/admin/*.html's
 * .app-shell/.sidebar pattern (section-labeled groups, unlike VendorShell's
 * flat list). All sections now link to real routes as of Frontend Arch
 * Phase 10 (Monetization/Roles & permissions/Audit log/Platform).
 */

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  label: string | null;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    label: null,
    items: [
      {
        href: "/admin/dashboard",
        label: "Dashboard",
        icon: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
      },
    ],
  },
  {
    label: "Vendors",
    items: [
      {
        href: "/admin/vendors",
        label: "All vendors",
        icon: <><path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-6h6v6" /></>,
      },
      {
        href: "/admin/vendors?status=PENDING_APPROVAL",
        label: "Pending approval",
        icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
      },
      {
        href: "/admin/vendors/create",
        label: "Create vendor",
        icon: <path d="M12 5v14M5 12h14" />,
      },
    ],
  },
  {
    label: "Users",
    items: [
      {
        href: "/admin/users",
        label: "All users",
        icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0116 0v1" /></>,
      },
    ],
  },
  {
    label: "Catalog",
    items: [
      {
        href: "/admin/categories-locations",
        label: "Categories & locations",
        icon: <><rect x="4" y="4" width="7" height="7" /><rect x="13" y="4" width="7" height="7" /><rect x="13" y="13" width="7" height="7" /><rect x="4" y="13" width="7" height="7" /></>,
      },
    ],
  },
  {
    label: "Leads",
    items: [
      {
        href: "/admin/leads",
        label: "All leads",
        icon: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
      },
    ],
  },
  {
    label: "Monetization",
    items: [
      {
        href: "/admin/subscriptions",
        label: "Subscriptions & payments",
        icon: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
      },
    ],
  },
  {
    label: "Trust & safety",
    items: [
      {
        href: "/admin/reviews",
        label: "Reviews",
        icon: <path d="M12 17.3l-6.2 3.6 1.6-7-5.4-4.7 7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7z" />,
      },
      {
        href: "/admin/roles-permissions",
        label: "Roles & permissions",
        icon: <path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />,
      },
      {
        href: "/admin/audit-log",
        label: "Audit log",
        icon: <><path d="M9 12h6M9 16h6M9 8h6" /><path d="M5 4h14v16H5z" /></>,
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        href: "/admin/cms",
        label: "CMS",
        icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></>,
      },
      {
        href: "/admin/seo",
        label: "SEO",
        icon: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
      },
      {
        href: "/admin/wedding-websites",
        label: "Wedding Websites",
        icon: <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.6 4.2 5a5 5 0 017.8 1.3A5 5 0 0119.8 5c2.8 1.6 3.4 5.1 1.5 7.9C18.7 16.65 12 21 12 21z" />,
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: (
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 01-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 010-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34H9a1.7 1.7 0 001-1.55V3a2 2 0 014 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87V9a1.7 1.7 0 001.55 1H21a2 2 0 010 4h-.09a1.7 1.7 0 00-1.55 1z" />
          </>
        ),
      },
    ],
  },
];

export function AdminShell({ children, activeHref }: { children: React.ReactNode; activeHref: string }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-[220px] flex-shrink-0 flex-col gap-1 border-r border-border bg-white p-4">
        <div className="mb-5 flex items-center gap-1.5 px-2">
          <BrandLogo variant="dark" href="/admin/dashboard" />
          <span className="text-[11px] font-bold uppercase tracking-wide text-text-grey">Admin</span>
        </div>

        {sections.map((section) => (
          <div key={section.label ?? "root"}>
            {section.label && (
              <div className="mb-1 mt-3 px-3 text-[11px] font-bold uppercase tracking-wide text-text-grey">{section.label}</div>
            )}
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-semibold no-underline ${
                  activeHref === item.href ? "bg-brand-primary-soft text-brand-primary" : "text-text-grey hover:bg-surface-input hover:text-text-dark"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                  {item.icon}
                </svg>
                {item.label}
              </Link>
            ))}
          </div>
        ))}

        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          <AdminLogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-end gap-4 border-b border-border bg-white px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">AD</div>
        </header>
        <main className="flex-1 bg-surface-page p-6">{children}</main>
      </div>
    </div>
  );
}
