import Link from "next/link";

export function PortfolioAttribution() {
  return (
    <footer className="mt-20 border-t border-neutral-100 bg-neutral-50/60 py-8 text-center text-xs text-neutral-400">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-1.5 px-4">
        <span>Powered by</span>
        <Link
          href="/"
          target="_blank"
          className="font-medium text-neutral-500 transition-colors hover:text-neutral-800 hover:underline"
        >
          itsmyKalyanam
        </Link>
      </div>
    </footer>
  );
}
