"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StoreNavTabs({
  itemCount,
  orderCount,
}: {
  itemCount?: number;
  orderCount?: number;
}) {
  const pathname = usePathname();

  const tabs = [
    {
      label: "Store Settings",
      href: "/vendor/store",
      exact: true,
    },
    {
      label: "Products & Catalog",
      href: "/vendor/store/items",
      count: itemCount,
    },
    {
      label: "Orders & Inquiries",
      href: "/vendor/store/orders",
      count: orderCount,
    },
  ];

  return (
    <div className="flex border-b border-border mb-6">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? "border-brand-primary text-brand-primary font-bold"
                : "border-transparent text-text-grey hover:text-text-dark hover:border-border"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                  isActive
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "bg-surface-input text-text-grey"
                }`}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
