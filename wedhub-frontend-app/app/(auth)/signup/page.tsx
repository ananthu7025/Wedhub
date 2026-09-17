import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getOptionalSession } from "@/lib/auth/dal";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { SignupWizard } from "./SignupWizard";
import { SwitchAccountForVendorSignup } from "./SwitchAccountForVendorSignup";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
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
  const { type } = await searchParams;
  const accountType = type === "vendor" ? "VENDOR" : "END_USER";

  if (session) {
    // A signed-in customer clicking "Register as a Vendor" (footer CTA,
    // ?type=vendor) used to be silently redirected to /shortlist here,
    // discarding their vendor-signup intent with no explanation — role is a
    // single fixed enum on User (END_USER | VENDOR | ADMIN), so an existing
    // customer session can never just "add" a vendor role. Offer logout
    // instead of redirecting them away. Any other case (already the right
    // role, or a VENDOR/ADMIN hitting this page at all) keeps the original
    // straight-to-home-route behavior.
    if (accountType === "VENDOR" && session.role === "END_USER") {
      return (
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-border px-10 py-4.5">
            <BrandLogo variant="dark" />
          </header>
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
            <SwitchAccountForVendorSignup homeHref={roleHomeRoute[session.role] ?? "/"} />
          </div>
        </div>
      );
    }
    redirect(roleHomeRoute[session.role] ?? "/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-10 py-4.5">
        <BrandLogo variant="dark" />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <p className="mb-6 text-[13px] text-text-grey">
          Already have an account?
          <Link href="/login" className="ml-1 font-bold text-brand-primary no-underline">
            Log in
          </Link>
        </p>
        <SignupWizard accountType={accountType} />

        <p className="mt-6 text-center text-[13px] text-text-grey">
          <Link href="/" className="font-semibold text-brand-primary no-underline hover:underline">
            ← Go to home
          </Link>
        </p>
      </div>
    </div>
  );
}
