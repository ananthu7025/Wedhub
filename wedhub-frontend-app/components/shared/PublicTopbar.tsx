import Link from "next/link";
import { getOptionalSession } from "@/lib/auth/dal";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Find Vendors" },
];

export async function PublicTopbar() {
  const session = await getOptionalSession();

  return (
    <header className="sticky top-0 z-100 flex h-[70px] items-center justify-between border-b border-border bg-white px-10 max-[900px]:px-4">
      <Link href="/" className="flex items-center text-[22px] font-semibold text-brand-ink-soft no-underline">
        Wed<span className="font-bold text-brand-primary">Hub</span>
      </Link>
      <nav className="flex gap-1 max-[900px]:hidden">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3.5 py-2 text-sm font-semibold text-text-grey no-underline hover:bg-surface-input hover:text-text-dark"
          >
            {link.label}
          </Link>
        ))}
        {session && (
          <Link
            href="/shortlist"
            className="rounded-md px-3.5 py-2 text-sm font-semibold text-text-grey no-underline hover:bg-surface-input hover:text-text-dark"
          >
            Shortlist
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-3.5">
        {session ? (
          <Link
            href="/shortlist"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-ink-soft text-sm font-bold text-white no-underline"
          >
            {session.userId.slice(0, 2).toUpperCase()}
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-md px-3.5 py-2 text-sm font-bold text-text-grey no-underline hover:bg-surface-input"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-brand-primary px-4 py-2.5 text-sm font-bold text-white no-underline shadow-[0_4px_12px_rgba(224,11,65,0.18)] hover:bg-brand-primary-hover"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
