/**
 * Crown Ribbon & Verification Badges
 * Styled after premier wedding vendor platforms (orange-yellow crown bookmark ribbon
 * and blue verified pill badge).
 */

export function CrownRibbonBadge({
  className = "absolute top-0 left-2.5 z-10 drop-shadow-sm",
}: {
  className?: string;
}) {
  return (
    <div className={className} title="Handpicked & Premium Vendor">
      <svg
        width="22"
        height="28"
        viewBox="0 0 24 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        {/* Amber/orange bookmark ribbon with swallowtail notch at bottom */}
        <path d="M0 0H24V30L12 24L0 30V0Z" fill="#FF7A00" />
        {/* Crown silhouette */}
        <path d="M5.5 15.8H18.5V17.2H5.5V15.8Z" fill="white" />
        <path
          d="M5.8 14.5L4.2 8.5L8 10.8L12 6L16 10.8L19.8 8.5L18.2 14.5H5.8Z"
          fill="white"
        />
      </svg>
    </div>
  );
}

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <span
      title="Premium Vendor"
      className={
        className ??
        "inline-flex items-center gap-1 rounded bg-[#FF7A00] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs"
      }
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 16.5h14v1.5H5v-1.5zm.5-2l-1.5-6.5 3.5 2.5 3.5-4.5 3.5 4.5 3.5-2.5-1.5 6.5h-11z" />
      </svg>
      <span>Premium</span>
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      title="Verified Vendor"
      className={
        className ??
        "inline-flex items-center gap-1 rounded bg-[#EBF5FF] px-1.5 py-0.5 text-[11px] font-semibold text-[#0080FF]"
      }
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
      <span>Verified</span>
    </span>
  );
}
