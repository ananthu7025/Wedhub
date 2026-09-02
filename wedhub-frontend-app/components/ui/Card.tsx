import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface-card p-6 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4.5 flex items-center justify-between gap-4">
      <div>
        <h3 className="m-0 text-base font-bold">{title}</h3>
        {subtitle && <p className="mt-1 mb-0 text-[13px] text-text-grey">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
