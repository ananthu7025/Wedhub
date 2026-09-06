"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminLogoutButton } from "./AdminLogoutButton";
import type { NavSection } from "./AdminShell";

/**
 * Mobile nav for (admin) routes — AdminShell's sidebar has ~8 sections and
 * 16 items with no natural "primary 4" the way VendorMobileNav's bottom
 * tabs has (Dashboard/Leads/Portfolio/Store), so this is a sticky header +
 * hamburger opening the exact same sectioned nav as a slide-over drawer,
 * rather than VendorMobileNav's bottom-tab-bar + separate "more" drawer.
 * Mirrors VendorMobileNav's drawer mechanics (ESC key, body scroll lock,
 * close-on-navigate).
 */
export function AdminMobileNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-white/95 px-3 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open admin menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-dark hover:bg-surface-input"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">AD</div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 flex h-full w-[280px] max-w-[85vw] flex-col gap-1 overflow-y-auto bg-white p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-bold text-text-dark">Menu</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-input text-text-grey hover:text-text-dark"
              >
                ✕
              </button>
            </div>

            {sections.map((section) => (
              <div key={section.label ?? "root"}>
                {section.label && (
                  <div className="mb-1 mt-3 px-3 text-[11px] font-bold uppercase tracking-wide text-text-grey">{section.label}</div>
                )}
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-semibold no-underline ${
                        isActive ? "bg-brand-primary-soft text-brand-primary" : "text-text-grey hover:bg-surface-input hover:text-text-dark"
                      }`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                        {item.icon}
                      </svg>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}

            <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
              <AdminLogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
