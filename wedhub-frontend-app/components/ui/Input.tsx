import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/cn";

interface InputOwnProps {
  /** Renders a red border/focus ring instead of the default, for a field that failed validation. */
  invalid?: boolean;
}

export function Input({ className, invalid = false, ...props }: ComponentPropsWithoutRef<"input"> & InputOwnProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-md border bg-white px-4 py-3 font-sans text-sm text-text-dark outline-none transition-colors placeholder:text-paynes-grey-40",
        invalid ? "border-red focus:border-red" : "border-border focus:border-brand-primary",
        className,
      )}
      {...props}
    />
  );
}
