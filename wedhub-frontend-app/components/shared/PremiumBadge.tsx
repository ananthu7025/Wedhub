import { SparkleIcon } from "@/components/portfolio/icons";

export function PremiumBadge({ className }: { className?: string }) {
  return (
    <span
      title="Premium Vendor"
      className={className ?? "flex-shrink-0 rounded-full bg-crimson-10 px-1.5 py-0.5 text-[10px] font-bold text-crimson-70"}
    >
      <SparkleIcon className="inline h-3 w-3" />
    </span>
  );
}
