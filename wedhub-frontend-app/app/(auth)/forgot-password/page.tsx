import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex justify-center">
          <BrandLogo variant="dark" />
        </div>
        <h1 className="mb-2 text-center text-2xl font-bold text-brand-ink-soft">Reset your password</h1>
        <p className="mb-7 text-center text-sm text-text-grey">
          Enter your email and we&apos;ll send you a reset link.
        </p>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-[13px] text-text-grey">
          <Link href="/login" className="font-semibold text-brand-primary no-underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
