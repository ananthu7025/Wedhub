import type { LeadStatus } from "@/lib/api/account.types";

/**
 * Maps the real backend LeadStatus enum onto the mockup's 4-step visual
 * tracker (Sent → Viewed → Responded → Closed) — see
 * frontenddocs/04-stage-couple-experience.md Frontend Arch Phase 4. There is
 * no 1:1 mapping (LeadStatus has 10 values, the mockup only shows 4 steps),
 * so this is a deliberate simplification: CONTACTED reads as "Viewed" (the
 * vendor has acknowledged it), RESPONDED/QUALIFIED/MEETING/QUOTED all read
 * as "Responded" (an active conversation is happening), and
 * WON/LOST/SPAM/CLOSED all read as "Closed" (the outcome badge above the
 * tracker — see statusBadge below — is what actually distinguishes them).
 */

const STEPS = ["Sent", "Viewed", "Responded", "Closed"] as const;

function stepIndexFor(status: LeadStatus): number {
  switch (status) {
    case "NEW":
      return 0;
    case "CONTACTED":
      return 1;
    case "RESPONDED":
    case "QUALIFIED":
    case "MEETING":
    case "QUOTED":
      return 2;
    case "WON":
    case "LOST":
    case "SPAM":
    case "CLOSED":
      return 3;
  }
}

export function statusBadge(status: LeadStatus): { label: string; variant: "blue" | "amber" | "green" | "grey" } {
  switch (status) {
    case "NEW":
      return { label: "Awaiting response", variant: "amber" };
    case "CONTACTED":
      return { label: "Viewed", variant: "amber" };
    case "RESPONDED":
    case "QUALIFIED":
    case "MEETING":
    case "QUOTED":
      return { label: "Responded", variant: "blue" };
    case "WON":
      return { label: "Won · Booked", variant: "green" };
    case "LOST":
      return { label: "Closed · Not selected", variant: "grey" };
    case "SPAM":
      return { label: "Closed", variant: "grey" };
    case "CLOSED":
      return { label: "Closed", variant: "grey" };
  }
}

export function LeadStatusTrack({ status }: { status: LeadStatus }) {
  const currentIndex = stepIndexFor(status);

  return (
    <div className="mt-2.5 flex items-center max-[700px]:w-full">
      {STEPS.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex items-center gap-1.5 text-[11px] ${
              index < currentIndex
                ? "text-text-grey"
                : index === currentIndex
                  ? "font-bold text-text-dark"
                  : "text-text-grey"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                index < currentIndex ? "bg-emerald" : index === currentIndex ? "bg-brand-primary" : "bg-border"
              }`}
            />
            {step}
          </div>
          {index < STEPS.length - 1 && (
            <span className={`mx-1 h-0.5 w-7 ${index < currentIndex ? "bg-emerald" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
