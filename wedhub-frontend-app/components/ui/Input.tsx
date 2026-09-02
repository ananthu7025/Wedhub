import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/cn";

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-border bg-white px-4 py-3 font-sans text-sm text-text-dark outline-none transition-colors placeholder:text-paynes-grey-40 focus:border-brand-primary",
        className,
      )}
      {...props}
    />
  );
}
