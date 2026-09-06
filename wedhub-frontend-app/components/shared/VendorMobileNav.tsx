"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { VendorLogoutButton } from "./VendorLogoutButton";

interface VendorMobileNavProps {
  vendorName: string;
  vendorSlug?: string;
  unreadCount?: number;
  hasStoreEligibleCategory?: boolean;
}

const PRIMARY_BOTTOM_TABS = [
  {
    href: "/vendor/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" />
      </svg>
    ),
  },
  {
    href: "/vendor/leads",
    label: "Leads",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    href: "/vendor/portfolio",
    label: "Portfolio",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    href: "/vendor/store",
    label: "Store",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
  },
];

const SECONDARY_SECTIONS = [
  {
    title: "Showcase & Catalog",
    links: [
      {
        href: "/vendor/profile",
        label: "My Profile",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21v-1a8 8 0 0116 0v1" />
          </svg>
        ),
      },
      {
        href: "/vendor/packages",
        label: "Packages & Pricing",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.59 13.41L11 3.83V3H3v8h.83l9.58 9.59a2 2 0 002.83 0l4.35-4.35a2 2 0 000-2.83z" />
            <circle cx="6.5" cy="6.5" r="1.5" />
          </svg>
        ),
      },
      {
        href: "/vendor/store",
        label: "Vendor Store",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Client Engagements",
    links: [
      {
        href: "/vendor/leads",
        label: "Leads & Enquiries",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        ),
      },
      {
        href: "/vendor/reviews",
        label: "Client Reviews",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        ),
      },
      {
        href: "/vendor/notifications",
        label: "Notifications",
        badgeCount: true,
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Business Growth & Finance",
    links: [
      {
        href: "/vendor/invoices",
        label: "Invoices & Billing",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      },
      {
        href: "/vendor/analytics",
        label: "Analytics & Views",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" />
          </svg>
        ),
      },
      {
        href: "/vendor/subscription",
        label: "Subscription Plan",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
        ),
      },
      {
        href: "/vendor/settings",
        label: "Settings",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 112.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
];

export function VendorMobileNav({
  vendorName,
  vendorSlug,
  unreadCount = 0,
  hasStoreEligibleCategory = false,
}: VendorMobileNavProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Mirrors VendorShell's desktop nav filter — same "Store" link, same
  // hasStoreEligibleCategory gate, just applied to this drawer's separate
  // SECONDARY_SECTIONS copy of the link.
  const visibleSections = SECONDARY_SECTIONS.map((section) => ({
    ...section,
    links: section.links.filter((link) => link.href !== "/vendor/store" || hasStoreEligibleCategory),
  }));

  // Check if current route is one of the 4 primary tabs
  const isPrimaryTab = PRIMARY_BOTTOM_TABS.some((tab) => pathname === tab.href || pathname.startsWith(tab.href + "/"));
  // "More" button is highlighted if on any secondary vendor page and not a primary tab
  const isMoreActive = !isPrimaryTab && pathname.startsWith("/vendor");

  // Close drawer on path change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Handle ESC key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const initials = vendorName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* 1. Mobile Bottom Navigation Bar (Fixed on Mobile/Tablet < 1024px) */}
      <nav
        aria-label="Mobile vendor navigation"
        className="fixed inset-x-0 bottom-0 z-40 block border-t border-border bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.06)] lg:hidden pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1"
      >
        <div className="grid grid-cols-5 items-center justify-around px-1">
          {PRIMARY_BOTTOM_TABS.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 text-center transition-all ${
                  isActive ? "text-brand-primary font-bold" : "text-text-grey hover:text-text-dark font-medium"
                }`}
              >
                <div className="relative">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                      isActive ? "bg-brand-primary-soft/60 text-brand-primary" : "text-text-grey"
                    }`}
                  >
                    {tab.icon}
                  </span>
                  {tab.href === "/vendor/leads" && unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-bold text-white shadow-xs">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="mt-0.5 text-[10px] tracking-tight truncate max-w-full">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-brand-primary" />
                )}
              </Link>
            );
          })}

          {/* 5th Tab: "More / Menu" opens the comprehensive drawer */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open full vendor menu"
            className={`relative flex flex-col items-center justify-center py-1.5 px-1 text-center transition-all ${
              drawerOpen || isMoreActive
                ? "text-brand-primary font-bold"
                : "text-text-grey hover:text-text-dark font-medium"
            }`}
          >
            <div className="relative">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                  drawerOpen || isMoreActive ? "bg-brand-primary-soft/60 text-brand-primary" : "text-text-grey"
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-brand-primary ring-2 ring-white" />
              )}
            </div>
            <span className="mt-0.5 text-[10px] tracking-tight truncate max-w-full">
              More
            </span>
            {(drawerOpen || isMoreActive) && (
              <span className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-brand-primary" />
            )}
          </button>
        </div>
      </nav>

      {/* 2. Slide-Over Bottom Drawer / Menu Sheet */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet container */}
          <div className="relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-white p-5 shadow-2xl transition-transform animate-in slide-in-from-bottom duration-250">
            {/* Grab handle */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-neutral-grey-30" />

            {/* Vendor Profile Mini Card */}
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-surface-page p-3.5 border border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-ink-soft text-sm font-bold text-white shadow-sm">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-text-dark truncate">{vendorName}</h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-70">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
                    Vendor Dashboard
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-input text-text-grey hover:text-text-dark transition-colors"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* Categorized Links */}
            <div className="space-y-4">
              {visibleSections.map((section) => (
                <div key={section.title}>
                  <h4 className="px-1 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    {section.title}
                  </h4>
                  <div className="grid grid-cols-1 gap-1">
                    {section.links.map((link) => {
                      const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setDrawerOpen(false)}
                          className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                            isActive
                              ? "bg-brand-primary-soft text-brand-primary"
                              : "text-text-body hover:bg-surface-input hover:text-text-dark"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={isActive ? "text-brand-primary" : "text-text-grey"}>
                              {link.icon}
                            </span>
                            <span>{link.label}</span>
                          </div>

                          {link.badgeCount && unreadCount > 0 && (
                            <span className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-bold text-white">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Logout Footer */}
            <div className="mt-6 border-t border-border pt-4">
              <VendorLogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
