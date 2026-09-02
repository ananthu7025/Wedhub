import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "crimson" | "blue" | "green" | "amber" | "red" | "grey";

const variantClasses: Record<BadgeVariant, string> = {
  crimson: "bg-crimson-10 text-crimson-70",
  blue: "bg-byzantine-blue-10 text-byzantine-blue-70",
  green: "bg-emerald-10 text-emerald-70",
  amber: "bg-amber-10 text-amber-70",
  red: "bg-red-10 text-red-70",
  grey: "bg-neutral-grey-20 text-text-grey",
};

export function Badge({
  variant = "grey",
  children,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        variantClasses[variant],
      )}
    >
      {children}
    </span>
  );
}
