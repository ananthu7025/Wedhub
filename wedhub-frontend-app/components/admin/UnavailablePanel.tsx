/**
 * Explicit "not available in this backend yet" state (Frontend Arch Phase
 * 10), reused everywhere a mockup shows a table with no backing list
 * endpoint (Active Subscriptions, Transactions, Webhooks log, Coupons
 * list) — per user decision, 2026-09-02: render real page structure with
 * a clear message rather than synthesizing or omitting the screen.
 */
export function UnavailablePanel({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-input text-text-grey">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
      </div>
      <h3 className="text-[15px] font-bold">{title}</h3>
      <p className="mt-1.5 max-w-[440px] text-[13px] leading-relaxed text-text-grey">{reason}</p>
    </div>
  );
}
