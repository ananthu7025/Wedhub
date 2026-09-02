import Link from "next/link";
import { AdminLogoutButton } from "./AdminLogoutButton";

/**
 * Sidebar shell for all (admin) routes, matching wedhub-frontend/admin/*.html's
 * .app-shell/.sidebar pattern (section-labeled groups, unlike VendorShell's
 * flat list). Dashboard/Vendors/Users link to real routes as of Frontend
 * Arch Phase 8; Catalog/Leads (Phase 9) and Monetization/Trust & safety/
 * Platform (Phase 10) are not yet built.
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
];

export function AdminShell({ children, activeHref }: { children: React.ReactNode; activeHref: string }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-[220px] flex-shrink-0 flex-col gap-1 border-r border-border bg-white p-4">
        <Link href="/admin/dashboard" className="mb-5 flex items-center gap-1.5 px-2 text-[20px] font-semibold text-brand-ink-soft no-underline">
          Wed<span className="font-bold text-brand-primary">Hub</span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-text-grey">Admin</span>
        </Link>

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
