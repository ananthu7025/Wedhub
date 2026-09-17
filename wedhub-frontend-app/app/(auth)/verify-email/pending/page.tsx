import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { verifySession } from "@/lib/auth/dal";
import { getMe } from "@/lib/api/account";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { VerifyEmailPendingPanel } from "./VerifyEmailPendingPanel";

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false, follow: false },
};

const roleHomeRoute: Record<string, string> = {
  END_USER: "/shortlist",
  VENDOR: "/vendor/dashboard",
  ADMIN: "/admin/dashboard",
};

// Reached by requireVerifiedRole (lib/auth/dal.ts) whenever a signed-in but
// unverified user tries to reach profile setup — the server-side backstop
// for item 1's "only after verification should profile setup happen", not
// just the signup wizard's own client-side "verify" step. If the session is
// already verified (e.g. they verified in another tab and this page is
// stale), just send them on to their normal home route instead of showing a
// pointless "please verify" screen.
export default async function VerifyEmailPendingPage() {
  const session = await verifySession();
  if (session.emailVerified) {
    redirect(roleHomeRoute[session.role] ?? "/");
  }

  const { data: me } = await getMe();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mb-7 flex justify-center">
          <BrandLogo variant="dark" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-brand-ink-soft">Verify your email</h1>
        <p className="mb-7 text-sm text-text-grey">
          We&apos;ve sent a verification link to <span className="font-semibold text-text-dark">{me.email}</span>.
          Check your inbox and click the link to continue.
        </p>
        <VerifyEmailPendingPanel email={me.email} />
      </div>
    </div>
  );
}
