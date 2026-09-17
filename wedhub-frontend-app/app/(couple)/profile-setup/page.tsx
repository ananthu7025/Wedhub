import type { Metadata } from "next";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { requireVerifiedRole } from "@/lib/auth/dal";
import { ProfileSetupWizard } from "./ProfileSetupWizard";

export const metadata: Metadata = {
  title: "Set up your wedding profile",
  robots: { index: false, follow: false },
};

// Reached right after email verification for END_USER accounts (item 2,
// 2026-09-16 request). requireVerifiedRole is the server-side backstop —
// SignupWizard.tsx's own "verify" step already keeps an unverified user
// from reaching here via the normal signup flow, but a direct URL visit
// must be blocked too (redirects to /verify-email/pending if unverified).
export default async function ProfileSetupPage() {
  await requireVerifiedRole("END_USER");

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="border-b border-border bg-white px-6 py-4">
        <BrandLogo variant="dark" />
      </header>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <ProfileSetupWizard />
      </div>
    </div>
  );
}
