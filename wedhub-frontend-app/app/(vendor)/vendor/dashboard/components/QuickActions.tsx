import Link from "next/link";

interface QuickActionsProps {
  categorySlug?: string;
  categoryName?: string;
  vendorSlug?: string;
}

export function QuickActions({ categorySlug = "", categoryName = "", vendorSlug }: QuickActionsProps) {
  const normSlug = categorySlug.toLowerCase();
  const normName = categoryName.toLowerCase();

  // Determine category-specific labels
  const isPhoto = normSlug.includes("photo") || normSlug.includes("video") || normName.includes("photo") || normName.includes("video");
  const isMakeup = normSlug.includes("makeup") || normSlug.includes("beauty") || normSlug.includes("hair") || normName.includes("makeup") || normName.includes("bridal");
  const isVenue = normSlug.includes("venue") || normSlug.includes("hall") || normSlug.includes("resort") || normName.includes("venue") || normName.includes("banquet");
  const isDecor = normSlug.includes("decor") || normSlug.includes("flor") || normName.includes("decor") || normName.includes("flower");
  const isPlanner = normSlug.includes("plan") || normSlug.includes("event") || normName.includes("planner");

  let photoActionLabel = "+ Add Photos";
  if (isPhoto) photoActionLabel = "+ Add Album / Photos";
  else if (isMakeup) photoActionLabel = "+ Add Look / Photos";
  else if (isVenue) photoActionLabel = "+ Add Venue Photos";
  else if (isDecor) photoActionLabel = "+ Add Project Photos";
  else if (isPlanner) photoActionLabel = "+ Add Wedding / Event";

  let packageLabel = "+ Add Package";
  if (isVenue) packageLabel = "+ Add Package / Hall";

  const actions = [
    {
      label: photoActionLabel,
      href: "/vendor/portfolio",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      ),
    },
    {
      label: packageLabel,
      href: "/vendor/packages",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    {
      label: "+ Add Service",
      href: "/vendor/profile",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: "Preview Profile",
      href: vendorSlug ? `/vendors/${vendorSlug}` : "/vendor/profile",
      target: vendorSlug ? "_blank" : undefined,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-white p-3.5 sm:p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <h3 className="text-xs font-bold text-text-dark uppercase tracking-wider">
          Quick Actions
        </h3>
        {categoryName && (
          <span className="text-[11px] text-text-muted">
            Tailored for {categoryName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        {actions.map((act) => (
          <Link
            key={act.label}
            href={act.href}
            target={act.target}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-page px-3 py-2.5 text-xs font-bold text-text-dark shadow-xs transition-all hover:border-brand-primary/40 hover:bg-white hover:text-brand-primary text-center"
          >
            <span className="text-text-grey shrink-0">{act.icon}</span>
            <span className="truncate">{act.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
