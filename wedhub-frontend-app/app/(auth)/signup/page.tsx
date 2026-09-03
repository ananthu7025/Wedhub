import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getOptionalSession } from "@/lib/auth/dal";
import { SignupWizard } from "./SignupWizard";

export const metadata: Metadata = {
  title: "Sign up",
};

const roleHomeRoute: Record<string, string> = {
  END_USER: "/shortlist",
  VENDOR: "/vendor/dashboard",
  ADMIN: "/admin/dashboard",
};

interface SignupPageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const session = await getOptionalSession();
  if (session) {
    redirect(roleHomeRoute[session.role] ?? "/");
  }

  const { type } = await searchParams;
  const accountType = type === "vendor" ? "VENDOR" : "END_USER";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-10 py-4.5">
        <Link href="/login" className="text-[22px] font-semibold text-brand-ink-soft no-underline">
          Wed<span className="font-bold text-brand-primary">Hub</span>
        </Link>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <p className="mb-6 text-[13px] text-text-grey">
          Already have an account?
          <Link href="/login" className="ml-1 font-bold text-brand-primary no-underline">
            Log in
          </Link>
        </p>
        <SignupWizard accountType={accountType} />
      </div>
    </div>
  );
}
