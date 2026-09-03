"use client";

// 8 steps — the feature spec's own summary progress indicator lists 7,
// but its detailed walkthrough treats "Couple Story" as a distinct
// section from Photos (its own numbered "Step 5"). Given its own
// distinct step, it gets its own dot here too, rather than being crammed
// into the Photos or Details screen — confirmed with the user 2026-09-03.
const STEPS = ["Template", "Details", "Events", "Photos", "Story", "Preview", "Payment", "Published"] as const;
export type WizardStepName = (typeof STEPS)[number];

export function WizardProgress({ current }: { current: WizardStepName }) {
  const currentIndex = STEPS.indexOf(current);

  return (
    <div className="mb-8 flex items-center justify-center gap-1 overflow-x-auto px-2">
      {STEPS.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                index < currentIndex
                  ? "bg-emerald-70 text-white"
                  : index === currentIndex
                    ? "bg-brand-primary text-white"
                    : "bg-surface-input text-text-grey"
              }`}
            >
              {index < currentIndex ? "✓" : index + 1}
            </div>
            <span
              className={`hidden text-[10px] font-semibold whitespace-nowrap sm:block ${
                index === currentIndex ? "text-brand-primary" : "text-text-grey"
              }`}
            >
              {step}
            </span>
          </div>
          {index < STEPS.length - 1 && <div className={`mx-1.5 h-px w-4 sm:w-8 ${index < currentIndex ? "bg-emerald-70" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}
