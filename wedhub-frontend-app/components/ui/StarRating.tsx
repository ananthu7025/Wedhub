import { StarIcon } from "@/components/portfolio/icons";

export function StarRating({ rating, max = 5, className }: { rating: number; max?: number; className?: string }) {
  return (
    <span className={className} aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <StarIcon key={i} filled={i < Math.round(rating)} className="inline h-3.5 w-3.5" />
      ))}
    </span>
  );
}
